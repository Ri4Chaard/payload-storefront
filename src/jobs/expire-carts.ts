import type { TaskConfig, Where } from 'payload'

import { CUSTOMER_CART_TTL_MS, GUEST_CART_TTL_MS } from '@/lib/cart/retention'

/**
 * The cart's stated life, enforced (spec 005, T075, FR-047, FR-048, SC-014).
 *
 * A cart holds what somebody wants, tied to their account or to their device. That is a data
 * collection point, and Constitution VI requires every one of them to have a documented retention
 * period and a working deletion path. "No payment" simplifies most of this feature; it does not
 * touch this.
 *
 * **A second task on the existing queue, not a second scheduler.** `purgeAccountsTask` already runs
 * nightly on the `nightly` queue and `payload.config.ts` already drains it every fifteen minutes.
 * Adding a task costs a registration; adding a scheduler costs a process to deploy, monitor and
 * forget about.
 *
 * **Two windows, because the carts differ.** A guest cart is unreachable thirty days after its last
 * touch — `aurum-cart` expires on the same clock — so keeping it is keeping a row nobody can ever
 * open. A customer's is theirs whenever they sign in again, so it is kept far longer and still
 * bounded, because the alternative is the one table in this system that grows without end.
 *
 * **Activity is `updatedAt`, not `createdAt`.** A cart somebody added to last week is not stale
 * because they started it in January, and measuring from creation would delete carts out from under
 * people who are still using them.
 *
 * Counts are logged; nothing that identifies a cart or its owner is.
 */

/** A guest cart has no customer. Both halves are needed: the age AND the absence of an owner. */
const staleGuestCarts = (cutoff: string): Where => ({
  and: [{ customer: { exists: false } }, { updatedAt: { less_than: cutoff } }],
})

const staleCustomerCarts = (cutoff: string): Where => ({
  and: [{ customer: { exists: true } }, { updatedAt: { less_than: cutoff } }],
})

export const expireCartsTask: TaskConfig<'expireCarts'> = {
  slug: 'expireCarts',
  label: 'Delete carts past their retention period',

  /** Transient failures only — a brief database outage should not cost a night. */
  retries: 2,

  /**
   * 03:35, twenty minutes after the account purge. Nothing depends on the order; they are separated
   * so that two deletions do not contend for the same locks on the same tables at the same instant.
   */
  schedule: [{ cron: '0 35 3 * * *', queue: 'nightly' }],

  outputSchema: [
    { name: 'guestCartsDeleted', type: 'number', required: true },
    { name: 'customerCartsDeleted', type: 'number', required: true },
  ],

  handler: async ({ req }) => {
    const now = Date.now()
    const guestCutoff = new Date(now - GUEST_CART_TTL_MS).toISOString()
    const customerCutoff = new Date(now - CUSTOMER_CART_TTL_MS).toISOString()

    /**
     * `overrideAccess: true`, and it has to be.
     *
     * The collection's rules answer "may this visitor open this cart" — a customer session or a
     * cart secret. A scheduled job has neither and never will. The safety here is not the access
     * layer; it is that the two `where` clauses above are the whole of what this can reach.
     */
    const guests = await req.payload.delete({
      collection: 'carts',
      overrideAccess: true,
      req,
      where: staleGuestCarts(guestCutoff),
    })

    const customers = await req.payload.delete({
      collection: 'carts',
      overrideAccess: true,
      req,
      where: staleCustomerCarts(customerCutoff),
    })

    const output = {
      guestCartsDeleted: guests.docs.length,
      customerCartsDeleted: customers.docs.length,
    }

    req.payload.logger.info({ msg: 'Cart expiry complete', ...output })

    return { output }
  },
}
