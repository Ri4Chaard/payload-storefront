/**
 * The catalogue's data layer (003/T235, contract §3) — **the swap point**.
 *
 * This is the only module that knows where a document came from. Today it reads the fixtures in
 * `src/mocks/catalog.ts`; in spec 004 the bodies become `payload.find()` and `payload.findByID()`
 * and nothing above this file changes. SC-010 measures exactly that, and the ESLint rules in
 * `eslint-rules/catalog-boundary.mjs` are what keep it true rather than aspirational.
 *
 * Four rules survive the rewrite, and each is here because breaking it turns the swap into one.
 *
 * 1. **Everything is `async`**, including the bodies that do no waiting. A signature that changes
 *    shape at swap time is not a seam.
 * 2. **Filtering, sorting and paging happen inside `getListing`.** A route that fetched everything
 *    and filtered in JavaScript would not become a Payload query later; it would become a rewrite.
 *    The mock body therefore does the work in the same order a `find()` will: narrow, sort, slice.
 * 3. **Drafts are excluded by the access rule, not by a filter here.** `adminOrPublishedStatus`
 *    already returns `{ _status: { equals: 'published' } }` for anonymous reads, so the real
 *    implementation passes no status condition at all. `published()` below stands in for it, and
 *    is the one line that disappears rather than moving.
 * 4. **Nothing outside this module imports `src/mocks/`.**
 */

import {
  categoryFixtures,
  collectionFixtures,
  productFixtures,
  shopFixture,
  sizeFixtures,
} from '@/mocks/catalog'
import type { Product } from '@/payload-types'

import { COLOURS, SHAPES } from './filters'
import { formatPrice } from './price'
import {
  isProductAvailable,
  lowestPriceMinor,
  toCategorySummary,
  toProductDetail,
  toProductSummary,
  toShopContent,
} from './mappers'
import type {
  AppliedFilterChip,
  CategorySummary,
  DroppedFilter,
  FacetOption,
  FilterFacets,
  FilterState,
  ListingResult,
  ProductDetail,
  ProductSummary,
  ShopContent,
} from './types'

/**
 * Twelve. A 1920 grid is four across, so a page is three complete rows and never a ragged one; the
 * same number divides cleanly by the two-across phone layout and the three-across tablet.
 */
export const PAGE_SIZE = 12

/**
 * Stands in for `access.adminOrPublishedStatus`. It is a filter here because a fixture array has no
 * access control; in spec 004 it is deleted rather than translated, because the real query never
 * asks — the rule is applied to it.
 */
const published = (product: Product): boolean => product._status === 'published'

const catalogue = (): Product[] => productFixtures.filter(published)

/** What the listing sorts and filters on — the price the card advertises. */
const priceOf = lowestPriceMinor

// ---------------------------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------------------------

/** `multicolor` → `Multicolor`. The values are single lowercase words in both closed sets. */
const titleCase = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1)

const categoryTitle = (slug: string): string | undefined =>
  categoryFixtures.find((entry) => entry.slug === slug)?.title

const collectionTitle = (slug: string): string | undefined =>
  collectionFixtures.find((entry) => entry.slug === slug)?.title

const sizeLabel = (value: string): string | undefined =>
  sizeFixtures.find((entry) => entry.value === value)?.label

// ---------------------------------------------------------------------------------------------
// getListing
// ---------------------------------------------------------------------------------------------

function slugsOf(product: Product, key: 'collections'): string[] {
  return (product[key] ?? []).map((entry) => (typeof entry === 'number' ? String(entry) : entry.slug))
}

