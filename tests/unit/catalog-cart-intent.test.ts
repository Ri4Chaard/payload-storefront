import { describe, expect, it } from 'vitest'

import {
  addToCart,
  buyNow,
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
  sizes: [{ id: 20 }, { id: 21 }],
}

const PLAIN_BAND: PurchasableProduct = { id: 2, available: true, diamonds: [], sizes: [] }

const good: CartIntent = { productId: 1, variantId: 10, sizeId: 20, quantity: 1 }

/** Written out rather than destructured off `good`: an optional key has to be ABSENT, not undefined. */
const withoutStone: CartIntent = { productId: 1, sizeId: 20, quantity: 1 }
const withoutSize: CartIntent = { productId: 1, variantId: 10, quantity: 1 }

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

  it('names the size when it has not been chosen', () => {
    expect(validateIntent(withoutSize, RING)).toEqual({ field: 'size', reason: 'missing-option' })
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

  it('refuses a size the piece is not made in', () => {
    expect(validateIntent({ ...good, sizeId: 999 }, RING)).toEqual({
      field: 'size',
      reason: 'missing-option',
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
    expect(keys.sort()).toEqual(['productId', 'quantity', 'sizeId', 'variantId'])

    for (const key of keys) {
      expect(key, `"${key}" looks like money crossing the seam`).not.toMatch(
        /price|amount|total|cost|currency|minor/i,
      )
    }
  })

  it('resolves ok for a good intent, on both actions', async () => {
    await expect(addToCart(good, RING)).resolves.toEqual({ ok: true })
    await expect(buyNow(good, RING)).resolves.toEqual({ ok: true })
  })

  it('reports the reason for a bad one, on both actions', async () => {
    await expect(addToCart(withoutSize, RING)).resolves.toEqual({
      ok: false,
      reason: 'missing-option',
    })
    await expect(buyNow(withoutSize, RING)).resolves.toEqual({
      ok: false,
      reason: 'missing-option',
    })
  })
})
