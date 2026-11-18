import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
} from 'payload'

/**
 * "Exactly one address is the default".
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
 * hook returns immediately for anything that is not becoming the default. `keepOneDefault` is
 * written to preserve that argument rather than to break it — see the condition it turns on.
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

/**
 * A customer is never left with no default at all.
 *
 * FR-031 says exactly one address is the default **at any time**, and every other hook here moves
 * the role from one row to another. This is the one transition that would destroy it instead:
 * clearing the box on the current default, from the modal or from the admin panel, leaves a
 * customer with three addresses and no default — a state nothing downstream can do anything
 * sensible with.
 *
 * **It refuses only when nobody else holds the role**, and that condition is doing more work than
 * it looks. `clearOtherDefaults` un-ticks the previous default by writing to it, which lands right
 * here: a hook that put the value back unconditionally would fight that write, be re-cleared, and
 * ping-pong between the two rows forever — the termination argument at the top of this file assumes
 * a row set to `false` stays `false`. Asking whether another default already exists distinguishes
 * the two cases exactly. During the hand-off, one does; when a customer simply un-ticks, none does.
 *
 * Refusing beats the alternatives. Promoting a replacement would silently pick an address the
 * customer did not choose, and throwing would turn an ordinary edit — fixing a typo in the city,
 * with the box left alone — into an error. So the value is put back, and the Add address modal
 * draws that box checked and disabled when it is editing the current default, so nobody is offered
 * a click that would be reverted.
 */
export const keepOneDefault: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update') return data
  if (originalDoc?.isDefault !== true) return data
  if (data.isDefault !== false) return data

  const owner = customerId(originalDoc.customer)
  if (!owner) return data

  const others = await req.payload.count({
    collection: 'addresses',
    overrideAccess: true,
    req,
    where: {
      and: [
        { customer: { equals: owner } },
        { id: { not_equals: originalDoc.id } },
        { isDefault: { equals: true } },
      ],
    },
  })

  // Somebody else already holds it — this write is the hand-off, not a customer emptying the role.
  if (others.totalDocs > 0) return data

  return { ...data, isDefault: true }
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
