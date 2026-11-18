/**
 * Filter state and its URL (003/T233, contract §4).
 *
 * Pure and symmetrical: `parseFilters` reads a listing URL, `toSearchParams` writes one, and
 * round-tripping any state through both returns it unchanged. That symmetry is what makes FR-029
 * — filtering with JavaScript disabled — the same code path as the interactive one rather than a
 * second implementation: the drawer is a `<form method="GET">` whose control names are the keys
 * below, so the browser's own submit produces exactly the URL this module would have written.
 *
 * **Absent means default.** `page=1`, `sort=recommended` and `inStock=0` are never written. One
 * listing therefore has one URL, which is what makes it cacheable and what stops two links to the
 * same grid looking like two pages to a crawler.
 *
 * **Unknown values are dropped and the drop is reported**. This module can only judge the
 * closed sets — sort and the numbers. Whether `category=rungs` names a real category, or whether
 * `?shape=round` names a real attribute and value, depends on the catalogue, so `getListing`
 * finishes the job and merges its own drops into the same list.
 *
 * **Every key the listing does not own is an attribute.** `?colour=black&shape=round` is
 * `{ attributes: { colour: ['black'], shape: ['round'] } }` — the owner names the keys in the admin,
 * so this module cannot list them. A key that is not kebab-case cannot be an attribute's name
 * (the admin refuses one), so `utm_source` and friends are not mistaken for filters.
 */

import { KEBAB_CASE, RESERVED_FILTER_KEYS } from './reserved-keys'
import {
  SORT_ORDERS,
  type DroppedFilter,
  type FilterState,
  type ParsedFilters,
  type SortOrder,
} from './types'

export const DEFAULT_SORT: SortOrder = 'recommended'

/**
 * The four orderings, worded as the sort menu draws them (node 225:1854).
 *
 * Here rather than beside the menu because the chip row names the ordering too, and a chip reading
 * "Newest" beside a menu reading "Most recent" is one label written twice. The drawing's own chip
 * says `Best selling`, which is not one of the four — spec inconsistency 1, resolved in favour of
 * the menu.
 */
export const SORT_LABELS: Record<SortOrder, string> = {
  recommended: 'Recommended',
  'price-asc': 'Price Ascending',
  'price-desc': 'Price Descending',
  newest: 'Newest',
}

/** The empty listing — every key at its default, which is also the state that writes no query. */
export const DEFAULT_FILTERS: FilterState = {
  category: [],
  attributes: {},
  inStock: false,
  sort: DEFAULT_SORT,
  page: 1,
}

/**
 * Next.js hands a route `Record<string, string | string[] | undefined>`; a form submit and a client
 * navigation both produce `URLSearchParams`. Accepting either is what lets one function serve the
 * server render and the drawer.
 */
export type SearchParamsInput = URLSearchParams | Record<string, string | string[] | undefined>

function keysOf(input: SearchParamsInput): string[] {
  if (input instanceof URLSearchParams) return [...new Set(input.keys())]
  return Object.keys(input).filter((key) => input[key] !== undefined)
}

const isReserved = (key: string): boolean => (RESERVED_FILTER_KEYS as readonly string[]).includes(key)

/** Whether a query key could be an attribute's name at all. Whether it IS one is the catalogue's call. */
export const isAttributeKey = (key: string): boolean => !isReserved(key) && KEBAB_CASE.test(key)

function valuesFor(input: SearchParamsInput, key: string): string[] {
  if (input instanceof URLSearchParams) return input.getAll(key)
  const raw = input[key]
  if (raw === undefined) return []
  return Array.isArray(raw) ? raw : [raw]
}

/** Duplicates collapse and order is kept — `?colour=black&colour=black` is one filter. */
function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))]
}

/**
 * Digits and nothing else. `Number()` would accept `73.00`, `1e5` and ` 5 ` and hand back a value
 * that passes `Number.isInteger` — and `maxPrice=73.00` in an address bar means dollars, written by
 * someone who did not know the units. Reading it as 73 minor units returns an empty grid for a
 * search that looked reasonable, so the shape of the string is checked rather than its value.
 */
const DIGITS = /^\d+$/

