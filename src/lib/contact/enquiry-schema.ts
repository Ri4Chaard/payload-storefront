import { z } from 'zod'

import { EMAIL_SHAPE } from '@/lib/auth/schemas'

import { ENQUIRY_MAX } from './config'

/**
 * The one shape both sides of the contact form agree on (spec 008, T050,
 * contracts/enquiry-action.md §3).
 *
 * **The maxima come from `./config.ts`, never from literals here.** The same numbers are
 * `maxLength` on the `enquiries` collection, so a value this schema accepts can never be one Payload
 * refuses — the failure mode that produces a 500 on a form that said everything was fine.
 *
 * **Parsed from `FormData`, not from typed values**, which is the one place this diverges from
 * `src/lib/auth/schemas.ts`. That module's own comment explains why it passes typed values: "one
 * schema serves both sides". It can, because those forms are react-hook-form and always have
 * JavaScript. FR-018 requires this form to work without it, so the browser posts a real form
 * encoding and the action receives `FormData` — see 008/research.md R3.
 */

/**
 * Trimmed before every check, so " " is empty rather than a one-character name — and so the value
 * that reaches the database is the value that was validated.
 */
const trimmed = z.string().trim()

export const enquirySchema = z.object({
  name: trimmed
    .min(1, 'nameRequired')
    .max(ENQUIRY_MAX.name, 'nameTooLong'),
  /*
    `EMAIL_SHAPE` is the regex the account forms already use, reused rather than restated — its own
    comment calls it "good enough to catch a typo, and not an attempt to out-parse RFC 5322", which
    is exactly the standard wanted here. A second definition of "looks like an address" is a second
    thing that can disagree with the first about somebody's real address.

    Not lowercased, unlike the account forms: this address is a reply-to, not an identity, and an
    address is shown back to the owner as the visitor wrote it. The throttle lowercases its own copy
    for counting.
  */
  email: trimmed
    .min(1, 'emailRequired')
    .max(ENQUIRY_MAX.email, 'emailTooLong')
    .regex(EMAIL_SHAPE, 'emailInvalid'),
  message: trimmed
    .min(1, 'messageRequired')
    .max(ENQUIRY_MAX.message, 'messageTooLong'),
  /**
   * The honeypot (FR-027).
   *
   * Named `website` because that is a field name a form-filling bot recognises and wants to
   * complete. A visitor cannot reach it — it is off-screen, `tabindex="-1"` and `aria-hidden` — so
   * anything in it came from something that read the markup rather than the page.
   *
   * Optional, because a browser that does not submit an empty hidden input is not a bot.
   */
  website: z.string().optional(),
})

export type EnquiryValues = z.infer<typeof enquirySchema>

/** Every message key this schema can produce. The words live in the component that renders them. */
export type EnquiryFieldError =
  | 'emailInvalid'
  | 'emailRequired'
  | 'emailTooLong'
  | 'messageRequired'
  | 'messageTooLong'
  | 'nameRequired'
  | 'nameTooLong'

/**
 * `FormData` to the object the schema validates.
 *
 * A missing field becomes `''` rather than `undefined`, so "the browser sent nothing" and "the
 * visitor typed nothing" produce the same error — which is what a visitor would expect, and what
 * keeps the no-JavaScript path from failing differently to the enhanced one.
 */
export function readEnquiryForm(formData: FormData): Record<string, string> {
  const field = (name: string): string => {
    const value = formData.get(name)
    return typeof value === 'string' ? value : ''
  }

  return {
    name: field('name'),
    email: field('email'),
    message: field('message'),
    website: field('website'),
  }
}
