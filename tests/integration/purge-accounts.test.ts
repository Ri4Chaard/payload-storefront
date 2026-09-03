import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { CODE_RETENTION_MS, UNVERIFIED_ACCOUNT_TTL_MS } from '@/lib/auth/config'

/**
 * The nightly purge (spec 004, FR-040, FR-041, T560).
 *
 * **This is the one job in the system that deletes customer rows**, so what needs proving is not
 * that it deletes — it is where it STOPS. A `where` clause that is one operator too broad here does
 * not throw, does not fail a build, and does not show up until somebody's account is gone. Every
 * test below therefore puts a row that must survive next to the row that must not, and asserts
 * both outcomes from the same run.
 *
 * The task is invoked through `payload.jobs.run`, the way the scheduler will invoke it, rather than
 * by calling the handler directly — the queue, the task registration and the handler are three
 * things that can each be wrong on their own.
 */

const payload = await getPayload({ config })

const fresh = (label: string) =>
  `purge-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@purge.aurum-testing.dev`

const customers: number[] = []
const codes: number[] = []

const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

/**
 * Created, then back-dated with a second write.
 *
 * `createdAt` is set by the database on insert and Payload's create ignores an incoming value, so
 * the only way to make a row genuinely old is to update it afterwards. Nothing else in the suite
 * needs this, which is why it is not a shared helper.
 */
async function customerAged(label: string, age: number, verified: boolean) {
  const created = await payload.create({
    collection: 'customers',
    data: { email: fresh(label), password: 'a-long-enough-password' },
    disableVerificationEmail: true,
    overrideAccess: true,
  })

  customers.push(created.id)

  await payload.update({
    collection: 'customers',
    data: { _verified: verified, createdAt: ago(age) },
    id: created.id,
    overrideAccess: true,
  })

  return created.id
}

/**
 * The three terminal markers, named rather than taken as a loose `object`.
 *
 * Spreading an `object` into `data` widens it enough that Payload's create overloads stop matching
 * — the compiler picks the draft-enabled signature and asks for a `draft` key that means nothing
 * here. Naming the three fields keeps the call on the overload it belongs to.
 */
interface TerminalState {
  consumedAt?: string
  expiresAt?: string
  supersededAt?: string
}

async function codeRow(state: TerminalState) {
  const created = await payload.create({
    collection: 'verification-codes',
    data: {
      // Required on the generated type — the column has a database default, so nothing else in the
      // application passes it, but a create typed against the collection has to.
      attempts: 0,
      codeHash: 'not-a-real-hash',
      email: fresh('code'),
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      purpose: 'verify-email',
      token: `token-${Math.random().toString(36).slice(2)}`,
      ...state,
    },
    overrideAccess: true,
  })

  codes.push(created.id)
  return created.id
}

const customerExists = async (id: number) => {
  const { totalDocs } = await payload.count({
    collection: 'customers',
    overrideAccess: true,
    where: { id: { equals: id } },
  })
  return totalDocs === 1
}

const codeExists = async (id: number) => {
  const { totalDocs } = await payload.count({
    collection: 'verification-codes',
    overrideAccess: true,
    where: { id: { equals: id } },
  })
  return totalDocs === 1
}

/** Runs the task the way the scheduler does, and fails loudly if the queue refused it. */
async function runPurge() {
  const result = await payload.jobs.queue({
    input: {},
    queue: 'nightly',
    task: 'purgeAccounts',
  })

  await payload.jobs.runByID({ id: result.id })
}

afterAll(async () => {
  if (customers.length > 0) {
    await payload.delete({
      collection: 'customers',
      overrideAccess: true,
      where: { id: { in: customers } },
    })
  }
  if (codes.length > 0) {
    await payload.delete({
      collection: 'verification-codes',
      overrideAccess: true,
      where: { id: { in: codes } },
    })
  }
})

describe('unverified accounts (FR-041)', () => {
  it('deletes one past the retention age and keeps a younger one', async () => {
    const stale = await customerAged('stale', UNVERIFIED_ACCOUNT_TTL_MS + 60_000, false)
    const recent = await customerAged('recent', UNVERIFIED_ACCOUNT_TTL_MS - 60_000, false)

    await runPurge()

    expect(await customerExists(stale)).toBe(false)
    expect(await customerExists(recent)).toBe(true)
  })

  /**
   * The assertion the whole job hangs on.
   *
   * A verified customer who has not signed in for a year is an ordinary customer, and the age
   * predicate on its own would take them. Only the `_verified` half stands between this job and
   * every dormant account in the shop.
   */
  it('never deletes a verified account, however old', async () => {
    const ancient = await customerAged('ancient', UNVERIFIED_ACCOUNT_TTL_MS * 52, true)

    await runPurge()

    expect(await customerExists(ancient)).toBe(true)
  })
})

describe('spent codes (FR-040)', () => {
  it('deletes a consumed code past retention', async () => {
    const old = await codeRow({ consumedAt: ago(CODE_RETENTION_MS + 60_000) })
    const recent = await codeRow({ consumedAt: ago(CODE_RETENTION_MS - 60_000) })

    await runPurge()

    expect(await codeExists(old)).toBe(false)
    expect(await codeExists(recent)).toBe(true)
  })

  it('deletes a superseded code past retention', async () => {
    const old = await codeRow({ supersededAt: ago(CODE_RETENTION_MS + 60_000) })

    await runPurge()

    expect(await codeExists(old)).toBe(false)
  })

  /**
   * The common case, and the one an implementation that only looked at `consumedAt` would keep
   * forever: a code issued to somebody who never came back.
   */
  it('deletes a long-expired code nobody ever used', async () => {
    const old = await codeRow({ expiresAt: ago(CODE_RETENTION_MS + 60_000) })

    await runPurge()

    expect(await codeExists(old)).toBe(false)
  })

  it('keeps a live code', async () => {
    const live = await codeRow({})

    await runPurge()

    expect(await codeExists(live)).toBe(true)
  })
})
