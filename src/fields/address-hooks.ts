import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
} from 'payload'

/**
 * "Exactly one address is the default" (spec 004, FR-031).
 *
 * **Why hooks and not the form.** The obvious place to put this is the Add address modal, and that
 * is the version that holds right up until the second writer appears — and there are already three
 * in view: two browser tabs, the Payload admin panel, and the checkout a later spec will build. An
 * invariant enforced in one form is an invariant with an expiry date. Enforced here it is a
 * property of the collection, whoever writes to it.
 *
 * These reach the collection through `addressesCollectionOverride` in `payload.config.ts` — the
 * plugin's own extension point for exactly this (`dist/types/index.d.ts:449`), and the same
 * `*CollectionOverride` shape already used for products, variants and carts. They are appended to
 * the plugin's existing hooks rather than replacing them, so the ownership assignment it does in
 * its own `beforeChange` still happens, and happens first.
 *
 * **On recursion**: clearing the other addresses issues updates that fire this same `afterChange`.
 * They terminate because every one of those documents is being set to `isDefault: false`, and the
 * hook returns immediately for anything that is not becoming the default.
 */

/** The `customer` value can arrive as an id or as a populated document, depending on depth. */
function customerId(value: unknown): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

/**
 * A customer's first address is their default, whether or not they ticked the box.
 *
 * Without this, a customer with exactly one address can have no default at all, and every consumer
 * downstream has to handle "no default but one address exists" — a state that means nothing.
 */
export const assignFirstAddressAsDefault: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create') return data

  const owner = customerId(data.customer)
  if (!owner) return data

  const existing = await req.payload.count({
    collection: 'addresses',
    overrideAccess: true,
    req,
    where: { customer: { equals: owner } },
  })

  if (existing.totalDocs === 0) {
    return { ...data, isDefault: true }
  }

  return data
}

/** Setting a default clears the previous one. */
export const clearOtherDefaults: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (!doc?.isDefault) return doc

  const owner = customerId(doc.customer)
  if (!owner) return doc

  await req.payload.update({
    collection: 'addresses',
    data: { isDefault: false },
    overrideAccess: true,
    req,
    where: {
      and: [
        { customer: { equals: owner } },
        { id: { not_equals: doc.id } },
        { isDefault: { equals: true } },
      ],
    },
  })

  return doc
}

/**
 * Deleting the default promotes another, if the customer has one left.
 *
 * Most recently created, because that is the likeliest to be current — a customer who has just
 * moved adds the new address and removes the old one, and the new one is the one they want.
 */
export const promoteDefaultAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  if (!doc?.isDefault) return doc

  const owner = customerId(doc.customer)
  if (!owner) return doc

  const remaining = await req.payload.find({
    collection: 'addresses',
    limit: 1,
    overrideAccess: true,
    req,
    sort: '-createdAt',
    where: { customer: { equals: owner } },
  })

  const next = remaining.docs[0]
  if (!next) return doc

  await req.payload.update({
    collection: 'addresses',
    data: { isDefault: true },
    id: next.id,
    overrideAccess: true,
    req,
  })

  return doc
}
