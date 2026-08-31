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
 *     stone selector needs their labels.
 *   `variants` is the plugin's paginated join shape, not a bare array.
 *
 * The one place the populated branch is deliberately NOT used is `Variant.product`, which stays a
 * number. Populating both ends makes a cycle, and a cycle in a fixture is a stack overflow in
 * whatever first tries to serialise it.
 *
 * **The catalogue mirrors `scripts/seed-catalog.ts`.** Same slugs, same prices, same stones. The
 * five drawn pieces are first and carry the real copy; the rest are filler, generated below, whose
 * only job is to make the grid long enough that paging and sorting have something to do.
 */

import type {
  Attribute,
  Category,
  Collection,
  Media,
  Product,
  Shop,
  Size,
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
  photograph(1, 'product-ring-packshot.webp', 1274, 1600, 'Paragon emerald cut diamond engagement ring'),
  photograph(2, 'product-ring-jacket.webp', 1000, 1000, 'The ring worn with a tailored jacket'),
  photograph(3, 'product-ring-arm.webp', 1000, 1000, 'The ring on a resting hand'),
  photograph(4, 'product-ring-portrait.webp', 1274, 1600, 'The ring worn, in portrait'),
  photograph(5, 'product-ring-denim.webp', 1274, 1600, 'The ring against denim'),
  photograph(6, 'product-bracelet.webp', 830, 830, 'Pavé butterfly diamond bracelet'),
  photograph(7, 'product-pendant.webp', 830, 830, 'Butterfly diamond pendant'),
  photograph(8, 'product-ear-climbers.webp', 830, 830, 'Butterfly ruby and pink sapphire ear climbers'),
  photograph(9, 'product-mini-pendant.webp', 830, 830, 'Butterfly ruby and pink sapphire mini pendant'),
]

const image = (index: number): Media => {
  const found = mediaFixtures[index]
  if (!found) throw new Error(`no photograph at index ${index}`)
  return found
}

const RING_GALLERY = [image(0), image(1), image(2), image(3), image(4)]

// ---------------------------------------------------------------------------------------------
// Reference collections
// ---------------------------------------------------------------------------------------------

