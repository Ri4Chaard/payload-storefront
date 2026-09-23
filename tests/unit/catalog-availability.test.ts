import { describe, expect, it } from 'vitest'

import { isProductAvailable, isVariantAvailable } from '@/lib/catalog/mappers'
import type { Product, Variant } from '@/payload-types'

/**
 * Who may be sold, and how many (spec 011, US1, FR-002, FR-003, FR-005, FR-008).
 *
 * **The rule this file pins used to say the opposite.** `isVariantAvailable` was documented as
 * deciding on the stone's own count "whatever the parent's availability mode says", which meant a
 * made-to-order piece whose stones had never been given a number offered none of them — the owner
 * marked a ring always-available and the page refused to sell it. A stone has no quantity to type
 * in when the piece is made to order, so the honest empty field became an unorderable product.
 *
 * Pure functions over stub documents, so this runs with nothing installed. The stubs carry only the
 * fields the rule reads; `asVariant`/`asProduct` narrow rather than spread `any`, because
 * `no-explicit-any` is an error in this repository.
 */

const asVariant = (value: object): Variant => value as unknown as Variant
const asProduct = (value: object): Product => value as unknown as Product

const stone = (inventory: null | number) => asVariant({ id: 1, inventory })

/** A piece with stones attached the way `productVariants` expects to find them. */
const pieceWith = (availability: Product['availability'], stones: Variant[]) =>
  asProduct({
    id: 1,
    availability,
    enableVariants: true,
    variants: { docs: stones },
  })

describe('a stone, against its piece (FR-002, FR-005)', () => {
  it('is available on a made-to-order piece however empty its quantity', () => {
    expect(isVariantAvailable(stone(0), 'made-to-order')).toBe(true)
    expect(isVariantAvailable(stone(null), 'made-to-order')).toBe(true)
  })

  it('still counts on a stock-tracked piece', () => {
    expect(isVariantAvailable(stone(3), 'stock-tracked')).toBe(true)
    expect(isVariantAvailable(stone(0), 'stock-tracked')).toBe(false)
    expect(isVariantAvailable(stone(null), 'stock-tracked')).toBe(false)
  })

  /**
   * The regression that matters.
   *
   * This is the exact shape the owner reported: made to order, stones added, no quantity typed
   * anywhere. Before this feature every one of them came back `false`.
   */
  it('makes a made-to-order piece with untouched stones fully orderable', () => {
    const piece = pieceWith('made-to-order', [stone(0), stone(null), stone(0)])
    expect(isProductAvailable(piece)).toBe(true)
  })
})

describe('a piece, against its stones (FR-008)', () => {
  it('is unavailable when it is stock tracked and every stone is empty', () => {
    expect(isProductAvailable(pieceWith('stock-tracked', [stone(0), stone(0)]))).toBe(false)
  })

  it('is available when it is stock tracked and one stone is left', () => {
    expect(isProductAvailable(pieceWith('stock-tracked', [stone(0), stone(2)]))).toBe(true)
  })

  /**
   * A made-to-order piece whose every stone has been taken off sale.
   *
   * Unpublished stones never reach the mapper — the storefront reads published-only — so by the
   * time the rule runs, "all withdrawn" looks like "no stones at all". It must fall back to the
   * piece's own mode rather than reporting a selector with nothing in it.
   */
  it('falls back to the piece when no stone survives', () => {
    expect(isProductAvailable(pieceWith('made-to-order', []))).toBe(true)
    expect(
      isProductAvailable(asProduct({ id: 1, availability: 'stock-tracked', inventory: 0 })),
    ).toBe(false)
  })

  it('ignores a count on a made-to-order piece with no stones', () => {
    expect(
      isProductAvailable(asProduct({ id: 1, availability: 'made-to-order', inventory: 0 })),
    ).toBe(true)
  })
})
