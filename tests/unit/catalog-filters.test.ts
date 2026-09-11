import { describe, expect, it } from 'vitest'

import {
  DEFAULT_FILTERS,
  applyChange,
  dropIdlePriceEnds,
  hasActiveFilters,
  parseFilters,
  removeFilter,
  toQueryString,
  toSearchParams,
  toggleFilter,
} from '@/lib/catalog/filters'
import type { FilterState } from '@/lib/catalog/types'

/**
 * Contract §4. Round-tripping is the first test because it is the property the whole module exists
 * for: the drawer's no-JavaScript submit and its interactive counterpart have to land on the same
 * URL, and they only do if writing and reading are exact inverses.
 */
const FULL: FilterState = {
  category: ['rings', 'earrings'],
  collection: ['molten'],
  size: ['2.25', '2.5'],
  colour: ['black', 'clear'],
  shape: ['pear', 'round'],
  minPrice: 120000,
  maxPrice: 730000,
  inStock: true,
  sort: 'price-asc',
  page: 3,
}

describe('the filter URL round-trips', () => {
  it('returns a fully populated state unchanged', () => {
    expect(parseFilters(toSearchParams(FULL)).filters).toEqual(FULL)
  })

  it('returns the default state unchanged, through an empty query', () => {
    expect(toQueryString(DEFAULT_FILTERS)).toBe('')
    expect(parseFilters(new URLSearchParams()).filters).toEqual(DEFAULT_FILTERS)
  })

  it('reads the record shape a route receives as well as URLSearchParams', () => {
    const { filters } = parseFilters({ colour: ['black', 'clear'], sort: 'newest', page: '2' })
    expect(filters.colour).toEqual(['black', 'clear'])
    expect(filters.sort).toBe('newest')
    expect(filters.page).toBe(2)
  })
})

describe('defaults are absent from the URL', () => {
  it('writes neither page 1, nor the recommended sort, nor an off stock toggle', () => {
    expect(
      toQueryString({ ...DEFAULT_FILTERS, page: 1, sort: 'recommended', inStock: false }),
    ).toBe('')
  })

  it('writes them once they leave their default', () => {
    expect(toQueryString({ ...DEFAULT_FILTERS, page: 2 })).toBe('?page=2')
    expect(toQueryString({ ...DEFAULT_FILTERS, inStock: true })).toBe('?inStock=1')
  })

  it('orders keys the same way whatever order the state was assembled in', () => {
    const a = toQueryString({ ...DEFAULT_FILTERS, colour: ['black'], category: ['rings'] })
    const b = toQueryString({ ...DEFAULT_FILTERS, category: ['rings'], colour: ['black'] })
    expect(a).toBe(b)
    expect(a).toBe('?category=rings&colour=black')
  })
})

describe('unknown values are dropped and reported', () => {
  it('drops a colour the schema does not have', () => {
    const { filters, dropped } = parseFilters({ colour: ['black', 'purple'] })
    expect(filters.colour).toEqual(['black'])
    expect(dropped).toEqual([{ key: 'colour', value: 'purple' }])
  })

  it('drops an unknown sort rather than sorting by nothing', () => {
    const { filters, dropped } = parseFilters({ sort: 'cheapest' })
    expect(filters.sort).toBe('recommended')
    expect(dropped).toEqual([{ key: 'sort', value: 'cheapest' }])
  })

  it('drops a price that is not a whole count of minor units', () => {
    const { filters, dropped } = parseFilters({ maxPrice: '73.00', minPrice: '-5' })
    expect(filters.maxPrice).toBeUndefined()
    expect(filters.minPrice).toBeUndefined()
    expect(dropped).toHaveLength(2)
  })

  it('drops both ends of a reversed range instead of quietly swapping them', () => {
    const { filters, dropped } = parseFilters({ minPrice: '900000', maxPrice: '100000' })
    expect(filters.minPrice).toBeUndefined()
    expect(filters.maxPrice).toBeUndefined()
    expect(dropped.map((entry) => entry.key)).toEqual(['minPrice', 'maxPrice'])
  })

  it('ignores keys that are not filters at all, silently', () => {
    const { filters, dropped } = parseFilters({ utm_source: 'newsletter', category: ['rings'] })
    expect(filters.category).toEqual(['rings'])
    expect(dropped).toEqual([])
  })

  it('collapses a repeated value to one filter', () => {
    expect(parseFilters({ size: ['2.25', '2.25'] }).filters.size).toEqual(['2.25'])
  })

  it('keeps an unknown category — only the catalogue can judge that one', () => {
    const { filters, dropped } = parseFilters({ category: ['rungs'] })
    expect(filters.category).toEqual(['rungs'])
    expect(dropped).toEqual([])
  })
})

