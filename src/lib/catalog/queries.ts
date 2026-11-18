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
import type { Attribute, AttributeValue, Category, Product } from '@/payload-types'

import { DEFAULT_SORT, SORT_LABELS } from './filters'
import { isDatabaseUnreachable } from './prerender'
import { formatPriceFor, formatPrice } from './price'
import {
  categoryHref,
  isProductAvailable,
  lowestPriceMinor,
  populatedValues,
  relatedValueIds,
  toCategorySummary,
  toProductDetail,
  toProductSummary,
  toShopContent,
} from './mappers'
import type {
  AppliedFilterChip,
  AttributeFacet,
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
 * Twelve — how many products each press of LOAD MORE adds.
 *
 * A 1920 grid is four across, so a set is three complete rows and never a ragged one; the same
 * number divides cleanly by the two-across phone layout and the three-across tablet.
 */
export const PAGE_SIZE = 12

const client = cache(async () => getPayload({ config }))

/**
 * Every published product, with its relationships resolved.
 *
 * **`overrideAccess: false` is the whole of the draft rule.** The Local API bypasses access control
 * by default, which would serve unpublished products to anonymous visitors — the exact leak FR-009 is
 * written against. Passing `false` hands the query to `adminOrPublishedStatus`, which narrows it to
 * published for a request with no user. The fixture body needed a `published()` predicate because
 * an array has no access control; there is deliberately no equivalent line here, because asking
 * twice would hide the day the access rule stops working.
 *
 * **`depth: 2` is chosen, not defaulted.** The mappers read `category.slug`, `values[].attribute`,
 * `gallery[]` as media, `attributes[].attribute.label` and `variants.docs[].options[].label` — the
 * second and last are two hops from the product, and depth 1 would leave them as numbers, the
 * details without their colour row and the variant selector empty.
 *
 * **The narrowing happens in JavaScript, and that is a considered trade rather than an oversight.**
 * The two things every listing sorts and filters on — the price and the availability — are derived
 * from the variant matrix: the price is the LOWEST across a product's variants and availability is
 * whether ANY of them has stock. Neither is a column, so neither can appear in a `where`, and a
 * query that narrowed on the product's own `priceInUSD` would quietly answer a different question
 * for every product that has variants. Correct in memory beats wrong in the database.
 *
 * It is bounded work at this size — a small shop's catalogue is tens of products, not tens of
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
 * The reference collections the chips, the facets and the dropped-value check all read: the
 * categories, every attribute, and every attribute value.
 *
 * Fetched together and passed down rather than looked up one at a time. One round trip each per
 * request, deduplicated by `cache`. Values are read at depth 0 — their attribute is matched by id
 * against the attributes already in hand.
 */
interface Reference {
  categories: Category[]
  attributes: Attribute[]
  values: AttributeValue[]
}

const byOrder = <T extends { id: number; order?: number | null }>(a: T, b: T): number =>
  (a.order ?? 0) - (b.order ?? 0) || a.id - b.id

const reference = cache(async (locale: Locale): Promise<Reference> => {
  const payload = await client()
  const [categories, attributes, values] = await Promise.all([
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
      collection: 'attributes',
      limit: 0,
      sort: 'order',
      overrideAccess: false,
    }),
    payload.find({
      locale,
      fallbackLocale: DEFAULT_LOCALE,
      collection: 'attribute-values',
      depth: 0,
      limit: 0,
      sort: 'order',
      overrideAccess: false,
    }),
  ])
  return {
    categories: categories.docs,
    attributes: [...attributes.docs].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name),
    ),
    values: [...values.docs].sort(byOrder),
  }
})

/** What the listing sorts and filters on — the price the card advertises. */
const priceOf = lowestPriceMinor

const idOf = (entry: number | { id: number }): number =>
  typeof entry === 'number' ? entry : entry.id

// ---------------------------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------------------------

const categoryTitle = (refs: Reference, slug: string): string | undefined =>
  refs.categories.find((entry) => entry.slug === slug)?.title

/**
 * The attribute a filter key names, when it is one a visitor may filter by: a LIST attribute marked
 * `filterable`. Anything else in the URL — a typed attribute, a list the owner keeps out of the
 * filters, a name nobody defined — is not a filter this shop offers.
 */
const filterAttribute = (refs: Reference, name: string): Attribute | undefined =>
  refs.attributes.find(
    (entry) => entry.name === name && entry.type === 'list' && entry.filterable === true,
  )

const valuesOf = (refs: Reference, attribute: Attribute): AttributeValue[] =>
  refs.values.filter((entry) => idOf(entry.attribute) === attribute.id)

