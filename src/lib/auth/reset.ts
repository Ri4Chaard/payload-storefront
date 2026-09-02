import config from '@payload-config'
import { getPayload } from 'payload'

import { tokenForCode } from '@/lib/auth/codes'
import { authenticateCustomer } from '@/lib/auth/login'
import { checkPassword } from '@/lib/auth/password'
import { openResetHandle } from '@/lib/auth/reset-handle'
import { sendPasswordChangedNotice } from '@/lib/email/transactional'

/**
 * Setting a customer's password — by reset, or by changing it while signed in — with no reference
 * to cookies or to Next (spec 004, US3 and US7).
 *
 * **Deliberately not inside `'use server'`**, exactly as `./login.ts` is not. Two reasons, and the
 * second is the load-bearing one. Every export of a `'use server'` module is a public RPC endpoint,
 * so what lives there should be the smallest surface that does the job; and a module that writes a
 * session cookie cannot be called from a test, because `cookies()` needs a request that a test
 * runner does not have. The assertions that matter most for this flow — that the old password stops
 * working, that other sessions end, that a verification code cannot be spent on a reset — need
 * somewhere to live, and this is it.
 *
 * `resetPassword` in `./actions.ts` is the thin wrapper: schema, session, revalidation, routing.
 */

const client = () => getPayload({ config })

/**
 * Named `ResetResult`, not `ResetOutcome`: `actions.ts` already exports a `ResetOutcome`, and that
 * one is the redirect the browser gets. Two types a letter apart in modules that import each other
 * is a bug waiting for a tired afternoon.
 */
export type ResetResult =
  | { customerId: number; email: string; ok: true; token: string | undefined; verified: boolean }
  | { ok: false; reason: 'expired' | 'weak' }

export interface ResetInput {
  handle: string
  password: string
}

/**
 * Turn a handle plus a password into a changed password.
 *
 * The order below is the whole of it, and each step exists because skipping it breaks something:
 *
 *  1. **Open the handle.** Signed, so it cannot be forged; short-lived, so a tab left open
 *     overnight is not a way in.
 *  2. **Resolve the row, checking `purpose`.** A handle is a row id and a signature. Without the
 *     purpose check a handle minted from a *verification* code would resolve to a verification
 *     token, and `payload.resetPassword` cannot tell the two apart (contract C6).
 *  3. **Find whose token it is, and judge the password against THAT address.** The browser submits
 *     an email so it can run the same check locally; anything can call the action with any address,
 *     so the one that counts is the one on the account being changed.
 *  4. **Reset**, which retires the token as it uses it — so neither the code nor the handle can be
 *     replayed.
 *  5. **Revoke the other sessions** (FR-021), then tell the customer (FR-035).
 */
export async function completePasswordReset({ handle, password }: ResetInput): Promise<ResetResult> {
  const opened = openResetHandle(handle)
  if (!opened.ok) return { ok: false, reason: 'expired' }

  const token = await tokenForCode(opened.recordId, 'reset-password')
  if (!token) return { ok: false, reason: 'expired' }

  const payload = await client()

  const holder = await payload.find({
    collection: 'customers',
    limit: 1,
    overrideAccess: true,
    where: { resetPasswordToken: { equals: token } },
  })

  const customer = holder.docs[0]
  if (!customer) return { ok: false, reason: 'expired' }

  if (!checkPassword(password, customer.email).ok) return { ok: false, reason: 'weak' }

  let issued: string | undefined
  try {
    const result = await payload.resetPassword({
      collection: 'customers',
      data: { password, token },
      overrideAccess: true,
    })
    issued = result.token
  } catch {
    // Payload refuses an expired or already-spent token with a `Forbidden`. From the customer's
    // side that is the same situation as a handle that timed out, so it reads the same.
    return { ok: false, reason: 'expired' }
  }

  await endOtherSessions(customer.id, issued)

  // Never gated on the marketing preference (FR-035) — it is how somebody finds out their account
  // was taken. A failed send is logged rather than thrown: the password HAS changed by now, and
  // reporting failure to the person who just changed it would be a lie.
  await sendPasswordChangedNotice(customer.email)

  return {
    customerId: customer.id,
    email: customer.email,
    ok: true,
    token: issued,
    verified: customer._verified === true,
  }
}