/**
 * Money in a URL is an integer count of minor units, because the alternative is parsing `$7,300`
 * out of an address bar and getting it wrong in one locale out of three. Anything else is reported
 * rather than coerced — `maxPrice=abc` silently becoming `NaN` and then "no results" is the worst
 * of the available failures.
 */
function parseAmount(
  input: SearchParamsInput,
  key: 'minPrice' | 'maxPrice',
  dropped: DroppedFilter[],
): number | undefined {
  const [value] = valuesFor(input, key)
  if (value === undefined || value === '') return undefined

  if (!DIGITS.test(value)) {
    dropped.push({ key, value })
    return undefined
  }
  return Number(value)
}

export function parseFilters(input: SearchParamsInput): ParsedFilters {
  const dropped: DroppedFilter[] = []

  const minPrice = parseAmount(input, 'minPrice', dropped)
  const maxPrice = parseAmount(input, 'maxPrice', dropped)

  const [rawStock] = valuesFor(input, 'inStock')
  let inStock = false
  if (rawStock !== undefined && rawStock !== '') {
    if (rawStock === '1') inStock = true
    else if (rawStock !== '0') dropped.push({ key: 'inStock', value: rawStock })
  }

  const [rawSort] = valuesFor(input, 'sort')
  let sort = DEFAULT_SORT
  if (rawSort !== undefined && rawSort !== '') {
    if ((SORT_ORDERS as readonly string[]).includes(rawSort)) sort = rawSort as SortOrder
    else dropped.push({ key: 'sort', value: rawSort })
  }

  const [rawPage] = valuesFor(input, 'page')
  let page = 1
  if (rawPage !== undefined && rawPage !== '') {
    if (DIGITS.test(rawPage) && Number(rawPage) >= 1) page = Number(rawPage)
    else dropped.push({ key: 'page', value: rawPage })
  }

  /*
    An OPEN set: whether `colour=navy` names a real attribute value depends on the catalogue, which
    this pure module has never seen, so `getListing` finishes the job and merges its own drops into
    the same list. A key with no non-empty value is no filter at all and is not kept.
  */
  const attributes: Record<string, string[]> = {}
  for (const key of keysOf(input)) {
    if (!isAttributeKey(key)) continue
    const values = unique(valuesFor(input, key))
    if (values.length > 0) attributes[key] = values
  }

  const filters: FilterState = {
    category: unique(valuesFor(input, 'category')),
    attributes,
    inStock,
    sort,
    page,
  }

  // A reversed range is one mistake, not two filters. Swapping it silently would hide a broken
  // slider; dropping both ends is what makes it visible without emptying the grid.
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    dropped.push({ key: 'minPrice', value: String(minPrice) })
    dropped.push({ key: 'maxPrice', value: String(maxPrice) })
  } else {
    if (minPrice !== undefined) filters.minPrice = minPrice
    if (maxPrice !== undefined) filters.maxPrice = maxPrice
  }

  return { filters, dropped }
}

/**
 * Keys are written in a fixed order so that two routes arriving at the same state produce the same
 * string. A `URLSearchParams` built in whatever order the caller happened to set things in is a
 * different cache entry for an identical grid.
 *
 * The order: category, then every attribute **alphabetically by name**, then price, stock, sort and
 * page. Alphabetical rather than the owner's `order`, because this module is pure and has never seen
 * the catalogue — and a URL's stability must not depend on a setting the owner can change.
 */
export function toSearchParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams()

  for (const value of filters.category) params.append('category', value)

  for (const name of Object.keys(filters.attributes).sort()) {
    for (const value of filters.attributes[name] ?? []) params.append(name, value)
  }

  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice))
  if (filters.inStock) params.set('inStock', '1')
  if (filters.sort !== DEFAULT_SORT) params.set('sort', filters.sort)
  if (filters.page > 1) params.set('page', String(filters.page))

  return params
}

/** `?a=1&b=2` or `''`. The empty string matters — `?` alone is a second URL for the same listing. */
export function toQueryString(filters: FilterState): string {
  const query = toSearchParams(filters).toString()
  return query === '' ? '' : `?${query}`
}

/**
 * A list-valued key: `'category'`, or an attribute's name. Every one of them is a group of
 * checkboxes somewhere.
 */
