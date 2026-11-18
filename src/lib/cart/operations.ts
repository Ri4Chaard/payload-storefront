import { addItem, removeItem, updateItem } from '@payloadcms/plugin-ecommerce'

import type { Locale } from '@/i18n/routing'
import { validateIntent, type CartIntent, type PurchasableProduct } from '@/lib/catalog/cart-intent'
import { getProductsByIds } from '@/lib/catalog/queries'
import type { ProductDetail } from '@/lib/catalog/types'

import { ownerLocalReq, ownerRequest, payloadClient, type CartOwner } from './session'
import type { CartOpResult } from './types'

/**
 * Everything a cart mutation does, *given* an owner and a cart.
 *
 * **The seam this file exists to be** is the one `src/lib/auth/login.ts` already established for
 * spec 004: the action above it reads cookies and headers, and everything below it takes what it
 * needs as arguments. That boundary is not tidiness — it is the only reason these rules can be
 * tested against a real database at all, because `cookies()` needs a request scope that a test
 * runner does not have. `tests/integration/us2-sign-in.test.ts` records the same decision from the
 * other side.
 *
 * Nothing here touches `next/headers`, and nothing here decides *who* the caller is. That is
 * `./session.ts`, and it is re-derived per call by `./actions.ts` before any of this runs.
 */

/** What `validateIntent` needs, taken from the published catalogue and never from the caller. */
function purchasable(product: ProductDetail): PurchasableProduct {
  return {
    id: product.id,
    available: product.available,
    variantChoices: product.variantOptions.map((option) => ({
      id: option.id,
      available: option.available,
    })),
  }
}

/**
 * Is this intent one we may honour, and what is the product behind it?
 *
 * The product is read from the **published** catalogue, so unpublished, deleted and never-real are
 * one answer — which is the point. Reading with access overridden would quietly keep selling a
 * product the owner had withdrawn.
 */
export async function checkIntent(
  intent: CartIntent,
  locale: Locale,
): Promise<{ ok: true; product: ProductDetail } | (CartOpResult & { ok: false })> {
  const products = await getProductsByIds([intent.productId], locale)
  const product = products.get(intent.productId)
  if (!product) return { ok: false, reason: 'unavailable', field: 'product' }

  const unmet = validateIntent(intent, purchasable(product))
  if (unmet) return { ok: false, reason: unmet.reason, field: unmet.field }

  return { ok: true, product }
}

/**
 * A new cart for this owner.
 *
 * `secret` comes back only for a guest, and only ever here — the plugin mints it in `beforeChange`
 * and its `afterRead` hook attaches it to the creation response alone. The caller must persist it
 * immediately or the cart is unreachable the moment the request ends.
 */
export async function createCartFor(
  owner: CartOwner,
): Promise<{ cartId: number; secret: null | string }> {
  const payload = await payloadClient()

  if (owner.kind === 'customer') {
    const created = await payload.create({
      collection: 'carts',
      data: { customer: owner.user.id, items: [] },
      overrideAccess: false,
      req: ownerRequest(owner),
    })
    return { cartId: created.id, secret: null }
  }

  const created = await payload.create({
    collection: 'carts',
    data: { items: [] },
    overrideAccess: false,
    req: {},
  })

  const secret = (created as { secret?: unknown }).secret
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new Error('The cart was created without returning its secret; it would be unreachable.')
  }

  return { cartId: created.id, secret }
}

export async function addLine(
  owner: CartOwner,
  cartId: number,
  intent: CartIntent,
): Promise<CartOpResult> {
  const payload = await payloadClient()

  const result = await addItem({
    payload,
    cartsSlug: 'carts',
    cartID: cartId,
    /*
      The plugin's DEFAULT matcher, as of spec 011.

      A custom one used to be passed here because size was a product field rather than a variant
      type, so two sizes of one product would otherwise merge into a quantity of two the seller could
      not fulfil. Sizes are gone; a line is a product and a variant, which is exactly what the default
      compares. See `src/collections/carts.ts`.
    */
    item: {
      product: intent.productId,
      ...(intent.variantId === undefined ? {} : { variant: intent.variantId }),
    },
    quantity: intent.quantity,
    req: await ownerLocalReq(owner),
  })

  return result.success ? { ok: true } : { ok: false, reason: 'not-found' }
}

export async function changeQuantity(
  owner: CartOwner,
  cartId: number,
  lineId: string,
  quantity: number,
): Promise<CartOpResult> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, reason: 'error', field: 'quantity' }
  }

  const payload = await payloadClient()
  const result = await updateItem({
    payload,
    cartsSlug: 'carts',
    cartID: cartId,
    itemID: lineId,
    // A direct value rather than `{ $inc }`, so two rapid clicks converge on what the customer can
    // see instead of compounding into a number nobody asked for.
    quantity,
    // Removal has its own confirmation and must not be reachable by holding the minus key.
    removeOnZero: false,
    req: await ownerLocalReq(owner),
  })

  return result.success ? { ok: true } : { ok: false, reason: 'not-found' }
}

export async function dropLine(
  owner: CartOwner,
  cartId: number,
  lineId: string,
): Promise<CartOpResult> {
  const payload = await payloadClient()
  const result = await removeItem({
    payload,
    cartsSlug: 'carts',
    cartID: cartId,
    itemID: lineId,
    req: await ownerLocalReq(owner),
  })

  return result.success ? { ok: true } : { ok: false, reason: 'not-found' }
}
