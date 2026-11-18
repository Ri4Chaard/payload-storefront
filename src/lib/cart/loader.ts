import { cache } from 'react'

import type { Locale } from '@/i18n/routing'
import { getProductsByIds } from '@/lib/catalog/queries'

import { findCartId, ownerRequest, payloadClient, resolveCartOwner, type CartOwner } from './session'
import { relationId, resolveCart, type RawCartLine } from './totals'
import { emptyCart, type CartView } from './types'

/**
 * The read side (spec 005, T008).
 *
 * Fetches; `./totals.ts` decides. The split is what lets every rule about staleness and money be
 * unit-tested without a database.
 *
 * **It does not render `cart.subtotal`, and that is deliberate.** The plugin does compute a subtotal
 * server-side, so Constitution VI's letter is satisfied by it — but it computes a different number
 * than this page must show. `beforeChangeCart` loops every item and reads `priceIn{currency}` with a
 * bare `findByID`: no `overrideAccess: false`, no status filter. An item whose product has since
 * been unpublished or sold out still contributes. FR-014 requires exactly those excluded, so the
 * drawn "Subtotal" and `cart.subtotal` would disagree the moment anything went stale — and two
 * numbers disagreeing about money is worse than one computed once, in the layer that already knows
 * what *published* and *available* mean. There is a quieter reason too: that hook builds its field
 * name as `priceIn${data.currency}`, so a cart saved without a currency reads `priceInundefined`
 * and silently yields `NaN`. `cart.subtotal` stays useful to the owner in the admin; it is simply
 * not what the storefront draws.
 *
 * **Nothing here writes.** No cart is created, no cookie is set. Creation belongs to `./actions.ts`,
 * because a cookie write during render is refused by Next — the constraint that keeps a page being
 * looked at from creating rows as a side effect.
 */

async function readRows(owner: CartOwner): Promise<null | RawCartLine[]> {
  const cartId = await findCartId(owner)
  if (cartId === null) return null

  const payload = await payloadClient()
  try {
    const cart = await payload.findByID({
      collection: 'carts',
      id: cartId,
      // Only the ids are wanted from here; the products behind them are resolved in one further
      // query by `getProductsByIds`, which is the call that applies the published-access rule.
      depth: 0,
      overrideAccess: false,
      req: ownerRequest(owner),
    })
    return (cart.items ?? []) as RawCartLine[]
  } catch {
    // A cookie naming a cart that has been purged, or a secret that no longer matches. The visitor
    // sees an empty cart rather than an error page, and the stale cookie is replaced by the next
    // action that creates one.
    return null
  }
}

/**
 * The cart, revalidated against the published catalogue.
 *
 * `cache`d so a render asking twice — the page and the summary card — reads once. Per request
 * only; nothing about a cart is cached across requests.
 *
 * Returns an empty view rather than `null` for "no cart", so a caller cannot forget the null and
 * the empty state is an ordinary render rather than a branch.
 */
export const getCart = cache(async (locale: Locale): Promise<CartView> => {
  const owner = await resolveCartOwner()
  const rows = await readRows(owner)
  if (!rows || rows.length === 0) return emptyCart()

  const ids = rows
    .map((row) => relationId(row.product))
    .filter((id): id is number => id !== undefined)

  return resolveCart(rows, await getProductsByIds(ids, locale))
})

/**
 * Just the number, for the badge.
 *
 * **Deliberately does not revalidate.** The badge is a hint; making the header pay for a catalogue
 * re-read on every route would be a poor trade, and the cart page is the authority. Its callers are
 * the mutation actions, which return the fresh count — never a layout, because reading `cookies`
 * there would opt every route into dynamic rendering and cost the prerendered catalogue.
 */
export async function getCartCount(): Promise<number> {
  const owner = await resolveCartOwner()
  const rows = await readRows(owner)
  if (!rows) return 0

  return rows.reduce((count, row) => count + Math.max(0, Math.trunc(row.quantity ?? 0)), 0)
}
