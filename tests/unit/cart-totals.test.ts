import { describe, expect, it } from 'vitest'

import { resolveCart, resolveLine, type RawCartLine } from '@/lib/cart/totals'
import { formatPrice } from '@/lib/catalog/price'
import type { ProductDetail } from '@/lib/catalog/types'

/**
 * The cart's arithmetic — [cart-loader.md §5](../../specs/005-checkout-handoff/contracts/cart-loader.md).
 * FR-012, FR-013, FR-015, SC-006.
 *
 * These run without a database on purpose. `src/lib/cart/totals.ts` was split out of the loader so
 * that every rule worth arguing about — which line is stale, which is excluded, what the total is —
 * can be exercised against plain objects. What is left in the loader is fetching, and fetching is
 * what the integration tier is for.
 */

const RING: ProductDetail = {
  id: 1,
  slug: 'ring',
  title: 'Paragon Emerald Cut Diamond Engagement Ring',
  href: '/products/ring',
  madeToOrder: false,
  price: '$24,900',
  images: [{ src: '/ring.webp', width: 800, height: 800 }],
  available: true,
  categoryName: 'Category 1',
  categorySlug: 'category-1',
  priceMinor: 2490000,
  currency: 'USD',
  maxQuantity: undefined,
  description: null,
  gallery: [],
  detailsHtml: null,
  variantOptions: [
    { id: 11, label: 'Option A', price: '$24,900', priceMinor: 2490000, available: true, attributes: [] },
    { id: 12, label: 'Lab 2.0 ct D VVS2', price: '$52,600', priceMinor: 5260000, available: false, attributes: [] },
    {
      id: 13,
      label: 'Option B',
      price: '$38,320',
      priceMinor: 3832000,
      available: true,
      maxQuantity: 2,
      attributes: [],
    },
  ],
  attributes: [],
  fromPrice: null,
  collectionIds: [],
  seo: { title: null, description: null, image: null },
}

/** A piece with no stones and no sizes — priced from the product itself. */
const PENDANT: ProductDetail = {
  ...RING,
  id: 2,
  slug: 'pendant',
  title: 'Butterfly Diamond Pendant',
  href: '/products/pendant',
  priceMinor: 2490000,
  variantOptions: [],
}

const line = (over: Partial<RawCartLine> = {}): RawCartLine => ({
  id: 'row-1',
  product: 1,
  variant: 11,
  quantity: 1,
  ...over,
})

const catalogue = (...products: ProductDetail[]) =>
  new Map(products.map((product) => [product.id, product]))

describe('resolveLine', () => {
  it('prices a line from the chosen stone, not from the piece', () => {
    const { line: resolved } = resolveLine(line({ variant: 13 }), RING)

    expect(resolved.unitMinor).toBe(3832000)
    expect(resolved.unitPrice).toBe('$38,320')
    expect(resolved.variantChoice).toBe('Option B')
  })

  it('prices a piece with no stones from the piece itself', () => {
    const { line: resolved } = resolveLine(
      line({ product: 2, variant: null }),
      PENDANT,
    )

    expect(resolved.unitMinor).toBe(2490000)
    expect(resolved.variantChoice).toBeNull()
  })

  /**
   * The line still renders. Dropping it is what the spec's edge case forbids — a cart that quietly
   * loses a piece is one the customer cannot reason about, and the row still has to be removable.
   */
  it('keeps a line whose product has gone, names it, and gives it nowhere to go', () => {
    const { issues, line: resolved } = resolveLine(line(), undefined)

    expect(resolved.available).toBe(false)
    expect(resolved.href).toBeNull()
    expect(resolved.id).toBe('row-1')
    expect(issues).toEqual([
      expect.objectContaining({ lineId: 'row-1', kind: 'unpublished' }),
    ])
  })

  it('marks a line whose chosen stone is sold out, and says which stone', () => {
    const { issues, line: resolved } = resolveLine(line({ variant: 12 }), RING)

    expect(resolved.available).toBe(false)
    expect(issues[0]?.kind).toBe('unavailable')
    expect(issues[0]?.message).toContain('Lab 2.0 ct D VVS2')
  })

  /**
   * A stone id that names no stone of THIS piece is treated exactly as an unavailable one. It can
   * only arrive from a stale page or a hand-edited request, and neither deserves its own message.
   */
  it('treats a stone that is not on the piece as unavailable', () => {
    const { line: resolved } = resolveLine(line({ variant: 999 }), RING)
    expect(resolved.available).toBe(false)
  })

  it('clamps a quantity above the stone stock and says so', () => {
    const { issues, line: resolved } = resolveLine(line({ variant: 13, quantity: 7 }), RING)

    expect(resolved.quantity).toBe(2)
    expect(issues).toEqual([
      expect.objectContaining({ kind: 'quantity-reduced', message: expect.stringContaining('2') }),
    ])
  })

  it('leaves a made-to-order line uncapped', () => {
    const { issues, line: resolved } = resolveLine(line({ quantity: 40 }), RING)

    expect(resolved.quantity).toBe(40)
    expect(resolved.maxQuantity).toBeUndefined()
    expect(issues).toEqual([])
  })
})

