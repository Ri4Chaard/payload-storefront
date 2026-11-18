/**
 * The catalogue's development content (003/T231).
 *
 * **Every array here is annotated with the GENERATED collection type.** Not a hand-written
 * interface that resembles it — the real `Product`, `Variant`, `Category` from `payload-types.ts`.
 * That is the whole reason this file is allowed to exist while Constitution I says content comes
 * from Payload: the deviation is the data *source*, not the data *shape*. Add a required field to a
 * collection, run `pnpm generate:types`, and every fixture missing it fails `pnpm typecheck` in the
 * same change. A mirrored interface would have kept compiling and drifted quietly, which is exactly
 * the failure the rule in `./index.ts` is written against.
 *
 * Three consequences follow from that, and all three are the point rather than an annoyance:
 *
 *   `id`/`createdAt`/`updatedAt`/`_status` are on every fixture. Verbose. Also what a document is.
 *   Relationships are unions — `category: number | Category` — and these use the POPULATED branch,
 *     which is what `depth: 1` returns. Variant options are populated too (`depth: 2`), because the
 *     option selector needs their labels.
 *   `variants` is the plugin's paginated join shape, not a bare array.
 *
 * The one place the populated branch is deliberately NOT used is `Variant.product`, which stays a
 * number. Populating both ends makes a cycle, and a cycle in a fixture is a stack overflow in
 * whatever first tries to serialise it.
 *
 * **The catalogue mirrors `scripts/seed-catalog.ts`.** Same slugs, same prices, same options. The
 * five drawn products are first and carry the real copy; the rest are filler, generated below, whose
 * only job is to make the grid long enough that paging and sorting have something to do.
 */

import type {
  Attribute,
  Category,
  Collection,
  Colour,
  Media,
  Product,
  Shop,
  Variant,
  VariantOption,
  VariantType,
} from '@/payload-types'

/** Fixed, because a fixture that changes between two renders is a snapshot test that never passes. */
const AT = '2026-08-28T12:00:00.000Z'
const STAMPS = { createdAt: AT, updatedAt: AT } as const

/** Dollars to the integer minor units the plugin stores. Mirrors the seed's `usd()` exactly. */
const usd = (dollars: number): number => Math.round(dollars * 100)

/** A lexical document with one paragraph per string — the shape the rich-text field round-trips. */
function richText(paragraphs: string[]): NonNullable<Product['details']> {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        textFormat: 0,
        children: [
          { type: 'text', format: 0, style: '', text, detail: 0, mode: 'normal', version: 1 },
        ],
      })),
    },
  }
}

// ---------------------------------------------------------------------------------------------
// Photography
// ---------------------------------------------------------------------------------------------

function photograph(id: number, filename: string, width: number, height: number, alt: string): Media {
  return {
    id,
    alt,
    ...STAMPS,
    url: `/photography/${filename}`,
    filename,
    mimeType: 'image/webp',
    width,
    height,
  }
}

export const mediaFixtures: Media[] = [
  photograph(1, 'product-1-a.webp', 1274, 1600, 'Product 1'),
  photograph(2, 'product-1-c.webp', 1000, 1000, 'Product 1, second view'),
  photograph(3, 'product-1-d.webp', 1000, 1000, 'Product 1, third view'),
  photograph(4, 'product-1-b.webp', 1274, 1600, 'Product 1, fourth view'),
  photograph(5, 'product-1-e.webp', 1274, 1600, 'Product 1, fifth view'),
  photograph(6, 'product-2.webp', 830, 830, 'Product 2'),
  photograph(7, 'product-3.webp', 830, 830, 'Product 3'),
  photograph(8, 'product-4.webp', 830, 830, 'Product 4'),
  photograph(9, 'product-5.webp', 830, 830, 'Product 5'),
]

const image = (index: number): Media => {
  const found = mediaFixtures[index]
  if (!found) throw new Error(`no photograph at index ${index}`)
  return found
}

const PRODUCT_1_GALLERY = [image(0), image(1), image(2), image(3), image(4)]

// ---------------------------------------------------------------------------------------------
// Reference collections
// ---------------------------------------------------------------------------------------------

export const categoryFixtures: Category[] = [
  {
    id: 1,
    title: 'Category 1',
    slug: 'category-1',
    subtitle: 'A short description of this category',
    order: 1,
    ...STAMPS,
  },
  {
    id: 2,
    title: 'Category 2',
    slug: 'category-2',
    subtitle: 'A short description of this category',
    order: 2,
    ...STAMPS,
  },
  {
    id: 3,
    title: 'Category 3',
    slug: 'category-3',
    subtitle: 'A short description of this category',
    order: 3,
    ...STAMPS,
  },
  {
    id: 4,
    title: 'Category 4',
    slug: 'category-4',
    subtitle: 'A short description of this category',
    order: 4,
    ...STAMPS,
  },
]

