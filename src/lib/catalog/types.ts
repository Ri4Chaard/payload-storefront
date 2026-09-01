/**
 * The view models (003/T230) — what a component is allowed to see.
 *
 * Derived from the generated collection types rather than restated beside them, so a schema change
 * surfaces here as a type error rather than as a screen that quietly renders nothing. Where a union
 * is enumerated below it is `NonNullable<Product['colour']>[number]` and not four string literals,
 * for exactly that reason: the literals would still compile after the field changed.
 *
 * Deliberately NARROWER than the documents they come from. No `_status`, no `inventory` count, no
 * `deletedAt`, no draft metadata. Two of those omissions are load-bearing:
 *
 *   `_status`    a component that can see it can render a draft, and FR-009 says drafts are
 *                unreachable. Excluding drafts is the access rule's job, and nothing downstream
 *                should be in a position to second-guess it.
 *   `inventory`  a component that can see a number will eventually compare it to zero somewhere,
 *                and then the availability rule lives in two places. `available` is computed once
 *                in `mappers.ts` and travels as a boolean.
 *
 * `price` is a formatted string everywhere except `DiamondOption.priceMinor`, which exists because
 * the stone selector has to compare stones. That one is an integer count of minor units, never a
 * float and never a parsed display string (Constitution VI).
 */

import type { Product } from '@/payload-types'

/** A photograph, shaped the way an upload comes back — intrinsic dimensions included, so nothing
 * downstream has to guess at an aspect ratio and reserve the wrong box for it. */
export interface CatalogImage {
  src: string
  width: number
  height: number
  /** Absent where the photograph is decoration beside text that already names it. */
  alt?: string
}

export type ColourValue = NonNullable<Product['colour']>[number]
export type DiamondShape = NonNullable<Product['diamondShape']>[number]

/** The card, the grid, and _Complete the Collection_. */
export interface ProductSummary {
  id: number
  slug: string
  title: string
  href: string
  /** Formatted. The lowest price across stones where the piece offers a choice. */
  price: string
  images: CatalogImage[]
  available: boolean
}

/** One selectable stone. The only view model carrying a raw amount, and it is an integer. */
export interface DiamondOption {
  id: number
  label: string
  price: string
  priceMinor: number
  available: boolean
  /**
   * The most a customer may order OF THIS STONE. Absent where nothing is counted.
   *
   * Not the same thing as `inventory`, which the note at the top of this file keeps out on purpose.
   * That exclusion is about the AVAILABILITY rule: a component that can see a stock number will
   * eventually compare it to zero, and then "is this orderable" lives in two places. This answers a
   * different question — how high the quantity stepper may go — which no boolean can express and
   * which nothing else in the app decides. `available` remains the only word on whether it can be
   * bought at all.
   */
  maxQuantity?: number
  image?: CatalogImage
}

export interface SizeOption {
  id: number
  label: string
  value: string
}

/** A descriptive property from the owner-defined `attributes` collection. Not a filter. */
export interface ProductAttribute {
  name: string
  label: string
  value: string
}

export interface ProductDetail extends ProductSummary {
  categoryName: string
  categorySlug: string
  /**
   * The same amount as `price`, before formatting — an integer count of minor units, and the
   * currency it counts.
   *
   * The one place a raw amount travels outside `DiamondOption`, and it exists for `schema.org`
   * rather than for a component: an `Offer` has to carry a machine-readable number, and the only
   * alternative is parsing `"$38,320"` back into money — which is exactly what the rule at the top
   * of this file forbids. Nothing that DRAWS a price should read it.
   */
  priceMinor: number
  currency: string
  /**
   * The ceiling for a piece that has no stones — the same question `DiamondOption.maxQuantity`
   * answers for one that does. Absent where the piece is made to order, which has no ceiling.
   */
  maxQuantity?: number
  description: string | null
  gallery: CatalogImage[]
  /** Serialised from the `details` rich text. `null` where the owner left it empty. */
  detailsHtml: string | null
  diamondOptions: DiamondOption[]
  sizes: SizeOption[]
  attributes: ProductAttribute[]
  /**
   * `"From $2,400"`-style prefix money, set only where stones differ in price. `null` means the
   * piece has one price and the label above it should not say "from".
   */
  fromPrice: string | null
  collectionIds: number[]
  seo: { title: string | null; description: string | null; image: CatalogImage | null }
}

export interface CategorySummary {
  id: number
  slug: string
  title: string
  subtitle: string | null
  href: string
  /** The tile's photograph on the home page. `null` where the owner has not set one. */
  image: CatalogImage | null
}

/** The shop global — the two accordions every product page repeats, and the listing fallback. */
export interface ShopContent {
  warrantyHtml: string | null
  deliveryHtml: string | null
  listingSubtitle: string | null
  /**
   * The three accordion headings. Strings rather than `string | null`: the global defaults them to
   * the drawn text, and a heading is not a thing a page can close over — a panel with no title is
   * a control nobody can name.
   */
  detailsTitle: string
  warrantyTitle: string
  deliveryTitle: string
}

// ---------------------------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------------------------

export type SortOrder = 'recommended' | 'price-asc' | 'price-desc' | 'newest'

export const SORT_ORDERS: readonly SortOrder[] = [
  'recommended',
  'price-asc',
  'price-desc',
  'newest',
]

/**
 * Every key that may appear in a listing URL. `sort` and `page` are here with the filters because
 * they share the encoder, the round-trip test and the "absent means default" rule.
 */
export type FilterKey =
  | 'category'
  | 'collection'
  | 'size'
  | 'colour'
  | 'shape'
  | 'minPrice'
  | 'maxPrice'
  | 'inStock'
  | 'sort'
  | 'page'

/**
 * Values within one key are OR; separate keys are AND (FR-024).
 *
 * The multi-value fields are always arrays, never `string | string[]`, and never optional. A single
 * shape is what lets the drawer, the chips and the query all treat them the same way, and an empty
 * array is a perfectly good "no filter" — an optional array only adds a second one.
 */
export interface FilterState {
  category: string[]
  collection: string[]
  size: string[]
  colour: ColourValue[]
  shape: DiamondShape[]
  /** Integer minor units, so nothing ever parses a formatted string back into money. */
  minPrice?: number
  maxPrice?: number
  inStock: boolean
  sort: SortOrder
  /** 1-based. Never written to the URL when it is 1. */
  page: number
}

/** A value the URL asked for that the catalogue does not have. Reported, not silently swallowed. */
export interface DroppedFilter {
  key: FilterKey
  value: string
}

export interface ParsedFilters {
  filters: FilterState
  dropped: DroppedFilter[]
}

/** One removable filter, as drawn above the grid. `value` identifies what to strip from the URL. */
export interface AppliedFilterChip {
  key: FilterKey
  value: string
  label: string
}

export interface FacetOption {
  value: string
  label: string
  /** How many products in the current catalogue carry it. Zero options are still offered. */
  count: number
}

/** The drawer's option lists, read from the catalogue rather than hardcoded beside the drawing. */
export interface FilterFacets {
  categories: FacetOption[]
  collections: FacetOption[]
  sizes: FacetOption[]
  colours: FacetOption[]
  shapes: FacetOption[]
  /** The slider's ends, in minor units. Equal min and max means one price and no slider. */
  price: { min: number; max: number }
}

export interface ListingResult {
  products: ProductSummary[]
  total: number
  page: number
  hasMore: boolean
  appliedChips: AppliedFilterChip[]
  /** What the URL asked for and the catalogue could not honour (FR-030). */
  ignored: DroppedFilter[]
}