export const categoryFixtures: Category[] = [
  {
    id: 1,
    title: 'Diamond Rings',
    slug: 'rings',
    subtitle: 'Timeless brilliance, made for every moment',
    order: 1,
    ...STAMPS,
  },
  {
    id: 2,
    title: 'Diamond Bracelets',
    slug: 'bracelets',
    subtitle: 'Timeless brilliance, made for every moment',
    order: 2,
    ...STAMPS,
  },
  {
    id: 3,
    title: 'Diamond Earrings',
    slug: 'earrings',
    subtitle: 'Timeless brilliance, made for every moment',
    order: 3,
    ...STAMPS,
  },
  {
    id: 4,
    title: 'Diamond Necklaces',
    slug: 'necklaces',
    subtitle: 'Timeless brilliance, made for every moment',
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
  { id: 1, title: 'Deia', slug: 'deia', order: 1, ...STAMPS },
  { id: 2, title: 'Marvel', slug: 'marvel', order: 2, ...STAMPS },
  { id: 3, title: 'Molten', slug: 'molten', order: 3, ...STAMPS },
  { id: 4, title: 'Spartan', slug: 'spartan', order: 4, ...STAMPS },
]

const collection = (slug: string): Collection => {
  const found = collectionFixtures.find((entry) => entry.slug === slug)
  if (!found) throw new Error(`no collection "${slug}"`)
  return found
}

/** Ring sizes. `label` is what the selector shows; `value` is what travels in the URL. */
export const sizeFixtures: Size[] = ['2', '2.25', '2.5', '2.75', '3'].map((value, index) => ({
  id: index + 1,
  label: value,
  value,
  order: index + 1,
  ...STAMPS,
}))

const size = (value: string): Size => {
  const found = sizeFixtures.find((entry) => entry.value === value)
  if (!found) throw new Error(`no size "${value}"`)
  return found
}

export const attributeFixtures: Attribute[] = [
  { id: 1, label: 'Metal', name: 'metal', type: 'text', order: 1, ...STAMPS },
  { id: 2, label: 'Carat weight', name: 'carat', type: 'text', order: 2, ...STAMPS },
  { id: 3, label: 'Provenance', name: 'provenance', type: 'text', order: 3, ...STAMPS },
]

const attribute = (name: string): Attribute => {
  const found = attributeFixtures.find((entry) => entry.name === name)
  if (!found) throw new Error(`no attribute "${name}"`)
  return found
}

// ---------------------------------------------------------------------------------------------
// The diamond variant type and its stones
// ---------------------------------------------------------------------------------------------

export const variantTypeFixtures: VariantType[] = [
  { id: 1, name: 'diamond', label: 'Choose Your Diamond:', ...STAMPS },
]

/** `surcharge` is dollars ON TOP of the piece's base price — the same arithmetic the seed does. */
const STONES: { label: string; value: string; surcharge: number; inventory: number }[] = [
  { label: 'Lab 1.0 ct D VS1', value: 'lab-1-0-d-vs1', surcharge: 0, inventory: 4 },
  { label: 'Lab 1.5 ct each D VS1 With Halo', value: 'lab-1-5-d-vs1-halo', surcharge: 4200, inventory: 2 },
  { label: 'Lab 2.0 ct D VVS2', value: 'lab-2-0-d-vvs2', surcharge: 9600, inventory: 1 },
  // Deliberately taken. FR-040 needs a stone that is drawn and cannot be chosen.
  { label: 'Natural 1.5 ct E VS2', value: 'natural-1-5-e-vs2', surcharge: 18400, inventory: 0 },
]

export const variantOptionFixtures: VariantOption[] = STONES.map((stone, index) => ({
  id: index + 1,
  variantType: 1,
  label: stone.label,
  value: stone.value,
  ...STAMPS,
}))

// ---------------------------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------------------------

interface Piece {
  id: number
  slug: string
  title: string
  categorySlug: string
  gallery: Media[]
  /** Dollars. Converted to minor units on the way into the fixture, never after. */
  price: number
  description?: string
  collectionSlugs?: string[]
  sizeValues?: string[]
  colour?: Product['colour']
  diamondShape?: Product['diamondShape']
  availability?: Product['availability']
  inventory?: number
  attributes?: { name: string; value: string }[]
  withStones?: boolean
  status?: 'draft' | 'published'
}

/** Filled as products are built, because a variant needs its parent's id and its base price. */
const variants: Variant[] = []

function build(piece: Piece): Product {
  const base = usd(piece.price)
  const stocked = piece.availability === 'stock-tracked'

  const own: Variant[] = piece.withStones
    ? STONES.map((stone, index) => {
        const option = variantOptionFixtures[index]
        if (!option) throw new Error(`no stone at index ${index}`)
        return {
          id: variants.length + index + 1,
          title: `${piece.title} — ${stone.label}`,
          // A number, not the product. See the note at the top of the file.
          product: piece.id,
          options: [option],
          inventory: stone.inventory,
          priceInUSDEnabled: true,
          priceInUSD: usd(piece.price + stone.surcharge),
          _status: 'published',
          ...STAMPS,
        }
      })
    : []

  variants.push(...own)

  return {
    id: piece.id,
    slug: piece.slug,
    title: piece.title,
    availability: piece.availability ?? 'made-to-order',
    ...(stocked ? { inventory: piece.inventory ?? 0 } : {}),
    description: piece.description ?? null,
    gallery: piece.gallery,
    details: richText(
      [piece.description, 'Handcrafted in our atelier.'].filter(
        (line): line is string => typeof line === 'string',
      ),
    ),
    attributes:
      piece.attributes?.map((entry, index) => ({
        id: `${piece.slug}-${index}`,
        attribute: attribute(entry.name),
        value: entry.value,
      })) ?? [],
    category: category(piece.categorySlug),
    collections: (piece.collectionSlugs ?? []).map(collection),
    sizes: (piece.sizeValues ?? []).map(size),
    colour: piece.colour ?? [],
    diamondShape: piece.diamondShape ?? [],
    enableVariants: Boolean(piece.withStones),
    variantTypes: piece.withStones ? variantTypeFixtures : [],
    variants: { docs: own, hasNextPage: false, totalDocs: own.length },
    priceInUSDEnabled: true,
    priceInUSD: base,
    _status: piece.status ?? 'published',
    ...STAMPS,
  }
}

/** The five pieces the design draws, with the copy the seed uses. */
const DRAWN: Piece[] = [
  {
    // The piece the product page is drawn around (node 231:1901). BOTH option paths: stones that
    // move the price, and sizes that do not.
    id: 1,
    slug: 'paragon-emerald-cut-diamond-engagement-ring',
    title: 'Paragon Emerald Cut Diamond Engagement Ring',
    categorySlug: 'rings',
    gallery: RING_GALLERY,
    price: 38320,
    description:
      'Available in a variety of carat weights, every stone is set by hand. Size, carat weight and stone quantities vary slightly from one ring to another.',
    collectionSlugs: ['deia'],
    sizeValues: ['2', '2.25', '2.5', '2.75', '3'],
    colour: ['clear'],
    diamondShape: ['emerald', 'round'],
    availability: 'made-to-order',
    withStones: true,
    attributes: [
      { name: 'metal', value: '18k white gold' },
      { name: 'carat', value: '1.5 ct centre stone' },
      { name: 'provenance', value: 'Lab grown, IGI certified' },
    ],
  },
  {
    // Sizes but no stones — the middle case of FR-008's "neither, either, or both".
    id: 2,
    slug: 'pave-butterfly-diamond-bracelet',
    title: 'Pavé Butterfly Diamond Bracelet',
    categorySlug: 'bracelets',
    gallery: [image(5), image(6)],
    price: 37400,
    description: 'Butterflies in pavé diamonds, set along a flexible band.',
    collectionSlugs: ['molten'],
    sizeValues: ['2', '2.25'],
    colour: ['clear'],
    diamondShape: ['round', 'oval'],
    attributes: [
      { name: 'metal', value: '18k white gold' },
      { name: 'carat', value: '4.2 ct total' },
    ],
  },
  {
    // Neither stones nor sizes, and stock-tracked at a real count.
    id: 3,
    slug: 'butterfly-diamond-pendant',
    title: 'Butterfly Diamond Pendant',
    categorySlug: 'necklaces',
    gallery: [image(6)],
    price: 12400,
    description: 'A single butterfly, pavé set, on a fine chain.',
    collectionSlugs: ['marvel'],
    colour: ['clear'],
    diamondShape: ['round'],
    availability: 'stock-tracked',
    inventory: 3,
    attributes: [{ name: 'metal', value: '18k white gold' }],
  },
  {
    id: 4,
    slug: 'butterfly-ruby-pink-sapphire-diamond-ear-climbers',
    title: 'Butterfly Ruby, Pink Sapphire and Diamond Ear Climbers',
    categorySlug: 'earrings',
    gallery: [image(7)],
    price: 21800,
    description: 'Ruby and pink sapphire butterflies that climb the ear.',
    collectionSlugs: ['spartan'],
    colour: ['multicolor'],
    diamondShape: ['round', 'marquise'],
    attributes: [{ name: 'metal', value: '18k rose gold' }],
  },
  {
    // Stock-tracked AT ZERO — visible, priced, and not orderable (FR-039).
    id: 5,
    slug: 'butterfly-ruby-pink-sapphire-diamond-mini-pendant',
    title: 'Butterfly Ruby, Pink Sapphire and Diamond Mini Pendant',
    categorySlug: 'necklaces',
    gallery: [image(8)],
    price: 9600,
    description: 'The mini butterfly, in ruby and pink sapphire.',
    collectionSlugs: ['spartan'],
    colour: ['multicolor'],
    diamondShape: ['pear'],
    availability: 'stock-tracked',
    inventory: 0,
    attributes: [{ name: 'metal', value: '18k rose gold' }],
  },
]

/**
 * Filler. A 1920 grid is four across and the listing pages at twelve, so a grid that pages needs
 * more than two dozen pieces — and sorting by price proves nothing over five. These carry generated
 * names and rotate through the categories, colours, shapes and price bands so that every filter in
 * the drawer matches something and excludes something.
 */
const FILLER_NAMES = [
  'Halo Solitaire Ring',
  'Baguette Eternity Band',
  'Marquise Cluster Ring',
  'Princess Cut Signet Ring',
  'Oval Trilogy Ring',
  'Tennis Bracelet',
  'Bezel Link Bracelet',
  'Pear Drop Bracelet',
  'Emerald Bar Bracelet',
  'Round Stud Earrings',
  'Baguette Huggie Earrings',
  'Oval Drop Earrings',
  'Marquise Threader Earrings',
  'Princess Halo Earrings',
  'Solitaire Necklace',
  'Riviera Necklace',
  'Pear Pendant Necklace',
  'Baguette Bar Necklace',
  'Emerald Station Necklace',
  'Cushion Halo Ring',
  'Twisted Pavé Ring',
  'Open Cuff Bracelet',
  'Double Hoop Earrings',
  'Layered Chain Necklace',
]

const FILLER_CATEGORIES = ['rings', 'bracelets', 'earrings', 'necklaces']
const FILLER_COLOURS: NonNullable<Product['colour']>[] = [
  ['clear'],
  ['black'],
  ['green'],
  ['multicolor'],
  ['clear', 'black'],
]
const FILLER_SHAPES: NonNullable<Product['diamondShape']>[] = [
  ['round'],
  ['oval'],
  ['emerald'],
  ['pear'],
  ['marquise'],
  ['princess'],
  ['baguette'],
]
const FILLER_GALLERIES = [[image(5)], [image(6)], [image(7)], [image(8)], [image(0), image(1)]]

const pick = <T,>(list: readonly T[], index: number): T => {
  const found = list[index % list.length]
  if (found === undefined) throw new Error('cannot pick from an empty list')
  return found
}

const FILLER: Piece[] = FILLER_NAMES.map((title, index) => {
  const categorySlug = pick(FILLER_CATEGORIES, index)
  const stocked = index % 4 === 3

  return {
    id: 100 + index,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title,
    categorySlug,
    gallery: pick(FILLER_GALLERIES, index),
    // 1,200 → 46,000 in even steps, so a price filter always has something on each side of it.
    price: 1200 + index * 1950,
    description: `${title}, made to order in our atelier.`,
    collectionSlugs: [pick(['deia', 'marvel', 'molten', 'spartan'], index)],
    sizeValues: categorySlug === 'rings' ? ['2', '2.5', '3'] : [],
    colour: pick(FILLER_COLOURS, index),
    diamondShape: pick(FILLER_SHAPES, index),
    availability: stocked ? 'stock-tracked' : 'made-to-order',
    // Every fourth is tracked, and one of those is empty — the IN-STOCK ONLY filter needs both.
    inventory: index === 7 ? 0 : 2,
    attributes: [{ name: 'metal', value: index % 2 === 0 ? '18k white gold' : '18k yellow gold' }],
  }
})

/**
 * A draft. It has a slug, it is complete, and nothing anonymous may reach it — `getProduct` returns
 * `null` for it and the listing never contains it. Keeping one here is what stops FR-009 from being
 * a rule nobody ever exercises.
 */
const UNPUBLISHED: Piece = {
  id: 999,
  slug: 'unreleased-spartan-cuff',
  title: 'Unreleased Spartan Cuff',
  categorySlug: 'bracelets',
  gallery: [image(5)],
  price: 28000,
  description: 'Not yet announced.',
  collectionSlugs: ['spartan'],
  colour: ['clear'],
  diamondShape: ['baguette'],
  status: 'draft',
}

export const productFixtures: Product[] = [...DRAWN, ...FILLER, UNPUBLISHED].map(build)

/** Every variant across every product, flattened. `build` fills this as it goes. */
export const variantFixtures: Variant[] = variants

export const shopFixture: Shop = {
  id: 1,
  warranty: richText([
    'Every piece is covered for three years against manufacturing defects.',
    'Returns are free within 30 days, in the original packaging.',
  ]),
  delivery: richText([
    'Made-to-order pieces ship within 3 to 4 weeks. Pieces in stock ship the next working day.',
    'Delivery is insured and signature required, worldwide.',
  ]),
  listingSubtitle: 'Timeless brilliance, made for every moment',
  ...STAMPS,
}
