import type { CollectionBeforeChangeHook } from 'payload'

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
