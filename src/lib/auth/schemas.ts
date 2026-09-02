import { z } from 'zod'

import { CODE_LENGTH } from '@/lib/auth/config'
import { checkPassword } from '@/lib/auth/password'

/**
 * The shape of every account form, defined once and checked twice (spec 004).
 *
 * **This module exists to be imported from both sides.** The browser runs it through
 * `zodResolver` so a mismatched password is caught before a request is made; the server action runs
 * the same schema over whatever actually arrived, because a client-side check is a courtesy to the
 * customer and nothing at all to an attacker, who simply calls the action. Two hand-written copies
 * of "what counts as valid" drift, and the half that drifts silently is always the server's.
 *
 * **Messages are copy KEYS, not sentences.** `'createEmailInvalid'` resolves through
 * `message(copy, key)` at the point of render, exactly as the actions' own failures do. It is also
 * what lets the integration tests assert `toBe('createEmailInvalid')` rather than matching English.
 *
 * **No `.default()` anywhere, deliberately.** A default makes a field optional on the way in and
 * required on the way out, which splits every schema into two types and pushes three generics into
 * every `useForm` call. Forms supply their own defaults; these stay input-equals-output.
 *
 * Pure — no Payload import — so it is safe in a client bundle.
 */

/** Good enough to catch a typo, and not an attempt to out-parse RFC 5322. */
export const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CODE_SHAPE = new RegExp(`^\\d{${CODE_LENGTH}}$`)

/**
 * Trimmed and lower-cased before anything looks at it, so `  Ada@Example.com ` and
 * `ada@example.com` cannot become two accounts.
 */
const emailField = (key: string) => z.string().trim().toLowerCase().regex(EMAIL_SHAPE, key)

/**
 * Trimmed, which is a decision rather than an oversight.
 *
 * A trailing space picked up by a copy-paste out of a password manager is a support ticket that
 * looks exactly like a forgotten password. The cost is a handful of bits of entropy in passwords
 * nobody chose on purpose. **Every path that checks a password must trim identically** — registering
 * with a trimmed value and signing in with an untrimmed one is a locked-out customer.
 */
const passwordField = z.string().trim()

export const createAccountSchema = z
  .object({
    email: emailField('createEmailInvalid'),
    password: passwordField,
    confirmPassword: passwordField,
    marketingConsent: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      // Returns rather than falling through, so a customer who mistyped the confirmation is told
      // that and only that. Two complaints about one typo reads as two problems.
      ctx.addIssue({
        code: 'custom',
        message: 'createPasswordMismatch',
        path: ['confirmPassword'],
      })
      return
    }

    if (!checkPassword(values.password, values.email).ok) {
      ctx.addIssue({ code: 'custom', message: 'createPasswordTooWeak', path: ['password'] })
    }
  })

export const verifyCodeSchema = z.object({
  email: emailField('codeInvalid'),
  /**
   * A wrong-length code fails as `codeInvalid` rather than as its own message. The customer holding
   * four digits and the customer holding six wrong ones are in the same position, and a distinct
   * "that is too short" would be the one place in this flow that tells an attacker something about
   * the shape of a valid code before spending an attempt on it.
   */
  code: z.string().trim().regex(CODE_SHAPE, 'codeInvalid'),
})

export const resendCodeSchema = z.object({
  email: emailField('codeInvalid'),
  purpose: z.enum(['reset-password', 'verify-email']),
})

export type CreateAccountValues = z.infer<typeof createAccountSchema>
export type ResendCodeValues = z.infer<typeof resendCodeSchema>
export type VerifyCodeValues = z.infer<typeof verifyCodeSchema>

export interface SchemaFailure {
  fieldErrors?: Record<string, string>
  message: string
}

/**
 * Turn a parse failure into the `{ message, fieldErrors }` shape the actions have always returned.
 *
 * The first issue for a field wins: zod reports every problem it finds, and a control that renders
 * three lines of complaint under it is worse than one that renders the first. The top-level
 * `message` is the first issue overall, so a form with no per-field slot still has something to say.
 */
export function schemaFailure(error: z.ZodError): SchemaFailure {
  const fieldErrors: Record<string, string> = {}

  for (const issue of error.issues) {
    const field = issue.path[0]
    if (typeof field === 'string' && !(field in fieldErrors)) {
      fieldErrors[field] = issue.message
    }
  }

  return {
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    message: error.issues[0]?.message ?? 'formInvalid',
  }
}
