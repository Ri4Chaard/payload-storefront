
import { createCartFor } from './operations'
import { findCartId, ownerRequest, payloadClient, type CartOwner } from './session'
import { relationId, type RawCartLine } from './totals'

/**
 * A guest cart meeting an account cart at sign-in.
 *
 * **The plugin ships a merge and it is wrong for this schema**, which is why this exists.
 * `createCartsCollection` registers `mergeCartEndpoint({ cartsSlug })` — note the absent
 * `cartItemMatcher` — above a comment saying it "uses its own matcher". That matcher,
 * `defaultMergeItemMatcher`, compares product and variant and stops. So a product in size 6 meeting
 * the same product in size 7 becomes one line of quantity two: an order the seller cannot fulfil, and
 * precisely the defect `src/collections/carts.ts` was written to prevent on the `addItem` path,
 * reappearing on a different one. `mergeCart` is not exported from the package root either, so the
 * correct matcher cannot be injected even by calling it directly.
 *
 * FR-005 says the merge must drop nothing from either side. A matcher that collapses two sizes
 * drops a size.
 *
 * **Cookie-free on purpose.** The guest's credential arrives as an argument so this can be tested
 * against a database — the same seam `./operations.ts` draws, and the reason
 * `tests/integration/cart-merge.test.ts` can exist at all. Clearing the cookie afterwards is the
 * caller's job, in `src/lib/auth/actions.ts`.
 */

export interface GuestCredential {
  cartId: number
  secret: string
}

export interface MergeOutcome {
  /** Lines carried across, whether appended or summed into an existing one. */
  merged: number
  /** The account cart everything ended up in. */
  cartId: number
}

/** Reads a cart's rows, or `null` if it cannot be opened at all. */
async function rowsOf(owner: CartOwner, cartId: number): Promise<null | RawCartLine[]> {
  const payload = await payloadClient()
  try {
    const cart = await payload.findByID({
      collection: 'carts',
      id: cartId,
      depth: 0,
      overrideAccess: false,
      req: ownerRequest(owner),
    })
    return (cart.items ?? []) as RawCartLine[]
  } catch {
    return null
  }
}

/** A cart line as it is written back: ids, no row id, and a quantity that is definitely a number. */
interface MergedItem {
  product: number
  quantity: number
  size?: number
  variant?: number
}

/** The write shape: ids, not documents. */
function asNewItem(row: RawCartLine) {
  const product = relationId(row.product)
  const variant = relationId(row.variant)

  return {
    product: product as number,
    quantity: Math.max(1, Math.trunc(row.quantity ?? 1)),
    ...(variant === undefined ? {} : { variant }),
  }
}

/**
 * Carry a guest's lines into the customer's cart, then delete the guest cart.
 *
 * Order matters at the end: the guest cart is deleted only after the account cart has been written.
 * The other way round, a failure between the two loses the lines entirely — and a merge that half
 * happened is the one outcome FR-005 has no words for.
 */
export async function mergeGuestCart(
  customer: CartOwner & { kind: 'customer' },
  guest: GuestCredential,
): Promise<MergeOutcome> {
  const guestOwner: CartOwner = { kind: 'guest', cartId: guest.cartId, secret: guest.secret }
  const payload = await payloadClient()

  const guestRows = await rowsOf(guestOwner, guest.cartId)

  // Nothing to carry: a cookie naming a purged cart, a wrong secret, or an empty basket. The guest
  // cart is still removed where it exists, so a signed-in customer never leaves one behind.
  if (!guestRows || guestRows.length === 0) {
    await payload
      .delete({ collection: 'carts', id: guest.cartId, overrideAccess: true })
      .catch(() => {})

    const existing = await findCartId(customer)
    return { merged: 0, cartId: existing ?? (await createCartFor(customer)).cartId }
  }

  const cartId = (await findCartId(customer)) ?? (await createCartFor(customer)).cartId
  const existingRows = (await rowsOf(customer, cartId)) ?? []

  /**
   * Worked on as plain data and written once. Adding them one at a time through `addItem` would be
   * several round trips and several chances to fail half way.
   *
   * Normalised into the write shape rather than carried as read rows, which does two jobs: the
   * quantity stops being nullable, and **the row ids are dropped**. Carrying a guest cart's row ids
   * into another cart's array is how two lines end up claiming to be the same row.
   */
  const items: MergedItem[] = existingRows
    .map(asNewItem)
    .filter((item): item is MergedItem => typeof item.product === 'number')

  let merged = 0

  for (const guestRow of guestRows) {
    const newItem = asNewItem(guestRow)
    if (typeof newItem.product !== 'number') continue

    /*
      Same product, same variant, same line — the plugin's own rule, applied here by hand because the
      merge works on plain data rather than through `addItem`.

      This used to call a custom `cartItemMatcher` that also compared size. Sizes left in spec 011,
      and with them the only reason the default was not enough.
    */
    const match = items.find(
      (existingItem) =>
        existingItem.product === newItem.product && existingItem.variant === newItem.variant,
    )

    if (match) {
      match.quantity += newItem.quantity
    } else {
      items.push(newItem as MergedItem)
    }
    merged += 1
  }

  await payload.update({
    collection: 'carts',
    id: cartId,
    data: { items },
    overrideAccess: false,
    req: ownerRequest(customer),
  })

  await payload
    .delete({ collection: 'carts', id: guest.cartId, overrideAccess: true })
    .catch(() => {})

  return { merged, cartId }
}
