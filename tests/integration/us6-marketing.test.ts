import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { marketingEmailSchema } from '@/lib/auth/schemas'

/**
 * US6 — the marketing preference and the evidence behind it.
 *
 * **What is actually at risk here is not the checkbox.** Whether a boolean round-trips is the least
 * interesting thing about consent. The two claims worth a test are that the record of WHEN consent
 * was given cannot be authored by whoever is giving it, and that withdrawing it does not cost the
 * customer their ability to get back into their account. Both are properties of the collection, so
 * both are asserted against it rather than against the form that usually drives it.
 *
 * `setMarketingEmail` is not called directly, for the seam every other US test records: it opens
 * with `requireCustomer()`, which reads `next/headers`, and there is no request in a test runner.
 * What it does past that line is one `payload.update` writing one field — which is exactly what the
 * blocks below write.
 */

const payload = await getPayload({ config })

const fresh = (label: string) =>
  `us6-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@us6.aurum-testing.dev`

const created: number[] = []

/**
 * Verified, because `syncMarketingChoice` skips anything else — and a test whose subject never
 * reaches the code under test proves nothing about it. Nothing leaves the machine either way:
 * `EMAIL_TRANSPORT=log` is set by `vitest.integration.config.ts` and `syncMarketingContact` honours
 * it, which is the guard this phase added.
 */
async function makeCustomer(label: string, marketingEmail = false) {
  const customer = await payload.create({
    collection: 'customers',
    data: { email: fresh(label), marketingEmail, password: 'a-long-enough-password' },
    disableVerificationEmail: true,
    overrideAccess: true,
  })

  const verified = await payload.update({
    collection: 'customers',
    data: { _verified: true },
    id: customer.id,
    overrideAccess: true,
  })

  created.push(customer.id)
  return verified
}

const reread = async (id: number) =>
  payload.findByID({ collection: 'customers', depth: 0, id, overrideAccess: true })

const setConsent = async (id: number, marketingEmail: boolean, extra: object = {}) =>
  payload.update({
    collection: 'customers',
    data: { marketingEmail, ...extra },
    id,
    overrideAccess: true,
  })

afterAll(async () => {
  if (created.length === 0) return
  await payload.delete({
    collection: 'customers',
    overrideAccess: true,
    where: { id: { in: created } },
  })
})

describe('the consent record is written by the hook, not by the caller', () => {
  it('stamps the time and the source when consent is given', async () => {
    const customer = await makeCustomer('given')
    // Declining at sign-up is a choice too, and it is recorded as one — so the interesting move is
    // the SOURCE changing from where it was first made to where it was changed.
    expect(customer.marketingEmailSource).toBe('registration')

    const before = Date.now()
    await setConsent(customer.id, true)
    const after = await reread(customer.id)

    expect(after.marketingEmail).toBe(true)
    expect(after.marketingEmailSource).toBe('profile')

    const stamped = new Date(after.marketingEmailUpdatedAt ?? 0).getTime()
    // Within the window this test ran in — which is what makes it the hook's clock and not a value
    // that happened to be lying in the row already.
    expect(stamped).toBeGreaterThanOrEqual(before - 1000)
    expect(stamped).toBeLessThanOrEqual(Date.now() + 1000)
  })

  it('stamps it again when consent is withdrawn', async () => {
    const customer = await makeCustomer('withdrawn', true)
    await setConsent(customer.id, true)
    const givenAt = (await reread(customer.id)).marketingEmailUpdatedAt

    await new Promise((resolve) => setTimeout(resolve, 10))
    await setConsent(customer.id, false)
    const after = await reread(customer.id)

    expect(after.marketingEmail).toBe(false)
    // Withdrawal is a consent event too. A record that only moves on opt-in cannot answer "when did
    // they leave?", which is the question that actually gets asked.
    expect(after.marketingEmailUpdatedAt).not.toBe(givenAt)
  })

  /**
   * FR-034. The reason `stampMarketingConsent` overwrites rather than defers.
   *
   * A server action is a public endpoint, so this is not a hypothetical request shape — it is what
   * arrives the first time somebody posts a hand-built body at it.
   */
  it('discards a timestamp and source supplied by the caller', async () => {
    const customer = await makeCustomer('forged')

    const forged = '1999-01-01T00:00:00.000Z'
    await setConsent(customer.id, true, {
      marketingEmailSource: 'registration',
      marketingEmailUpdatedAt: forged,
    })

    const after = await reread(customer.id)
    expect(after.marketingEmailUpdatedAt).not.toBe(forged)
    expect(after.marketingEmailSource).toBe('profile')
  })

  /** Saving the profile with the switch untouched is not fresh consent. */
  it('leaves the record alone when the value has not changed', async () => {
    const customer = await makeCustomer('unchanged')
    await setConsent(customer.id, true)
    const stampedAt = (await reread(customer.id)).marketingEmailUpdatedAt

    await new Promise((resolve) => setTimeout(resolve, 10))
    await setConsent(customer.id, true)

    expect((await reread(customer.id)).marketingEmailUpdatedAt).toBe(stampedAt)
  })

  it('records registration as the source when the box is ticked at sign-up', async () => {
    const customer = await makeCustomer('signup', true)

    expect(customer.marketingEmail).toBe(true)
    expect(customer.marketingEmailSource).toBe('registration')
    expect(customer.marketingEmailUpdatedAt).toBeTruthy()
  })
})

/**
 * FR-035 — the requirement this feature's whole email architecture exists to make structural.
 *
 * The assertion looks almost too easy, and that is the point being recorded: there is no branch to
 * test because `src/lib/email/transactional.ts` cannot see `marketingEmail` and
 * `src/lib/email/marketing.ts` cannot send a message. This fails on the day somebody merges the two
 * paths, which is the only day it could ever fail.
 */
describe('withdrawing consent does not touch transactional mail', () => {
  it('issues a reset token to a customer with marketing off', async () => {
    const customer = await makeCustomer('reset', true)
    await setConsent(customer.id, false)

    expect((await reread(customer.id)).marketingEmail).toBe(false)

    const token = await payload.forgotPassword({
      collection: 'customers',
      data: { email: customer.email },
      disableEmail: true,
    })

    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('leaves the account able to sign in', async () => {
    const customer = await makeCustomer('login', true)
    await setConsent(customer.id, false)

    const result = await payload.login({
      collection: 'customers',
      data: { email: customer.email, password: 'a-long-enough-password' },
    })

    expect(result.user?.id).toBe(customer.id)
  })
})

/**
 * The action's own guard, tested where it lives.
 *
 * A POST can carry `"false"`, `0` or nothing at all, and each would write the wrong consent under a
 * `Boolean()` cast. The schema is what refuses them.
 */
describe('marketingEmailSchema', () => {
  it('accepts both booleans', () => {
    expect(marketingEmailSchema.safeParse({ subscribed: true }).success).toBe(true)
    expect(marketingEmailSchema.safeParse({ subscribed: false }).success).toBe(true)
  })

  it.each([['false'], [0], [1], [null], [undefined], ['on']])(
    'refuses %p, which a form post can produce',
    (value) => {
      expect(marketingEmailSchema.safeParse({ subscribed: value }).success).toBe(false)
    },
  )
})
