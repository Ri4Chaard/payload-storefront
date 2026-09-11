import type { TaskConfig, Where } from 'payload'

import { ENQUIRY_RETENTION_DAYS, ENQUIRY_RETENTION_MS } from '@/lib/contact/config'

/**
 * Forgetting enquiries once there is no longer a reason to keep them (spec 008, T092, FR-029d).
 *
 * **Its own task rather than a third deletion inside `purgeAccounts`.** That one exists because two
 * account-shaped cleanups wanted the same slot and splitting them "would double the scheduling
 * surface to save nothing". This is different data with a different policy and a different
 * retention constant — a year against seven days — and folding it in would mean an account purge
 * that silently also deletes correspondence, which is not what its name says it does.
 *
 * **A hard delete, deliberately.** Enquiries carry no drafts and nothing references them, so there
 * is nothing for a soft delete to protect — and a "deleted" row that still holds a visitor's name,
 * address and message is not an erasure path (FR-029e). The `senderHash` the throttle counts on
 * dies with its row, which is why that pseudonymous key needs no policy of its own.
 *
 * **`overrideAccess: true`, and it has to be.** `enquiries` refuses `create` and `update` to
 * everybody and allows `delete` only to an administrator; a job runs as nobody, so a purge that
 * respected access control could not delete a single row. The safety here is not the access layer —
 * it is that the `where` below can only ever match rows older than the cutoff.
 */

/**
 * Older than the retention period, by the timestamp Payload writes.
 *
 * `createdAt` **is** "when it arrived" — `src/collections/enquiries.ts` records why there is no
 * second field for it. A row written while this query runs cannot match it, so an arriving enquiry
 * is never caught by the sweep that is already in flight.
 */
const arrivedBefore = (cutoff: string): Where => ({ createdAt: { less_than: cutoff } })

export const purgeEnquiriesTask: TaskConfig<'purgeEnquiries'> = {
  slug: 'purgeEnquiries',
  label: 'Purge enquiries past their retention period',

  /**
   * Retried, for the reason `purgeAccounts` gives: both failure modes are transient, and a purge
   * that gives up until tomorrow leaves personal data in place for another day — which is the
   * requirement it exists to satisfy.
   */
  retries: 2,

  /**
   * Nightly at 03:30, fifteen minutes after the account purge so the two do not contend for the
   * same tables or the same connection. The leading field is seconds (Payload's cron takes six), so
   * this is 03:30:00 and not every second of 03:30.
   */
  schedule: [{ cron: '0 30 3 * * *', queue: 'nightly' }],

  /**
   * Declared so the count is typed and stored rather than only logged. It is the only evidence the
   * purge ran and did something, which is what somebody asks for when a customer says they were
   * told their data had been deleted.
   */
  outputSchema: [{ name: 'enquiriesDeleted', type: 'number', required: true }],

  handler: async ({ req }) => {
    const cutoff = new Date(Date.now() - ENQUIRY_RETENTION_MS).toISOString()

    const deleted = await req.payload.delete({
      collection: 'enquiries',
      overrideAccess: true,
      req,
      where: arrivedBefore(cutoff),
    })

    const output = { enquiriesDeleted: deleted.docs.length }

    req.payload.logger.info({
      msg: 'Enquiry purge complete',
      retentionDays: ENQUIRY_RETENTION_DAYS,
      ...output,
    })

    return { output }
  },
}
