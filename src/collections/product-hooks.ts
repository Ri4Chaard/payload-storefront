import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'

/**
 * Hooks for `products` and `variants`.
 *
 * Both exist for one reason: a variant cannot see its parent. `admin.condition` is synchronous and
 * receives only the document being edited (`payload/dist/fields/config/types.d.ts:111`), so a variant
 * holding its product as an id has no way to ask what mode that product is in — and FR-001 says the
 * quantity field must not be offered on a made-to-order product.
 *
 * So the parent tells it. `variants.availability` is a mirror of the product's own value, written
 * here and read only by the admin form.
 *
 * **The storefront never reads that mirror.** `src/lib/catalog/mappers.ts` has the parent product in
 * hand when it maps its variants and takes availability from there, so a mirror that somehow fell
 * out of step could misdraw a form in the admin but could never sell something that should not be
 * for sale. That is the constraint that makes a denormalised column acceptable at all.
 *
 * **On recursion**: neither hook reads what the other writes. `cascadeAvailability` writes to
 * variants and fires on products; `stampAvailability` reads a product and fires on variants. The
 * ping-pong that `clearOtherDefaults` in `src/fields/address-hooks.ts` had to argue its way out of
 * cannot arise here.
 */

/** The `product` value arrives as an id or as a populated document, depending on depth. */
function productId(value: unknown): null | number | string {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

/**
 * A product's availability reaches every variant it already has.
 *
 * **Only when the value actually changed.** A product is saved on every edit — a typo in the title,
 * a new photograph — and rewriting every variant each time would turn one save into six, each with
 * its own hooks and its own revalidation. Comparing against `previousDoc` is what keeps this to the
 * handful of saves that mean anything.
 */
export const cascadeAvailability: CollectionAfterChangeHook = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  if (operation !== 'update') return doc
  if (previousDoc?.availability === doc.availability) return doc

  await req.payload.update({
    collection: 'variants',
    data: { availability: doc.availability },
    overrideAccess: true,
    req,
    where: { product: { equals: doc.id } },
  })

  return doc
}

/**
 * A variant is stamped with its parent's mode as it is created.
 *
 * Without this, a variant added to a product that is ALREADY made to order would be born with no
 * availability at all — `cascadeAvailability` only fires when a product changes, and nothing about
 * the product changes when a variant is added to it. The result would be a quantity field appearing
 * on exactly the variants an owner adds in the ordinary way, which is the common case rather than an
 * edge one.
 *
 * On update it re-reads rather than trusting what arrived: the field is `readOnly` in the admin, but
 * a `readOnly` field is a UI affordance and the REST API does not honour it.
 */
export const stampAvailability: CollectionBeforeChangeHook = async ({ data, req }) => {
  const owner = productId(data.product)
  if (!owner) return data

  const product = await req.payload.findByID({
    collection: 'products',
    depth: 0,
    disableErrors: true,
    id: owner,
    overrideAccess: true,
    req,
  })

  if (!product) return data

  return { ...data, availability: product.availability }
}
