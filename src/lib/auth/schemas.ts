import { z } from 'zod'

import { CODE_LENGTH } from '@/lib/auth/config'
import { checkPassword } from '@/lib/auth/password'
import { COUNTRY_CODES } from '@/lib/countries'

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

/**
 * The "type it twice, and make it a real password" rule, shared by every screen that sets one.
 *
 * Registration and password reset ask the same question and must answer it the same way; the keys
 * differ only so each screen can word its own sentences. Written once because the ORDER below is
 * the part that is easy to get wrong twice.
 *
 * **Mismatch returns rather than falling through.** A customer who mistyped the confirmation is
 * told that and only that — two complaints about one typo reads as two problems. Note this governs
 * these two checks only: zod runs object-level refinements even when a field-level check has
 * already failed, so an invalid address and a mismatched confirmation do both appear. That is
 * correct — they are two different mistakes, under two different fields.
 */
const passwordPair = (mismatchKey: string, weakKey: string) =>
  (values: { confirmPassword: string; email: string; password: string }, ctx: z.RefinementCtx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({ code: 'custom', message: mismatchKey, path: ['confirmPassword'] })
      return
    }

    if (!checkPassword(values.password, values.email).ok) {
      ctx.addIssue({ code: 'custom', message: weakKey, path: ['password'] })
    }
  }

export const createAccountSchema = z
  .object({
    email: emailField('createEmailInvalid'),
    password: passwordField,
    confirmPassword: passwordField,
    marketingConsent: z.boolean(),
  })
  .superRefine(passwordPair('createPasswordMismatch', 'createPasswordTooWeak'))