/**
 * A value's customer-facing label, from the catalogue. Localized on the row, so it falls back the way
 * every other editorial label does.
 */
const valueLabel = (refs: Reference, name: string, value: string): string | undefined => {
  const attribute = filterAttribute(refs, name)
  if (!attribute) return undefined
  return valuesOf(refs, attribute).find((entry) => entry.value === value)?.label
}

// ---------------------------------------------------------------------------------------------
// getListing
// ---------------------------------------------------------------------------------------------

/** The `value`s a product carries for one attribute. */
function productValues(product: Product, attributeId: number): string[] {
  return populatedValues(product)
    .filter(({ attribute }) => attribute.id === attributeId)
    .map(({ value }) => value.value)
}

function matches(product: Product, filters: FilterState, refs: Reference): boolean {
  const category = typeof product.category === 'number' ? '' : product.category.slug
  if (filters.category.length > 0 && !filters.category.includes(category)) return false

  // Within one attribute, any ticked value will do; across attributes, every one must hold.
  for (const [name, wanted] of Object.entries(filters.attributes)) {
    if (wanted.length === 0) continue
    const attribute = filterAttribute(refs, name)
    if (!attribute) continue
    const carried = productValues(product, attribute.id)
    if (!wanted.some((value) => carried.includes(value))) return false
  }

  const price = priceOf(product)
  if (filters.minPrice !== undefined && price < filters.minPrice) return false
  if (filters.maxPrice !== undefined && price > filters.maxPrice) return false

  // IN-STOCK ONLY hides what cannot be ordered. Without it, an unavailable product is still SHOWN —
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

/** The applied attribute names, in the drawer's own order — the attributes' `order`. */
const appliedAttributeNames = (filters: FilterState, refs: Reference): string[] =>
  refs.attributes
    .map((attribute) => attribute.name)
    .filter((name) => (filters.attributes[name] ?? []).length > 0)

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
  for (const name of appliedAttributeNames(filters, refs)) {
    for (const value of filters.attributes[name] ?? []) {
      chips.push({ key: name, value, label: valueLabel(refs, name, value) ?? value })
    }
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

  // The ordering is a chip too. It is not a filter — it removes nothing from the grid — but
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
 * these" rather than "that link is stale".
 *
 * An attribute the shop does not filter by is reported value by value under its own key, exactly
 * like a value the attribute does not have — from the visitor's side the two are the same stale link.
 */
function unknownValues(filters: FilterState, refs: Reference): DroppedFilter[] {
  const dropped: DroppedFilter[] = []

  for (const slug of filters.category) {
    if (!categoryTitle(refs, slug)) dropped.push({ key: 'category', value: slug })
  }
  for (const [name, values] of Object.entries(filters.attributes)) {
    for (const value of values) {
      if (!valueLabel(refs, name, value)) dropped.push({ key: name, value })
    }
  }

  return dropped
}

/** `filters` with everything the catalogue does not have taken out. */
function knownOnly(filters: FilterState, refs: Reference): FilterState {
  const attributes: Record<string, string[]> = {}
  for (const [name, values] of Object.entries(filters.attributes)) {
    const known = values.filter((value) => Boolean(valueLabel(refs, name, value)))
    if (known.length > 0) attributes[name] = known
  }

  return {
    ...filters,
    category: filters.category.filter((slug) => Boolean(categoryTitle(refs, slug))),
    attributes,
  }
}

export async function getListing(filters: FilterState, locale: Locale): Promise<ListingResult> {
  const [refs, all] = await Promise.all([reference(locale), catalogue(locale)])
  const ignored = unknownValues(filters, refs)

  // A dropped value must not narrow the result — the grid shows what WAS applied, and the notice
  // above it names what was not.
  const applied = knownOnly(filters, refs)

  const found = sorted(
    all.filter((product) => matches(product, applied, refs)),
    applied.sort,
  )

  /**
   * `page` counts how many sets are SHOWN, not which one is.
   *
   * The listing extends rather than replacing (FR-018, spec Open Question 1), so `page=3` is the
   * first thirty-six products and not the third twelve. Keeping the arithmetic here rather than
   * letting the route ask three times is what makes the swap in 004 one query — `limit: page *
   * PAGE_SIZE` — instead of a loop.
   */
  /**
   * Clamped, not refused. Numbered pagination could answer a page past the end with a 404, because
   * there was genuinely nothing there. Under LOAD MORE a large `page` means "everything up to
   * this much", and a link that asked for sixty products should show forty-five when three got
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
 * stranger the product exists, which is the leak FR-009 is written against.
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
    // narrows the QUERY rather than rejecting the result, so an unpublished product simply is not
    // there. A `_status` check here would reach the same 404 down a path that has to be kept right
    // by hand.
    overrideAccess: false,
  })

  const found = docs[0]
  return found ? toProductDetail(found, locale) : null
}

/**
 * The same read, by id, for a set of products at once.
 *
 * The cart stores product ids, not slugs, and it needs the resolved detail — the variants with their
 * prices and stock, the sizes with their labels — to say what a line costs and whether it can still
 * be bought. That is exactly `ProductDetail`, so this is `getProduct` with a different `where` and
 * a set rather than a single document.
 *
 * **`overrideAccess: false` is doing the same work here as everywhere else in this file, and it
 * matters more.** A product unpublished after it was added to somebody's cart must come back missing
 * rather than resolved, because the cart page's whole staleness story is built on the
 * difference between "this id resolved" and "this id did not". Reading with access overridden would
 * quietly keep selling a product the owner had withdrawn.
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
 * Every published slug, for the product route's `generateStaticParams`.
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
    /* No locale: `slug` is shared across languages, so this read is language-free. */
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
  return [...categories].sort(byOrder).map(toCategorySummary)
}

/**
 * The categories the owner ticked "Show in the header", in their `order`, titled in `locale`.
 *
 * Read by the root layout and handed to the header and the mobile menu as props, on the same terms
 * as the contact settings beside it: a Local API read is not a request-time API, so the prerendered
 * catalogue stays prerendered. Saving a category runs `revalidateOnChange`, which invalidates every
 * cached page — so ticking or unticking one reaches the header on the next visit.
 *
 * An empty list is an ordinary answer: the header then carries its fixed links alone. A query of
 * its own rather than `reference(locale)`, because every page's layout runs it and has no use for
 * the attributes and values that one also reads.
 */
export const getHeaderCategories = cache(
  async (locale: Locale): Promise<{ label: string; href: string }[]> => {
    try {
      const payload = await client()
      const { docs } = await payload.find({
        locale,
        fallbackLocale: DEFAULT_LOCALE,
        collection: 'categories',
        where: { showInHeader: { equals: true } },
        sort: 'order',
        depth: 0,
        limit: 0,
        overrideAccess: false,
        select: { title: true, slug: true, order: true },
      })
      return [...docs]
        .sort(byOrder)
        .map((category) => ({ label: category.title, href: categoryHref(category.slug) }))
    } catch (error) {
      if (!isDatabaseUnreachable(error)) throw error
      // The container build has no database; the header renders its fixed links and the first real
      // request reads the categories — the same arrangement as the footer's policy links.
      return []
    }
  },
)

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
 * One group per LIST attribute marked `filterable`, in the attributes' `order`, each offering every
 * one of its values in theirs. A value the owner has just added is offered at once — the facets are
 * read per request.
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

  const attributes: AttributeFacet[] = refs.attributes
    .filter((attribute) => attribute.type === 'list' && attribute.filterable === true)
    .map((attribute) => ({
      name: attribute.name,
      label: attribute.label,
      options: facet(
        within,
        (product) => productValues(product, attribute.id),
        valuesOf(refs, attribute).map((entry) => ({ value: entry.value, label: entry.label })),
      ),
    }))

  return {
    categories: facet(
      all,
      (product) => (typeof product.category === 'number' ? [] : [product.category.slug]),
      refs.categories
        .slice()
        .sort(byOrder)
        .map((entry) => ({ value: entry.slug, label: entry.title })),
    ),
    attributes,
    price: {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
    },
  }
}

/**
 * _You may also like_ — the products related to this one.
 *
 * Related means sharing a value of an attribute the owner marked `relatesProducts` (a collection, a
 * range, a designer). Where that finds nothing — the product carries no such value, or is the only
 * one carrying it — the same category stands in, which is still a better suggestion than none.
 * Published products only (the catalogue is read through the access rule), never the product
 * itself. An empty array means the band does not render.
 */
export async function getRelated(
  productId: number,
  locale: Locale,
  limit = 4,
): Promise<ProductSummary[]> {
  const all = await catalogue(locale)
  const product = all.find((entry) => entry.id === productId)
  if (!product) return []

  const others = all.filter((entry) => entry.id !== productId)
  const relating = relatedValueIds(product)

  const sharing =
    relating.length > 0
      ? others.filter((entry) =>
          relatedValueIds(entry).some((id) => relating.includes(id)),
        )
      : []

  const categoryId = idOf(product.category)
  const chosen =
    sharing.length > 0 ? sharing : others.filter((entry) => idOf(entry.category) === categoryId)

  return chosen.slice(0, limit).map((entry) => toProductSummary(entry, locale))
}

/**
 * The products the home page puts in front of a first-time visitor.
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
