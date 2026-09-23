import { describe, expect, it } from 'vitest'

import {
  intentFrom,
  validateIntent,
  type CartIntent,
  type PurchasableProduct,
} from '@/lib/catalog/cart-intent'

/**
 * The FR-041 seam (003/T286, contract §6).
 *
 * Two things are under test and only one of them is the validation. The other is an ABSENCE: the
 * intent must carry no price, and Constitution VI's rule survives only as long as something asserts
 * it. A type cannot — an extra property assigned at a call site is structurally fine — so the shape
 * is inspected at runtime.
 */
const RING: PurchasableProduct = {
  id: 1,
  available: true,
  diamonds: [
    { id: 10, available: true },
    { id: 11, available: false },
  ],
}

const PLAIN_BAND: PurchasableProduct = { id: 2, available: true, diamonds: [] }

const good: CartIntent = { productId: 1, variantId: 10, quantity: 1 }

/** Written out rather than destructured off `good`: an optional key has to be ABSENT, not undefined. */
const withoutStone: CartIntent = { productId: 1, quantity: 1 }

describe('validateIntent', () => {
  it('accepts an intent with every choice made', () => {
    expect(validateIntent(good, RING)).toBeNull()
  })

  it('accepts a piece that offers no choices at all', () => {
    expect(validateIntent({ productId: 2, quantity: 1 }, PLAIN_BAND)).toBeNull()
  })

  it('names the diamond when it has not been chosen', () => {
    expect(validateIntent(withoutStone, RING)).toEqual({
      field: 'diamond',
      reason: 'missing-option',
    })
  })

  /** FR-040 — an unavailable stone is offered, and refused if it is somehow chosen anyway. */
  it('refuses a stone that cannot be bought', () => {
    expect(validateIntent({ ...good, variantId: 11 }, RING)).toEqual({
      field: 'diamond',
      reason: 'unavailable',
    })
  })

  /**
   * A stale page or a hand-edited request. Treated as unavailable rather than given a message of
   * its own — the visitor's remedy is identical either way.
   */
  it('refuses a stone that belongs to no piece', () => {
    expect(validateIntent({ ...good, variantId: 999 }, RING)).toEqual({
      field: 'diamond',
      reason: 'unavailable',
    })
  })


  /**
   * The piece before its parts. A sold-out ring cannot be rescued by choosing a stone for it, and
   * naming the stone would send the visitor to fix the wrong control.
   */
  it('reports the piece, not the stone, when the piece is unavailable', () => {
    const soldOut: PurchasableProduct = {
      ...RING,
      available: false,
      diamonds: [{ id: 10, available: false }],
    }
    expect(validateIntent(good, soldOut)).toEqual({ field: 'product', reason: 'unavailable' })
  })

  it.each([0, -1, 1.5, Number.NaN])('refuses a quantity of %s', (quantity) => {
    expect(validateIntent({ ...good, quantity }, RING)).toEqual({
      field: 'quantity',
      reason: 'error',
    })
  })
})

describe('the intent that crosses the seam', () => {
  /**
   * Constitution VI, asserted rather than trusted. A page that can name its own total is a page
   * that can be edited to name a smaller one, so the amount is never sent — the server resolves it
   * from the identifiers. This test is the only thing keeping that true as the shape grows.
   */
  it('carries identifiers only — never a price', () => {
    const keys = Object.keys(good)
    expect(keys.sort()).toEqual(['productId', 'quantity', 'variantId'])

    for (const key of keys) {
      expect(key, `"${key}" looks like money crossing the seam`).not.toMatch(
        /price|amount|total|cost|currency|minor/i,
      )
    }
  })

  /**
   * The two cases that used to sit here — that a good intent resolves and a bad one reports its
   * reason — moved with the code they were about. Spec 005 T011 removed the placeholder `addToCart`
   * and `buyNow` wrappers from this module: a cart mutation has to be a Server Action, so the body
   * they were holding open went to `src/lib/cart/actions.ts`, and forwarding wrappers would have
   * meant a two-file import cycle for no gain.
   *
   * They are now asserted against the real action and a real database, in
   * `tests/integration/cart-operations.test.ts` — a stronger claim than the one made here, since
   * the placeholder resolved `{ ok: true }` without a cart existing at all.
   */
})

/**
 * The intent that crosses the seam.
 *
 * **This block used to be about the size trap** (spec 005, T015, research R16), and the trap went
 * with the sizes in spec 011. Two selects sat beside each other on the product page using opposite
 * conventions — the stone's options carried `String(option.id)` with a handler doing
 * `Number(value)`, the size's carried `option.value`, a label — so `Number("6.5")` produced `6.5`:
 * not an id, not an error, and stored as a broken relationship. There is one select now.
 *
 * What remains is worth keeping: the intent is assembled in one tested place rather than in three
 * lines of a component, and a choice nobody made is omitted rather than sent as a placeholder.
 */
describe('intentFrom', () => {
  it('carries the stone id through as it stands', () => {
    const intent = intentFrom({ productId: 1, quantity: 2, diamondId: 11 })

    expect(intent).toEqual({ productId: 1, quantity: 2, variantId: 11 })
  })

  it('omits a choice that has not been made rather than sending a placeholder', () => {
    const intent = intentFrom({ productId: 1, quantity: 1, diamondId: null })

    expect(intent).toEqual({ productId: 1, quantity: 1 })
    expect('variantId' in intent).toBe(false)
  })
})
