import { describe, expect, it } from 'vitest'

import {
  isProductAvailable,
  toCatalogImage,
  toCategorySummary,
  toProductDetail,
  toProductSummary,
  toShopContent,
} from '@/lib/catalog/mappers'
import { categoryFixtures, productFixtures, shopFixture } from '../fixtures/catalog'
import type { Media, Product } from '@/payload-types'

/**
 * Contract §2. The two behaviours worth testing are the ones that fail quietly in production:
 * narrowing a relationship union at the wrong depth, and answering "is this available" differently
 * in two places.
 */
const bySlug = (slug: string): Product => {
  const found = productFixtures.find((entry) => entry.slug === slug)
  if (!found) throw new Error(`no fixture "${slug}"`)
  return found
}

const first = <T>(list: T[], what: string): T => {
  const [found] = list
  if (found === undefined) throw new Error(`no ${what}`)
  return found
}

const RING = bySlug('product-1')
const BRACELET = bySlug('product-2')
const IN_STOCK = bySlug('product-3')
const SOLD_OUT = bySlug('product-5')

describe('availability is decided once', () => {
  it('is true for a made-to-order piece whatever the count says', () => {
    expect(BRACELET.availability).toBe('made-to-order')
    expect(isProductAvailable(BRACELET)).toBe(true)
  })

  it('is true for a stock-tracked piece above zero', () => {
    expect(isProductAvailable(IN_STOCK)).toBe(true)
  })

  it('is false for a stock-tracked piece at zero — which is still shown', () => {
    expect(isProductAvailable(SOLD_OUT)).toBe(false)
    expect(toProductSummary(SOLD_OUT, 'en').price).toBe('$9,600')
  })

  /**
   * **This assertion was reversed by spec 011, deliberately.**
   *
   * It used to read "follows the stones when a piece has them, not the parent mode", and asserted
   * that a made-to-order ring whose every stone sat at zero was unavailable. That was the defect
   * 011/US1 fixes: a made-to-order piece has no quantity to type into a stone, so the honest empty
   * field made the piece unorderable and nothing on the page said why. The mode now decides, and a
   * count is consulted only where one means something.
   */
  it('lets the piece’s mode decide, and consults counts only when it is stock tracked', () => {
    expect(RING.availability).toBe('made-to-order')
    expect(isProductAvailable(RING)).toBe(true)

    const emptied = (product: Product): Product => ({
      ...product,
      variants: {
        ...product.variants,
        docs: (product.variants?.docs ?? []).map((variant) =>
          typeof variant === 'number' ? variant : { ...variant, inventory: 0 },
        ),
      },
    })

    // Made to order: every stone is offered however empty its quantity (011/FR-002).
    expect(isProductAvailable(emptied(RING))).toBe(true)

    // Stock tracked: the counts govern again, exactly as before (011/FR-005).
    const tracked: Product = { ...RING, availability: 'stock-tracked' }
    expect(isProductAvailable(tracked)).toBe(true)
    expect(isProductAvailable(emptied(tracked))).toBe(false)
  })

  it('never lets a count reach the view model', () => {
    expect(toProductSummary(IN_STOCK, 'en')).not.toHaveProperty('inventory')
    expect(toProductDetail(IN_STOCK, 'en')).not.toHaveProperty('inventory')
  })
})

describe('relationship unions are narrowed, loudly', () => {
  it('reads the populated branch', () => {
    expect(toProductDetail(RING, 'en').categoryName).toBe('Category 1')
    expect(toProductDetail(RING, 'en').categorySlug).toBe('category-1')
  })

  it('throws rather than rendering a blank when the query asked for too little depth', () => {
    const shallow: Product = { ...RING, category: 1 }
    expect(() => toProductDetail(shallow, 'en')).toThrow(/greater depth/)
  })

  it('names the document in the error, so the cause is not three files away', () => {
    const shallow: Product = { ...RING, category: 1 }
    expect(() => toProductDetail(shallow, 'en')).toThrow(/product-1/)
  })
})