describe('removeFilter', () => {
  it('strips one value from a group and leaves the rest', () => {
    expect(removeFilter(FULL, 'category', 'rings').category).toEqual(['earrings'])
  })

  it('returns to page one, so widening a search cannot land on an empty page', () => {
    expect(removeFilter(FULL, 'colour', 'black').page).toBe(1)
  })

  it('clears a price end and the stock toggle outright', () => {
    expect(removeFilter(FULL, 'maxPrice').maxPrice).toBeUndefined()
    expect(removeFilter(FULL, 'inStock').inStock).toBe(false)
  })

  it('does not mutate the state it was given', () => {
    const before = structuredClone(FULL)
    removeFilter(FULL, 'category', 'rings')
    expect(FULL).toEqual(before)
  })
})

describe('hasActiveFilters', () => {
  it('is false for the default state and true for anything narrowed', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'newest', page: 4 })).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, inStock: true })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, minPrice: 1 })).toBe(true)
  })
})

describe('toggleFilter', () => {
  it('adds a value that is absent and removes one that is present', () => {
    const on = toggleFilter(DEFAULT_FILTERS, 'shape', 'oval')
    expect(on.shape).toEqual(['oval'])
    expect(toggleFilter(on, 'shape', 'oval').shape).toEqual([])
  })

  it('returns to page one, because a narrower grid may not have the page you are standing on', () => {
    expect(toggleFilter({ ...DEFAULT_FILTERS, page: 4 }, 'colour', 'black').page).toBe(1)
  })

  it('leaves every other group alone', () => {
    const filters = { ...DEFAULT_FILTERS, category: ['rings'], colour: ['black' as const] }
    expect(toggleFilter(filters, 'size', '2.5')).toMatchObject({
      category: ['rings'],
      colour: ['black'],
      size: ['2.5'],
    })
  })
})

describe('applyChange', () => {
  it('patches and returns to page one', () => {
    const next = applyChange({ ...DEFAULT_FILTERS, page: 7 }, { sort: 'price-desc' })
    expect(next.sort).toBe('price-desc')
    expect(next.page).toBe(1)
  })
})

/**
 * A price range is drawn as ONE chip, so dismissing it has to clear both ends. Removing only the
 * end that was named would leave half a filter applied under a chip that has gone.
 */
describe('removeFilter, on a price range', () => {
  it('clears both ends whichever one is named', () => {
    const ranged = { ...DEFAULT_FILTERS, minPrice: 120_000, maxPrice: 730_000 }
    for (const named of ['minPrice', 'maxPrice'] as const) {
      const next = removeFilter(ranged, named)
      expect(next.minPrice).toBeUndefined()
      expect(next.maxPrice).toBeUndefined()
      expect(toQueryString(next)).toBe('')
    }
  })
})

/**
 * The slider always submits both of its ends, so an end left where the catalogue already stops is
 * a value that removes nothing. Judged one end at a time, which is what produces the drawn
 * "Up to $7,300" chip rather than "$1,200 – $7,300".
 */
describe('dropIdlePriceEnds', () => {
  const BOUNDS = { min: 120_000, max: 3_840_000 }

  it('drops both ends of an untouched slider', () => {
    const submitted = { ...DEFAULT_FILTERS, minPrice: 120_000, maxPrice: 3_840_000 }
    const settled = dropIdlePriceEnds(submitted, BOUNDS)
    expect(settled.minPrice).toBeUndefined()
    expect(settled.maxPrice).toBeUndefined()
  })

  it('keeps the end that moved and drops the one that did not', () => {
    const submitted = { ...DEFAULT_FILTERS, minPrice: 120_000, maxPrice: 730_000 }
    const settled = dropIdlePriceEnds(submitted, BOUNDS)
    expect(settled.minPrice).toBeUndefined()
    expect(settled.maxPrice).toBe(730_000)
  })

  /** The control rounds the ends outward to a whole step, so a handle can sit past the bound. */
  it('drops an end that sits beyond its bound', () => {
    const submitted = { ...DEFAULT_FILTERS, minPrice: 120_000, maxPrice: 3_850_000 }
    expect(dropIdlePriceEnds(submitted, BOUNDS).maxPrice).toBeUndefined()
  })

  it('leaves a genuine range alone', () => {
    const submitted = { ...DEFAULT_FILTERS, minPrice: 200_000, maxPrice: 730_000 }
    expect(dropIdlePriceEnds(submitted, BOUNDS)).toMatchObject({
      minPrice: 200_000,
      maxPrice: 730_000,
    })
  })
})
