import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { createCartFor } from '@/lib/cart/operations'
import { CUSTOMER_CART_TTL_MS, GUEST_CART_TTL_MS } from '@/lib/cart/retention'
import type { CustomerUser } from '@/lib/auth/dal'
import type { CartOwner } from '@/lib/cart/session'

/**
 * How long a cart is kept, and how it is erased —
 * [data-model.md §4a](../../specs/005-checkout-handoff/data-model.md). FR-047 – FR-049, SC-014.
 *
 * **Every test puts a row that must survive beside the row that must not**, and asserts both
 * outcomes from the same run. `purge-accounts.test.ts` records why: a `where` clause one operator
 * too broad does not throw, does not fail a build, and does not surface until somebody's data is
 * gone. Checking only that the stale row went would pass just as happily if everything went.
 *
 * **The clock is controlled, never waited on — and it takes raw SQL to do it.** Payload sets
 * `updatedAt` itself on every write and ignores an incoming value, so the obvious back-dating
 * update silently does nothing and every "this should have been deleted" assertion fails against a
 * job that is working perfectly. `purge-accounts.test.ts` back-dates `createdAt`, which Payload
 * leaves alone; `updatedAt` is not the same and needed finding out.
 *
 * The task is invoked through `payload.jobs.run`, the way the scheduler invokes it, rather than by
 * calling the handler: the queue, the registration and the handler are three things that can each
 * be wrong on their own.
 */

const payload = await getPayload({ config })

const DOMAIN = '@retention.aurum-testing.dev'
const created: number[] = []

afterAll(async () => {
  for (const id of created) {
    await payload.delete({ collection: 'carts', id, overrideAccess: true }).catch(() => {})
  }
  await payload.delete({
    collection: 'customers',
    overrideAccess: true,
    where: { email: { like: DOMAIN } },
  })
})

const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

async function customer(): Promise<CartOwner & { kind: 'customer' }> {
  const doc = await payload.create({
    collection: 'customers',
    data: {
      email: `ret-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${DOMAIN}`,
      password: 'a-long-enough-password',
    },
    disableVerificationEmail: true,
    overrideAccess: true,
  })
  const user = await payload.findByID({
    collection: 'customers',
    id: doc.id,
    depth: 0,
    overrideAccess: true,
  })
  return { kind: 'customer', user: { ...user, collection: 'customers' } as CustomerUser }
}

/** A cart of the given kind, back-dated to a given age. */
async function cartAged(owner: CartOwner, age: number): Promise<number> {
  const { cartId } = await createCartFor(owner)
  created.push(cartId)

  // Straight to the column. See the note at the top of the file.
  await payload.db.drizzle.execute(
    sql`UPDATE carts SET updated_at = ${ago(age)}::timestamptz WHERE id = ${cartId}`,
  )

  return cartId
}

const exists = async (id: number): Promise<boolean> =>
  payload
    .findByID({ collection: 'carts', id, overrideAccess: true })
    .then(() => true)
    .catch(() => false)

/**
 * Runs the task the way the scheduler does: enqueue, then run that job.
 *
 * `jobs.run` alone only drains what is already queued — a task with a `schedule` is enqueued by the
 * scheduler when it comes due, which is never inside a test. Calling it and asserting nothing
 * happened is how a working job looks like a broken one. `purge-accounts.test.ts` settled the same
 * point for spec 004.
 */
async function runExpiry() {
  const job = await payload.jobs.queue({ input: {}, queue: 'nightly', task: 'expireCarts' })
  await payload.jobs.runByID({ id: job.id })
}

const DAY = 24 * 60 * 60 * 1000

describe('guest carts (FR-047)', () => {
  it('deletes one past its window and keeps one inside it', async () => {
    const stale = await cartAged({ kind: 'none' }, GUEST_CART_TTL_MS + DAY)
    const fresh = await cartAged({ kind: 'none' }, GUEST_CART_TTL_MS - DAY)

    await runExpiry()

    expect(await exists(stale)).toBe(false)
    expect(await exists(fresh)).toBe(true)
  })
})

describe('customer carts (FR-048)', () => {
  it('deletes one past its window and keeps one inside it', async () => {
    const alice = await customer()
    const bob = await customer()

    const stale = await cartAged(alice, CUSTOMER_CART_TTL_MS + DAY)
    const fresh = await cartAged(bob, CUSTOMER_CART_TTL_MS - DAY)

    await runExpiry()

    expect(await exists(stale)).toBe(false)
    expect(await exists(fresh)).toBe(true)
  })

  /**
   * The two windows are far apart, and the job must not confuse them. A customer cart aged past the
   * GUEST window is nowhere near due — treating it as a guest cart would delete carts belonging to
   * people who signed in last month.
   */
  it('does not apply the guest window to a signed-in customer cart', async () => {
    const alice = await customer()
    const aged = await cartAged(alice, GUEST_CART_TTL_MS + DAY)

    await runExpiry()

    expect(await exists(aged)).toBe(true)
  })

  /** And the reverse: a guest cart is not given the customer's much longer window. */
  it('does not apply the customer window to a guest cart', async () => {
    const aged = await cartAged({ kind: 'none' }, GUEST_CART_TTL_MS + DAY)

    await runExpiry()

    expect(await exists(aged)).toBe(false)
  })
})

describe('erasure (FR-049)', () => {
  it('takes a customer cart with the customer, in the same operation', async () => {
    const alice = await customer()
    const bob = await customer()

    const hers = await cartAged(alice, 0)
    const his = await cartAged(bob, 0)

    await payload.delete({ collection: 'customers', id: alice.user.id, overrideAccess: true })

    expect(await exists(hers)).toBe(false)
    // Nobody else's cart went with it.
    expect(await exists(his)).toBe(true)
  })

  it('leaves guest carts alone when a customer is deleted', async () => {
    const alice = await customer()
    await cartAged(alice, 0)
    const stranger = await cartAged({ kind: 'none' }, 0)

    await payload.delete({ collection: 'customers', id: alice.user.id, overrideAccess: true })

    expect(await exists(stranger)).toBe(true)
  })
})

/**
 * FR-051: the periods are configuration, not constants. A retention period that exists only in a
 * source file is one nobody outside this repository can read or change.
 */
describe('the periods are configurable (FR-051)', () => {
  it('ships the documented defaults', () => {
    expect(GUEST_CART_TTL_MS).toBe(30 * DAY)
    expect(CUSTOMER_CART_TTL_MS).toBe(365 * DAY)
  })
})
