'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { revalidatePath } from 'next/cache'

import { consumeCode, issueCode, type CodeFailure } from '@/lib/auth/codes'
import { requireCustomer, requireCustomerUser, type CustomerUser } from '@/lib/auth/dal'
import { authenticateCustomer } from '@/lib/auth/login'
import { changeCustomerPassword, completePasswordReset } from '@/lib/auth/reset'
import { mintResetHandle } from '@/lib/auth/reset-handle'
import { clearSession, establishSession } from '@/lib/auth/session'
import {
  changePasswordSchema,
  createAccountSchema,
  deleteAddressSchema,
  marketingEmailSchema,
  nameSchema,
  requestResetSchema,
  resendCodeSchema,
  resetPasswordSchema,
  safeNextPath,
  saveAddressSchema,
  schemaFailure,
  signInSchema,
  verifyCodeSchema,
  type ChangePasswordValues,
  type CreateAccountValues,
  type MarketingEmailValues,
  type NameValues,
  type RequestResetValues,
  type DeleteAddressValues,
  type ResendCodeValues,
  type ResetPasswordValues,
  type SaveAddressValues,
  type SignInValues,
  type VerifyCodeValues,
} from '@/lib/auth/schemas'
import { syncMarketingContact } from '@/lib/email/marketing'
import { sendVerificationCode } from '@/lib/email/transactional'

/**
 * The server actions behind the account forms (spec 004, contracts/auth-actions.md).
 *
 * Every message below is a KEY, never a sentence — the words live in the component that renders
 * them. That keeps these functions assertable: the integration tests compare two responses to each
 * other, and `toBe('codeExpired')` does not break the day somebody rewords the sentence.
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
 * Where a successful sign-in sends the customer. Always a same-origin path — see `safeNextPath`.
 */
export interface SignInOutcome {
  next: string
}

/**
 * Sign in (FR-010 – FR-012, FR-014).
 *
 * **One message for a wrong password and for an address with no account** (FR-011). They are
 * genuinely different events and the customer is told the same thing, because a form that
 * distinguishes them answers "does this person shop here?" for anyone willing to submit a list.
 * `authenticateCustomer` reports the difference; this is the line that throws it away, and it is
 * written in one place so it cannot be half-undone later.
 *
 * **An unverified account is not a failure, it is a detour.** The customer proved they know the
 * password, so they are the owner of an abandoned registration; they get a fresh code and the
 * verify screen rather than a dead end (US2 scenario 3). This is only safe because Payload checks
 * the password first — see `authenticateCustomer` for the line numbers.
 */
export async function signIn(
  input: SignInValues & { next?: string },
): Promise<ActionResult<SignInOutcome>> {
  const parsed = signInSchema.safeParse(input)
  if (!parsed.success) {
    const { fieldErrors, message } = schemaFailure(parsed.error)
    return fail(message, fieldErrors)
  }

  const { email, password } = parsed.data
  const outcome = await authenticateCustomer({ email, password })

  if (!outcome.ok) {
    if (outcome.reason === 'locked') return fail('signInLocked')

    if (outcome.reason === 'unverified') {
      // Best effort: if the throttle refuses, the verify screen's own resend button is still there.
      await resendVerificationFor(outcome.customerId)
      return ok({ next: `/verify-email?email=${encodeURIComponent(email)}` })
    }

    return fail('signInFailed')
  }

  await establishSession(outcome.token)

  // The header and any cached shell were rendered for an anonymous visitor. Without this the
  // customer is signed in and the page still says otherwise until something else forces a refresh.
  revalidatePath('/', 'layout')

  return ok({ next: safeNextPath(input.next) })
}

/**
 * Sign out (FR-013).
 *
 * `revalidatePath` is not decoration. The session cookie is gone the moment this returns, but the
 * client router keeps rendered segments in memory — so without invalidating them, the back button
 * shows the profile it already has, populated with a signed-out customer's data. The page is not
 * *reachable* any more, which is what the cookie settles; FR-013 asks for something stronger, which
 * is that it not be *visible*.
 */