const category = (slug: string): Category => {
  const found = categoryFixtures.find((entry) => entry.slug === slug)
  if (!found) throw new Error(`no category "${slug}"`)
  return found
}

export const collectionFixtures: Collection[] = [
  { id: 1, title: 'Collection A', slug: 'collection-a', order: 1, ...STAMPS },
  { id: 2, title: 'Collection B', slug: 'collection-b', order: 2, ...STAMPS },
  { id: 3, title: 'Collection C', slug: 'collection-c', order: 3, ...STAMPS },
  { id: 4, title: 'Collection D', slug: 'collection-d', order: 4, ...STAMPS },
]

const collection = (slug: string): Collection => {
  const found = collectionFixtures.find((entry) => entry.slug === slug)
  if (!found) throw new Error(`no collection "${slug}"`)
  return found
}



/**
 * The owner-managed colours (spec 011). `label` is what the drawer shows; `value` is what travels
 * in the URL and is what a link bookmarked before 011 still carries.
 */
export const colourFixtures: Colour[] = [
  { id: 1, label: 'Black', value: 'black', order: 0, ...STAMPS },
  { id: 2, label: 'Clear', value: 'clear', order: 1, ...STAMPS },
  { id: 3, label: 'Green', value: 'green', order: 2, ...STAMPS },
  { id: 4, label: 'Multicolor', value: 'multicolor', order: 3, ...STAMPS },
]

const colour = (value: string): Colour => {
  const found = colourFixtures.find((entry) => entry.value === value)
  if (!found) throw new Error(`no colour "${value}"`)
  return found
}

export const attributeFixtures: Attribute[] = [
  { id: 1, label: 'Material', name: 'material', type: 'text', order: 1, ...STAMPS },
  { id: 2, label: 'Weight', name: 'weight', type: 'text', order: 2, ...STAMPS },
  { id: 3, label: 'Origin', name: 'origin', type: 'text', order: 3, ...STAMPS },
]

const attribute = (name: string): Attribute => {
  const found = attributeFixtures.find((entry) => entry.name === name)
  if (!found) throw new Error(`no attribute "${name}"`)
  return found
}

// ---------------------------------------------------------------------------------------------
// The variant type and its options
// ---------------------------------------------------------------------------------------------

export const variantTypeFixtures: VariantType[] = [
  { id: 1, name: 'variant', label: 'Option', ...STAMPS },
]

/** `surcharge` is dollars ON TOP of the product's base price — the same arithmetic the seed does. */
const OPTIONS: { label: string; value: string; surcharge: number; inventory: number }[] = [
  { label: 'Option A', value: 'option-a', surcharge: 0, inventory: 4 },
  { label: 'Option B', value: 'option-b', surcharge: 4200, inventory: 2 },
  { label: 'Option C', value: 'option-c', surcharge: 9600, inventory: 1 },
  // Deliberately taken. FR-040 needs an option that is drawn and cannot be chosen.
  { label: 'Option D', value: 'option-d', surcharge: 18400, inventory: 0 },
]

export const variantOptionFixtures: VariantOption[] = OPTIONS.map((entry, index) => ({
  id: index + 1,
  variantType: 1,
  label: entry.label,
  value: entry.value,
  ...STAMPS,
}))

// ---------------------------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------------------------

interface ProductSeed {
  id: number
  slug: string
  title: string
  categorySlug: string
  gallery: Media[]
  /** Dollars. Converted to minor units on the way into the fixture, never after. */
  price: number
  description?: string
  collectionSlugs?: string[]
  colour?: string[]
  availability?: Product['availability']
  inventory?: number
  attributes?: { name: string; value: string }[]
  withVariants?: boolean
  status?: 'draft' | 'published'
}

/** Filled as products are built, because a variant needs its parent's id and its base price. */
const variants: Variant[] = []