function matches(product: Product, filters: FilterState): boolean {
  const category = typeof product.category === 'number' ? '' : product.category.slug
  if (filters.category.length > 0 && !filters.category.includes(category)) return false

  if (filters.collection.length > 0) {
    const collections = slugsOf(product, 'collections')
    if (!filters.collection.some((slug) => collections.includes(slug))) return false
  }

  if (filters.size.length > 0) {
    const sizes = (product.sizes ?? []).map((entry) =>
      typeof entry === 'number' ? String(entry) : entry.value,
    )
    if (!filters.size.some((value) => sizes.includes(value))) return false
  }

  if (filters.colour.length > 0) {
    const colours = product.colour ?? []
    if (!filters.colour.some((value) => colours.includes(value))) return false
  }

  if (filters.shape.length > 0) {
    const shapes = product.diamondShape ?? []
    if (!filters.shape.some((value) => shapes.includes(value))) return false
  }

  const price = priceOf(product)
  if (filters.minPrice !== undefined && price < filters.minPrice) return false
  if (filters.maxPrice !== undefined && price > filters.maxPrice) return false

  // IN-STOCK ONLY hides what cannot be ordered. Without it, an unavailable piece is still SHOWN —
  // the owner wants it seen, and that is the default (spec Edge Cases).
  if (filters.inStock && !isProductAvailable(product)) return false

  return true
}

function sorted(products: Product[], sort: FilterState['sort']): Product[] {
  const copy = [...products]

  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => priceOf(a) - priceOf(b) || a.id - b.id)
    case 'price-desc':
      return copy.sort((a, b) => priceOf(b) - priceOf(a) || a.id - b.id)
    case 'newest':
      return copy.sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id,
      )
    case 'recommended':
    default:
      // Catalogue order — what the owner sees in the admin. It is deliberately NOT a relevance
      // score: there is no search term on a listing to be relevant to, and inventing a ranking the
      // owner cannot see or change is worse than the order they arranged themselves.
      return copy
  }
}

/**
 * The chips drawn above the grid, in the drawer's own group order so that the row reads the same
 * way as the panel that produced it. Labels come from the catalogue, which is why they are built
 * here and not in `filters.ts` — that module is pure URL arithmetic and has never seen a category.
 */
function chipsFor(filters: FilterState): AppliedFilterChip[] {
  const chips: AppliedFilterChip[] = []

  for (const slug of filters.category) {
    chips.push({ key: 'category', value: slug, label: categoryTitle(slug) ?? slug })
  }
  for (const slug of filters.collection) {
    chips.push({ key: 'collection', value: slug, label: collectionTitle(slug) ?? slug })
  }
  for (const value of filters.size) {
    chips.push({ key: 'size', value, label: `Size ${sizeLabel(value) ?? value}` })
  }
  for (const value of filters.colour) {
    chips.push({ key: 'colour', value, label: titleCase(value) })
  }
  for (const value of filters.shape) {
    chips.push({ key: 'shape', value, label: titleCase(value) })
  }

  // One chip for a range, two for two open ends. "$1,200 – $7,300" is one thing a visitor set and
  // one thing they will want to undo; splitting it makes them press twice to clear a slider.
  if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
    chips.push({
      key: 'minPrice',
      value: String(filters.minPrice),
      label: `${formatPrice(filters.minPrice)} – ${formatPrice(filters.maxPrice)}`,
    })
  } else if (filters.minPrice !== undefined) {
    chips.push({
      key: 'minPrice',
      value: String(filters.minPrice),
      label: `Over ${formatPrice(filters.minPrice)}`,
    })
  } else if (filters.maxPrice !== undefined) {
    chips.push({
      key: 'maxPrice',
      value: String(filters.maxPrice),
      label: `Under ${formatPrice(filters.maxPrice)}`,
    })
  }

  if (filters.inStock) chips.push({ key: 'inStock', value: '1', label: 'In stock only' })

  return chips
}

/**
 * Values `filters.ts` could not judge, because judging them needs the catalogue. A slug that names
 * nothing would otherwise return an empty grid with no explanation, which reads as "we sell none of
 * these" rather than "that link is stale" (FR-030).
 */
function unknownValues(filters: FilterState): DroppedFilter[] {
  const dropped: DroppedFilter[] = []

  for (const slug of filters.category) {
    if (!categoryTitle(slug)) dropped.push({ key: 'category', value: slug })
  }
  for (const slug of filters.collection) {
    if (!collectionTitle(slug)) dropped.push({ key: 'collection', value: slug })
  }
  for (const value of filters.size) {
    if (!sizeLabel(value)) dropped.push({ key: 'size', value })
  }

  return dropped
}

