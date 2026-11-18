/**
 * The catalogue's data layer (003/T235, T290, contract §3) — **the swap point, now swapped.**
 *
 * This is the only module that knows where a document came from. Until 003/T290 it read the
 * fixtures in `src/mocks/catalog.ts`; it now reads Payload through the Local API, and **no
 * component and no route changed** — the deviation spec 002 opened is closed. SC-010 is exactly
 * that measurement, and T291 records the walk that verifies it.
 *
 * Four rules were written down before the rewrite, on the grounds that breaking any of them would
 * turn a swap into a rewrite. Each one held:
 *
 * 1. **Everything was already `async`**, including bodies that did no waiting. A signature that
 *    changes shape at swap time is not a seam, and none of these changed.
 * 2. **Filtering, sorting and paging happen inside `getListing`.** They still do — see the note on
 *    `catalogue(locale)` for what runs in the database and what cannot.
 * 3. **Drafts are excluded by the access rule, not by a filter here.** The fixture body needed a
 *    `published()` predicate because an array has no access control; the real one passes
 *    `overrideAccess: false` and lets `adminOrPublishedStatus` do it. That predicate was deleted
 *    rather than translated, exactly as predicted.
 * 4. **Nothing outside this module imports `src/mocks/`.** 003/T293 tightened that from a
 *    convention into a rule the linter enforces for app code entirely.
 *
 * **Reads are deduplicated per request, not cached across requests.** `cache()` collapses the
 * several calls a single render makes — a listing asks for the categories, the facets and the
 * products, and the facets ask again — into one query each. Anything longer-lived is `T294`'s
 * business and belongs with revalidation, because a cache without an invalidation story is how
 * Constitution V's "stale content after publish is a defect" gets broken.
 */

import config from '@payload-config'

import { getPayload } from 'payload'
import { cache } from 'react'

import { DEFAULT_LOCALE, type Locale } from '@/i18n/routing'
import type { Category, Collection, Colour, Product } from '@/payload-types'

import { DEFAULT_SORT, SORT_LABELS } from './filters'
import { formatPriceFor, formatPrice } from './price'
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
 * Twelve — how many pieces each press of LOAD MORE adds.
 *
 * A 1920 grid is four across, so a set is three complete rows and never a ragged one; the same
 * number divides cleanly by the two-across phone layout and the three-across tablet.
 */
export const PAGE_SIZE = 12

const client = cache(async () => getPayload({ config }))

/**
 * Every published piece, with its relationships resolved.
 *
 * **`overrideAccess: false` is the whole of the draft rule.** The Local API bypasses access control
 * by default, which would serve unpublished pieces to anonymous visitors — the exact leak FR-009 is
 * written against. Passing `false` hands the query to `adminOrPublishedStatus`, which narrows it to
 * published for a request with no user. The fixture body needed a `published()` predicate because
 * an array has no access control; there is deliberately no equivalent line here, because asking
 * twice would hide the day the access rule stops working.
 *
 * **`depth: 2` is chosen, not defaulted.** The mappers read `category.slug`, `collections[].slug`,
 * `sizes[].value`, `gallery[]` as media, `attributes[].attribute.label` and `variants.docs[].options[].label`
 * — that last one is two hops from the product, and depth 1 would leave it as a number and the
 * stone selector empty.
 *
 * **The narrowing happens in JavaScript, and that is a considered trade rather than an oversight.**
 * The two things every listing sorts and filters on — the price and the availability — are derived
 * from the variant matrix: the price is the LOWEST across a piece's stones and availability is
 * whether ANY of them has stock. Neither is a column, so neither can appear in a `where`, and a
 * query that narrowed on the product's own `priceInUSD` would quietly answer a different question
 * for every piece that has stones. Correct in memory beats wrong in the database.
 *
 * It is bounded work at this size — a jeweller's catalogue is tens of pieces, not tens of
 * thousands — and it has a known upgrade path: denormalise `priceMinor` and `available` onto the
 * product with an `afterChange` hook, then the `where` becomes possible and `limit`/`sort` move
 * into the query. That is recorded as T304 rather than guessed at now, because the hook has to be
 * written and backfilled and it is not what closes the 002 deviation.
 */
const catalogue = cache(async (locale: Locale): Promise<Product[]> => {
  const payload = await client()
  const { docs } = await payload.find({
    locale,
    fallbackLocale: DEFAULT_LOCALE,
    collection: 'products',
    depth: 2,
    limit: 0,
    overrideAccess: false,
    sort: 'createdAt',
  })
  return docs
})