function build(seed: ProductSeed): Product {
  const base = usd(seed.price)
  const stocked = seed.availability === 'stock-tracked'

  const own: Variant[] = seed.withVariants
    ? OPTIONS.map((entry, index) => {
        const option = variantOptionFixtures[index]
        if (!option) throw new Error(`no option at index ${index}`)
        return {
          id: variants.length + index + 1,
          title: `${seed.title} — ${entry.label}`,
          // A number, not the product. See the note at the top of the file.
          product: seed.id,
          options: [option],
          inventory: entry.inventory,
          priceInUSDEnabled: true,
          priceInUSD: usd(seed.price + entry.surcharge),
          _status: 'published',
          ...STAMPS,
        }
      })
    : []

  variants.push(...own)

  return {
    id: seed.id,
    slug: seed.slug,
    title: seed.title,
    availability: seed.availability ?? 'made-to-order',
    ...(stocked ? { inventory: seed.inventory ?? 0 } : {}),
    description: seed.description ?? null,
    gallery: seed.gallery,
    details: richText(
      [seed.description, 'Handcrafted in our atelier.'].filter(
        (line): line is string => typeof line === 'string',
      ),
    ),
    attributes:
      seed.attributes?.map((entry, index) => ({
        id: `${seed.slug}-${index}`,
        attribute: attribute(entry.name),
        value: entry.value,
      })) ?? [],
    category: category(seed.categorySlug),
    collections: (seed.collectionSlugs ?? []).map(collection),
    colour: (seed.colour ?? []).map(colour),
    enableVariants: Boolean(seed.withVariants),
    variantTypes: seed.withVariants ? variantTypeFixtures : [],
    variants: { docs: own, hasNextPage: false, totalDocs: own.length },
    priceInUSDEnabled: true,
    priceInUSD: base,
    _status: seed.status ?? 'published',
    ...STAMPS,
  }
}

/** The five products the design draws, with the copy the seed uses. */
const DRAWN: ProductSeed[] = [
  {
    // The product the product page is drawn around (node 231:1901). BOTH option paths: options that
    // move the price. Sizes were the other axis until spec 011 deprecated them.
    id: 1,
    slug: 'product-1',
    title: 'Product 1',
    categorySlug: 'category-1',
    gallery: PRODUCT_1_GALLERY,
    price: 38320,
    description:
      'Available in several options. Weight and finish vary slightly from one item to another.',
    collectionSlugs: ['collection-a'],
    colour: ['clear'],
    availability: 'made-to-order',
    withVariants: true,
    attributes: [
      { name: 'material', value: 'Sample material' },
      { name: 'weight', value: '1.0 kg' },
      { name: 'origin', value: 'Sample origin' },
    ],
  },
  {
    // No options at all — a product with no choice to make.
    id: 2,
    slug: 'product-2',
    title: 'Product 2',
    categorySlug: 'category-2',
    gallery: [image(5), image(6)],
    price: 37400,
    description: 'Short product description. Replace it with your own text.',
    collectionSlugs: ['collection-c'],
    colour: ['clear'],
    attributes: [
      { name: 'material', value: 'Sample material' },
      { name: 'weight', value: '1.0 kg' },
    ],
  },
  {
    // No options, and stock-tracked at a real count.
    id: 3,
    slug: 'product-3',
    title: 'Product 3',
    categorySlug: 'category-4',
    gallery: [image(6)],
    price: 12400,
    description: 'Short product description. Replace it with your own text.',
    collectionSlugs: ['collection-b'],
    colour: ['clear'],
    availability: 'stock-tracked',
    inventory: 3,
    attributes: [{ name: 'material', value: 'Sample material' }],
  },
  {
    id: 4,
    slug: 'product-4',
    title: 'Product 4',
    categorySlug: 'category-3',
    gallery: [image(7)],
    price: 21800,
    description: 'Short product description. Replace it with your own text.',
    collectionSlugs: ['collection-d'],
    colour: ['multicolor'],
    attributes: [{ name: 'material', value: 'Sample material' }],
  },
  {
    // Stock-tracked AT ZERO — visible, priced, and not orderable (FR-039).
    id: 5,
    slug: 'product-5',
    title: 'Product 5',
    categorySlug: 'category-4',
    gallery: [image(8)],
    price: 9600,
    description: 'Short product description. Replace it with your own text.',
    collectionSlugs: ['collection-d'],
    colour: ['multicolor'],
    availability: 'stock-tracked',
    inventory: 0,
    attributes: [{ name: 'material', value: 'Sample material' }],
  },
]

/**
 * Filler. A 1920 grid is four across and the listing pages at twelve, so a grid that pages needs
 * more than two dozen products — and sorting by price proves nothing over five. These carry generated
 * names and rotate through the categories, colours, shapes and price bands so that every filter in
 * the drawer matches something and excludes something.
 */
/**
 * Filler. A 1920 grid is four across and the listing pages at twelve, so a grid that pages needs
 * more than two dozen products — and sorting by price proves nothing over five.
 *
 * **The name and the category are one entry, not two rotating lists.** An earlier version picked
 * the category from the index and the name from a parallel array, which put a product
 * named for Category 3 in Category 1. Nothing was broken except the fixture, and it took a screenshot to
 * see — which is exactly the sort of thing development content is for.
 */
