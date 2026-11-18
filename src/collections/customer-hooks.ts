import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
} from 'payload'

import { syncMarketingContact } from '@/lib/email/marketing'

/**
 * Hooks for `customers`.
 */

/**
 * Keep the existing `name` in step with `firstName` and `lastName`.
 *
 * The design splits the name in two; `name` predates it and is what `useAsTitle`, `defaultColumns`
 * and the seller's view of a customer are built on. Recomposing it here means the split is additive
 * — nothing that already reads `name` has to change, and no migration has to guess where to put a
 * space in the existing data.
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
 * Record WHEN the marketing choice was made, and where.
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
 * Mirror a consent change into the Resend audience.
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
      locale: doc.locale ?? undefined,
      firstName: doc.firstName,
      lastName: doc.lastName,
      subscribed: next,
    })
  } catch (error) {
    req.payload.logger.error({ err: error, msg: 'Marketing sync failed after consent change' })
  }

  return doc
}

/**
 * A deleted customer leaves no cart behind.
 *
 * Constitution VI asks every data collection point for a working deletion path, and a cart is one:
 * it records what somebody wanted, by name, for as long as it exists. An erasure request that left
 * the cart would leave exactly that.
 *
 * **Two hooks, and the reason is a foreign key.** `carts.customer_id` is `ON DELETE SET NULL`, so
 * by the time `afterDelete` runs the link is already gone — a delete keyed on the customer id finds
 * nothing, reports success, and leaves the cart behind as an orphan no cookie can ever open. It
 * would eventually be collected by the guest window thirty days later, and in the meantime it is
 * precisely the record the erasure was supposed to remove. The first draft here was that
 * single-hook version; it passed review by eye and failed against a database.
 *
 * So the ids are captured in `beforeDelete`, while the relationship still exists, and the deletion
 * happens in `afterDelete`. That ordering also keeps the original property: a customer deletion
 * refused by access control or a later hook never reaches `afterDelete`, so their cart survives —
 * emptying the cart of somebody who is still a customer is the unrecoverable direction.
 *
 * `overrideAccess: true` because a deletion runs as whoever asked for it — an admin, or the
 * customer themselves — and neither carries the cart secret the collection's own rules want. The
 * captured id list is the whole of what this can touch.
 */
const CART_IDS = 'aurum:cartsToDelete'

export const captureCustomerCarts: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { docs } = await req.payload.find({
    collection: 'carts',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    req,
    select: {},
    where: { customer: { equals: id } },
  })

  req.context[CART_IDS] = docs.map((doc) => doc.id)
}

export const deleteCustomerCarts: CollectionAfterDeleteHook = async ({ req }) => {
  const ids = req.context[CART_IDS]
  if (!Array.isArray(ids) || ids.length === 0) return

  await req.payload.delete({
    collection: 'carts',
    overrideAccess: true,
    req,
    where: { id: { in: ids } },
  })

  delete req.context[CART_IDS]
}