export type MultiFilterKey = string

/** The values ticked under one list-valued key. */
export function selectedValues(filters: FilterState, key: MultiFilterKey): readonly string[] {
  return key === 'category' ? filters.category : (filters.attributes[key] ?? [])
}

/**
 * `filters` with one list-valued key replaced. An emptied attribute is removed rather than kept as
 * `[]`, so two states that mean the same thing are the same object shape — and round-trip equal.
 */
function withValues(filters: FilterState, key: MultiFilterKey, values: string[]): FilterState {
  if (key === 'category') return { ...filters, category: values }

  const attributes = { ...filters.attributes }
  if (values.length > 0) attributes[key] = values
  else delete attributes[key]
  return { ...filters, attributes }
}

/**
 * What a chip's dismiss link points at. Removing any filter returns to page one — staying on page
 * four of a grid that just got shorter is how a visitor lands on "no results" after widening their
 * own search.
 *
 * `key` is a reserved key or an attribute name, exactly as a chip carries it.
 */
export function removeFilter(filters: FilterState, key: string, value?: string): FilterState {
  const next: FilterState = { ...filters, page: 1 }

  switch (key) {
    case 'minPrice':
    case 'maxPrice':
      // Both ends, whichever one is named. A price range is drawn as ONE chip — "$1,200 – $7,300"
      // — so dismissing it has to clear the whole thing; leaving the other end behind would empty
      // half a filter the visitor believes they just removed.
      delete next.minPrice
      delete next.maxPrice
      return next
    case 'inStock':
      next.inStock = false
      return next
    case 'sort':
      next.sort = DEFAULT_SORT
      return next
    case 'page':
    case 'q':
      return next
    default:
      // `category`, or an attribute.
      return withValues(
        next,
        key,
        selectedValues(filters, key).filter((entry) => entry !== value),
      )
  }
}

/** True when nothing is filtered — the state that renders the bare route with no chips above it. */
export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.category.length > 0 ||
    Object.values(filters.attributes).some((values) => values.length > 0) ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.inStock
  )
}

/**
 * Tick or untick one value in one group — `'category'` or an attribute's name.
 *
 * `value` is a plain string because every caller has one: a `FacetOption.value`, a checkbox's
 * `value` attribute, a segment of a URL. It is safe in the direction that matters — `getListing`
 * drops anything the catalogue does not contain, so a bad value cannot narrow the grid even if one
 * reached here.
 */
export function toggleFilter(filters: FilterState, key: MultiFilterKey, value: string): FilterState {
  const current = selectedValues(filters, key)
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value]

  return { ...withValues(filters, key, next), page: 1 }
}

/**
 * Change anything and return to page one.
 *
 * Every commit goes through here for that one reason. Narrowing a search while standing on page
 * four is how a visitor lands on an empty grid that has results — the grid got shorter than the
 * page they were on, and nothing about the screen explains it.
 */
export function applyChange(filters: FilterState, patch: Partial<FilterState>): FilterState {
  return { ...filters, ...patch, page: 1 }
}

/**
 * Drop whichever end of the price range is sitting where the catalogue already ends.
 *
 * Both ends are always submitted — the slider is a pair of native inputs inside a
 * `<form method="GET">`, which is what makes the price reachable without scripting. So a
 * visitor who never touched it sends the catalogue's own minimum and maximum, and one who pulled
 * only the top handle down still sends the minimum. Neither of those removes a single product from
 * the grid, and a chip claiming otherwise is a filter the visitor did not apply.
 *
 * Each end is judged on its own, which is also what produces the drawn chip: `Up to $7,300` rather
 * than `$1,200 – $7,300` when only the maximum was moved (node 225:1487).
 *
 * `bounds` are the facet's raw ends. The control rounds them outward to a round step, so a handle
 * left alone lands at or beyond them — hence the inclusive comparison.
 */
export function dropIdlePriceEnds(
  filters: FilterState,
  bounds: { min: number; max: number },
): FilterState {
  const next = { ...filters }
  if (next.minPrice !== undefined && next.minPrice <= bounds.min) delete next.minPrice
  if (next.maxPrice !== undefined && next.maxPrice >= bounds.max) delete next.maxPrice
  return next
}