const FILLER_PRODUCTS: { title: string; categorySlug: string }[] = [
  { title: 'Product 7', categorySlug: 'category-1' },
  { title: 'Product 8', categorySlug: 'category-1' },
  { title: 'Product 9', categorySlug: 'category-1' },
  { title: 'Product 10', categorySlug: 'category-1' },
  { title: 'Product 11', categorySlug: 'category-1' },
  { title: 'Product 12', categorySlug: 'category-1' },
  { title: 'Product 13', categorySlug: 'category-1' },
  { title: 'Product 14', categorySlug: 'category-2' },
  { title: 'Product 15', categorySlug: 'category-2' },
  { title: 'Product 16', categorySlug: 'category-2' },
  { title: 'Product 17', categorySlug: 'category-2' },
  { title: 'Product 18', categorySlug: 'category-2' },
  { title: 'Product 19', categorySlug: 'category-3' },
  { title: 'Product 20', categorySlug: 'category-3' },
  { title: 'Product 21', categorySlug: 'category-3' },
  { title: 'Product 22', categorySlug: 'category-3' },
  { title: 'Product 23', categorySlug: 'category-3' },
  { title: 'Product 24', categorySlug: 'category-3' },
  { title: 'Product 25', categorySlug: 'category-4' },
  { title: 'Product 26', categorySlug: 'category-4' },
  { title: 'Product 27', categorySlug: 'category-4' },
  { title: 'Product 28', categorySlug: 'category-4' },
  { title: 'Product 29', categorySlug: 'category-4' },
  { title: 'Product 30', categorySlug: 'category-4' },
]

// Colour VALUES, resolved to rows by the builder — the same strings a URL carries.
const FILLER_COLOURS: string[][] = [
  ['clear'],
  ['black'],
  ['green'],
  ['multicolor'],
  ['clear', 'black'],
]
/** A product is photographed as what it is: each category gets its own pictures. */
const GALLERY_FOR: Record<string, Media[]> = {
  'category-1': [image(0), image(1)],
  'category-2': [image(5)],
  'category-3': [image(7)],
  'category-4': [image(6), image(8)],
}

const pick = <T,>(list: readonly T[], index: number): T => {
  const found = list[index % list.length]
  if (found === undefined) throw new Error('cannot pick from an empty list')
  return found
}

const FILLER: ProductSeed[] = FILLER_PRODUCTS.map(({ title, categorySlug }, index) => {
  const stocked = index % 4 === 3

  return {
    id: 100 + index,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title,
    categorySlug,
    gallery: GALLERY_FOR[categorySlug] ?? [image(0)],
    // 1,200 → 46,000 in even steps, so a price filter always has something on each side of it.
    price: 1200 + index * 1950,
    description: `${title}, made to order in our atelier.`,
    collectionSlugs: [pick(['collection-a', 'collection-b', 'collection-c', 'collection-d'], index)],
    colour: pick(FILLER_COLOURS, index),
    availability: stocked ? 'stock-tracked' : 'made-to-order',
    // Every fourth is tracked, and one of those is empty — the IN-STOCK ONLY filter needs both.
    inventory: index === 7 ? 0 : 2,
    attributes: [{ name: 'material', value: index % 2 === 0 ? 'Material A' : 'Material B' }],
  }
})

/**
 * A draft. It has a slug, it is complete, and nothing anonymous may reach it — `getProduct` returns
 * `null` for it and the listing never contains it. Keeping one here is what stops FR-009 from being
 * a rule nobody ever exercises.
 */
const UNPUBLISHED: ProductSeed = {
  id: 999,
  slug: 'unreleased-product',
  title: 'Unreleased Product',
  categorySlug: 'category-2',
  gallery: [image(5)],
  price: 28000,
  description: 'Not yet announced.',
  collectionSlugs: ['collection-d'],
  colour: ['clear'],
  status: 'draft',
}

export const productFixtures: Product[] = [...DRAWN, ...FILLER, UNPUBLISHED].map(build)

/** Every variant across every product, flattened. `build` fills this as it goes. */
export const variantFixtures: Variant[] = variants

export const shopFixture: Shop = {
  id: 1,
  warranty: richText([
    'Every product is covered for three years against manufacturing defects.',
    'Returns are free within 30 days, in the original packaging.',
  ]),
  delivery: richText([
    'Made-to-order products ship within 3 to 4 weeks. Products in stock ship the next working day.',
    'Delivery is insured and signature required, worldwide.',
  ]),
  listingSubtitle: 'A short description of this listing',
  ...STAMPS,
}
