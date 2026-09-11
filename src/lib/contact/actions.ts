'use server'

import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { sendEnquiryNotification } from '@/lib/email/enquiry'

import type { EnquiryState, EnquiryValues } from './actions-types'
import { enquirySchema, readEnquiryForm, type EnquiryFieldError } from './enquiry-schema'
import { checkEnquiryThrottle, clientIp, senderHash } from './throttle'

/**
 * The contact form's server action (spec 008, T053 – T056, contracts/enquiry-action.md).
 *
 * **The one public write surface this feature adds.** It is reachable by anything that can make an
 * HTTP request, so every rule below is enforced here rather than in the form.
 *
 * **`(prevState, formData)`, taking `FormData` — the deliberate departure from
 * `src/lib/auth/actions.ts`.** That module passes typed values and says why: "one schema serves
 * both sides". It can, because the account forms are react-hook-form and always have JavaScript.
 * FR-018 requires this form to work without it, so the browser posts a real form encoding and React
 * hands it over as `FormData`. See 008/research.md R3 — this divergence is the requirement, not an
 * oversight, and should not be "corrected" back.
 *
 * **Message strings are KEYS, never sentences.** The words come from `contact-page.form`, which is
 * the editor's (FR-042), and keys keep the tests assertable — `toBe('throttled')` does not break
 * when somebody rewords the copy. Same convention as the account actions.
 */

const client = () => getPayload({ config })

/*
  `EnquiryState`, `EnquiryValues` and `initialEnquiryState` live in `./actions-types.ts`.

  Not a preference: a `'use server'` module may export only async functions, so exporting the
  initial state object from here fails at runtime with "A 'use server' file can only export async
  functions, found object". `src/lib/cart/actions-types.ts` made the same split for the same
  framework rule, and records the second reason — keeping the Payload config off a client
  component's import graph.
*/

const failure = (
  message: 'invalid' | 'sendFailed' | 'throttled',
  values: EnquiryValues,
  fieldErrors?: Partial<Record<'email' | 'message' | 'name', EnquiryFieldError>>,
): EnquiryState => ({ status: 'error', message, values, ...(fieldErrors ? { fieldErrors } : {}) })

/**
 * Where the notification goes (FR-024).
 *
 * Resolved at send time from the global, never from a constant — an address written in code is
 * exactly what that requirement forbids. The override wins, then the shop's own address; the
 * shipped default is the last resort, so a notification is never simply dropped because a field is
 * blank.
 */
async function enquiryRecipient(): Promise<string> {
  const payload = await client()
  const settings = await payload.findGlobal({ slug: 'contact-settings', depth: 0 })

  const override = typeof settings.enquiryEmail === 'string' ? settings.enquiryEmail.trim() : ''
  if (override !== '') return override

  const email = typeof settings.email === 'string' ? settings.email.trim() : ''
  if (email !== '') return email

  const { DEFAULT_CONTACT } = await import('./defaults')
  return DEFAULT_CONTACT.email
}

/**
 * Receive an enquiry.
 *
 * **The ordering is the contract** (contracts/enquiry-action.md §5, FR-021, FR-024a):
 *
 *     validate            fail → 'invalid'    | nothing written, nothing sent
 *     honeypot + throttle fail → 'throttled'  | nothing written, nothing sent
 *     CREATE  (notification='pending')
 *             fail → 'sendFailed'             | nothing sent, and the visitor is told plainly
 *     notify  ok   → notification='sent'
 *             fail → notification='failed' + reason
 *     return 'success' ── decided by the CREATE, and NEVER by the send
 *
 * That last line is the whole design. The record is the receipt; the email is how the owner finds
 * out. A visitor whose enquiry was stored is told it arrived, because it did — even when the
 * notification failed, which is the owner's problem to see in the admin and not the customer's to
 * be lied to about. `'success'` must be unreachable without a written row.
 *
 * **This action must not:** read or write the session, set a cookie, require an account, look up a
 * customer by the submitted address (FR-029f — an enquiry is correspondence, not profile data), or
 * call `revalidatePath`. That last one matters more than it looks: `src/lib/revalidate.ts`
 * invalidates by walking every product slug, so an invalidation here would let any anonymous
 * visitor evict the entire catalogue by submitting this form.
 */
