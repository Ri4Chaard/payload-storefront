import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { registerCustomer, resendCode, verifyEmailCode } from '@/lib/auth/actions'
import type { CreateAccountValues } from '@/lib/auth/schemas'

/**
 * US1 — create an account and verify the address (spec 004, FR-001 – FR-009).
 *
 * The assertions worth the most here are the ones about what the system does NOT say. FR-009 turns
 * the create form into an oracle for "does this person shop here?" the moment its response varies,
 * so registering a known address and an unknown one are compared directly rather than each being
 * checked against its own expectation.
 */

const payload = await getPayload({ config })

/**
 * The actions take typed values rather than `FormData`, so the same zod schema validates the
 * browser's copy and the server's (spec 004, `src/lib/auth/schemas.ts`). `marketingConsent` is
 * explicit because the schema has no defaults — see the note there on why.
 */
const credentials = (over: Partial<CreateAccountValues> = {}): CreateAccountValues => ({
  confirmPassword: 'a-long-enough-password',
  email: fresh(),
  marketingConsent: false,
  password: 'a-long-enough-password',
  ...over,
})

const fresh = () =>
  `us1-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@aurum-testing.dev`

async function codeFor(email: string): Promise<string> {
  // The stored hash is not reversible, so the test reads the code the only way anything else can:
  // by minting a known one. Instead we re-issue against the same token and capture the return.
  const customer = await payload.find({
    collection: 'customers',
    limit: 1,
    overrideAccess: true,
    showHiddenFields: true,
    where: { email: { equals: email } },
  })
  const token = (customer.docs[0] as { _verificationToken?: string } | undefined)
    ?._verificationToken
  if (!token) throw new Error('no verification token — registration did not complete')

  const { issueCode } = await import('@/lib/auth/codes')
  const issued = await issueCode(email, 'verify-email', token, { bypassThrottle: true })
  if (!issued.ok) throw new Error('could not issue a code for the test')
  return issued.code
}

afterAll(async () => {
  await payload.delete({
    collection: 'verification-codes',
    overrideAccess: true,
    where: { email: { like: '@aurum-testing.dev' } },
  })
  await payload.delete({
    collection: 'customers',
    overrideAccess: true,
    where: { email: { like: '@aurum-testing.dev' } },
  })
})

describe('registerCustomer', () => {
  it('creates an unverified account and issues a code', async () => {
    const email = fresh()
    const result = await registerCustomer(credentials({ email }))
    expect(result.status).toBe('success')

    const found = await payload.find({
      collection: 'customers',
      overrideAccess: true,
      where: { email: { equals: email } },
    })
    expect(found.totalDocs).toBe(1)
    expect(found.docs[0]?._verified).not.toBe(true)

    const codes = await payload.find({
      collection: 'verification-codes',
      overrideAccess: true,
      where: { and: [{ email: { equals: email } }, { purpose: { equals: 'verify-email' } }] },
    })
    expect(codes.totalDocs).toBe(1)
  })

  it('refuses a confirmation that does not match, against that field', async () => {
    const result = await registerCustomer(
      credentials({ confirmPassword: 'something-else-entirely' }),
    )
    expect(result.status).toBe('error')
    if (result.status !== 'error') return
    expect(result.fieldErrors?.confirmPassword).toBeDefined()
  })

  it('refuses a password below the strength rule', async () => {
    const result = await registerCustomer(
      credentials({ confirmPassword: 'short', password: 'short' }),
    )
    expect(result.status).toBe('error')
  })

  it('never reflects the password back in the result', async () => {
    const password = 'a-long-enough-password'
    const result = await registerCustomer(
      credentials({ confirmPassword: 'mismatch-here', password }),
    )
    expect(JSON.stringify(result)).not.toContain(password)
  })

  /** FR-009. The two responses are compared to each other, not to a fixture. */
  it('answers a registered address exactly as it answers a new one', async () => {
    const taken = fresh()

    const first = await registerCustomer(credentials({ email: taken }))
    const second = await registerCustomer(credentials({ email: taken }))
    const other = await registerCustomer(credentials())

    expect(second).toEqual(first)
    expect(second).toEqual(other)

    const found = await payload.find({
      collection: 'customers',
      overrideAccess: true,
      where: { email: { equals: taken } },
    })
    expect(found.totalDocs, 'a second account was created').toBe(1)
  })

  /**
   * FR-034 records "the customer's marketing choice" — and a decline is a choice. Stamping it means
   * the shop can show it asked and was told no, which is the more useful half of a consent record.
   */
  it('defaults marketing email to off, and records that it was declined', async () => {
    const email = fresh()
    await registerCustomer(credentials({ email }))

    const found = await payload.find({
      collection: 'customers',
      overrideAccess: true,
      where: { email: { equals: email } },
    })
    expect(found.docs[0]?.marketingEmail).toBe(false)
    expect(found.docs[0]?.marketingEmailSource).toBe('registration')
    expect(found.docs[0]?.marketingEmailUpdatedAt).toBeTruthy()
  })

  it('records consent and when it was given when the box IS ticked', async () => {
    const email = fresh()
    await registerCustomer(credentials({ email, marketingConsent: true }))

    const found = await payload.find({
      collection: 'customers',
      overrideAccess: true,
      where: { email: { equals: email } },
    })
    expect(found.docs[0]?.marketingEmail).toBe(true)
    expect(found.docs[0]?.marketingEmailSource).toBe('registration')
    expect(found.docs[0]?.marketingEmailUpdatedAt).toBeTruthy()
  })
})

