/**
 * What a chosen piece is, and whether it may be bought (003/T284, contract §6).
 *
 * **The seam this file opened has been consumed** (spec 005, T011). Spec 003 left `addToCart`,
 * `buyNow` and an empty `submit` here, holding a shape for the cart to arrive into. The cart has
 * arrived, and the body went to `src/lib/cart/actions.ts` rather than into those wrappers, for a
 * reason worth recording:
 *
 * - **A cart mutation must be a Server Action**, so it lives in a `'use server'` module. Had these
 *   wrappers stayed and called into that module, the two files would import each other — a cycle
 *   between a `'use server'` module and its caller, which is fragile in a way no comment fixes.
 * - **Forwarding wrappers would have been a second name for one thing**, which Principle II treats
 *   as the duplication to avoid rather than the seam to keep. Nothing in `src/` ever imported them:
 *   the product page's buttons were disabled, so there was no caller to protect.
 *
 * What stays is the half that was always pure and always right: the intent's shape, and the rule
 * deciding whether one may be honoured. `src/lib/cart/actions.ts` calls `validateIntent` below
 * before it touches a cart, on the server, on every request.
 *
 * **The intent carries identifiers and nothing else.** No price, no title, no formatted string.
 * Constitution VI forbids trusting a client-supplied amount, so the seam passes what the server can
 * resolve for itself. That is not defensive style, it is the rule that stops a DISPLAYED price from
 * becoming a CHARGED one: a page that could name its own total is a page that can be edited to name
 * a smaller one. `T286` asserts the absence rather than trusting it, because an assertion is the
 * only thing that keeps a negative true.
 *
 * **The validation is real, and it is not the component's.** It runs on the server, inside the
 * action, so that ADD TO CART, BUY NOW and any later caller share one answer — and so that a
 * request arriving without going near the interface is checked exactly as hard as one that did.
 * It is unit-tested here; the action that calls it is tested against a database.
 */

/** What the customer has chosen, as identifiers the server can resolve. */
export interface CartIntent {
  productId: number
  /** The chosen stone. Absent where the piece offers none. */
  variantId?: number
  /** The chosen size's id. Absent where the piece offers none. */
  sizeId?: number
  quantity: number
}

export type CartIntentFailure = 'unavailable' | 'missing-option' | 'error'

export type CartIntentResult = { ok: true } | { ok: false; reason: CartIntentFailure }

/**
 * What the piece requires and what it can currently supply — read from the catalogue by the
 * caller, never from the intent, because an intent is client-supplied and this is what checks it.
 */
export interface PurchasableProduct {
  id: number
  available: boolean
  /** Stone ids the piece offers, and whether each can currently be bought. */
  diamonds: { id: number; available: boolean }[]
  /** Size ids the piece offers. Sizes carry no stock of their own (003/research.md R3). */
  sizes: { id: number }[]
}

/**
 * Which choice has not been made, or which one cannot be honoured. `null` means the intent is good.
 *
 * Returns the FIELD rather than a sentence: FR-038 says the refusal must NAME the unmade choice,
 * and the words belong to the interface that has to announce them, in whatever language it is
 * speaking. A message built here would be a string this module cannot translate and the caller
 * cannot reword.
 */
export type UnmetRequirement =
  | { field: 'product'; reason: 'unavailable' }
  | { field: 'diamond'; reason: 'missing-option' | 'unavailable' }
  | { field: 'size'; reason: 'missing-option' }
  | { field: 'quantity'; reason: 'error' }

export function validateIntent(
  intent: CartIntent,
  product: PurchasableProduct,
): UnmetRequirement | null {
  // The piece first. A sold-out piece cannot be rescued by choosing a stone for it, and reporting
  // the stone would send the visitor to fix the wrong control.
  if (!product.available) return { field: 'product', reason: 'unavailable' }

  if (product.diamonds.length > 0) {
    if (intent.variantId === undefined) return { field: 'diamond', reason: 'missing-option' }

    const chosen = product.diamonds.find((diamond) => diamond.id === intent.variantId)
    // An id that names no stone of THIS piece is treated exactly as an unavailable one. It can only
    // arrive from a stale page or a hand-edited request, and neither deserves a distinct message.
    if (!chosen || !chosen.available) return { field: 'diamond', reason: 'unavailable' }
  }

  if (product.sizes.length > 0) {
    if (intent.sizeId === undefined) return { field: 'size', reason: 'missing-option' }
    if (!product.sizes.some((size) => size.id === intent.sizeId)) {
      return { field: 'size', reason: 'missing-option' }
    }
  }

  if (!Number.isInteger(intent.quantity) || intent.quantity < 1) {
    return { field: 'quantity', reason: 'error' }
  }

  return null
}
