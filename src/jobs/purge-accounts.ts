import type { TaskConfig, Where } from 'payload'

import { CODE_RETENTION_MS, UNVERIFIED_ACCOUNT_TTL_MS } from '@/lib/auth/config'

/**
 * The scheduled cleanup behind FR-040 and FR-041.
 *
 * Two deletions that have nothing in common except when they run, which is why they are one task
 * rather than two: both are "forget what we no longer have a reason to keep", both want the same
 * nightly slot, and splitting them would double the scheduling surface to save nothing.
 *
 * **Payload's own job queue, not a cron container.** The framework ships one, it runs against this
 * database, and it needs no new service to deploy or authenticate — the cheapest correct answer to
 * a requirement that otherwise invites a second process. The alternative considered and rejected in
 * R15 was an authenticated HTTP endpoint poked by an external scheduler: a new public surface for a
 * job with no reason to be reachable from outside.
 *
 * **Both deletions run with `overrideAccess: true`, and they have to.** `verification-codes` denies
 * every operation to everybody — that is the point of the collection — so a job that respected
 * access control could not delete a single row. The safety here is not the access layer; it is that
 * the `where` clauses below are the whole of what this can touch.
 *
 * **It logs counts and never addresses.** A purge that prints who it deleted turns the log into the
 * copy of the personal data the purge existed to remove.
 */

/**
 * A code row nobody can use again.
 *
 * Terminal is three separate states and the query needs all of them, because they arrive by
 * different routes: `consumedAt` is a code that worked, `supersededAt` a code replaced by a resend,
 * and `expiresAt` in the past a code nobody ever came back for. The last is the common case, and
 * the one an implementation that only looked at `consumedAt` would leave behind forever.
 *
 * The age is measured from the terminal event rather than from `createdAt` — a code that expired
 * ten minutes ago is not a code that can be deleted, whatever its issue date.
 */
const terminalCodesBefore = (cutoff: string): Where => ({
  or: [
    { consumedAt: { less_than: cutoff } },
    { supersededAt: { less_than: cutoff } },
    { expiresAt: { less_than: cutoff } },
  ],
})

/**
 * A registration nobody finished.
 *
 * **`_verified` must be matched as "not true" rather than "equals false"**, and the distinction is
 * not pedantry: Payload writes the column on verification, so a row that predates the auth config
 * — or one created by a path that never set it — holds `null`, and `equals: false` skips exactly
 * the oldest rows this is meant to collect. `createdAt` is the age, because an account that was
 * never verified has no other event to measure from.
 */
const unverifiedBefore = (cutoff: string): Where => ({
  and: [{ _verified: { not_equals: true } }, { createdAt: { less_than: cutoff } }],
})

export const purgeAccountsTask: TaskConfig<'purgeAccounts'> = {
  slug: 'purgeAccounts',
  label: 'Purge unverified accounts and spent codes',

  /**
   * Retried, because both failure modes are transient — a database that was briefly unreachable or
   * a lock held by something else. A purge that gives up until tomorrow leaves personal data in
   * place for another day, which is the requirement it exists to satisfy.
   */
  retries: 2,

  /**
   * Nightly at 03:15, and the odd minute is deliberate — every job in every system runs at :00, and
   * this one has no reason to join that queue. The leading field is seconds (Payload's cron takes
   * six), so this is 03:15:00 and not every second of 03:15.
   */
  schedule: [{ cron: '0 15 3 * * *', queue: 'nightly' }],

  /**
   * Declared so the counts are typed and stored rather than only logged.
   *
   * Payload generates the task's output type from this; without it the handler's return is `never`
   * and the numbers would have nowhere to go but a log line. They are the only evidence that the
   * purge ran and did something, which is what somebody asks for when a customer says an account
   * vanished.
   */
  outputSchema: [
    { name: 'codesDeleted', type: 'number', required: true },
    { name: 'unverifiedAccountsDeleted', type: 'number', required: true },
  ],

  handler: async ({ req }) => {
    const now = Date.now()
    const codeCutoff = new Date(now - CODE_RETENTION_MS).toISOString()
    const accountCutoff = new Date(now - UNVERIFIED_ACCOUNT_TTL_MS).toISOString()

    /**
     * Codes first, and the order matters more than it looks.
     *
     * Deleting a customer cascades to the code rows that point at them, so running the accounts
     * first would leave this query counting rows that no longer exist and report a smaller number
     * than it deleted. Codes first means each count describes the work that step actually did.
     */
    const codes = await req.payload.delete({
      collection: 'verification-codes',
      overrideAccess: true,
      req,
      where: terminalCodesBefore(codeCutoff),
    })

    const accounts = await req.payload.delete({
      collection: 'customers',
      overrideAccess: true,
      req,
      where: unverifiedBefore(accountCutoff),
    })

    const output = {
      codesDeleted: codes.docs.length,
      unverifiedAccountsDeleted: accounts.docs.length,
    }

    req.payload.logger.info({ msg: 'Account purge complete', ...output })

    return { output }
  },
}
