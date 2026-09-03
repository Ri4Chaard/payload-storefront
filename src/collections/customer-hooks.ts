import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'

import { syncMarketingContact } from '@/lib/email/marketing'

/**
 * Hooks for `customers` (spec 004).
 */

/**
 * Keep the existing `name` in step with `firstName` and `lastName`.
 *
 * The design splits the name in two; `name` predates it and is what `useAsTitle`, `defaultColumns`
 * and the seller's view of a customer are built on. Recomposing it here means the split is additive
 * — nothing that already reads `name` has to change, and no migration has to guess where to put a
 * space in the existing data (004/data-model.md).
 *
 * Partial updates only carry the fields that changed, so the missing half comes from `originalDoc`
 * rather than being blanked.
 */
export const composeCustomerName: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const first = 'firstName' in data ? data.firstName : originalDoc?.firstName
  const last = 'lastName' in data ? data.lastName : originalDoc?.lastName

  const touched = 'firstName' in data || 'lastName' in data
  if (!touched) return data

  const composed = [first, last]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ')

  // An admin may have typed a name before the customer ever set one. Only clear it if the customer
  // has actively emptied both halves.
  if (!composed && !first && !last) {
    return { ...data, name: null }
  }

  return { ...data, name: composed }
}

/**
 * Record WHEN the marketing choice was made, and where (FR-034).
 *
 * **This hook is the only writer, and it overwrites rather than defers.** Whatever
 * `marketingEmailUpdatedAt` and `marketingEmailSource` arrive with is discarded and recomputed from
 * the change actually being made. That is deliberately stronger than marking the fields read-only:
 * a consent record a client can post a value into is not evidence of anything, and this closes the
 * hole rather than asking the API surface to.
 *
 * It is done this way rather than with field-level `update: () => false` because collection
 * `beforeChange` runs BEFORE the field traversal (verified in
 * `payload/dist/collections/operations/utilities/update.js:123-162`), so an access function that
 * refuses writes would refuse this hook's write too, and the timestamp would never be stored at all.
 *
 * The stamp moves only when the value actually changes. Saving the profile with the switch
 * untouched must not look like fresh consent.
 */
export const stampMarketingConsent: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
}) => {
  if (!('marketingEmail' in data)) return data

  const next = Boolean(data.marketingEmail)
  const previous = Boolean(originalDoc?.marketingEmail)

  if (operation === 'update' && next === previous) {
    // Leave the existing record untouched, and drop any value the caller tried to supply.
    return {
      ...data,
      marketingEmailSource: originalDoc?.marketingEmailSource ?? null,
      marketingEmailUpdatedAt: originalDoc?.marketingEmailUpdatedAt ?? null,
    }
  }

  return {
    ...data,
    marketingEmailSource: operation === 'create' ? 'registration' : 'profile',
    marketingEmailUpdatedAt: new Date().toISOString(),
  }
}

/**
 * Mirror a consent change into the Resend audience (FR-033, T537).
 *
 * **In the collection rather than in the action**, for the reason every hook in this feature is:
 * the storefront toggle is not the only writer. A seller correcting a preference in the admin panel
 * is making the same change, and a mirror that only runs on one of the two paths is a mirror that
 * drifts. Payload stays the source of truth either way — this only tells Resend what Payload
 * already decided.
 *
 * **It fires on a real change of value, and only for a verified address.** Registration writes
 * `marketingEmail` before the address has been proved, and pushing an unverified address into a
 * marketing audience means anyone can enrol somebody else's inbox by typing it into a sign-up form.
 * The verification moment is therefore where a consenting customer first reaches Resend — and that
 * is handled in `verifyEmailCode`, not here, because `payload.verifyEmail` writes through
 * `db.updateOne` and runs no collection hooks at all
 * (`payload/dist/auth/operations/verifyEmail.js`). A branch here for "just verified" would look
 * like it worked and never run.
 *
 * **A failure is swallowed, and the write stands.** `syncMarketingContact` already catches its own
 * transport errors; this catches everything else, because the alternative is a customer who
 * withdrew consent being shown an error and reasonably concluding it did not take. It did — in the
 * database that governs. What is left is a mirror briefly out of step, which is a reconciliation
 * problem rather than a consent one.
 *
 * **It runs inside the request's transaction and is awaited.** That holds a database transaction
 * open for the length of an HTTP call to a third party, which is a genuine cost and the reason the
 * timeout matters more here than it looks. The alternative — firing it off unawaited — trades a
 * slow request for a lost sync on a process that exits first, and a consent mirror that silently
 * drops writes is worse than a slow toggle. Revisit if the profile ever feels sluggish.
 */
export const syncMarketingChoice: CollectionAfterChangeHook = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  if (operation !== 'update') return doc
  if (doc._verified !== true) return doc

  const next = Boolean(doc.marketingEmail)
  if (Boolean(previousDoc?.marketingEmail) === next) return doc

  try {
    await syncMarketingContact({
      email: doc.email,
      firstName: doc.firstName,
      lastName: doc.lastName,
      subscribed: next,
    })
  } catch (error) {
    req.payload.logger.error({ err: error, msg: 'Marketing sync failed after consent change' })
  }

  return doc
}
