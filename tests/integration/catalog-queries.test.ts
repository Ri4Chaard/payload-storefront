import { describe, expect, it } from 'vitest'

import { DEFAULT_FILTERS } from '@/lib/catalog/filters'
import {
  PAGE_SIZE,
  getCategories,
  getFilterFacets,
  getListing,
  getProduct,
  getProductSlugs,
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
  getListing({ ...DEFAULT_FILTERS, ...overrides }, 'en')

describe('getListing', () => {
  /**
   * `page` counts how many sets are shown, not which one — the listing EXTENDS. Page three
   * therefore opens with page one's twelve rather than replacing them, which is the property the
   * whole LOAD MORE arrangement rests on: pressing it must never move a card the visitor was
   * already looking at.
   */
  it('extends rather than replacing, and never returns the whole catalogue at once', async () => {
    const first = await listing()
    expect(first.products).toHaveLength(PAGE_SIZE)
    expect(first.total).toBeGreaterThan(PAGE_SIZE * 2)
    expect(first.hasMore).toBe(true)

    const second = await listing({ page: 2 })
    expect(second.page).toBe(2)
    expect(second.products).toHaveLength(PAGE_SIZE * 2)
    expect(second.products.slice(0, PAGE_SIZE)).toEqual(first.products)
  })

  it('runs past the last set without throwing, and says there is no more', async () => {
    const beyond = await listing({ page: 99 })
    expect(beyond.products).toHaveLength(beyond.total)
    expect(beyond.hasMore).toBe(false)
  })

  it('never contains a draft', async () => {
    const everything = await listing({ page: 99 })
    expect(everything.products).toHaveLength(everything.total)
    expect(everything.products.map((product) => product.slug)).not.toContain(
      'unreleased-product',
    )
  })

  it('combines groups with AND and values within a group with OR', async () => {
    const firstCategory = await listing({ category: ['category-1'] })
    const both = await listing({ category: ['category-1', 'category-2'] })
    expect(both.total).toBeGreaterThan(firstCategory.total)

    const narrowed = await listing({ category: ['category-1'], colour: ['clear'] })
    expect(narrowed.total).toBeLessThanOrEqual(firstCategory.total)
  })

  it('sorts by price in both directions, across the whole result and not just the page', async () => {
    const cheapest = await listing({ sort: 'price-asc' })
    const dearest = await listing({ sort: 'price-desc' })
    expect(cheapest.products[0]?.id).not.toBe(dearest.products[0]?.id)

    const ascending = await listing({ sort: 'price-asc', category: ['category-1'] })
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
    const result = await listing({ category: ['category-1'], inStock: true, maxPrice: 730000 })
    expect(result.appliedChips).toEqual([
      { key: 'category', value: 'category-1', label: 'Category 1' },
      { key: 'maxPrice', value: '730000', label: 'Under $7,300' },
      { key: 'inStock', value: '1', label: 'In stock only' },
    ])
  })

  /**
   * Asked over the whole catalogue rather than one category.
   *
   * It used to name `category-4`, which passed against the fixtures because that is where their
   * sold-out product happened to sit. The rule has nothing to do with category 4 — an assertion that
   * depends on WHICH category holds the empty shelf breaks when the shop is restocked, and reports
   * a filter bug when the only thing that changed was a number in the admin.
   *
   * The first line is the load-bearing one: it fails if the catalogue contains nothing unavailable,
   * which would let the second pass by filtering nothing at all.
   */
  it('hides what cannot be ordered only when asked to', async () => {
    const shown = await listing({ page: 99 })
    const orderable = await listing({ page: 99, inStock: true })

    expect(
      shown.products.some((product) => !product.available),
      'nothing in the catalogue is unavailable, so this filter proves nothing',
    ).toBe(true)
    expect(orderable.products.every((product) => product.available)).toBe(true)
    expect(orderable.total).toBeLessThan(shown.total)
  })
})

describe('getProduct', () => {
  it('returns a product by slug', async () => {
    const product = await getProduct('product-1', 'en')
    expect(product?.title).toBe('Product 1')
    expect(product?.variantOptions).toHaveLength(4)
  })

  it('returns null for a draft, exactly as it does for a slug that names nothing', async () => {
    expect(await getProduct('unreleased-product', 'en')).toBeNull()
    expect(await getProduct('no-such-product', 'en')).toBeNull()
  })
})

describe('getProductSlugs', () => {
  /**
   * What the product route prerenders. A draft in this list would get a prerendered page
   * and become reachable by URL — FR-009's leak, arriving through the build rather than a query —
   * so the access rule has to hold on this path too, not only on the one that draws a page.
   */
  it('lists every published slug and no draft', async () => {
    const slugs = await getProductSlugs()

    expect(slugs).toContain('product-1')
    expect(slugs).not.toContain('unreleased-product')
    expect(slugs).toHaveLength((await listing({ page: 99 })).total)
  })
})

describe('getFilterFacets', () => {
  it('offers every option in a group, whatever the category holds', async () => {
    const facets = await getFilterFacets('en', 'category-1')
    expect(facets.colours).toHaveLength(4)
    expect(facets.price.min).toBeLessThan(facets.price.max)
  })

  it('always counts categories over the whole catalogue', async () => {
    const withinRings = await getFilterFacets('en', 'category-1')
    const everywhere = await getFilterFacets('en', 'en')
    expect(withinRings.categories).toEqual(everywhere.categories)
  })
})

describe('getRelated', () => {
  it('returns products sharing a collection, never the product itself', async () => {
    const related = await getRelated(1, 'en')
    expect(related.length).toBeGreaterThan(0)
    expect(related.map((product) => product.id)).not.toContain(1)
  })

  it('returns nothing for a product in no collection, so the band does not render', async () => {
    expect(await getRelated(999, 'en')).toEqual([])
    expect(await getRelated(-1, 'en')).toEqual([])
  })
})

describe('the rest', () => {
  it('orders categories the way the owner arranged them', async () => {
    expect((await getCategories('en')).map((category) => category.slug)).toEqual([
      'category-1',
      'category-2',
      'category-3',
      'category-4',
    ])
  })

  it('reads the shop global', async () => {
    expect((await getShopContent('en')).listingSubtitle).toBeTruthy()
  })
})
