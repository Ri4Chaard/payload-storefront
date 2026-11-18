import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { authenticateCustomer } from '@/lib/auth/login'
import { changeCustomerPassword } from '@/lib/auth/reset'
import { changePasswordSchema } from '@/lib/auth/schemas'

/**
 * US7 — change the password while signed in.
 *
 * `changeCustomerPassword` rather than the `changePassword` action, for the reason US2, US3 and US4
 * all record: the action writes a session cookie, and `cookies()` needs a request that does not
 * exist here. The seam is where the assertions live.
 *
 * The one worth reading first is the session count. Changing a password is what somebody does after
 * discovering that another person has it, so "the old sessions end" is the requirement rather than
 * a tidy-up — and the version of this that verifies the current password by signing in leaves a
 * spare session behind, which is exactly the kind of thing that passes a manual test and fails a
 * count.
 */

const payload = await getPayload({ config })

const CURRENT = 'a-long-enough-password'
const NEXT = 'an-entirely-different-one'

const fresh = () =>
  `us7-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@us7.aurum-testing.dev`

async function verifiedCustomer(): Promise<{ email: string; id: number }> {
  const email = fresh()
  const created = await payload.create({
    collection: 'customers',
    data: { email, password: CURRENT },
    disableVerificationEmail: true,
    overrideAccess: true,
  })
  await payload.update({
    collection: 'customers',
    data: { _verified: true },
    id: created.id,
    overrideAccess: true,
  })
  return { email, id: created.id }
}

const sessionCount = async (id: number): Promise<number> => {
  const doc = await payload.findByID({ collection: 'customers', id, overrideAccess: true })
  return ((doc as { sessions?: unknown[] }).sessions ?? []).length
}

afterAll(async () => {
  await payload.delete({
    collection: 'customers',
    overrideAccess: true,
    where: { email: { like: '@us7.aurum-testing.dev' } },
  })
})

describe('changeCustomerPassword', () => {
  it('changes the password, and the old one stops working', async () => {
    const { email, id } = await verifiedCustomer()

    const outcome = await changeCustomerPassword({
      currentPassword: CURRENT,
      customerId: id,
      newPassword: NEXT,
    })

    expect(outcome.ok).toBe(true)
    expect((await authenticateCustomer({ email, password: NEXT })).ok).toBe(true)
    expect((await authenticateCustomer({ email, password: CURRENT })).ok).toBe(false)
  })

  /** FR-020 — the current password is the gate, and a wrong one changes nothing. */
  it('refuses a wrong current password and leaves the password alone', async () => {
    const { email, id } = await verifiedCustomer()

    const outcome = await changeCustomerPassword({
      currentPassword: 'not-the-password',
      customerId: id,
      newPassword: NEXT,
    })

    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.reason).toBe('wrong-password')

    expect((await authenticateCustomer({ email, password: CURRENT })).ok).toBe(true)
    expect((await authenticateCustomer({ email, password: NEXT })).ok).toBe(false)
  })

  /**
   * FR-021, and the assertion that catches the spare session.
   *
   * Verifying the current password signs in, which mints one; so does logging back in with the new
   * password. A version of this that only removed the OTHER devices' sessions would leave three
   * behind and still look correct from the customer's chair.
   */
  it('leaves exactly one session — the device that made the change', async () => {
    const { email, id } = await verifiedCustomer()

    // Two other devices, as though the customer were signed in on a phone and a laptop.
    await authenticateCustomer({ email, password: CURRENT })
    await authenticateCustomer({ email, password: CURRENT })
    expect(await sessionCount(id), 'the fixture needs sessions to revoke').toBeGreaterThan(1)

    const outcome = await changeCustomerPassword({
      currentPassword: CURRENT,
      customerId: id,
      newPassword: NEXT,
    })
    expect(outcome.ok).toBe(true)

    expect(await sessionCount(id)).toBe(1)
  })

  /** The password rule that needs the address, applied against the account being changed. */
  it('refuses a new password that is the customer’s own email address', async () => {
    const { email, id } = await verifiedCustomer()

    const outcome = await changeCustomerPassword({
      currentPassword: CURRENT,
      customerId: id,
      newPassword: email,
    })

    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.reason).toBe('weak')
    expect((await authenticateCustomer({ email, password: CURRENT })).ok).toBe(true)
  })
})

describe('changePasswordSchema', () => {
  it('reports a mismatch against the confirmation, and only that', () => {
    const parsed = changePasswordSchema.safeParse({
      confirmPassword: 'something-else-entirely',
      currentPassword: CURRENT,
      newPassword: NEXT,
    })

    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues).toHaveLength(1)
    expect(parsed.error.issues[0]?.message).toBe('changePasswordMismatch')
    expect(parsed.error.issues[0]?.path).toEqual(['confirmPassword'])
  })

  it('refuses a new password too short to be one', () => {
    const parsed = changePasswordSchema.safeParse({
      confirmPassword: 'short',
      currentPassword: CURRENT,
      newPassword: 'short',
    })

    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues[0]?.message).toBe('changePasswordTooWeak')
  })
})
