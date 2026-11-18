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

import type { Locale } from '@/i18n/routing'
import type { Category, Media, Product, Shop,  Variant } from '@/payload-types'

import { CATALOG_CURRENCY, formatPriceFor } from './price'
import type {
  CatalogImage,
  CategorySummary,
  VariantOption,
  ProductAttribute,
  ProductDetail,
  ProductSummary,
  ShopContent,
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

/**
 * Payload writes an ABSOLUTE url — `http://localhost:3000/api/media/file/…` in development, the
 * deployed origin in production — and the fixtures used to write a relative one. That difference is
 * the whole of what the swap to the Local API changed downstream, and it matters because
 * `next/image` treats an absolute src as a REMOTE image: it refuses to load one whose host is not
 * listed in `images.remotePatterns`, which is what turned every product page into a 500.
 *
 * Configuring the host would work and would be wrong. The file is served by this very application —
 * Payload's own route handler — so calling it remote asks Next to treat same-origin content as
 * foreign, and pins a hostname into the build that differs in every environment.
 *
 * So OUR origin is stripped and anything else is left alone: media that genuinely moves to a CDN
 * later keeps its absolute url and gets a `remotePatterns` entry, which is the case that rule is
 * actually for.
 */
function sameOrigin(url: string): string {
  const origin = process.env.NEXT_PUBLIC_SERVER_URL
  if (!origin || !url.startsWith(origin)) return url

  const relative = url.slice(origin.length)
  return relative.startsWith('/') ? relative : `/${relative}`
}

export function toCatalogImage(media: number | Media | null | undefined): CatalogImage | null {
  const document = optional(media)
  if (!document?.url) return null

  return {
    src: sameOrigin(document.url),
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

/**
 * A stone is available if its piece is made to order, or if it has one left (spec 011, FR-002).
 *
 * **This used to read "above its own zero, whatever the parent's availability mode says", and that
 * comment was the defect.** It is the honest rule for a stock-tracked piece and the wrong one for a
 * made-to-order piece, where there is no quantity to type in: an owner who marked a ring
 * always-available and added five stones got five stones at zero, and a page that refused to sell
 * any of them. Nothing on screen explained why, because from the storefront's side the piece looked
 * exactly like one that had genuinely sold out.
 *
 * The piece's mode is passed rather than read from a parent pointer because every caller already
 * has the product in hand. That is also what keeps `variants.availability` — the denormalised column
 * the admin form needs — out of the storefront's path entirely: a mirror that fell out of step can
 * misdraw a form, and can never sell what should not be sold (011/research.md R5, R6).
 */
export function isVariantAvailable(
  variant: Variant,
  availability: Product['availability'],
): boolean {
  if (availability === 'made-to-order') return true
  return (variant.inventory ?? 0) > 0
}

/**
 * How many of a thing a customer may order, or `undefined` for no ceiling.
 *
 * Zero is deliberately NOT returned as a ceiling: a stepper capped at zero is a control stuck below
 * its own minimum, and something that cannot be bought at all is already answered by `available`.
 */
function ceiling(count: number | null | undefined): number | undefined {
  return typeof count === 'number' && count > 0 ? count : undefined
}

function productVariants(product: Product): Variant[] {
  if (!product.enableVariants) return []
  return (product.variants?.docs ?? []).filter(
    (entry): entry is Variant => typeof entry === 'object' && entry !== null,
  )
}

export function isProductAvailable(product: Product): boolean {
  const variants = productVariants(product)
  if (variants.length > 0) {
    return variants.some((variant) => isVariantAvailable(variant, product.availability))
  }

  /*
    No stones left to offer — which covers a piece that never had any, AND a made-to-order piece
    whose every stone has been taken off sale (FR-008). Unpublished stones never reach this mapper,
    so by the time the question is asked the two are indistinguishable, and falling back to the
    piece's own mode is right for both: a selector with nothing in it is not a thing to draw.
  */
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

export function toProductSummary(product: Product, locale: Locale): ProductSummary {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    href: productHref(product.slug),
    price: formatPriceFor(locale, lowestPriceMinor(product)),
    images: gallery(product),
    available: isProductAvailable(product),
  }
}

function toVariantOption(
  variant: Variant,
  locale: Locale,
  availability: Product['availability'],
): VariantOption {
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
    price: formatPriceFor(locale, priceMinor),
    /*
      No ceiling on a made-to-order stone (FR-003). A count stored from when the piece was stock
      tracked is deliberately still there — switching modes does not erase it (FR-004) — so the mode
      has to be consulted here rather than the number trusted.
    */
    ...(availability === 'made-to-order' || ceiling(variant.inventory) === undefined
      ? {}
      : { maxQuantity: ceiling(variant.inventory) }),
    priceMinor,
    available: isVariantAvailable(variant, availability),
    // What this stone says about itself, where it differs from its piece (FR-009). Empty for a
    // stone carrying none, which is every stone until an owner fills one in.
    attributes: toAttributes(variant.attributes),
    ...(image ? { image } : {}),
  }
}


/**
 * The owner-defined rows on a piece or on a stone (spec 011, FR-009).
 *
 * Takes the array rather than the document, because as of 011 a variant carries an identically
 * shaped one and the two must be read the same way. A second reader would be a second place for the
 * dropped-row rule below to drift.
 */
function toAttributes(
  rows: Product['attributes'] | Variant['attributes'],
): ProductAttribute[] {
  /*
    A row with no value in this language is dropped rather than rendered empty (spec 010, FR-047).

    `attributes[].value` stopped being `required` when it became localized: a row is shared across
    all three languages, so a required localized child would have forced every translation to be
    complete before a document could be saved in any of them. The cost is that a value can be absent
    here, and an attribute row reading "Metal:" with nothing after it is worse than one that is not
    drawn at all.
  */
  return (rows ?? []).flatMap((entry) => {
    const definition = populated(entry.attribute, 'a product attribute')
    const value = entry.value
    if (typeof value !== 'string' || value.trim() === '') return []
    return [{ name: definition.name, label: definition.label, value }]
  })
}

/**
 * The piece's rows, with the selected stone's laid over them (spec 011, FR-010, FR-011, FR-016).
 *
 * **By attribute, never by position.** Two rows for one attribute is the outcome to avoid — a stone
 * showing two carat weights is worse than one showing neither — and matching on the attribute's own
 * `name` is what makes "replace" mean replace.
 *
 * **Order is the attribute's, not the row's.** A value must not jump up the list because it happened
 * to come from the stone rather than from the piece; the customer is comparing two stones, and a
 * list that reshuffles between them is a list they have to re-read rather than scan. The piece's
 * order is kept for everything it defines, and anything only the stone carries follows it.
 */
export function mergeAttributes(
  piece: ProductAttribute[],
  stone: ProductAttribute[],
): ProductAttribute[] {
  if (stone.length === 0) return piece

  const overrides = new Map(stone.map((row) => [row.name, row]))
  const merged = piece.map((row) => overrides.get(row.name) ?? row)
  const seen = new Set(piece.map((row) => row.name))

  return [...merged, ...stone.filter((row) => !seen.has(row.name))]
}

export function toProductDetail(product: Product, locale: Locale): ProductDetail {
  const summary = toProductSummary(product, locale)
  const category = populated<Category>(product.category, `product "${product.slug}" category`)
  const variantOptions = productVariants(product)
    .map((variant) => toVariantOption(variant, locale, product.availability))
    // Cheapest first, so the drawn column reads as a price ladder rather than as insertion order.
    .sort((a, b) => a.priceMinor - b.priceMinor)

  const prices = variantOptions.map((option) => option.priceMinor)
  const varies = prices.length > 1 && Math.min(...prices) !== Math.max(...prices)

  return {
    ...summary,
    categoryName: category.title,
    categorySlug: category.slug,
    priceMinor: lowestPriceMinor(product),
    currency: CATALOG_CURRENCY,
    // Only for a piece with no stones, and only when it is counted. With stones the ceiling belongs
    // to whichever one is chosen, and a product-level number would contradict it.
    ...(variantOptions.length === 0 &&
    product.availability === 'stock-tracked' &&
    ceiling(product.inventory) !== undefined
      ? { maxQuantity: ceiling(product.inventory) }
      : {}),
    description: product.description ?? null,
    gallery: summary.images,
    madeToOrder: product.availability === 'made-to-order',
    detailsHtml: html(product.details),
    variantOptions,
    attributes: toAttributes(product.attributes),
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
    image: toCatalogImage(category.image),
  }
}

export function toShopContent(shop: Shop): ShopContent {
  return {
    warrantyHtml: html(shop.warranty),
    deliveryHtml: html(shop.delivery),
    listingSubtitle: shop.listingSubtitle ?? null,
    // Falling back to the drawn text rather than to an empty string: the global defaults these, but
    // a document saved before the fields existed has them null, and an accordion with no heading is
    // a control nobody can name.
    detailsTitle: shop.detailsTitle ?? 'PRODUCT DETAILS',
    warrantyTitle: shop.warrantyTitle ?? '3 YEAR WARRANTY + FREE RETURNS',
    deliveryTitle: shop.deliveryTitle ?? 'DELIVERY',
  }
}
