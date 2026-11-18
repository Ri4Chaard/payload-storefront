import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { registerCustomer, requestPasswordReset, verifyResetCode } from '@/lib/auth/actions'
import { issueCode } from '@/lib/auth/codes'
import { authenticateCustomer } from '@/lib/auth/login'
import { completePasswordReset } from '@/lib/auth/reset'
import { mintResetHandle, openResetHandle } from '@/lib/auth/reset-handle'
import { RESET_HANDLE_TTL_MS } from '@/lib/auth/config'
import type { CreateAccountValues } from '@/lib/auth/schemas'

/**
 * US3 — recover a forgotten password.
 *
 * **`completePasswordReset` rather than the `resetPassword` action**, for the same reason US2 tests
 * `authenticateCustomer`: the action writes a session cookie, and `cookies()` needs a request that
 * does not exist here. The seam exists so these assertions have somewhere to live.
 *
 * The two assertions worth reading first are the FR-017 pair — an unregistered address answered
 * identically to a registered one, compared to EACH OTHER rather than each to its own expectation —
 * and contract C6, that a verification code cannot be spent on a password reset. Both would pass a
 * casual reading of the implementation and neither is guaranteed by it.
 */

const payload = await getPayload({ config })

const PASSWORD = 'a-long-enough-password'
const NEW_PASSWORD = 'an-entirely-different-one'

const fresh = () =>
  `us3-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@us3.aurum-testing.dev`

const credentials = (over: Partial<CreateAccountValues> = {}): CreateAccountValues => ({
  confirmPassword: PASSWORD,
  email: fresh(),
  marketingConsent: false,
  password: PASSWORD,
  ...over,
})

/**
 * Registered and verified — the state a customer is in when they forget their password.
 *
 * **Created through the Local API rather than `registerCustomer`, and `disableVerificationEmail`
 * is the reason.** The code throttle is per ADDRESS across both purposes (see `issueCode`), so a
 * registration a second earlier puts the reset request inside the verification code's cooldown and
 * nothing is sent. That is the designed behaviour and it is right — sixty seconds is the whole of
 * it, and a real customer registers and forgets their password on different days — but it makes
 * registering an unusable way to build a fixture. The one test that genuinely needs a
 * registration-minted verification code (contract C6) still registers.
 */
async function verifiedCustomer(): Promise<string> {
  const email = fresh()

  await payload.create({
    collection: 'customers',
    data: { email, marketingEmail: false, password: PASSWORD },
    disableVerificationEmail: true,
    overrideAccess: true,
  })

  await payload.update({
    collection: 'customers',
    data: { _verified: true },
    overrideAccess: true,
    where: { email: { equals: email } },
  })

  return email
}

/**
 * The code that was mailed, read back the only way anything can read it.
 *
 * Codes are stored as a keyed hash, so the row cannot be decoded — the test mints a fresh one
 * against the same Payload token instead, which is exactly what the resend path does. The throttle
 * is bypassed because the send a moment ago started its cooldown, and waiting sixty seconds per
 * assertion is not a test suite.
 */
async function resetCodeFor(email: string): Promise<string> {
  const found = await payload.find({
    collection: 'verification-codes',
    limit: 1,
    overrideAccess: true,
    sort: '-createdAt',
    where: { and: [{ email: { equals: email } }, { purpose: { equals: 'reset-password' } }] },
  })

  const token = found.docs[0]?.token
  if (!token) throw new Error(`no reset code was issued for ${email}`)

  const issued = await issueCode(email, 'reset-password', token, { bypassThrottle: true })
  if (!issued.ok) throw new Error('could not mint a reset code')
  return issued.code
}

/** Requests a reset, then returns a live handle for the code it produced. */
async function handleFor(email: string): Promise<string> {
  await requestPasswordReset({ email })
  const result = await verifyResetCode({ code: await resetCodeFor(email), email })

  if (result.status !== 'success' || !result.data) throw new Error('the code was refused')
  return result.data.handle
}

afterAll(async () => {
  await payload.delete({
    collection: 'verification-codes',
    overrideAccess: true,
    where: { email: { like: '@us3.aurum-testing.dev' } },
  })
  await payload.delete({
    collection: 'customers',
    overrideAccess: true,
    where: { email: { like: '@us3.aurum-testing.dev' } },
  })
})

