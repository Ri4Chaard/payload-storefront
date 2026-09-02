import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { registerCustomer } from '@/lib/auth/actions'
import { authenticateCustomer } from '@/lib/auth/login'
import { LOGIN_MAX_ATTEMPTS } from '@/lib/auth/config'
import { safeNextPath } from '@/lib/auth/schemas'
import type { CreateAccountValues } from '@/lib/auth/schemas'

/**
 * US2 — sign in (spec 004, FR-010 – FR-014).
 *
 * **`authenticateCustomer` rather than the `signIn` action**, because `signIn` writes a session
 * cookie and `cookies()` needs a request that does not exist here. The seam exists precisely so
 * these assertions have somewhere to live — see `src/lib/auth/login.ts`.
 *
 * The assertion that matters most is the one comparing two failures to each other. FR-011 is not
 * "return a vague message"; it is "return the SAME message", and a test that checks each response
 * against its own expectation passes happily while the two drift apart.
 */

const payload = await getPayload({ config })

const PASSWORD = 'a-long-enough-password'

const fresh = () =>
  `us2-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@us2.aurum-testing.dev`

const credentials = (over: Partial<CreateAccountValues> = {}): CreateAccountValues => ({
  confirmPassword: PASSWORD,
  email: fresh(),
  marketingConsent: false,
  password: PASSWORD,
  ...over,
})

/** Registers and marks verified, which is the state every sign-in test starts from. */
async function verifiedCustomer(): Promise<string> {
  const email = fresh()
  await registerCustomer(credentials({ email }))
  await payload.update({
    collection: 'customers',
    data: { _verified: true },
    overrideAccess: true,
    where: { email: { equals: email } },
  })
  return email
}

afterAll(async () => {
  await payload.delete({
    collection: 'verification-codes',
    overrideAccess: true,
    where: { email: { like: '@us2.aurum-testing.dev' } },
  })
  await payload.delete({
    collection: 'customers',
    overrideAccess: true,
    where: { email: { like: '@us2.aurum-testing.dev' } },
  })
})

describe('authenticateCustomer', () => {
  it('signs in a verified customer and returns a token', async () => {
    const email = await verifiedCustomer()
    const outcome = await authenticateCustomer({ email, password: PASSWORD })

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.token).toBeTruthy()
    expect(outcome.customerId).toBeTypeOf('number')
  })

  /** FR-011. The two failures are compared to each other, not to a fixture. */
  it('answers a wrong password exactly as it answers an unknown address', async () => {
    const email = await verifiedCustomer()

    const wrongPassword = await authenticateCustomer({ email, password: 'not-the-password' })
    const unknownAddress = await authenticateCustomer({
      email: fresh(),
      password: 'not-the-password',
    })

    expect(wrongPassword).toEqual(unknownAddress)
    expect(wrongPassword.ok).toBe(false)
  })

  it('never reflects the password back in the outcome', async () => {
    const email = await verifiedCustomer()
    const outcome = await authenticateCustomer({ email, password: PASSWORD })
    expect(JSON.stringify(outcome)).not.toContain(PASSWORD)
  })

  /**
   * FR-014. Payload counts the attempts and applies the lock; this proves the collection is wired
   * to do it and that the outcome is distinguishable from an ordinary failure — a customer locked
   * out needs to be told to wait rather than to keep guessing.
   */
  it('locks the account after too many failures, and says so', async () => {
    const email = await verifiedCustomer()

    for (let attempt = 0; attempt < LOGIN_MAX_ATTEMPTS; attempt += 1) {
      await authenticateCustomer({ email, password: `wrong-${attempt}` })
    }

    const locked = await authenticateCustomer({ email, password: PASSWORD })
    expect(locked.ok).toBe(false)
    if (locked.ok) return
    expect(locked.reason, 'the correct password must not open a locked account').toBe('locked')
  })

  /**
   * US2 scenario 3. An unverified account is reported separately so the customer can be sent to the
   * verify screen — and it is safe to do so only because Payload checks the password FIRST. If it
   * did not, this branch would tell an attacker which addresses are registered.
   */
  it('reports an unverified account, but only for the right password', async () => {
    const email = fresh()
    await registerCustomer(credentials({ email }))

    const wrong = await authenticateCustomer({ email, password: 'not-the-password' })
    expect(wrong.ok).toBe(false)
    if (wrong.ok) return
    expect(wrong.reason, 'an unverified account must not be revealed by a wrong password').toBe(
      'invalid',
    )

    const right = await authenticateCustomer({ email, password: PASSWORD })
    expect(right.ok).toBe(false)
    if (right.ok) return
    expect(right.reason).toBe('unverified')
  })
})

/**
 * An unchecked `next` is how a sign-in form becomes an open redirect, so it gets its own tests
 * rather than being taken on trust from the one line that implements it.
 */
describe('safeNextPath', () => {
  it('keeps a same-origin path', () => {
    expect(safeNextPath('/account')).toBe('/account')
    expect(safeNextPath('/account/addresses?added=1')).toBe('/account/addresses?added=1')
  })

  it('refuses anything that leaves this origin', () => {
    expect(safeNextPath('https://evil.example/harvest')).toBe('/account')
    // Protocol-relative: the browser reads this as another host, not as a path.
    expect(safeNextPath('//evil.example')).toBe('/account')
    // Backslashes, because more than one parser normalises them to forward slashes.
    expect(safeNextPath('/\\evil.example')).toBe('/account')
    expect(safeNextPath('javascript:alert(1)')).toBe('/account')
  })

  it('falls back when there is nothing to go on', () => {
    expect(safeNextPath(undefined)).toBe('/account')
    expect(safeNextPath(null)).toBe('/account')
    expect(safeNextPath('')).toBe('/account')
  })
})
