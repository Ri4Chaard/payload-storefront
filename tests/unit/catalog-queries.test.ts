import { describe, expect, it } from 'vitest'

import { DEFAULT_FILTERS } from '@/lib/catalog/filters'
import {
  PAGE_SIZE,
  getCategories,
  getFilterFacets,
  getListing,
  getProduct,
  getRelated,
  getShopContent,
} from '@/lib/catalog/queries'
import type { FilterState } from '@/lib/catalog/types'

/**
 * Contract §3. These are about the rules that have to survive the swap to Payload, not about the
 * fixture contents: that narrowing, sorting and paging all happen INSIDE `getListing`, and that a
 * draft is unreachable by either route into the module.
 */
const listing = (overrides: Partial<FilterState> = {}) =>
  getListing({ ...DEFAULT_FILTERS, ...overrides })

describe('getListing', () => {
  it('pages rather than returning the catalogue', async () => {
    const first = await listing()
    expect(first.products).toHaveLength(PAGE_SIZE)
    expect(first.total).toBeGreaterThan(PAGE_SIZE * 2)
    expect(first.hasMore).toBe(true)

    const third = await listing({ page: 3 })
    expect(third.page).toBe(3)
    expect(third.products.map((product) => product.id)).not.toEqual(
      first.products.map((product) => product.id),
    )
  })

  it('runs past the last page without throwing', async () => {
    const beyond = await listing({ page: 99 })
    expect(beyond.products).toEqual([])
    expect(beyond.hasMore).toBe(false)
  })

  it('never contains a draft', async () => {
    const everything = await listing({ page: 1 })
    const all = await Promise.all(
      Array.from({ length: Math.ceil(everything.total / PAGE_SIZE) }, (_, index) =>
        listing({ page: index + 1 }),
      ),
    )
    const slugs = all.flatMap((result) => result.products.map((product) => product.slug))
    expect(slugs).not.toContain('unreleased-spartan-cuff')
  })

  it('combines groups with AND and values within a group with OR', async () => {
    const rings = await listing({ category: ['rings'] })
    const both = await listing({ category: ['rings', 'bracelets'] })
    expect(both.total).toBeGreaterThan(rings.total)

    const narrowed = await listing({ category: ['rings'], colour: ['clear'] })
    expect(narrowed.total).toBeLessThanOrEqual(rings.total)
  })

  it('sorts by price in both directions, across the whole result and not just the page', async () => {
    const cheapest = await listing({ sort: 'price-asc' })
    const dearest = await listing({ sort: 'price-desc' })
    expect(cheapest.products[0]?.id).not.toBe(dearest.products[0]?.id)

    const ascending = await listing({ sort: 'price-asc', category: ['rings'] })
    const amounts = ascending.products.map((product) => Number(product.price.replace(/[^0-9]/g, '')))
    expect(amounts).toEqual([...amounts].sort((a, b) => a - b))
  })

  it('reports an unknown slug instead of silently emptying the grid', async () => {
    const result = await listing({ category: ['rungs'] })
    expect(result.ignored).toEqual([{ key: 'category', value: 'rungs' }])
    // The filter was dropped, so the grid is the unfiltered one rather than nothing.
    expect(result.total).toBe((await listing()).total)
  })

  it('labels the chips from the catalogue, not from the slug', async () => {
    const result = await listing({ category: ['rings'], inStock: true, maxPrice: 730000 })
    expect(result.appliedChips).toEqual([
      { key: 'category', value: 'rings', label: 'Diamond Rings' },
      { key: 'maxPrice', value: '730000', label: 'Under $7,300' },
      { key: 'inStock', value: '1', label: 'In stock only' },
    ])
  })

  it('hides what cannot be ordered only when asked to', async () => {
    const shown = await listing({ category: ['necklaces'] })
    const orderable = await listing({ category: ['necklaces'], inStock: true })
    expect(shown.products.some((product) => !product.available)).toBe(true)
    expect(orderable.products.every((product) => product.available)).toBe(true)
  })
})

describe('getProduct', () => {
  it('returns a piece by slug', async () => {
    const product = await getProduct('paragon-emerald-cut-diamond-engagement-ring')
    expect(product?.title).toBe('Paragon Emerald Cut Diamond Engagement Ring')
    expect(product?.diamondOptions).toHaveLength(4)
    expect(product?.sizes).toHaveLength(5)
  })

  it('returns null for a draft, exactly as it does for a slug that names nothing', async () => {
    expect(await getProduct('unreleased-spartan-cuff')).toBeNull()
    expect(await getProduct('no-such-piece')).toBeNull()
  })
})

describe('getFilterFacets', () => {
  it('offers every option in a group, whatever the category holds', async () => {
    const facets = await getFilterFacets('rings')
    expect(facets.shapes).toHaveLength(7)
    expect(facets.colours).toHaveLength(4)
    expect(facets.price.min).toBeLessThan(facets.price.max)
  })

  it('offers an option no piece in the category has, rather than hiding it', async () => {
    // Hiding zero-count options makes the drawer change shape as a visitor filters, which loses
    // the option they were reaching for. A zero is the honest answer to "do you have this".
    const facets = await getFilterFacets('bracelets')
    const empty = facets.shapes.filter((option) => option.count === 0)
    expect(empty.length, 'no shape is absent from bracelets — pick a sparser group').toBeGreaterThan(
      0,
    )
    expect(facets.shapes).toHaveLength(7)
  })

  it('always counts categories over the whole catalogue', async () => {
    const withinRings = await getFilterFacets('rings')
    const everywhere = await getFilterFacets()
    expect(withinRings.categories).toEqual(everywhere.categories)
  })
})

describe('getRelated', () => {
  it('returns pieces sharing a collection, never the piece itself', async () => {
    const related = await getRelated(1)
    expect(related.length).toBeGreaterThan(0)
    expect(related.map((product) => product.id)).not.toContain(1)
  })

  it('returns nothing for a piece in no collection, so the band does not render', async () => {
    expect(await getRelated(999)).toEqual([])
    expect(await getRelated(-1)).toEqual([])
  })
})

describe('the rest', () => {
  it('orders categories the way the owner arranged them', async () => {
    expect((await getCategories()).map((category) => category.slug)).toEqual([
      'rings',
      'bracelets',
      'earrings',
      'necklaces',
    ])
  })

  it('reads the shop global', async () => {
    expect((await getShopContent()).listingSubtitle).toBeTruthy()
  })
})
