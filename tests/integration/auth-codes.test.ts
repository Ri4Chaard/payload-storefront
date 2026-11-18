import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { consumeCode, issueCode } from '@/lib/auth/codes'
import { CODE_MAX_ATTEMPTS, CODE_TTL_MS } from '@/lib/auth/config'

/**
 * The code lifecycle.
 *
 * These live in the integration suite rather than `tests/unit` because the four terminal states are
 * database state, not arithmetic — the whole point of the design is that single-use is enforced by
 * the write rather than by a caller remembering. Testing that against a fake would test the fake.
 *
 * Each state is asserted separately because they are reported separately: a customer whose code has
 * expired needs to be told to ask for a new one, and telling them it is "invalid" is how a person
 * ends up retyping the same six digits until they give up.
 */

const payload = await getPayload({ config })

/** A fresh address per test, so one test's throttling cannot decide another's outcome. */
let email: string

async function purge(address: string) {
  await payload.delete({
    collection: 'verification-codes',
    overrideAccess: true,
    where: { email: { equals: address } },
  })
}

beforeEach(() => {
  email = `codes-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`
})

afterAll(async () => {
  await payload.delete({
    collection: 'verification-codes',
    overrideAccess: true,
    where: { email: { like: '@example.test' } },
  })
})

describe('issueCode', () => {
  it('returns six digits and stores only their hash', async () => {
    const issued = await issueCode(email, 'verify-email', 'token-abc')
    expect(issued.ok).toBe(true)
    if (!issued.ok) return

    expect(issued.code).toMatch(/^\d{6}$/)

    const rows = await payload.find({
      collection: 'verification-codes',
      overrideAccess: true,
      where: { email: { equals: email } },
    })
    // The digits must not be recoverable from the table — a dump would otherwise hand over every
    // code in flight.
    expect(rows.docs[0]?.codeHash).not.toBe(issued.code)
    expect(rows.docs[0]?.codeHash).not.toContain(issued.code)
    await purge(email)
  })

  it('refuses a second send inside the cooldown', async () => {
    const first = await issueCode(email, 'verify-email', 'token-1')
    expect(first.ok).toBe(true)

    const second = await issueCode(email, 'verify-email', 'token-2')
    expect(second.ok).toBe(false)
    if (second.ok) return
    expect(second.throttled).toBe('cooldown')
    await purge(email)
  })
})

describe('consumeCode', () => {
  it('hands back the token the code stands for, and only for the right purpose', async () => {
    const issued = await issueCode(email, 'verify-email', 'the-payload-token')
    if (!issued.ok) throw new Error('setup failed')

    // The same digits must not satisfy a different purpose (C6).
    const crossPurpose = await consumeCode(email, 'reset-password', issued.code)
    expect(crossPurpose.ok).toBe(false)

    const result = await consumeCode(email, 'verify-email', issued.code)
    // `recordId` came with the reset flow: the handle it issues is a signed reference to this
    // row, so `consumeCode` has to say which row it matched. Asserted loosely on the id and
    // strictly on everything else.
    expect(result).toMatchObject({ ok: true, token: 'the-payload-token' })
    expect(result.ok && result.recordId).toBeTypeOf('number')
    await purge(email)
  })

  it('refuses a code that has already been used', async () => {
    const issued = await issueCode(email, 'verify-email', 'tok')
    if (!issued.ok) throw new Error('setup failed')

    await consumeCode(email, 'verify-email', issued.code)
    const again = await consumeCode(email, 'verify-email', issued.code)

    expect(again.ok).toBe(false)
    if (again.ok) return
    expect(again.failure).toBe('consumed')
    await purge(email)
  })

  it('refuses a code that has expired, and says so rather than calling it wrong', async () => {
    const issued = await issueCode(email, 'verify-email', 'tok')
    if (!issued.ok) throw new Error('setup failed')

    const rows = await payload.find({
      collection: 'verification-codes',
      overrideAccess: true,
      where: { email: { equals: email } },
    })
    await payload.update({
      collection: 'verification-codes',
      data: { expiresAt: new Date(Date.now() - CODE_TTL_MS - 1000).toISOString() },
      id: rows.docs[0]!.id,
      overrideAccess: true,
    })

    const result = await consumeCode(email, 'verify-email', issued.code)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.failure).toBe('expired')
    await purge(email)
  })

  it('refuses a superseded code once a newer one exists', async () => {
    const first = await issueCode(email, 'verify-email', 'tok-1')
    if (!first.ok) throw new Error('setup failed')

    // Reach past the cooldown the way a resend an hour later would.
    const rows = await payload.find({
      collection: 'verification-codes',
      overrideAccess: true,
      where: { email: { equals: email } },
    })
    await payload.update({
      collection: 'verification-codes',
      data: { createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
      id: rows.docs[0]!.id,
      overrideAccess: true,
    })

    const second = await issueCode(email, 'verify-email', 'tok-2')
    expect(second.ok).toBe(true)

    const result = await consumeCode(email, 'verify-email', first.code)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.failure).toBe('superseded')
    await purge(email)
  })

  it('burns the code after the configured number of wrong guesses', async () => {
    const issued = await issueCode(email, 'verify-email', 'tok')
    if (!issued.ok) throw new Error('setup failed')

    const wrong = issued.code === '000000' ? '111111' : '000000'

    for (let attempt = 1; attempt < CODE_MAX_ATTEMPTS; attempt += 1) {
      const result = await consumeCode(email, 'verify-email', wrong)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.failure).toBe('mismatch')
    }

    const burned = await consumeCode(email, 'verify-email', wrong)
    expect(burned.ok).toBe(false)
    if (burned.ok) return
    expect(burned.failure).toBe('too-many-attempts')

    // And the RIGHT code no longer works either — that is what "burned" has to mean.
    const correct = await consumeCode(email, 'verify-email', issued.code)
    expect(correct.ok).toBe(false)
    await purge(email)
  })

  /**
   * Regression. `consumeCode` originally looked only at the newest row, so pasting the previous
   * code — still sitting in the earlier email — reported "invalid" AND spent a guess against the
   * code the customer actually needed. Five of those and they were locked out of a live code by
   * their own paste.
   */
  it('does not spend the live code’s attempts when an older code is submitted', async () => {
    const first = await issueCode(email, 'verify-email', 'tok-1')
    if (!first.ok) throw new Error('setup failed')

    const rows = await payload.find({
      collection: 'verification-codes',
      overrideAccess: true,
      where: { email: { equals: email } },
    })
    await payload.update({
      collection: 'verification-codes',
      data: { createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
      id: rows.docs[0]!.id,
      overrideAccess: true,
    })

    const second = await issueCode(email, 'verify-email', 'tok-2')
    if (!second.ok) throw new Error('setup failed')

    for (let i = 0; i < CODE_MAX_ATTEMPTS + 2; i += 1) {
      await consumeCode(email, 'verify-email', first.code)
    }

    // The current code still works, and still has all of its attempts.
    const result = await consumeCode(email, 'verify-email', second.code)
    expect(result).toMatchObject({ ok: true, token: 'tok-2' })
    await purge(email)
  })

  it('reports an address with no code at all distinctly', async () => {
    const result = await consumeCode('nobody@example.test', 'verify-email', '123456')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.failure).toBe('not-found')
  })
})
