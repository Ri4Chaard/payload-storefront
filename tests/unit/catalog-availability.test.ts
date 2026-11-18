import { describe, expect, it } from 'vitest'

import { isProductAvailable, isVariantAvailable } from '@/lib/catalog/mappers'
import type { Product, Variant } from '@/payload-types'

/**
 * Who may be sold, and how many (spec 011, US1, FR-002, FR-003, FR-005, FR-008).
 *
 * **The rule this file pins used to say the opposite.** `isVariantAvailable` was documented as
 * deciding on the option's own count "whatever the parent's availability mode says", which meant a
 * made-to-order product whose options had never been given a number offered none of them — the owner
 * marked a product always-available and the page refused to sell it. An option has no quantity to type
 * in when the product is made to order, so the honest empty field became an unorderable product.
 *
 * Pure functions over stub documents, so this runs with nothing installed. The stubs carry only the
 * fields the rule reads; `asVariant`/`asProduct` narrow rather than spread `any`, because
 * `no-explicit-any` is an error in this repository.
 */

const asVariant = (value: object): Variant => value as unknown as Variant
const asProduct = (value: object): Product => value as unknown as Product

const option = (inventory: null | number) => asVariant({ id: 1, inventory })

/** A product with options attached the way `productVariants` expects to find them. */
const productWith = (availability: Product['availability'], options: Variant[]) =>
  asProduct({
    id: 1,
    availability,
    enableVariants: true,
    variants: { docs: options },
  })

describe('an option, against its product (FR-002, FR-005)', () => {
  it('is available on a made-to-order product however empty its quantity', () => {
    expect(isVariantAvailable(option(0), 'made-to-order')).toBe(true)
    expect(isVariantAvailable(option(null), 'made-to-order')).toBe(true)
  })

  it('still counts on a stock-tracked product', () => {
    expect(isVariantAvailable(option(3), 'stock-tracked')).toBe(true)
    expect(isVariantAvailable(option(0), 'stock-tracked')).toBe(false)
    expect(isVariantAvailable(option(null), 'stock-tracked')).toBe(false)
  })

  /**
   * The regression that matters.
   *
   * This is the exact shape the owner reported: made to order, options added, no quantity typed
   * anywhere. Before this feature every one of them came back `false`.
   */
  it('makes a made-to-order product with untouched options fully orderable', () => {
    const product = productWith('made-to-order', [option(0), option(null), option(0)])
    expect(isProductAvailable(product)).toBe(true)
  })
})

describe('a product, against its options (FR-008)', () => {
  it('is unavailable when it is stock tracked and every option is empty', () => {
    expect(isProductAvailable(productWith('stock-tracked', [option(0), option(0)]))).toBe(false)
  })

  it('is available when it is stock tracked and one option is left', () => {
    expect(isProductAvailable(productWith('stock-tracked', [option(0), option(2)]))).toBe(true)
  })

  /**
   * A made-to-order product whose every option has been taken off sale.
   *
   * Unpublished options never reach the mapper — the storefront reads published-only — so by the
   * time the rule runs, "all withdrawn" looks like "no options at all". It must fall back to the
   * product's own mode rather than reporting a selector with nothing in it.
   */
  it('falls back to the product when no option survives', () => {
    expect(isProductAvailable(productWith('made-to-order', []))).toBe(true)
    expect(
      isProductAvailable(asProduct({ id: 1, availability: 'stock-tracked', inventory: 0 })),
    ).toBe(false)
  })

  it('ignores a count on a made-to-order product with no options', () => {
    expect(
      isProductAvailable(asProduct({ id: 1, availability: 'made-to-order', inventory: 0 })),
    ).toBe(true)
  })
})