describe('resolveCart', () => {
  it('sums the subtotal from integers and formats it once', () => {
    const view = resolveCart(
      [
        line({ id: 'a', quantity: 2 }),
        line({ id: 'b', product: 2, variant: null, quantity: 1 }),
      ],
      catalogue(RING, PENDANT),
    )

    // 2 × 2,490,000 + 1 × 2,490,000, in minor units, before it ever becomes a string.
    expect(view.subtotal).toBe(formatPrice(2490000 * 3))
    expect(view.itemCount).toBe(3)
    expect(view.empty).toBe(false)
  })

  /**
   * The whole reason the loader does not render `cart.subtotal`: the plugin's hook counts an item
   * whose product has been withdrawn, and this must not.
   */
  it('leaves an unavailable line out of the subtotal and the item count, but not off the page', () => {
    const view = resolveCart(
      [line({ id: 'a', quantity: 1 }), line({ id: 'b', variant: 12, quantity: 5 })],
      catalogue(RING),
    )

    expect(view.lines).toHaveLength(2)
    expect(view.subtotal).toBe(formatPrice(2490000))
    expect(view.itemCount).toBe(1)
    expect(view.issues.map((issue) => issue.kind)).toEqual(['unavailable'])
  })

  it('excludes a vanished product from the total while keeping its row addressable', () => {
    const view = resolveCart([line({ id: 'gone', product: 99 })], catalogue(RING))

    expect(view.lines[0]?.id).toBe('gone')
    expect(view.subtotal).toBe(formatPrice(0))
    expect(view.itemCount).toBe(0)
  })

  it('reports an empty cart rather than a zero-line one', () => {
    const view = resolveCart([], catalogue(RING))

    expect(view.empty).toBe(true)
    expect(view.lines).toEqual([])
    expect(view.itemCount).toBe(0)
    expect(view.subtotal).toBe(formatPrice(0))
  })

  it('skips a row with no id, which no mutation could ever address', () => {
    const view = resolveCart([{ product: 1, variant: 11, quantity: 1 }], catalogue(RING))
    expect(view.empty).toBe(true)
  })

  it('always reports shipping as nothing — it is arranged with the seller', () => {
    const view = resolveCart([line()], catalogue(RING))
    expect(view.shipping).toBe(formatPrice(0))
  })
})

/**
 * Constitution VI, asserted rather than trusted. Every amount above is an integer count of minor
 * units until the last moment; this is the guard that makes a float impossible to render quietly.
 */
describe('money never becomes a float on the way through', () => {
  it('refuses a fractional minor unit instead of rounding it into something plausible', () => {
    expect(() => formatPrice(2490000.5)).toThrow(TypeError)
  })
})