describe('requestPasswordReset', () => {
  /**
   * FR-017 and scenario 2. Compared to each other, not to a fixture: a test that checks each
   * response against its own expectation passes happily while the two drift apart, and the drift is
   * the vulnerability.
   */
  it('answers an unregistered address exactly as it answers a registered one', async () => {
    const registered = await verifiedCustomer()

    const known = await requestPasswordReset({ email: registered })
    const unknown = await requestPasswordReset({ email: fresh() })

    expect(known).toEqual(unknown)
    expect(known.status).toBe('success')
  })

  /** Scenario 1. The identical response above is only acceptable if a code really was sent. */
  it('issues a reset code for a registered address', async () => {
    const email = await verifiedCustomer()
    await requestPasswordReset({ email })

    const codes = await payload.find({
      collection: 'verification-codes',
      overrideAccess: true,
      where: { and: [{ email: { equals: email } }, { purpose: { equals: 'reset-password' } }] },
    })

    expect(codes.totalDocs).toBe(1)
  })

  /** …and none for an address with no account, however encouraging the response was. */
  it('issues nothing for an unregistered address', async () => {
    const email = fresh()
    await requestPasswordReset({ email })

    const codes = await payload.find({
      collection: 'verification-codes',
      overrideAccess: true,
      where: { email: { equals: email } },
    })

    expect(codes.totalDocs).toBe(0)
  })
})

describe('verifyResetCode', () => {
  /** Scenario 3. */
  it('refuses a wrong code and issues no handle', async () => {
    const email = await verifiedCustomer()
    await requestPasswordReset({ email })

    const right = await resetCodeFor(email)
    const wrong = right === '000000' ? '111111' : '000000'

    const result = await verifyResetCode({ code: wrong, email })
    expect(result.status).toBe('error')
    if (result.status !== 'error') return
    expect(result.message).toBe('codeInvalid')
  })

  /** Scenario 4. */
  it('accepts the right code and returns a handle', async () => {
    const email = await verifiedCustomer()
    const handle = await handleFor(email)

    expect(handle).toBeTruthy()
    expect(openResetHandle(handle).ok).toBe(true)
  })

  /** Scenario 6, and the reason `consumeCode` distinguishes its failures at all. */
  it('refuses a code that has already been spent, and says which', async () => {
    const email = await verifiedCustomer()
    await requestPasswordReset({ email })

    const code = await resetCodeFor(email)
    const first = await verifyResetCode({ code, email })
    expect(first.status).toBe('success')

    const second = await verifyResetCode({ code, email })
    expect(second.status).toBe('error')
    if (second.status !== 'error') return
    expect(second.message).toBe('codeAlreadyUsed')
  })
})

