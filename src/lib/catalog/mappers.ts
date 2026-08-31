/**
 * Payload document → view model (003/T234, contract §2).
 *
 * Pure, and written once for both data sources. The fixtures and the Local API hand this the same
 * generated types, so nothing here changes when spec 004 swaps `queries.ts` — which is the property
 * the whole seam exists for.
 *
 * Two behaviours carry the risk in this file and get most of the tests.
 *
 * **Narrowing the relationship unions.** Every relationship generates as `number | Category`, and
 * which branch arrives depends on the `depth` the caller asked for. Code that assumes the populated
 * branch renders `[object Object]` in the good case and crashes in the other; code that assumes the
 * id silently drops the title. So the union is narrowed in one helper, and a document that arrives
 * at the wrong depth is a loud error rather than a blank on the page.
 *
 * **Computing `available`.** The rule lives here and nowhere else:
 *
 *   made-to-order    always available. The count is meaningless and is not consulted.
 *   stock-tracked    available above zero. At zero the piece is still SHOWN — visible and clearly
 *                    unavailable is what the owner asked for, not hidden.
 *   with variants    available when any stone is. A stone's own `inventory` decides it, whatever
 *                    the parent's mode says: made-to-order describes the setting, not the stone,
 *                    and a stone at zero is one somebody already bought (FR-040).
 *
 * A component never sees an `inventory` number, so it is never in a position to answer this
 * differently somewhere else.
 */

import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import type { Category, Media, Product, Shop, Size, Variant } from '@/payload-types'

import { CATALOG_CURRENCY, formatPrice } from './price'
import type {
  CatalogImage,
  CategorySummary,
  DiamondOption,
  ProductAttribute,
  ProductDetail,
  ProductSummary,
  ShopContent,
  SizeOption,
} from './types'

/**
 * The populated branch, or a thrown error naming what went wrong. Returning `null` for an
 * unpopulated relationship was the alternative and it is worse: the page renders, the category
 * heading is empty, and the cause is a `depth` argument three files away.
 */
function populated<T extends object>(value: number | T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`${what} is missing`)
  if (typeof value === 'number') {
    throw new Error(`${what} arrived as an id — the query needs a greater depth to populate it`)
  }
  return value
}

/** The same, for a relationship that is legitimately optional. */
function optional<T extends object>(value: number | T | null | undefined): T | null {
  if (value === null || value === undefined || typeof value === 'number') return null
  return value
}

export function toCatalogImage(media: number | Media | null | undefined): CatalogImage | null {
  const document = optional(media)
  if (!document?.url) return null

  return {
    src: document.url,
    width: document.width ?? 0,
    height: document.height ?? 0,
    // A single space is how the admin records "decorative" (see the `alt` field's description), and
    // it must survive as an empty string rather than becoming the filename.
    ...(document.alt.trim() === '' ? {} : { alt: document.alt }),
  }
}

function gallery(product: Product): CatalogImage[] {
  return product.gallery
    .map((entry) => toCatalogImage(entry))
    .filter((entry): entry is CatalogImage => entry !== null)
}

/** `null` where the owner left the field empty, so a caller can close the layout over it. */
function html(value: Product['details'] | Shop['warranty']): string | null {
  if (!value) return null

  // The generated type describes the same document `SerializedEditorState` does, one field at a
  // time, and the two descriptions are not assignable to each other. The cast is the seam between
  // Payload's generated shape and lexical's own; it is not hiding an unknown.
  const output = convertLexicalToHTML({
    data: value as unknown as SerializedEditorState,
    disableContainer: true,
  }).trim()

  return output === '' ? null : output
}

// ---------------------------------------------------------------------------------------------
// Availability — the rule, in one place
// ---------------------------------------------------------------------------------------------

/** A stone is available above its own zero, whatever the parent's availability mode says. */
export function isVariantAvailable(variant: Variant): boolean {
  return (variant.inventory ?? 0) > 0
}

function productVariants(product: Product): Variant[] {
  if (!product.enableVariants) return []
  return (product.variants?.docs ?? []).filter(
    (entry): entry is Variant => typeof entry === 'object' && entry !== null,
  )
}