/**
 * Revoke every session except the one just minted (FR-021).
 *
 * A password reset is what somebody does after losing control of their account, so leaving the
 * other party's session live would defeat the entire exercise. Payload does not do this itself:
 * `resetPassword` calls `addSessionToUser`, which appends.
 *
 * **The session to keep is read from the JWT's own `sid` claim**, not taken as the newest row. Two
 * sessions created in the same millisecond sort arbitrarily, and the cost of guessing wrong is
 * signing out the customer who has just this moment reset their password.
 *
 * Written through `payload.db` because that is how Payload's own `addSessionToUser` and
 * `revokeSession` write this field — it carries `access.update: () => false` — and because the raw
 * document is the one that still has the hash and salt on it. Writing a sanitised document back
 * would blank the password that was the point of the exercise.
 */
async function endOtherSessions(customerId: number, token: string | undefined): Promise<void> {
  const keep = token ? sessionIdFrom(token) : undefined
  const payload = await client()

  const raw = (await payload.db.findOne({
    collection: 'customers',
    where: { id: { equals: customerId } },
  })) as null | { sessions?: { id: string }[] }

  if (!raw) return

  raw.sessions = (raw.sessions ?? []).filter((session) => session.id === keep)

  await payload.db.updateOne({
    collection: 'customers',
    data: raw,
    id: customerId,
    returning: false,
  })
}

/**
 * The `sid` claim out of a token we just minted.
 *
 * Read rather than verified, deliberately: it came from `payload.resetPassword` a few lines ago and
 * has not been anywhere. Verifying a signature we produced ourselves would prove nothing and would
 * mean reaching past Payload's export map for its JWT internals.
 */
function sessionIdFrom(token: string): string | undefined {
  const claims = token.split('.')[1]
  if (!claims) return undefined

  try {
    const decoded = JSON.parse(Buffer.from(claims, 'base64url').toString('utf8')) as { sid?: string }
    return decoded.sid
  } catch {
    return undefined
  }
}


export type ChangeResult =
  | { customerId: number; ok: true; token: string | undefined }
  | { ok: false; reason: 'locked' | 'weak' | 'wrong-password' }

/**
 * Change the password of a customer who is already signed in (FR-020, FR-021).
 *
 * **The current password is proved by signing in with it**, because Payload offers no "is this the
 * password?" call and hand-rolling one would mean reaching past its export map for the hashing
 * strategy. `login` is the supported way to ask, so it is the way this asks — and it brings the
 * lockout counter with it, which is the right behaviour anyway: somebody sitting at a borrowed
 * screen guessing at this form should hit the same wall they would hit at the sign-in screen.
 *
 * **It signs in twice, and the second one is the point.** `payload.login` mints a session each
 * time, so verifying leaves a spare one behind; logging in again with the NEW password produces the
 * token this device will carry, and `endOtherSessions` then keeps that one and discards everything
 * else — the spare, the old sessions on other devices, and whoever prompted the change in the first
 * place. Two password verifications for an operation a customer performs once in a year is not a
 * cost worth optimising against the alternative, which is reading the current session's `sid` out
 * of a cookie this module deliberately cannot see.
 */
export async function changeCustomerPassword({
  currentPassword,
  customerId,
  newPassword,
}: {
  currentPassword: string
  customerId: number
  newPassword: string
}): Promise<ChangeResult> {
  const payload = await client()

  const customer = await payload.findByID({
    collection: 'customers',
    id: customerId,
    overrideAccess: true,
  })

  const proof = await authenticateCustomer({ email: customer.email, password: currentPassword })

  if (!proof.ok) {
    // `unverified` cannot reach here — the caller required a verified session to get this far — and
    // if it somehow did, refusing as a wrong password is the safe reading.
    return { ok: false, reason: proof.reason === 'locked' ? 'locked' : 'wrong-password' }
  }

  // The authoritative check. The form has no email on it, so this is the only place the rule that
  // a password may not BE the customer's address can be applied.
  if (!checkPassword(newPassword, customer.email).ok) return { ok: false, reason: 'weak' }

  await payload.update({
    collection: 'customers',
    data: { password: newPassword },
    id: customerId,
    overrideAccess: true,
  })

  const renewed = await authenticateCustomer({ email: customer.email, password: newPassword })
  const token = renewed.ok ? renewed.token : undefined

  // FR-021 — everything else signed in as this customer stops being signed in, including the
  // session the verification above minted.
  await endOtherSessions(customerId, token)

  await sendPasswordChangedNotice(customer.email)

  return { customerId, ok: true, token }
}