describe('completePasswordReset', () => {
  /** Scenario 5, both halves: the new password works and the old one stops. */
  it('changes the password, and the old one no longer signs in', async () => {
    const email = await verifiedCustomer()
    const handle = await handleFor(email)

    const outcome = await completePasswordReset({ handle, password: NEW_PASSWORD })
    expect(outcome.ok).toBe(true)

    const withNew = await authenticateCustomer({ email, password: NEW_PASSWORD })
    expect(withNew.ok, 'the new password must sign in').toBe(true)

    const withOld = await authenticateCustomer({ email, password: PASSWORD })
    expect(withOld.ok, 'the old password must not').toBe(false)
  })

  /**
   * FR-021. A reset is what somebody does after losing control of their account, so a session that
   * was already open must not survive it — otherwise the flow returns the account to its owner and
   * leaves the other party signed in.
   */
  it('ends every other session', async () => {
    const email = await verifiedCustomer()

    // Two sessions, as though the customer were signed in on a phone and a laptop.
    await authenticateCustomer({ email, password: PASSWORD })
    await authenticateCustomer({ email, password: PASSWORD })

    const before = await payload.find({
      collection: 'customers',
      limit: 1,
      overrideAccess: true,
      where: { email: { equals: email } },
    })
    const sessionsBefore = (before.docs[0] as { sessions?: unknown[] } | undefined)?.sessions ?? []
    expect(sessionsBefore.length, 'the fixture needs sessions to revoke').toBeGreaterThan(1)

    const handle = await handleFor(email)
    const outcome = await completePasswordReset({ handle, password: NEW_PASSWORD })
    expect(outcome.ok).toBe(true)

    const after = await payload.find({
      collection: 'customers',
      limit: 1,
      overrideAccess: true,
      where: { email: { equals: email } },
    })
    const sessionsAfter = (after.docs[0] as { sessions?: unknown[] } | undefined)?.sessions ?? []

    // Exactly one: the session the reset itself minted, which is the customer's current one.
    expect(sessionsAfter).toHaveLength(1)
  })

  /** A handle is single-use because the token it points at is. Replay must not set a password. */
  it('refuses a handle that has already been spent', async () => {
    const email = await verifiedCustomer()
    const handle = await handleFor(email)

    expect((await completePasswordReset({ handle, password: NEW_PASSWORD })).ok).toBe(true)

    const replay = await completePasswordReset({ handle, password: 'yet-another-password' })
    expect(replay.ok).toBe(false)
    if (replay.ok) return
    expect(replay.reason).toBe('expired')

    // …and the password is still the one set by the first call.
    expect((await authenticateCustomer({ email, password: NEW_PASSWORD })).ok).toBe(true)
  })

  /**
   * **Contract C6 — a verification code can never complete a password reset.**
   *
   * A handle is a row id and a signature, so a customer holding a legitimately signed handle from
   * their own registration could point it at their verification code row. Without the purpose check
   * in `tokenForCode` that row's token would resolve, and `payload.resetPassword` cannot tell a
   * verification token from a reset one. Nothing else in the system catches this.
   */
  it('refuses a handle minted from a verification code', async () => {
    const email = fresh()
    await registerCustomer(credentials({ email }))

    const verification = await payload.find({
      collection: 'verification-codes',
      limit: 1,
      overrideAccess: true,
      where: { and: [{ email: { equals: email } }, { purpose: { equals: 'verify-email' } }] },
    })

    const row = verification.docs[0]
    expect(row, 'registration must have minted a verification code').toBeTruthy()
    if (!row) return

    const outcome = await completePasswordReset({
      handle: mintResetHandle(row.id),
      password: NEW_PASSWORD,
    })

    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.reason).toBe('expired')
  })

  /** The weak-password rule is applied against the account's OWN address, not a submitted one. */
  it('refuses a password that is the customer’s own email address', async () => {
    const email = await verifiedCustomer()
    const handle = await handleFor(email)

    const outcome = await completePasswordReset({ handle, password: email })
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.reason).toBe('weak')

    // Refused, and the handle survives so the customer can simply try a better password.
    expect((await completePasswordReset({ handle, password: NEW_PASSWORD })).ok).toBe(true)
  })
})

/**
 * The handle is the one part of this flow with no Payload behind it, so it is checked directly:
 * what the browser holds must be unforgeable and must expire.
 */
describe('reset handles', () => {
  it('round-trips a row id', () => {
    const opened = openResetHandle(mintResetHandle(4242))
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.recordId).toBe(4242)
  })

  it('refuses a handle whose row id was edited', () => {
    const handle = mintResetHandle(1)
    const [, expiry, signature] = handle.split('.')
    // Someone else's row, the original expiry, the original signature.
    expect(openResetHandle(`999.${expiry}.${signature}`).ok).toBe(false)
  })

  it('refuses a handle whose expiry was extended', () => {
    const handle = mintResetHandle(1)
    const [id, , signature] = handle.split('.')
    expect(openResetHandle(`${id}.${Date.now() + 86_400_000}.${signature}`).ok).toBe(false)
  })

  it('refuses nonsense without throwing', () => {
    expect(openResetHandle('').ok).toBe(false)
    expect(openResetHandle('1.2').ok).toBe(false)
    expect(openResetHandle('1.2.3').ok).toBe(false)
    // A short signature: `timingSafeEqual` throws on a length mismatch rather than returning false.
    expect(openResetHandle('1.2.ab').ok).toBe(false)
  })

  it('expires', () => {
    const minted = mintResetHandle(1, 0)
    expect(openResetHandle(minted, RESET_HANDLE_TTL_MS - 1).ok).toBe(true)
    expect(openResetHandle(minted, RESET_HANDLE_TTL_MS + 1).ok).toBe(false)
  })
})