describe('prices', () => {
  it('advertises the cheapest stone on the card', () => {
    // Base 38,320 with the free stone; the dearest adds 18,400.
    expect(toProductSummary(RING, 'en').price).toBe('$38,320')
  })

  it('says "from" only when the stones actually differ', () => {
    expect(toProductDetail(RING, 'en').fromPrice).toBe('$38,320')
    expect(toProductDetail(BRACELET, 'en').fromPrice).toBeNull()
  })

  it('orders the stones cheapest first and keeps the one with no count', () => {
    const options = toProductDetail(RING, 'en').variantOptions
    expect(options.map((option) => option.priceMinor)).toEqual([3832000, 4252000, 4792000, 5672000])
    expect(options.at(-1)?.label).toBe('Option D')

    /*
      The ring is made to order, so the stone at zero is offered like every other (011/FR-002) and
      carries no ceiling (011/FR-003). It used to read as sold out here — see the availability block
      above for why that reversed. The claim this test still makes is about ORDER: a stone nobody
      can order today is still listed, in its place in the price ladder, rather than disappearing
      and making the ladder move between two page loads.
    */
    expect(options.at(-1)?.available).toBe(true)
    expect(options.at(-1)?.maxQuantity).toBeUndefined()

    const tracked = toProductDetail({ ...RING, availability: 'stock-tracked' }, 'en')
    expect(tracked.variantOptions.at(-1)?.available).toBe(false)
  })
})

describe('images', () => {
  it('carries intrinsic dimensions through', () => {
    expect(toProductSummary(RING, 'en').images[0]).toEqual({
      src: '/photography/product-1-a.webp',
      width: 1274,
      height: 1600,
      alt: 'Product 1',
    })
  })

  it('drops the alt text for a photograph the admin marked decorative', () => {
    const decorative: Media = { ...first(RING.gallery as Media[], 'photograph'), alt: ' ' }
    expect(toCatalogImage(decorative)).not.toHaveProperty('alt')
  })

  it('returns null for an unpopulated or fileless upload rather than half an image', () => {
    expect(toCatalogImage(7)).toBeNull()
    expect(toCatalogImage(null)).toBeNull()
  })
})

describe('rich text', () => {
  it('serialises the details to HTML and closes over an empty field', () => {
    expect(toProductDetail(RING, 'en').detailsHtml).toContain('our atelier')
    expect(toProductDetail({ ...RING, details: null }, 'en').detailsHtml).toBeNull()
  })

  it('serialises both shop accordions', () => {
    const content = toShopContent(shopFixture)
    expect(content.warrantyHtml).toContain('three years')
    expect(content.deliveryHtml).toContain('3 to 4 weeks')
    expect(content.listingSubtitle).toBe('A short description of this listing')
  })
})

describe('categories', () => {
  it('maps to a listing link and keeps the subtitle', () => {
    const summary = toCategorySummary(first(categoryFixtures, 'category'))
    expect(summary).toEqual({
      id: 1,
      slug: 'category-1',
      title: 'Category 1',
      subtitle: 'A short description of this category',
      href: '/category-1',
      // The home page's tile. `null` here because the fixtures set none, which is the state the
      // band has to survive: an unphotographed category is left out rather than drawn as a hole.
      image: null,
    })
  })

  /** With a photograph, it travels as a `CatalogImage` like every other picture in the catalogue. */
  it('carries the tile photograph when the owner has set one', () => {
    const category = first(categoryFixtures, 'category')
    const summary = toCategorySummary({
      ...category,
      image: {
        id: 99,
        alt: 'Category 1 image',
        url: '/api/media/file/category-1.webp',
        width: 960,
        height: 1040,
        updatedAt: category.updatedAt,
        createdAt: category.createdAt,
      },
    })

    expect(summary.image).toEqual({
      src: '/api/media/file/category-1.webp',
      width: 960,
      height: 1040,
      alt: 'Category 1 image',
    })
  })
})