export async function signOutCustomer(): Promise<ActionResult> {
  await clearSession()
  revalidatePath('/', 'layout')
  return ok()
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

  if (purpose === 'reset-password') {
    // Identical to asking on the forgot-password screen, deliberately: one path, one behaviour,
    // one throttle. `issueResetFor` swallows both an unknown address and a refused throttle.
    await issueResetFor(email)
    return ok()
  }

  const payload = await client()
  const found = await payload.find({
    collection: 'customers',
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: email } },
  })

  const customer = found.docs[0]

  if (customer) {
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
 * A newly verified customer who ticked the consent box reaches the Resend audience here.
 *
 * **This is not where a mirror belongs, and it is here because the hook cannot reach it.**
 * `syncMarketingChoice` covers every consent change through the collection, which is the right
 * place for it — but the one moment it cannot see is verification, because `payload.verifyEmail`
 * writes `_verified` with `req.payload.db.updateOne` and runs no collection hooks
 * (`payload/dist/auth/operations/verifyEmail.js`). Without this call, a customer who consented at
 * registration would be recorded as consenting in Payload and never appear in the audience at all,
 * until the day they toggled the switch off and on again.
 *
 * **Only when they said yes.** Enrolling someone who declined — even flagged `unsubscribed` — puts
 * an address into a marketing platform on the strength of a decision to stay out of it. If they
 * later opt in, the hook syncs them then, which is the first moment there is consent to mirror.
 *
 * Failures are logged and swallowed for the same reason they are in the hook, with one addition:
 * the account is verified by this point, and refusing the customer their success screen because a
 * third party was slow would be a strange way to report that everything worked.
 */
async function enrolIfConsented(email: string): Promise<void> {
  const payload = await client()

  try {
    const { docs } = await payload.find({
      collection: 'customers',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { email: { equals: email } },
    })

    const customer = docs[0]
    if (!customer?.marketingEmail) return

    await syncMarketingContact({
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      subscribed: true,
    })
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Marketing enrolment failed after verification' })
  }
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

  await enrolIfConsented(email)

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

/**
 * Ask for a reset code (FR-017).
 *
 * **Success, always, and this is the requirement rather than a simplification.** The forgot-password
 * form is the easiest place in any application to enumerate registered addresses: submit a list,
 * read which ones came back "sent". So there is nothing here to read — an unknown address, a
 * registered one, and one whose code was refused by the throttle all produce this exact object.
 */
export async function requestPasswordReset(input: RequestResetValues): Promise<ActionResult> {
  const parsed = requestResetSchema.safeParse(input)
  if (!parsed.success) {
    const { fieldErrors, message } = schemaFailure(parsed.error)
    return fail(message, fieldErrors)
  }

  await issueResetFor(parsed.data.email)
  return ok()
}

/**
 * Mint and send a reset code, or quietly do neither.
 *
 * **`disableEmail` is deliberately not set.** Payload sends this one itself, which means
 * `forgotPassword.generateEmailHTML` runs — and that hook mints the code inside the same
 * transaction that rotates `resetPasswordToken` (see `./reset-email.ts`). Minting it out here
 * instead would put the two writes on separate connections, and a throttled second request would
 * then rotate the token while refusing to send: the code from the FIRST email would silently stop
 * working, with no message able to explain why.
 *
 * Two things are swallowed, both on purpose. `payload.forgotPassword` returns `null` for an address
 * with no account — its own comment says it "prefer[s] to fail silently" — and the hook throws when
 * the throttle refuses, which rolls the whole transaction back. Neither may reach the customer.
 */
async function issueResetFor(email: string): Promise<void> {
  const payload = await client()

  try {
    await payload.forgotPassword({ collection: 'customers', data: { email } })
  } catch (error) {
    // Logged, never returned. The caller's response must not vary.
    payload.logger.warn({ err: error, msg: 'Reset code not sent' })
  }
}

/** What step two hands to step three. Opaque to the browser — see `./reset-handle.ts`. */
export interface ResetHandleOutcome {
  handle: string
}

/**
 * Step two: the code is right, so issue a handle for the screen that sets the password (FR-018).
 *
 * **Two actions rather than one, because the design is two screens** — and the handle is what makes
 * that safe. Payload's reset token is resolved here and stays here; what crosses to the browser is
 * a signed reference to the code row, good for ten minutes. A hidden field holding the real token
 * would work identically and would put a live password-reset credential in the DOM.
 *
 * The code is spent by `consumeCode` before the handle exists, so the six digits cannot be replayed
 * — and `payload.resetPassword` retires the token as it uses it, so neither can the handle.
 */
export async function verifyResetCode(
  input: VerifyCodeValues,
): Promise<ActionResult<ResetHandleOutcome>> {
  const parsed = verifyCodeSchema.safeParse(input)
  if (!parsed.success) return fail(schemaFailure(parsed.error).message)

  const { code, email } = parsed.data
  const result = await consumeCode(email, 'reset-password', code)
  if (!result.ok) return fail(CODE_FAILURE_KEYS[result.failure])

  return ok({ handle: mintResetHandle(result.recordId) })
}

/** Where a completed reset sends the customer, already signed in. */
export interface ResetOutcome {
  next: string
}

/**
 * Step three: set the new password (FR-018, FR-021).
 *
 * Schema, session, revalidation and routing. Everything that decides whether the password actually
 * changes is in `completePasswordReset` — see that module for why the two are separated.
 *
 * **The customer ends up signed in.** `payload.resetPassword` mints a session and hands back a
 * token, so unlike the verification flow — which has no password to hand and therefore no way to
 * mint one (see `verifyEmailCode`) — there is nothing to reconstruct here. Someone who has just
 * proved they read the code and chosen a password has done strictly more than signing in requires.
 */
export async function resetPassword(
  input: ResetPasswordValues,
): Promise<ActionResult<ResetOutcome>> {
  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) {
    const { fieldErrors, message } = schemaFailure(parsed.error)
    return fail(message, fieldErrors)
  }

  const { handle, password } = parsed.data
  const outcome = await completePasswordReset({ handle, password })

  if (!outcome.ok) {
    if (outcome.reason === 'weak') {
      return fail('resetPasswordTooWeak', { password: 'resetPasswordTooWeak' })
    }
    return fail('resetSessionExpired')
  }

  if (outcome.token) await establishSession(outcome.token)
  revalidatePath('/', 'layout')

  /**
   * An unverified customer can reach this: `forgotPassword` does not check `_verified`, and the DAL
   * refuses the profile to anyone who is not. So they are sent to finish what they started rather
   * than to a page that would bounce them straight back to sign-in.
   */
  if (!outcome.verified) {
    await resendVerificationFor(outcome.customerId)
    return ok({ next: `/verify-email?email=${encodeURIComponent(outcome.email)}` })
  }

  return ok({ next: '/account' })
}

/**
 * Set the customer's first and last name (FR-024, FR-026).
 *
 * **It begins with `requireCustomer()`, and every mutating action after it does the same.** Not a
 * convention for its own sake: this is a public RPC endpoint, so "who is this?" cannot come from
 * the form. Nothing in the input names a customer — the id comes from the session and nowhere else,
 * which is what makes it impossible to write a version of this that edits somebody else's profile.
 *
 * `name` is not written here. A `beforeChange` hook recomposes it from the two halves so that
 * everything already built on the single field keeps working — see `composeCustomerName`.
 */
export async function updateName(input: NameValues): Promise<ActionResult> {
  const customer = await requireCustomer()

  const parsed = nameSchema.safeParse(input)
  if (!parsed.success) {
    const { fieldErrors, message } = schemaFailure(parsed.error)
    return fail(message, fieldErrors)
  }

  const payload = await client()
  await payload.update({
    collection: 'customers',
    data: { firstName: parsed.data.firstName, lastName: parsed.data.lastName },
    id: customer.id,
    overrideAccess: true,
  })

  /**
   * FR-024 — the row updates without a page reload.
   *
   * The profile is a Server Component, so the new name only exists once its segment is re-rendered.
   * This is the whole of it: Next returns the revalidated payload with the action's own response
   * and the router applies it.
   *
   * **The modals used to call `router.refresh()` as well, and that was wrong twice over.** It is
   * redundant — the row updates without it, which the profile and address e2e specs both assert —
   * and every extra application of the server tree is another chance to replace a dialog's inputs
   * while somebody is typing into them. That is a real defect and not a theoretical one; see the
   * `useForm` note in `src/components/account/address-modal/address-modal.tsx`.
   */
  revalidatePath('/account')

  return ok()
}

/**
 * Change the password while signed in (FR-020, FR-021).
 *
 * Schema, session and revalidation; everything that decides whether the password changes is in
 * `changeCustomerPassword`, for the same reason the reset flow is split that way.
 *
 * **The customer stays signed in on THIS device and nowhere else.** The action replaces their
 * cookie with the session minted against the new password, and the core has already discarded every
 * other one — so a change made because somebody else had the old password ends that person's access
 * in the same breath, which is the whole point of FR-021.
 */
export async function changePassword(input: ChangePasswordValues): Promise<ActionResult> {
  const customer = await requireCustomer()

  const parsed = changePasswordSchema.safeParse(input)
  if (!parsed.success) {
    const { fieldErrors, message } = schemaFailure(parsed.error)
    return fail(message, fieldErrors)
  }

  const outcome = await changeCustomerPassword({
    currentPassword: parsed.data.currentPassword,
    customerId: customer.id,
    newPassword: parsed.data.newPassword,
  })

  if (!outcome.ok) {
    if (outcome.reason === 'locked') return fail('signInLocked')
    if (outcome.reason === 'weak') {
      return fail('changePasswordTooWeak', { newPassword: 'changePasswordTooWeak' })
    }
    // Against the field it concerns, so the customer is not left hunting for which of three boxes
    // the complaint is about.
    return fail('changePasswordWrong', { currentPassword: 'changePasswordWrong' })
  }

  if (outcome.token) await establishSession(outcome.token)
  revalidatePath('/account')

  return ok()
}

/**
 * The customer's own addresses, and the two checks that keep them theirs (FR-032, SC-007).
 *
 * Every write below carries a client-supplied id, which is the whole reason this reads the way it
 * does. Two things stand between that id and another customer's row:
 *
 *  1. **This module re-reads it**, scoped to the signed-in customer, and refuses anything the query
 *     does not return. That is the check you can see.
 *  2. **The write runs as the customer**, `overrideAccess: false` with their own user, so the
 *     addresses collection's `isDocumentOwner` rule runs too. That is the check that keeps working
 *     when somebody edits this file, adds a second caller, or forgets the first one.
 *
 * Either alone would pass a test. Both is the right number for an identifier that arrives over the
 * wire, and it costs one query.
 */
async function ownedAddress(user: CustomerUser, id: number): Promise<null | { id: number }> {
  const payload = await client()

  const { docs } = await payload.find({
    collection: 'addresses',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    user,
    where: { id: { equals: id } },
  })

  return docs[0] ? { id: docs[0].id } : null
}

/**
 * Blank optional fields are stored as null, not as `''` (FR-027).
 *
 * The form always renders both optional boxes, so an untouched one submits an empty string. Letting
 * that through would fill the column with values that are neither absent nor present, and every
 * reader downstream would then need `?? ''` alongside its `?? null` — the same bug the DTO in
 * `src/lib/addresses.ts` exists to prevent.
 */
const blankToNull = (value: string): null | string => (value === '' ? null : value)

/**
 * Create or update one address (FR-027 – FR-031).
 *
 * **`isDefault` is passed through and then overruled by the collection.** `src/fields/address-hooks.ts`
 * owns FR-031, because a form is only one of the writers — the admin panel and a future checkout
 * are two more, and an invariant enforced in a form holds until the second writer appears. The
 * customer's first address becomes the default whether or not they ticked the box, and ticking it
 * on a second address clears the first.
 *
 * **`customer` is not set here.** The plugin's own `beforeChange` assigns ownership from
 * `req.user`, which is exactly why the create runs as the customer rather than with
 * `overrideAccess`. Sending a `customer` of our own would be a second answer to a question that
 * already has one.
 */
export async function saveAddress(input: SaveAddressValues): Promise<ActionResult> {
  const user = await requireCustomerUser()

  const parsed = saveAddressSchema.safeParse(input)
  if (!parsed.success) {
    const { fieldErrors, message } = schemaFailure(parsed.error)
    return fail(message, fieldErrors)
  }

  const { id, ...values } = parsed.data
  const data = {
    ...values,
    addressLine2: blankToNull(values.addressLine2),
    apartment: blankToNull(values.apartment),
  }

  const payload = await client()

  if (id === undefined) {
    await payload.create({ collection: 'addresses', data, overrideAccess: false, user })
  } else {
    const owned = await ownedAddress(user, id)
    if (!owned) return fail('addressNotFound')

    await payload.update({ collection: 'addresses', data, id, overrideAccess: false, user })
  }

  revalidatePath('/account')

  return ok()
}

/**
 * Remove one address (FR-029, FR-031).
 *
 * The confirmation the requirement asks for is the modal's, not this function's. An action that
 * demanded a second "yes, really" parameter would be a confirmation an attacker sends twice, and it
 * would put a question about the interface into the part of the system that cannot see one.
 *
 * If the deleted address was the default, `promoteDefaultAfterDelete` gives the role to another —
 * again in the collection, so it also holds for a deletion made from the admin panel.
 */
export async function deleteAddress(input: DeleteAddressValues): Promise<ActionResult> {
  const user = await requireCustomerUser()

  const parsed = deleteAddressSchema.safeParse(input)
  if (!parsed.success) {
    const { fieldErrors, message } = schemaFailure(parsed.error)
    return fail(message, fieldErrors)
  }

  const owned = await ownedAddress(user, parsed.data.id)
  if (!owned) return fail('addressNotFound')

  const payload = await client()
  await payload.delete({ collection: 'addresses', id: owned.id, overrideAccess: false, user })

  revalidatePath('/account')

  return ok()
}

/**
 * Turn marketing email on or off (FR-033, FR-034, FR-036).
 *
 * **It writes one field, and that is the whole of the action.** The timestamp and the source are
 * `stampMarketingConsent`'s, computed from the change actually being made; the mirror into Resend is
 * `syncMarketingChoice`'s. Both are collection hooks rather than lines in this function, so the
 * admin panel gets the same behaviour without this code being reachable from it.
 *
 * **`overrideAccess: true` with the id from the session, like every other profile action here.** The
 * collection's own `update` rule already narrows a customer to `{ id: { equals: req.user.id } }`, so
 * either route reaches one row; taking the id from `requireCustomer()` and nowhere near the input is
 * what makes a version of this that edits somebody else's preference unwriteable rather than merely
 * refused.
 */
export async function setMarketingEmail(input: MarketingEmailValues): Promise<ActionResult> {
  const customer = await requireCustomer()

  const parsed = marketingEmailSchema.safeParse(input)
  if (!parsed.success) {
    const { fieldErrors, message } = schemaFailure(parsed.error)
    return fail(message, fieldErrors)
  }

  const payload = await client()
  await payload.update({
    collection: 'customers',
    data: { marketingEmail: parsed.data.subscribed },
    id: customer.id,
    overrideAccess: true,
  })

  // The row is server-rendered from `getCustomer()`, so the switch's stored position comes back
  // with this response. See the note in `updateName` for why there is no `router.refresh()`.
  revalidatePath('/account')

  return ok()
}
