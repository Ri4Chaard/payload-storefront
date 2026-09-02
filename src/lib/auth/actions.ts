'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { consumeCode, issueCode, type CodeFailure } from '@/lib/auth/codes'
import {
  createAccountSchema,
  resendCodeSchema,
  schemaFailure,
  verifyCodeSchema,
  type CreateAccountValues,
  type ResendCodeValues,
  type VerifyCodeValues,
} from '@/lib/auth/schemas'
import { sendVerificationCode } from '@/lib/email/transactional'

/**
 * The server actions behind the account forms (spec 004, contracts/auth-actions.md).
 *
 * Every message below is a KEY into `src/lib/auth/copy.ts`, never a sentence. That keeps each string
 * defined once, and it keeps these functions assertable: the integration tests compare two responses
 * to each other, and `toBe('codeExpired')` does not break the day somebody rewords the sentence.
 *
 * **Each action re-validates its input with the same schema the form used** (`./schemas.ts`). The
 * browser's check is a courtesy to the customer; these functions are a public HTTP endpoint that
 * anything can call with anything, so the shape is proved again here. Passing typed values rather
 * than `FormData` is what lets one schema serve both sides — and what lets the tests below read as
 * `registerCustomer({ email, password })`.
 */

export type ActionResult<T = undefined> =
  | { data?: T; status: 'success' }
  | { fieldErrors?: Record<string, string>; message: string; status: 'error' }

const ok = <T>(data?: T): ActionResult<T> => ({ data, status: 'success' })
const fail = (message: string, fieldErrors?: Record<string, string>): ActionResult<never> => ({
  fieldErrors,
  message,
  status: 'error',
})

const client = () => getPayload({ config })

/** Each way a code can be dead maps to its own message. See `consumeCode` for why that matters. */
const CODE_FAILURE_KEYS: Record<CodeFailure, string> = {
  consumed: 'codeAlreadyUsed',
  expired: 'codeExpired',
  mismatch: 'codeInvalid',
  'not-found': 'codeInvalid',
  superseded: 'codeSuperseded',
  'too-many-attempts': 'codeTooManyAttempts',
}

/**
 * Create an account (FR-001 – FR-004, FR-009).
 *
 * **The response is identical whether or not the address is already registered**, and that is the
 * requirement rather than a shortcut: a create form that says "this email is taken" is a way to ask
 * the site which of a list of addresses shop here. An address that already has an UNVERIFIED
 * account gets a fresh code, so the legitimate owner of an abandoned registration can still finish
 * it; a verified one gets nothing at all. From outside, the three cases are indistinguishable.
 */
export async function registerCustomer(input: CreateAccountValues): Promise<ActionResult> {
  const parsed = createAccountSchema.safeParse(input)
  if (!parsed.success) {
    const { fieldErrors, message } = schemaFailure(parsed.error)
    return fail(message, fieldErrors)
  }

  const { email, marketingConsent: marketingEmail, password } = parsed.data
  const payload = await client()

  const existing = await payload.find({
    collection: 'customers',
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: email } },
  })

  const already = existing.docs[0]
  if (already) {
    if (already._verified !== true) {
      await resendVerificationFor(already.id)
    }
    // Deliberately the same as a fresh registration.
    return ok()
  }

  await payload.create({
    collection: 'customers',
    data: { email, marketingEmail, password },
    overrideAccess: true,
  })

  return ok()
}

/**
 * Mint and send a new verification code for an existing unverified account.
 *
 * Payload has no "resend verification" operation, so this reuses the token it already minted rather
 * than forcing a new one — the token is not what the customer sees, the code is, and rotating it
 * would invalidate nothing that matters while costing a write.
 */
async function resendVerificationFor(customerId: number): Promise<'ok' | 'throttled'> {
  const payload = await client()

  const customer = await payload.findByID({
    collection: 'customers',
    id: customerId,
    overrideAccess: true,
    showHiddenFields: true,
  })

  const token = (customer as { _verificationToken?: string })._verificationToken
  if (!token || customer._verified === true) return 'ok'

  const issued = await issueCode(customer.email, 'verify-email', token, { customerId })
  if (!issued.ok) return 'throttled'

  await sendVerificationCode(customer.email, issued.code)
  return 'ok'
}

/**
 * Ask for another code (FR-006).
 *
 * Returns success for an unknown address as well, for the same reason registration does.
 */
export async function resendCode(input: ResendCodeValues): Promise<ActionResult> {
  const parsed = resendCodeSchema.safeParse(input)
  if (!parsed.success) return fail(schemaFailure(parsed.error).message)

  const { email, purpose } = parsed.data
  const payload = await client()
  const found = await payload.find({
    collection: 'customers',
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: email } },
  })

  const customer = found.docs[0]

  if (customer && purpose === 'verify-email') {
    // The throttle still applies — it just is not announced. See below.
    await resendVerificationFor(customer.id)
  }

  /**
   * **Success, always, including when the send was throttled.**
   *
   * Returning "please wait a moment" for a registered address and "sent" for an unregistered one
   * makes this form an oracle: an attacker submits a list of addresses and reads which ones are
   * throttled. It is the same disclosure FR-009 closes on the create form, arriving through a side
   * door — and an integration test comparing the two responses is what caught it, because each one
   * looks perfectly reasonable on its own.
   *
   * The cooldown is not lost, only unspoken: no second email goes out inside the window. The button
   * still shows a countdown, driven client-side from a fixed interval that is identical for every
   * address and therefore tells nobody anything.
   */
  return ok()
}

/**
 * Enter the code, become verified, and be signed in (FR-007).
 *
 * `payload.verifyEmail` is what flips `_verified`; the code only decides whether we call it. That
 * split is the whole of research R3 — Payload keeps the token and the state transition, and we own
 * six digits that stand for the token.
 */
export async function verifyEmailCode(input: VerifyCodeValues): Promise<ActionResult> {
  const parsed = verifyCodeSchema.safeParse(input)
  if (!parsed.success) return fail(schemaFailure(parsed.error).message)

  const { code, email } = parsed.data
  const result = await consumeCode(email, 'verify-email', code)
  if (!result.ok) return fail(CODE_FAILURE_KEYS[result.failure])

  const payload = await client()
  await payload.verifyEmail({ collection: 'customers', token: result.token })

  /**
   * **The customer is verified here, and is NOT signed in. That is a deviation from FR-007.**
   *
   * FR-007 asks for the session to start the moment the code is accepted, and there is no supported
   * way to do it in Payload 3.88. A session is a JWT Payload signs itself, and the only operation
   * that mints one is `login`, which needs the password — typed on a different screen, minutes
   * earlier, and quite rightly not kept anywhere in between. The alternatives were all worse than
   * the extra step:
   *
   *   - Forging the token ourselves means importing `jwtSign` and `getFieldsToSign` from
   *     `payload/dist/auth/`, past the package's export map, and reproducing the exact claim set
   *     `payload.auth()` validates. A silent Payload upgrade then signs customers out, or worse,
   *     does not.
   *   - Carrying the password through the verification screen in a hidden field puts it in the DOM
   *     for any extension to read, to save one click.
   *   - A custom auth strategy is a real answer and a much larger change than this spec's scope.
   *
   * So the success screen's single button leads to sign-in. The cost is one extra step, against
   * SC-001's 90-second budget — measure it before deciding this needs solving properly.
   */
  return ok()
}