export async function getListing(filters: FilterState): Promise<ListingResult> {
  const ignored = unknownValues(filters)

  // A dropped value must not narrow the result — the grid shows what WAS applied, and the notice
  // above it names what was not.
  const applied: FilterState = {
    ...filters,
    category: filters.category.filter((slug) => Boolean(categoryTitle(slug))),
    collection: filters.collection.filter((slug) => Boolean(collectionTitle(slug))),
    size: filters.size.filter((value) => Boolean(sizeLabel(value))),
  }

  const found = sorted(
    catalogue().filter((product) => matches(product, applied)),
    applied.sort,
  )

  const start = (applied.page - 1) * PAGE_SIZE
  const page = found.slice(start, start + PAGE_SIZE)

  return {
    products: page.map(toProductSummary),
    total: found.length,
    page: applied.page,
    hasMore: start + page.length < found.length,
    appliedChips: chipsFor(applied),
    ignored,
  }
}

// ---------------------------------------------------------------------------------------------
// The rest
// ---------------------------------------------------------------------------------------------

/**
 * `null` is the branded 404 — for a slug that names nothing AND for a draft asked for anonymously.
 * The two are deliberately indistinguishable from outside: a 403 on an unpublished slug tells a
 * stranger the piece exists, which is the leak FR-009 is written against.
 */
export async function getProduct(slug: string): Promise<ProductDetail | null> {
  const found = catalogue().find((product) => product.slug === slug)
  return found ? toProductDetail(found) : null
}

export async function getCategories(): Promise<CategorySummary[]> {
  return [...categoryFixtures]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id)
    .map(toCategorySummary)
}

function facet(
  products: Product[],
  values: (product: Product) => string[],
  options: { value: string; label: string }[],
): FacetOption[] {
  return options.map((option) => ({
    ...option,
    count: products.filter((product) => values(product).includes(option.value)).length,
  }))
}

/**
 * The drawer's option lists, read from the catalogue rather than hardcoded beside the drawing.
 *
 * Zero-count options are still offered. Hiding them makes the panel change shape as a visitor
 * filters, which loses the option they were about to press; showing a zero is the honest answer to
 * "do you have this".
 */
export async function getFilterFacets(categorySlug?: string): Promise<FilterFacets> {
  const within = categorySlug
    ? catalogue().filter(
        (product) => typeof product.category !== 'number' && product.category.slug === categorySlug,
      )
    : catalogue()

  const prices = within.map(priceOf)

  return {
    categories: facet(
      catalogue(),
      (product) => (typeof product.category === 'number' ? [] : [product.category.slug]),
      categoryFixtures
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((entry) => ({ value: entry.slug, label: entry.title })),
    ),
    collections: facet(
      within,
      (product) => slugsOf(product, 'collections'),
      collectionFixtures
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((entry) => ({ value: entry.slug, label: entry.title })),
    ),
    sizes: facet(
      within,
      (product) =>
        (product.sizes ?? []).map((entry) => (typeof entry === 'number' ? String(entry) : entry.value)),
      sizeFixtures
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((entry) => ({ value: entry.value, label: entry.label })),
    ),
    colours: facet(
      within,
      (product) => product.colour ?? [],
      COLOURS.map((value) => ({ value, label: titleCase(value) })),
    ),
    shapes: facet(
      within,
      (product) => product.diamondShape ?? [],
      SHAPES.map((value) => ({ value, label: titleCase(value) })),
    ),
    price: {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
    },
  }
}

/**
 * _Complete the Collection_. An empty array means the band does not render (FR-037) — a "related"
 * strip padded out with whatever else is in the shop is worse than no strip.
 */
export async function getRelated(productId: number, limit = 4): Promise<ProductSummary[]> {
  const product = catalogue().find((entry) => entry.id === productId)
  if (!product) return []

  const collections = slugsOf(product, 'collections')
  if (collections.length === 0) return []

  return catalogue()
    .filter((entry) => entry.id !== productId)
    .filter((entry) => slugsOf(entry, 'collections').some((slug) => collections.includes(slug)))
    .slice(0, limit)
    .map(toProductSummary)
}

export async function getShopContent(): Promise<ShopContent> {
  return toShopContent(shopFixture)
}