describe('verifyEmailCode', () => {
  it('verifies the address when the code is right', async () => {
    const email = fresh()
    await registerCustomer(credentials({ email }))

    const code = await codeFor(email)
    const result = await verifyEmailCode({ code, email })
    expect(result.status).toBe('success')

    const found = await payload.find({
      collection: 'customers',
      overrideAccess: true,
      where: { email: { equals: email } },
    })
    expect(found.docs[0]?._verified).toBe(true)
  })

  it('reports a wrong code and an expired one differently', async () => {
    const email = fresh()
    await registerCustomer(credentials({ email }))
    const code = await codeFor(email)

    const wrong = await verifyEmailCode({
      code: code === '000000' ? '111111' : '000000',
      email,
    })
    expect(wrong.status).toBe('error')
    if (wrong.status !== 'error') return
    expect(wrong.message).toBe('codeInvalid')

    // Age the live code out and try the RIGHT one.
    await payload.update({
      collection: 'verification-codes',
      data: { expiresAt: new Date(Date.now() - 1000).toISOString() },
      overrideAccess: true,
      where: { and: [{ email: { equals: email } }, { consumedAt: { exists: false } }] },
    })

    const expired = await verifyEmailCode({ code, email })
    expect(expired.status).toBe('error')
    if (expired.status !== 'error') return
    expect(expired.message, 'an expired code must not be reported as invalid').toBe('codeExpired')
  })

  it('will not accept the same code twice', async () => {
    const email = fresh()
    await registerCustomer(credentials({ email }))
    const code = await codeFor(email)

    expect((await verifyEmailCode({ code, email })).status).toBe('success')
    const again = await verifyEmailCode({ code, email })
    expect(again.status).toBe('error')
  })
})

describe('resendCode', () => {
  /**
   * Regression. This returned `verifyResendTooSoon` for a registered address (one had just been
   * sent at sign-up) and `success` for an unknown one — turning the resend button into a way to
   * discover who has an account.
   */
  it('answers an unknown address the same as a known one, throttled or not', async () => {
    const known = fresh()
    await registerCustomer(credentials({ email: known }))

    const forKnown = await resendCode({ email: known, purpose: 'verify-email' })
    const forUnknown = await resendCode({ email: fresh(), purpose: 'verify-email' })
    expect(forUnknown).toEqual(forKnown)
  })
})
