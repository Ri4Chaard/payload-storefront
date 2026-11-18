import { describe, expect, it } from 'vitest'

import { DEFAULT_FILTERS } from '@/lib/catalog/filters'
import { ALL_PRODUCTS, canonicalListing, listingHref } from '@/lib/catalog/listing-url'
import type { FilterState } from '@/lib/catalog/types'

/**
 * The one rule this module exists for: a single category is a PATH, and everything else is a query.
 * Two addresses for one grid is two cache entries, two indexed pages and two answers to "what is
 * the canonical URL of the category-1 listing".
 */
const CATEGORIES = [
  { slug: 'category-1', href: '/category-1' },
  { slug: 'category-2', href: '/category-2' },
]

const state = (patch: Partial<FilterState> = {}): FilterState => ({ ...DEFAULT_FILTERS, ...patch })

describe('listingHref', () => {
  it('puts a single category in the path and leaves it out of the query', () => {
    expect(listingHref(state({ category: ['category-1'] }), CATEGORIES)).toBe('/category-1')
    expect(listingHref(state({ category: ['category-1'], colour: ['black'] }), CATEGORIES)).toBe(
      '/category-1?colour=black',
    )
  })

  it('is the whole shop when no category is applied', () => {
    expect(listingHref(state(), CATEGORIES)).toBe(ALL_PRODUCTS)
  })

  /** There is no route for "category 1 and category 2", and inventing one is a page per combination. */
  it('keeps two categories in the query, on the shop-wide route', () => {
    expect(listingHref(state({ category: ['category-1', 'category-2'] }), CATEGORIES)).toBe(
      '/all-products?category=category-1&category=category-2',
    )
  })

  /** A slug the catalogue does not have has no path to move into, so it stays where it can be seen
   * and reported. */
  it('leaves an unknown category in the query', () => {
    expect(listingHref(state({ category: ['rungs'] }), CATEGORIES)).toBe(
      '/all-products?category=rungs',
    )
  })

  it('carries the page, the sort and the price through either branch', () => {
    const filters = state({ category: ['category-1'], sort: 'price-asc', maxPrice: 730_000, page: 3 })
    expect(listingHref(filters, CATEGORIES)).toBe('/category-1?maxPrice=730000&sort=price-asc&page=3')
  })
})

describe('canonicalListing', () => {
  /** `requested` and `settled` are the same state wherever the route changed nothing. */
  const asked = (filters: FilterState, dropped: readonly unknown[] = []) =>
    canonicalListing(filters, filters, CATEGORIES, dropped)

  it('moves a known single category out of the query and into the path', () => {
    expect(asked(state({ category: ['category-1'] }))).toBe('/category-1')
  })

  it('is null when the address is already right', () => {
    expect(asked(state())).toBeNull()
    expect(asked(state({ category: ['category-1', 'category-2'] }))).toBeNull()
    expect(asked(state({ colour: ['green'] }))).toBeNull()
  })

  /**
   * The no-JavaScript submit attaches both ends of an untouched slider. The route drops them, and
   * this is what sends the visitor on to the address without them — which is the address a scripted
   * visitor would have produced.
   */
  it('drops a price range the route settled away', () => {
    const requested = state({ colour: ['green'], minPrice: 120_000, maxPrice: 3_840_000 })
    const settled = state({ colour: ['green'] })
    expect(canonicalListing(requested, settled, CATEGORIES, [])).toBe('/all-products?colour=green')
  })

  /** And once there, it stops: the two states agree and there is nothing left to redirect to. */
  it('does not cycle', () => {
    const settled = state({ colour: ['green'] })
    expect(canonicalListing(settled, settled, CATEGORIES, [])).toBeNull()
  })

  /**
   * The redirect rewrites the query from the PARSED state, which is exactly where a dropped value
   * would disappear. A URL with something to report has to stay put and report it.
   */
  it('refuses to move a URL that has a dropped value to report', () => {
    expect(asked(state({ category: ['category-1'] }), [{ key: 'colour', value: 'puce' }])).toBeNull()
  })
})
