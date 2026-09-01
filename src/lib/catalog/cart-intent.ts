/**
 * The FR-041 seam (003/T284, contract §6) — where ADD TO CART and BUY NOW go.
 *
 * **This spec builds the calling side, the validation and this signature. Spec 004 builds the
 * body.** Wiring the cart is meant to be one file, and this is that file: everything above it —
 * the selectors, the quantity, the two buttons — is finished and does not change when the cart
 * arrives.
 *
 * **The intent carries identifiers and nothing else.** No price, no title, no formatted string.
 * Constitution VI forbids trusting a client-supplied amount, so the seam passes what the server can
 * resolve for itself. That is not defensive style, it is the rule that stops a DISPLAYED price from
 * becoming a CHARGED one: a page that could name its own total is a page that can be edited to name
 * a smaller one. `T286` asserts the absence rather than trusting it, because an assertion is the
 * only thing that keeps a negative true.
 *
 * **The validation in front of the body is real.** It is what FR-038 and FR-040 specify, it runs
 * here rather than in a component so that both actions and any later caller share one answer, and
 * it is unit-tested here. Only the last step — actually putting a line in a cart — is deferred.
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

/**
 * The body spec 004 replaces.
 *
 * It resolves `{ ok: true }` and does nothing else. That is deliberate and documented rather than
 * thrown: the validation above it is real, so a caller can already tell a good intent from a bad
 * one, and the only missing step is the line in the cart.
 */
async function submit(intent: CartIntent, product: PurchasableProduct): Promise<CartIntentResult> {
  const unmet = validateIntent(intent, product)
  if (unmet) return { ok: false, reason: unmet.reason }

  // 004 puts the line in the cart here. Until then there is nowhere for it to go, and inventing a
  // local basket that the real one would have to reconcile is worse than not having one.
  return { ok: true }
}

export async function addToCart(
  intent: CartIntent,
  product: PurchasableProduct,
): Promise<CartIntentResult> {
  return submit(intent, product)
}

/**
 * Distinct from `addToCart` at the signature even though the bodies agree today, because in 004
 * they diverge: one stays on the page and one leaves for the checkout. A caller written against a
 * single function with a flag would have to be rewritten then; these two do not.
 */
export async function buyNow(
  intent: CartIntent,
  product: PurchasableProduct,
): Promise<CartIntentResult> {
  return submit(intent, product)
}