export async function submitEnquiry(
  _prevState: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  const payload = await client()
  const raw = readEnquiryForm(formData)
  const values: EnquiryValues = { name: raw.name ?? '', email: raw.email ?? '', message: raw.message ?? '' }

  const parsed = enquirySchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors: Partial<Record<'email' | 'message' | 'name', EnquiryFieldError>> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (field === 'name' || field === 'email' || field === 'message') {
        fieldErrors[field] ??= issue.message as EnquiryFieldError
      }
    }

    payload.logger.info({ msg: 'enquiry rejected', outcome: 'invalid', fields: Object.keys(fieldErrors) })
    return failure('invalid', values, fieldErrors)
  }

  /*
    A filled honeypot returns the SUCCESS shape, not an error.

    A bot told precisely which check it failed is a bot that learns. A visitor cannot reach this
    branch — the control is off-screen, `tabindex="-1"` and `aria-hidden` — so anything here read
    the markup rather than the page. Nothing is written and nothing is sent.
  */
  if (parsed.data.website && parsed.data.website.trim() !== '') {
    payload.logger.info({ msg: 'enquiry rejected', outcome: 'honeypot' })
    return { status: 'success' }
  }

  const hash = senderHash(clientIp(await headers()))
  const throttle = await checkEnquiryThrottle(parsed.data.email, hash)
  if (!throttle.allowed) {
    payload.logger.warn({ msg: 'enquiry throttled', outcome: 'throttled', key: throttle.key })
    return failure('throttled', values)
  }

  /*
    `overrideAccess: true` because the collection refuses `create` to everyone (data-model §1). This
    action is structurally the only way an enquiry can be written — the construction
    `src/collections/verification-codes.ts` uses and documents.
  */
  let enquiryId: number | string
  try {
    const created = await payload.create({
      collection: 'enquiries',
      overrideAccess: true,
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        message: parsed.data.message,
        notification: 'pending',
        // FR-043 — the acknowledgement and the messenger handoff are answered in this language.
        locale: parsed.data.locale,
        ...(hash ? { senderHash: hash } : {}),
      },
    })
    enquiryId = created.id
  } catch (error) {
    // Nothing was stored, so nothing may be acknowledged. This is the ONE branch that tells a
    // visitor their message did not arrive, and it is correct only because no row exists.
    payload.logger.error({ err: error, msg: 'enquiry write failed', outcome: 'write-failed' })
    return failure('sendFailed', values)
  }

  /*
    From here the visitor is getting `'success'` whatever happens: the shop has their message.

    The log lines carry the enquiry's own id as the correlation handle and never the message text or
    the address (FR-028) — those live in an access-controlled collection, and a log line is not
    access-controlled and is frequently shipped somewhere else.
  */
  try {
    const to = await enquiryRecipient()
    await sendEnquiryNotification(to, {
      name: parsed.data.name,
      email: parsed.data.email,
      message: parsed.data.message,
    })

    await payload.update({
      collection: 'enquiries',
      id: enquiryId,
      overrideAccess: true,
      data: { notification: 'sent' },
    })

    payload.logger.info({ msg: 'enquiry received', outcome: 'accepted', enquiry: enquiryId })
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error'

    await payload
      .update({
        collection: 'enquiries',
        id: enquiryId,
        overrideAccess: true,
        data: { notification: 'failed', notificationError: reason.slice(0, 255) },
      })
      // If even the outcome write fails the row stays `pending`, which is legible and is why that
      // option exists. Nothing here may throw: the enquiry is safe, and that is what matters.
      .catch((updateError: unknown) => {
        payload.logger.error({ err: updateError, msg: 'enquiry outcome write failed', enquiry: enquiryId })
      })

    payload.logger.error({ err: error, msg: 'enquiry notification failed', outcome: 'notify-failed', enquiry: enquiryId })
  }

  return { status: 'success' }
}