/**
 * The three reference collections the chips, the facets and the dropped-value check all read.
 *
 * Fetched together and passed down rather than looked up one at a time: the fixture bodies could
 * close over module-level arrays for free, and a query cannot. One round trip each per request,
 * deduplicated by `cache`.
 */
interface Reference {
  categories: Category[]
  collections: Collection[]
  colours: Colour[]
}

const reference = cache(async (locale: Locale): Promise<Reference> => {
  const payload = await client()
  const [categories, collections, colours] = await Promise.all([
    payload.find({
      locale,
      fallbackLocale: DEFAULT_LOCALE,
      collection: 'categories',
      limit: 0,
      sort: 'order',
      overrideAccess: false,
    }),
    payload.find({
      locale,
      fallbackLocale: DEFAULT_LOCALE,
      collection: 'collections',
      limit: 0,
      sort: 'order',
      overrideAccess: false,
    }),
    payload.find({
      locale,
      fallbackLocale: DEFAULT_LOCALE,
      collection: 'colours',
      limit: 0,
      sort: 'order',
      overrideAccess: false,
    }),
  ])
  return {
    categories: categories.docs,
    collections: collections.docs,
    colours: colours.docs,
  }
})

/** What the listing sorts and filters on — the price the card advertises. */
const priceOf = lowestPriceMinor

// ---------------------------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------------------------

const categoryTitle = (refs: Reference, slug: string): string | undefined =>
  refs.categories.find((entry) => entry.slug === slug)?.title

const collectionTitle = (refs: Reference, slug: string): string | undefined =>
  refs.collections.find((entry) => entry.slug === slug)?.title


/**
 * A colour's customer-facing name, from the catalogue (spec 011, US3).
 *
 * A colour is the owner's, so its name is a localized field on the row and falls back the way every other
 * editorial label does — one place to change it rather than three JSON files (011/research.md R3).
 */
const colourLabel = (refs: Reference, value: string): string | undefined =>
  refs.colours.find((entry) => entry.value === value)?.label

// ---------------------------------------------------------------------------------------------
// getListing
// ---------------------------------------------------------------------------------------------

function slugsOf(product: Product, key: 'collections'): string[] {
  return (product[key] ?? []).map((entry) =>
    typeof entry === 'number' ? String(entry) : entry.slug,
  )
}