export function isProductAvailable(product: Product): boolean {
  const variants = productVariants(product)
  if (variants.length > 0) return variants.some(isVariantAvailable)
  if (product.availability === 'made-to-order') return true
  return (product.inventory ?? 0) > 0
}

// ---------------------------------------------------------------------------------------------
// Price
// ---------------------------------------------------------------------------------------------

/**
 * What the card shows. With stones that is the cheapest one — the listing advertises the price a
 * visitor can actually reach, and the product page repeats it under "From".
 *
 * Stones that are sold out still count. A price that moves because somebody else bought the cheap
 * stone is a listing that contradicts itself between two loads.
 */
export function lowestPriceMinor(product: Product): number {
  const variants = productVariants(product)
  const prices = variants
    .map((variant) => variant.priceInUSD)
    .filter((price): price is number => typeof price === 'number')

  if (prices.length > 0) return Math.min(...prices)
  return product.priceInUSD ?? 0
}

// ---------------------------------------------------------------------------------------------
// View models
// ---------------------------------------------------------------------------------------------

export const productHref = (slug: string): string => `/products/${slug}`
export const categoryHref = (slug: string): string => `/${slug}`

export function toProductSummary(product: Product): ProductSummary {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    href: productHref(product.slug),
    price: formatPrice(lowestPriceMinor(product)),
    images: gallery(product),
    available: isProductAvailable(product),
  }
}

function toDiamondOption(variant: Variant): DiamondOption {
  // A variant's label is its options joined — one today, and joined rather than indexed so that a
  // second variant type arriving later reads correctly instead of silently showing the first.
  const label = variant.options
    .map((option) => (typeof option === 'object' ? option.label : ''))
    .filter((part) => part !== '')
    .join(' · ')

  const priceMinor = variant.priceInUSD ?? 0
  const image = toCatalogImage(variant.image)

  return {
    id: variant.id,
    label: label === '' ? (variant.title ?? `Option ${variant.id}`) : label,
    price: formatPrice(priceMinor),
    priceMinor,
    available: isVariantAvailable(variant),
    ...(image ? { image } : {}),
  }
}

function toSizeOption(size: number | Size): SizeOption {
  const document = populated<Size>(size, 'a size')
  return { id: document.id, label: document.label, value: document.value }
}

function toAttributes(product: Product): ProductAttribute[] {
  return (product.attributes ?? []).map((entry) => {
    const definition = populated(entry.attribute, 'a product attribute')
    return { name: definition.name, label: definition.label, value: entry.value }
  })
}

export function toProductDetail(product: Product): ProductDetail {
  const summary = toProductSummary(product)
  const category = populated<Category>(product.category, `product "${product.slug}" category`)
  const diamondOptions = productVariants(product)
    .map(toDiamondOption)
    // Cheapest first, so the drawn column reads as a price ladder rather than as insertion order.
    .sort((a, b) => a.priceMinor - b.priceMinor)

  const prices = diamondOptions.map((option) => option.priceMinor)
  const varies = prices.length > 1 && Math.min(...prices) !== Math.max(...prices)

  return {
    ...summary,
    categoryName: category.title,
    categorySlug: category.slug,
    priceMinor: lowestPriceMinor(product),
    currency: CATALOG_CURRENCY,
    description: product.description ?? null,
    gallery: summary.images,
    detailsHtml: html(product.details),
    diamondOptions,
    sizes: (product.sizes ?? []).map(toSizeOption),
    attributes: toAttributes(product),
    fromPrice: varies ? summary.price : null,
    collectionIds: (product.collections ?? []).map((entry) =>
      typeof entry === 'number' ? entry : entry.id,
    ),
    seo: {
      title: product.seo?.title ?? null,
      description: product.seo?.description ?? null,
      image: toCatalogImage(product.seo?.image) ?? summary.images[0] ?? null,
    },
  }
}

export function toCategorySummary(category: Category): CategorySummary {
  return {
    id: category.id,
    slug: category.slug,
    title: category.title,
    subtitle: category.subtitle ?? null,
    href: categoryHref(category.slug),
  }
}

export function toShopContent(shop: Shop): ShopContent {
  return {
    warrantyHtml: html(shop.warranty),
    deliveryHtml: html(shop.delivery),
    listingSubtitle: shop.listingSubtitle ?? null,
  }
}