export const signInSchema = z.object({
  email: emailField('signInEmailInvalid'),
  password: passwordField,
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

/** Forgot password, step one. One field, and the response never varies (FR-017). */
export const requestResetSchema = z.object({
  email: emailField('resetEmailInvalid'),
})

/**
 * Forgot password, step three. The handle is what step two issued — see `./reset-handle.ts`.
 *
 * **`email` is here for the browser's benefit only.** It lets this schema run the identical weak-
 * password check the create form runs, so the customer is told about a password that is their own
 * address before making a round trip. The server does not trust it: `resetPassword` re-runs the
 * check against the address on the code row, which is the one the handle actually points at.
 */
export const resetPasswordSchema = z
  .object({
    email: emailField('resetEmailInvalid'),
    handle: z.string().min(1, 'resetSessionExpired'),
    password: passwordField,
    confirmPassword: passwordField,
  })
  .superRefine(passwordPair('resetPasswordMismatch', 'resetPasswordTooWeak'))

/**
 * The profile's Full name modal (FR-024).
 *
 * **Both halves are optional, and that is the requirement rather than laxity.** A customer who has
 * only ever given one name should be able to save it, and one who wants to remove what they typed
 * should be able to clear the field — a `min(1)` here would turn "I would rather you did not store
 * my surname" into a validation error. The bound is at the top, not the bottom: the column is text,
 * and a hundred characters is past any real name and short of a paste of a novel.
 */
export const nameSchema = z.object({
  firstName: z.string().trim().max(100, 'nameTooLong'),
  lastName: z.string().trim().max(100, 'nameTooLong'),
})

/**
 * The Change password modal — node `426:11616` (FR-020).
 *
 * **Its refinement is written out rather than sharing `passwordPair`.** Two reasons, and the first
 * alone would be enough: the fields are named `newPassword`/`confirmPassword`, not
 * `password`/`confirmPassword`, so the shared helper does not fit without being parameterised into
 * something harder to read than the four lines below. The second is that this form has no email on
 * it — the customer is signed in, so the address is not asked for — and the weak-password check
 * that needs it therefore has to happen on the server, against the account being changed.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: passwordField,
    newPassword: passwordField,
    confirmPassword: passwordField,
  })
  .superRefine((values, ctx) => {
    if (values.newPassword !== values.confirmPassword) {
      ctx.addIssue({ code: 'custom', message: 'changePasswordMismatch', path: ['confirmPassword'] })
      return
    }

    // Length and the common-password list only. `changePassword` re-runs the same check with the
    // customer's own address, which is the one that can refuse a password that IS the address.
    if (!checkPassword(values.newPassword).ok) {
      ctx.addIssue({ code: 'custom', message: 'changePasswordTooWeak', path: ['newPassword'] })
    }
  })

/**
 * The Add address modal — node `583:12968` (FR-027, FR-028, FR-030).
 *
 * **The four required fields are required in three places, and that is deliberate.** The modal
 * keeps Save disabled while any of them is empty, this schema refuses the submission, and
 * `src/fields/address-fields.ts` marks the same three columns `required` on the collection (the
 * plugin already requires `country`). The disabled button is a courtesy to the customer, this is
 * the check, and the column constraint is what keeps both of them honest when a later writer —
 * checkout, an import, the admin panel — arrives.
 *
 * **`addressLine2` and `apartment` are optional and still `string`.** The form renders both boxes
 * always, and an untouched box submits `''`, never `undefined` — a schema that expected the latter
 * would reject every address anybody actually typed. `saveAddress` is what turns `''` back into a
 * stored null, so the database does not collect empty strings that then have to be checked for.
 *
 * **The country is checked against the whole ISO list, not the shop's narrowed one.** Narrowing
 * `shippingCountries` changes what the form OFFERS; making it a validation rule would mean an
 * address already saved in a country the owner later removed could not be re-saved — the row would
 * become uneditable rather than merely unusual. `src/globals/account-settings.ts` says the same
 * thing from the other end.
 */
export const addressSchema = z.object({
  country: z.enum(COUNTRY_CODES, 'addressCountryRequired'),
  addressLine1: z.string().trim().min(1, 'addressLine1Required').max(200, 'addressTooLong'),
  addressLine2: z.string().trim().max(200, 'addressTooLong'),
  apartment: z.string().trim().max(200, 'addressTooLong'),
  city: z.string().trim().min(1, 'addressCityRequired').max(120, 'addressTooLong'),
  postalCode: z.string().trim().min(1, 'addressPostcodeRequired').max(32, 'addressTooLong'),
  isDefault: z.boolean(),
})

/**
 * The same fields plus the row being edited — absent when creating (FR-029).
 *
 * **Separate from `addressSchema` because the form has no id field.** The modal knows which address
 * it was opened on; folding that into the resolver's value type would mean a hidden input whose
 * only purpose is to be tampered with. The id is validated here, on the server, where it arrives —
 * and `saveAddress` re-reads the row it names before writing anything to it (FR-032).
 */
export const saveAddressSchema = addressSchema.extend({
  id: z.number().int().positive().optional(),
})

/** Deletion needs the id and nothing else. Confirmation is the modal's job, not the schema's. */
export const deleteAddressSchema = z.object({
  id: z.number().int().positive(),
})

/**
 * The marketing switch (FR-033, FR-034).
 *
 * One boolean, and a schema for it anyway. `z.boolean()` is not decoration here: a server action is
 * a public endpoint reached by a POST that can carry `"false"`, `0`, `null` or nothing at all, and
 * every one of those is truthy-or-falsy in a way that would quietly write the wrong consent. This
 * refuses them instead, so the action never has to decide what a string meant.
 *
 * **The timestamp and the source are absent on purpose.** They are the evidence, and they are
 * written by `stampMarketingConsent` from the change actually being made — a consent record whose
 * date arrived in the same request as the consent is a record of nothing. There is deliberately no
 * field here for a caller to supply one.
 */
export const marketingEmailSchema = z.object({
  subscribed: z.boolean(),
})

export type AddressValues = z.infer<typeof addressSchema>
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
export type CreateAccountValues = z.infer<typeof createAccountSchema>
export type DeleteAddressValues = z.infer<typeof deleteAddressSchema>
export type MarketingEmailValues = z.infer<typeof marketingEmailSchema>
export type NameValues = z.infer<typeof nameSchema>
export type RequestResetValues = z.infer<typeof requestResetSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
export type SignInValues = z.infer<typeof signInSchema>
export type ResendCodeValues = z.infer<typeof resendCodeSchema>
export type SaveAddressValues = z.infer<typeof saveAddressSchema>
export type VerifyCodeValues = z.infer<typeof verifyCodeSchema>

/**
 * Where signing in should land, given whatever the URL asked for (FR-016).
 *
 * **An unchecked `next` is how a sign-in form becomes an open redirect** — the attacker mails
 * `/sign-in?next=https://aurum-login.example`, the customer signs in on the real site, and the
 * real site hands them to the fake one already trusting it. This is the single most copied
 * vulnerability in authentication code, so the rule is a whitelist rather than a blacklist: an
 * absolute path on this origin, or nothing.
 *
 * Rejected, in order: anything not starting with `/`, which covers `https://evil.example` and
 * `javascript:`; anything starting with `//`, which is protocol-relative and resolves to another
 * host; and any backslash, because some parsers normalise `\` to `/` and `/\evil.example` has
 * been a working bypass in more than one library.
 *
 * Falls back rather than failing. A bad `next` is not the customer's fault and not worth an error
 * screen — they asked to sign in, so sign them in and take them somewhere sensible.
 */
export function safeNextPath(next: null | string | undefined): string {
  const fallback = '/account'
  if (!next) return fallback
  if (!next.startsWith('/')) return fallback
  if (next.startsWith('//')) return fallback
  if (next.includes('\\')) return fallback
  return next
}

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