function matches(product: Product, filters: FilterState): boolean {
  const category = typeof product.category === 'number' ? '' : product.category.slug
  if (filters.category.length > 0 && !filters.category.includes(category)) return false

  if (filters.collection.length > 0) {
    const collections = slugsOf(product, 'collections')
    if (!filters.collection.some((slug) => collections.includes(slug))) return false
  }


  if (filters.colour.length > 0) {
    // Relationship rows as of spec 011, so this reads a `value` off each the way `slugsOf` does for
    // collections rather than comparing enum strings.
    const colours = (product.colour ?? []).map((entry) =>
      typeof entry === 'number' ? String(entry) : entry.value,
    )
    if (!filters.colour.some((value) => colours.includes(value))) return false
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
      return copy.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id)
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
function chipsFor(filters: FilterState, refs: Reference, locale: Locale): AppliedFilterChip[] {
  const chips: AppliedFilterChip[] = []

  for (const slug of filters.category) {
    chips.push({ key: 'category', value: slug, label: categoryTitle(refs, slug) ?? slug })
  }
  for (const slug of filters.collection) {
    chips.push({ key: 'collection', value: slug, label: collectionTitle(refs, slug) ?? slug })
  }
  for (const value of filters.colour) {
    chips.push({ key: 'colour', value, label: colourLabel(refs, value) ?? value })
  }

  // One chip for a range, two for two open ends. "$1,200 – $7,300" is one thing a visitor set and
  // one thing they will want to undo; splitting it makes them press twice to clear a slider.
  if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
    chips.push({
      key: 'minPrice',
      value: String(filters.minPrice),
      label: `${formatPriceFor(locale, filters.minPrice)} – ${formatPriceFor(locale, filters.maxPrice)}`,
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

  // The ordering is a chip too (T281). It is not a filter — it removes nothing from the grid — but
  // it is a thing the visitor chose and therefore a thing they must be able to undo without
  // reopening the menu to find which of the four is current. Dismissing it restores the default.
  if (filters.sort !== DEFAULT_SORT) {
    chips.push({ key: 'sort', value: filters.sort, label: SORT_LABELS[filters.sort] })
  }

  return chips
}

/**
 * Values `filters.ts` could not judge, because judging them needs the catalogue. A slug that names
 * nothing would otherwise return an empty grid with no explanation, which reads as "we sell none of
 * these" rather than "that link is stale" (FR-030).
 */
function unknownValues(filters: FilterState, refs: Reference): DroppedFilter[] {
  const dropped: DroppedFilter[] = []

  for (const slug of filters.category) {
    if (!categoryTitle(refs, slug)) dropped.push({ key: 'category', value: slug })
  }
  for (const slug of filters.collection) {
    if (!collectionTitle(refs, slug)) dropped.push({ key: 'collection', value: slug })
  }
  // Colour joined this list in spec 011, when it stopped being an enum the parser could judge.
  for (const value of filters.colour) {
    if (!colourLabel(refs, value)) dropped.push({ key: 'colour', value })
  }

  return dropped
}

export async function getListing(filters: FilterState, locale: Locale): Promise<ListingResult> {
  const [refs, all] = await Promise.all([reference(locale), catalogue(locale)])
  const ignored = unknownValues(filters, refs)

  // A dropped value must not narrow the result — the grid shows what WAS applied, and the notice
  // above it names what was not.
  const applied: FilterState = {
    ...filters,
    category: filters.category.filter((slug) => Boolean(categoryTitle(refs, slug))),
    collection: filters.collection.filter((slug) => Boolean(collectionTitle(refs, slug))),
    colour: filters.colour.filter((value) => Boolean(colourLabel(refs, value))),
  }

  const found = sorted(
    all.filter((product) => matches(product, applied)),
    applied.sort,
  )

  /**
   * `page` counts how many sets are SHOWN, not which one is.
   *
   * The listing extends rather than replacing (FR-018, spec Open Question 1), so `page=3` is the
   * first thirty-six pieces and not the third twelve. Keeping the arithmetic here rather than
   * letting the route ask three times is what makes the swap in 004 one query — `limit: page *
   * PAGE_SIZE` — instead of a loop.
   */
  /**
   * Clamped, not refused. Numbered pagination could answer a page past the end with a 404, because
   * there was genuinely nothing there. Under LOAD MORE a large `page` means "everything up to
   * this much", and a link that asked for sixty pieces should show forty-five when three got
   * unpublished rather than turning into a dead end in someone's inbox.
   *
   * It is also what keeps `limit: page * PAGE_SIZE` from becoming a query for ten million rows
   * when the swap lands — a hand-typed `?page=999999` is bounded here, once, for both bodies.
   */
  const sets = Math.max(1, Math.ceil(found.length / PAGE_SIZE))
  const page = Math.min(applied.page, sets)
  const shown = found.slice(0, page * PAGE_SIZE)

  return {
    products: shown.map((product) => toProductSummary(product, locale)),
    total: found.length,
    page,
    hasMore: shown.length < found.length,
    appliedChips: chipsFor(applied, refs, locale),
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
export async function getProduct(slug: string, locale: Locale): Promise<ProductDetail | null> {
  const payload = await client()
  const { docs } = await payload.find({
    locale,
    fallbackLocale: DEFAULT_LOCALE,
    collection: 'products',
    depth: 2,
    limit: 1,
    where: { slug: { equals: slug } },
    // The access rule is what makes a draft indistinguishable from a slug that names nothing: it
    // narrows the QUERY rather than rejecting the result, so an unpublished piece simply is not
    // there. A `_status` check here would reach the same 404 down a path that has to be kept right
    // by hand.
    overrideAccess: false,
  })

  const found = docs[0]
  return found ? toProductDetail(found, locale) : null
}

/**
 * The same read, by id, for a set of pieces at once (spec 005, T008).
 *
 * The cart stores product ids, not slugs, and it needs the resolved detail — the stones with their
 * prices and stock, the sizes with their labels — to say what a line costs and whether it can still
 * be bought. That is exactly `ProductDetail`, so this is `getProduct` with a different `where` and
 * a set rather than a single document.
 *
 * **`overrideAccess: false` is doing the same work here as everywhere else in this file, and it
 * matters more.** A piece unpublished after it was added to somebody's cart must come back missing
 * rather than resolved, because the cart page's whole staleness story (FR-014) is built on the
 * difference between "this id resolved" and "this id did not". Reading with access overridden would
 * quietly keep selling a piece the owner had withdrawn.
 *
 * Returned as a `Map` because the caller is iterating cart lines and asking "and this one?" — a
 * list would make every line a linear scan of the catalogue.
 */
export async function getProductsByIds(
  ids: number[],
  locale: Locale,
): Promise<Map<number, ProductDetail>> {
  if (ids.length === 0) return new Map()

  const payload = await client()
  const { docs } = await payload.find({
    locale,
    fallbackLocale: DEFAULT_LOCALE,
    collection: 'products',
    depth: 2,
    limit: 0,
    where: { id: { in: [...new Set(ids)] } },
    overrideAccess: false,
  })

  return new Map(docs.map((product) => [product.id, toProductDetail(product, locale)]))
}

/**
 * Every published slug, for the product route's `generateStaticParams` (003/T294).
 *
 * **Not `catalogue(locale)`.** That cache holds fully resolved documents because a page draws them;
 * a list of strings has no business filling it, and `depth: 0` with `select` is the difference
 * between one cheap query at build time and thirty products' worth of joins thrown away.
 *
 * `overrideAccess: false` for the same reason it is everywhere else in this file: a draft must not
 * get a prerendered page, which would make it reachable by URL — the leak FR-009 is written
 * against, arriving through the build instead of through a query.
 */
export async function getProductSlugs(): Promise<string[]> {
  const payload = await client()
  const { docs } = await payload.find({
    /* No locale: `slug` is shared across languages (spec 010, R7), so this read is language-free. */
    collection: 'products',
    depth: 0,
    limit: 0,
    overrideAccess: false,
    select: { slug: true },
  })
  return docs.map((product) => product.slug)
}

export async function getCategories(locale: Locale): Promise<CategorySummary[]> {
  const { categories } = await reference(locale)
  // `order` is the column the owner drags in the admin; ties fall back to id so that two
  // categories sharing an order do not swap places between requests.
  return [...categories]
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
export async function getFilterFacets(
  locale: Locale,
  categorySlug?: string,
): Promise<FilterFacets> {
  const [refs, all] = await Promise.all([reference(locale), catalogue(locale)])

  const within = categorySlug
    ? all.filter(
        (product) => typeof product.category !== 'number' && product.category.slug === categorySlug,
      )
    : all

  const prices = within.map(priceOf)

  return {
    categories: facet(
      all,
      (product) => (typeof product.category === 'number' ? [] : [product.category.slug]),
      refs.categories
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((entry) => ({ value: entry.slug, label: entry.title })),
    ),
    collections: facet(
      within,
      (product) => slugsOf(product, 'collections'),
      refs.collections
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((entry) => ({ value: entry.slug, label: entry.title })),
    ),
    colours: facet(
      within,
      (product) =>
        (product.colour ?? []).map((entry) => (typeof entry === 'number' ? String(entry) : entry.value)),
      refs.colours.map((colour) => ({ value: colour.value, label: colour.label })),
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
export async function getRelated(
  productId: number,
  locale: Locale,
  limit = 4,
): Promise<ProductSummary[]> {
  const all = await catalogue(locale)
  const product = all.find((entry) => entry.id === productId)
  if (!product) return []

  const collections = slugsOf(product, 'collections')
  if (collections.length === 0) return []

  return all
    .filter((entry) => entry.id !== productId)
    .filter((entry) => slugsOf(entry, 'collections').some((slug) => collections.includes(slug)))
    .slice(0, limit)
    .map((product) => toProductSummary(product, locale))
}

/**
 * The pieces the home page puts in front of a first-time visitor.
 *
 * **Catalogue order, which is the order the owner arranged in the admin.** There is no "featured"
 * flag on a product, and adding one is a schema decision rather than a query decision — so this
 * takes the first few in the order the shop already has, and the owner changes what is featured by
 * dragging a product up. If that turns out to be the wrong control, the fix is a field and this
 * function's body, not its callers.
 *
 * Four by default: the drawn row is four cards across at 1920 and the band's own arrows appear only
 * when there are more than fit, so four is the number that draws exactly as designed.
 */
export async function getFeatured(locale: Locale, limit = 4): Promise<ProductSummary[]> {
  const all = await catalogue(locale)
  return all.slice(0, limit).map((product) => toProductSummary(product, locale))
}

export async function getShopContent(locale: Locale): Promise<ShopContent> {
  const payload = await client()
  const shop = await payload.findGlobal({
    locale,
    fallbackLocale: DEFAULT_LOCALE,
    slug: 'shop',
    depth: 0,
    overrideAccess: false,
  })
  return toShopContent(shop)
}
