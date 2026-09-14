/**
 * Seeds a development catalogue: reference data, then two kinds of product.
 *
 * Run with `pnpm seed`. It goes through Payload's Local API, so every hook, default and access rule
 * that a real editor would hit applies here too — which is the point. A seed that writes SQL proves
 * nothing about the model.
 *
 * **Idempotent.** Everything is looked up by its slug or name and updated in place, so it can be
 * re-run after the photography lands (T292) without duplicating a catalogue.
 *
 * **Every write passes `context: skipRevalidation`.** Seeding is not publishing: this runs in its
 * own process, where `revalidatePath` has no request scope to reach and throws rather than doing
 * nothing — and a dev server running alongside is a different process whose cache this one could
 * not have invalidated anyway. See `src/lib/revalidate.ts`.
 *
 * This is development fixture data, not content. The owner's real catalogue is authored in the
 * admin; what this script guarantees is that there is always something to develop against, and that
 * both option paths — a piece with stones and a piece without — exist for spec FR-008.
 */

import { resolve } from 'node:path'
import { getPayload } from 'payload'
import config from '@payload-config'

import { skipRevalidation } from '@/lib/revalidate'

const photograph = (name: string) => resolve(process.cwd(), 'public/photography', name)

/** Lexical's document shape. One paragraph per string. */
const richText = (paragraphs: string[]) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      textFormat: 0,
      children: [
        { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 },
      ],
    })),
  },
})

/** Dollars to the integer minor units the plugin stores. Never the other way round. */
const usd = (dollars: number) => Math.round(dollars * 100)

/** Strict lookup. `noUncheckedIndexedAccess` is on, and a missing seed row is a bug, not a maybe. */
const need = <T>(map: Record<string, T>, key: string, what: string): T => {
  const value = map[key]
  if (!value) throw new Error(`Seed is missing the ${what} "${key}" — it should exist by now.`)
  return value
}

const payload = await getPayload({ config })

/** Find-or-create by a unique field, then keep the document in step with the seed. */
async function upsert<
  T extends 'categories' | 'collections' | 'sizes' | 'attributes' | 'article-categories' | 'articles',
>(
  collection: T,
  field: string,
  value: string,
  data: Record<string, unknown>,
) {
  const existing = await payload.find({
    collection,
    where: { [field]: { equals: value } },
    limit: 1,
  })

  if (existing.docs[0]) {
    return payload.update({
      collection,
      id: existing.docs[0].id,
      data: data as never,
      context: skipRevalidation,
    })
  }

  return payload.create({ collection, data: data as never, context: skipRevalidation })
}

async function upsertMedia(file: string, alt: string) {
  const existing = await payload.find({
    collection: 'media',
    where: { alt: { equals: alt } },
    limit: 1,
  })
  if (existing.docs[0]) return existing.docs[0]
  return payload.create({
    collection: 'media',
    data: { alt },
    filePath: photograph(file),
    context: skipRevalidation,
  })
}

console.log('› categories')
/**
 * The four category photographs, uploaded before the categories that reference them.
 *
 * They were served straight from `public/photography` while the home page read fixtures. Now that
 * the band reads Payload, the owner has to be able to change the picture on a category without a
 * deployment — which means it has to be a Media document like every other photograph in the shop.
 */
const categoryMedia = {
  rings: await upsertMedia('category-rings.webp', 'A hand wearing a diamond ring'),
  bracelets: await upsertMedia('category-bracelets.webp', 'A diamond bracelet on a wrist'),
  earrings: await upsertMedia('category-earrings.webp', 'Diamond earrings worn'),
  necklaces: await upsertMedia('category-necklaces.webp', 'A diamond necklace worn'),
}

const categories = {
  rings: await upsert('categories', 'slug', 'rings', {
    image: categoryMedia.rings.id,
    title: 'Diamond Rings',
    slug: 'rings',
    subtitle: 'Timeless brilliance, made for every moment',
    order: 1,
  }),
  bracelets: await upsert('categories', 'slug', 'bracelets', {
    image: categoryMedia.bracelets.id,
    title: 'Diamond Bracelets',
    slug: 'bracelets',
    subtitle: 'Timeless brilliance, made for every moment',
    order: 2,
  }),
  earrings: await upsert('categories', 'slug', 'earrings', {
    image: categoryMedia.earrings.id,
    title: 'Diamond Earrings',
    slug: 'earrings',
    subtitle: 'Timeless brilliance, made for every moment',
    order: 3,
  }),
  necklaces: await upsert('categories', 'slug', 'necklaces', {
    image: categoryMedia.necklaces.id,
    title: 'Diamond Necklaces',
    slug: 'necklaces',
    subtitle: 'Timeless brilliance, made for every moment',
    order: 4,
  }),
}

console.log('› collections')
const collections: Record<string, { id: number | string }> = {}
for (const [index, title] of ['Deia', 'Marvel', 'Molten', 'Spartan'].entries()) {
  const slug = title.toLowerCase()
  collections[slug] = await upsert('collections', 'slug', slug, { title, slug, order: index + 1 })
}

console.log('› sizes')
const sizes: Record<string, { id: number | string }> = {}
for (const [index, value] of ['2', '2.25', '2.5', '2.75', '3'].entries()) {
  sizes[value] = await upsert('sizes', 'value', value, { label: value, value, order: index + 1 })
}

console.log('› attributes')
const attributes = {
  metal: await upsert('attributes', 'name', 'metal', {
    label: 'Metal',
    name: 'metal',
    type: 'text',
    order: 1,
  }),
  carat: await upsert('attributes', 'name', 'carat-weight', {
    label: 'Carat weight',
    name: 'carat-weight',
    type: 'text',
    order: 2,
  }),
  provenance: await upsert('attributes', 'name', 'provenance', {
    label: 'Provenance',
    name: 'provenance',
    type: 'text',
    order: 3,
  }),
}

console.log('› the diamond variant type and its stones')
const existingType = await payload.find({
  collection: 'variantTypes',
  where: { name: { equals: 'diamond' } },
  limit: 1,
})
const diamondType =
  existingType.docs[0] ??
  (await payload.create({
    collection: 'variantTypes',
    data: { name: 'diamond', label: 'Choose Your Diamond:' },
    context: skipRevalidation,
  }))

const stoneSpecs = [
  { label: 'Lab 1.0 ct D VS1', value: 'lab-1-0-d-vs1', price: 0, inventory: 4 },
  {
    label: 'Lab 1.5 ct each D VS1 With Halo',
    value: 'lab-1-5-d-vs1-halo',
    price: 4200,
    inventory: 2,
  },
  { label: 'Lab 2.0 ct D VVS2', value: 'lab-2-0-d-vvs2', price: 9600, inventory: 1 },
  // Deliberately taken — spec FR-040 needs a stone that cannot be chosen.
  { label: 'Natural 1.5 ct E VS2', value: 'natural-1-5-e-vs2', price: 18400, inventory: 0 },
]

const stones: Record<string, { id: number | string }> = {}
for (const spec of stoneSpecs) {
  const found = await payload.find({
    collection: 'variantOptions',
    where: { value: { equals: spec.value } },
    limit: 1,
  })
  stones[spec.value] =
    found.docs[0] ??
    (await payload.create({
      collection: 'variantOptions',
      data: { variantType: diamondType.id, label: spec.label, value: spec.value },
      context: skipRevalidation,
    }))
}

console.log('› photography')
const media = {
  // The five drawn thumbnails, in the order the rail shows them (node 297:4568).
  ringPackshot: await upsertMedia(
    'product-ring-packshot.webp',
    'Paragon emerald cut diamond engagement ring',
  ),
  ringJacket: await upsertMedia(
    'product-ring-jacket.webp',
    'The ring worn on a hand, against a brown jacket',
  ),
  ringArm: await upsertMedia(
    'product-ring-arm.webp',
    'The ring worn, arm folded across a black top',
  ),
  ringPortrait: await upsertMedia(
    'product-ring-portrait.webp',
    'The ring worn, hand raised to the face',
  ),
  ringDenim: await upsertMedia(
    'product-ring-denim.webp',
    'The ring stacked with others, hand against denim',
  ),
  bracelet: await upsertMedia('product-bracelet.webp', 'Pavé butterfly diamond bracelet'),
  earClimbers: await upsertMedia(
    'product-ear-climbers.webp',
    'Butterfly ruby, pink sapphire and diamond ear climbers',
  ),
  pendant: await upsertMedia('product-pendant.webp', 'Butterfly diamond pendant'),
  miniPendant: await upsertMedia(
    'product-mini-pendant.webp',
    'Butterfly ruby, pink sapphire and diamond mini pendant',
  ),
}

console.log('› products')

type ProductSeed = {
  slug: string
  title: string
  category: { id: number | string }
  gallery: (number | string)[]
  price: number
  description: string
  collections?: (number | string)[]
  sizes?: (number | string)[]
  colour?: string[]
  diamondShape?: string[]
  availability: 'made-to-order' | 'stock-tracked'
  inventory?: number
  withStones?: boolean
  attributes?: { attribute: number | string; value: string }[]
  /** Published unless it says otherwise. One draft exists so FR-009 is exercised, not assumed. */
  status?: 'draft' | 'published'
}

const productSeeds: ProductSeed[] = [
  {
    // The piece the product page is drawn around (node 231:1901). BOTH option types: stones that
    // move the price, sizes that do not. Five photographs, in the drawn thumbnail order.
    //
    // Named "Paragon" after the 1920 frame; the 768 and 390 frames say "Polygon" (spec Open
    // Question 8). The drawn description names a competitor and is placeholder, so this is written
    // fresh (spec Open Question 7).
    slug: 'paragon-emerald-cut-diamond-engagement-ring',
    title: 'Paragon Emerald Cut Diamond Engagement Ring',
    category: categories.rings,
    gallery: [
      media.ringPackshot.id,
      media.ringJacket.id,
      media.ringArm.id,
      media.ringPortrait.id,
      media.ringDenim.id,
    ],
    price: 38320,
    description:
      'Available in a variety of carat weights, every stone is set by hand. Size, carat weight and stone quantities vary slightly from one ring to another.',
    collections: [need(collections, 'deia', 'collection').id],
    sizes: [
      need(sizes, '2', 'size').id,
      need(sizes, '2.25', 'size').id,
      need(sizes, '2.5', 'size').id,
      need(sizes, '2.75', 'size').id,
      need(sizes, '3', 'size').id,
    ],
    colour: ['clear'],
    diamondShape: ['emerald', 'round'],
    availability: 'made-to-order',
    withStones: true,
    attributes: [
      { attribute: attributes.metal.id, value: '18k white gold' },
      { attribute: attributes.carat.id, value: '1.5 ct centre stone' },
      { attribute: attributes.provenance.id, value: 'Lab grown, IGI certified' },
    ],
  },
  {
    // Sizes but NO stones — the middle case of FR-008's "neither, either, or both".
    slug: 'pave-butterfly-diamond-bracelet',
    title: 'Pavé Butterfly Diamond Bracelet',
    category: categories.bracelets,
    gallery: [media.bracelet.id, media.pendant.id],
    price: 37400,
    description: 'Butterflies in pavé diamonds, set along a flexible band.',
    collections: [need(collections, 'molten', 'collection').id],
    sizes: [need(sizes, '2', 'size').id, need(sizes, '2.25', 'size').id],
    colour: ['clear'],
    diamondShape: ['round', 'oval'],
    availability: 'made-to-order',
    attributes: [
      { attribute: attributes.metal.id, value: '18k white gold' },
      { attribute: attributes.carat.id, value: '4.2 ct total' },
    ],
  },
  {
    // NEITHER option type — orderable immediately, no selectors drawn.
    slug: 'butterfly-diamond-pendant',
    title: 'Butterfly Diamond Pendant',
    category: categories.necklaces,
    gallery: [media.pendant.id],
    price: 24900,
    description: 'A single butterfly in pavé diamonds on a fine chain.',
    collections: [need(collections, 'deia', 'collection').id],
    colour: ['clear'],
    diamondShape: ['round'],
    availability: 'made-to-order',
    attributes: [{ attribute: attributes.metal.id, value: '18k white gold' }],
  },
  {
    // Stock tracked, at zero — visible in the listing, unavailable on its page.
    slug: 'butterfly-ruby-pink-sapphire-diamond-ear-climbers',
    title: 'Butterfly Ruby, Pink Sapphire and Diamond Ear Climbers',
    category: categories.earrings,
    gallery: [media.earClimbers.id],
    price: 38000,
    description:
      'Rubies and pink sapphires graduate along the ear in a climbing butterfly setting.',
    collections: [need(collections, 'marvel', 'collection').id],
    colour: ['multicolor'],
    diamondShape: ['pear', 'marquise'],
    availability: 'stock-tracked',
    inventory: 0,
    attributes: [{ attribute: attributes.metal.id, value: '18k rose gold' }],
  },
  {
    // Stock tracked with stock — the ordinary case.
    slug: 'butterfly-ruby-pink-sapphire-diamond-mini-pendant',
    title: 'Butterfly Ruby, Pink Sapphire and Diamond Mini Pendant',
    category: categories.necklaces,
    gallery: [media.miniPendant.id],
    price: 19000,
    description: 'The butterfly at its smallest, in ruby and pink sapphire.',
    collections: [need(collections, 'spartan', 'collection').id],
    colour: ['multicolor'],
    diamondShape: ['round'],
    availability: 'stock-tracked',
    inventory: 3,
    attributes: [{ attribute: attributes.metal.id, value: '18k rose gold' }],
  },
  {
    /**
     * A piece titled in Cyrillic (spec 005, FR-028a).
     *
     * Not decoration. The messenger message is carried in a URL, and the budget that governs it is
     * measured AFTER percent-encoding — where one Cyrillic character costs six, because it is two
     * UTF-8 bytes and each byte becomes a `%XX` escape. A truncation rule tested only against Latin
     * titles passes while doing nothing for the customers it was written for: the shop sells into
     * Kazakhstan and the UAE.
     *
     * The slug is written out rather than derived. The generator below strips everything outside
     * `a-z0-9`, so deriving one from this title would produce an empty string.
     */
    slug: 'zolotoe-kolco-s-brilliantom',
    title: 'Золотое кольцо с бриллиантом',
    category: categories.rings,
    gallery: [media.ringPackshot.id, media.ringPortrait.id],
    price: 21500,
    description: 'Кольцо из белого золота с бриллиантом огранки «принцесса».',
    collections: [need(collections, 'deia', 'collection').id],
    sizes: [need(sizes, '2', 'size').id, need(sizes, '2.5', 'size').id],
    colour: ['clear'],
    diamondShape: ['princess'],
    availability: 'made-to-order',
    attributes: [{ attribute: attributes.metal.id, value: '18k white gold' }],
  },
]

/**
 * Twenty-four more pieces, and one draft.
 *
 * Ported from `src/mocks/catalog.ts` deliberately: until 003/T290 the storefront read those
 * fixtures, and the acceptance written against them — that the listing pages at twelve, that a
 * price filter has something on both sides of it, that IN-STOCK ONLY has both a stocked piece and
 * an empty one to tell apart — only means anything if the database describes the same shop. Five
 * hand-written pieces cannot page.
 *
 * They are filler in the sense that the copy is generated, not in the sense that they are
 * disposable: every one of them is what makes some rule testable.
 */
const FILLER: { title: string; categorySlug: keyof typeof categories }[] = [
  { title: 'Halo Solitaire Ring', categorySlug: 'rings' },
  { title: 'Baguette Eternity Band', categorySlug: 'rings' },
  { title: 'Marquise Cluster Ring', categorySlug: 'rings' },
  { title: 'Princess Cut Signet Ring', categorySlug: 'rings' },
  { title: 'Oval Trilogy Ring', categorySlug: 'rings' },
  { title: 'Cushion Halo Ring', categorySlug: 'rings' },
  { title: 'Twisted Pavé Ring', categorySlug: 'rings' },
  { title: 'Tennis Bracelet', categorySlug: 'bracelets' },
  { title: 'Bezel Link Bracelet', categorySlug: 'bracelets' },
  { title: 'Pear Drop Bracelet', categorySlug: 'bracelets' },
  { title: 'Emerald Bar Bracelet', categorySlug: 'bracelets' },
  { title: 'Open Cuff Bracelet', categorySlug: 'bracelets' },
  { title: 'Round Stud Earrings', categorySlug: 'earrings' },
  { title: 'Baguette Huggie Earrings', categorySlug: 'earrings' },
  { title: 'Oval Drop Earrings', categorySlug: 'earrings' },
  { title: 'Marquise Threader Earrings', categorySlug: 'earrings' },
  { title: 'Princess Halo Earrings', categorySlug: 'earrings' },
  { title: 'Double Hoop Earrings', categorySlug: 'earrings' },
  { title: 'Solitaire Necklace', categorySlug: 'necklaces' },
  { title: 'Riviera Necklace', categorySlug: 'necklaces' },
  { title: 'Pear Pendant Necklace', categorySlug: 'necklaces' },
  { title: 'Baguette Bar Necklace', categorySlug: 'necklaces' },
  { title: 'Emerald Station Necklace', categorySlug: 'necklaces' },
  { title: 'Layered Chain Necklace', categorySlug: 'necklaces' },
]

const FILLER_COLOURS = [['clear'], ['black'], ['green'], ['multicolor'], ['clear', 'black']]
const FILLER_SHAPES = [
  ['round'], ['oval'], ['emerald'], ['pear'], ['marquise'], ['princess'], ['baguette'],
]

/** A piece is photographed as what it is. Rings get the ring, necklaces get a necklace. */
const GALLERY_FOR: Record<string, (number | string)[]> = {
  rings: [media.ringPackshot.id, media.ringJacket.id],
  bracelets: [media.bracelet.id],
  earrings: [media.earClimbers.id],
  necklaces: [media.pendant.id, media.miniPendant.id],
}

const pick = <T,>(list: readonly T[], index: number): T => {
  const found = list[index % list.length]
  if (found === undefined) throw new Error('cannot pick from an empty list')
  return found
}

for (const [index, { title, categorySlug }] of FILLER.entries()) {
  // Every fourth piece is stock tracked, and one of THOSE is empty — IN-STOCK ONLY needs both a
  // piece it keeps and a piece it hides, or the filter passes by doing nothing.
  const stocked = index % 4 === 3

  productSeeds.push({
    slug: title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    title,
    category: categories[categorySlug],
    gallery: GALLERY_FOR[categorySlug] ?? [media.ringPackshot.id],
    // 1,200 → 46,050 in even steps, so a price filter always has something on each side of it.
    price: 1200 + index * 1950,
    description: `${title}, made to order in our atelier.`,
    collections: [need(collections, pick(['deia', 'marvel', 'molten', 'spartan'], index), 'collection').id],
    sizes:
      categorySlug === 'rings'
        ? [need(sizes, '2', 'size').id, need(sizes, '2.5', 'size').id, need(sizes, '3', 'size').id]
        : [],
    colour: pick(FILLER_COLOURS, index),
    diamondShape: pick(FILLER_SHAPES, index),
    availability: stocked ? 'stock-tracked' : 'made-to-order',
    inventory: index === 7 ? 0 : 2,
    attributes: [
      { attribute: attributes.metal.id, value: index % 2 === 0 ? '18k white gold' : '18k yellow gold' },
    ],
  })
}

/**
 * A draft. It has a slug, it is complete, and nothing anonymous may reach it — `getProduct` returns
 * null for it and the listing never contains it. Keeping one here is what stops FR-009 from being a
 * rule nobody ever exercises.
 */
productSeeds.push({
  slug: 'unreleased-spartan-cuff',
  title: 'Unreleased Spartan Cuff',
  category: categories.bracelets,
  gallery: [media.bracelet.id],
  price: 28000,
  description: 'Not yet announced.',
  collections: [need(collections, 'spartan', 'collection').id],
  colour: ['clear'],
  diamondShape: ['baguette'],
  availability: 'made-to-order',
  status: 'draft',
})

for (const seed of productSeeds) {
  const data = {
    title: seed.title,
    slug: seed.slug,
    description: seed.description,
    gallery: seed.gallery,
    details: richText([seed.description, 'Handcrafted in our atelier.']),
    category: seed.category.id,
    collections: seed.collections ?? [],
    sizes: seed.sizes ?? [],
    colour: seed.colour ?? [],
    diamondShape: seed.diamondShape ?? [],
    attributes: seed.attributes ?? [],
    availability: seed.availability,
    ...(seed.availability === 'stock-tracked' ? { inventory: seed.inventory ?? 0 } : {}),
    priceInUSDEnabled: true,
    priceInUSD: usd(seed.price),
    enableVariants: Boolean(seed.withStones),
    ...(seed.withStones ? { variantTypes: [diamondType.id] } : {}),
    _status: seed.status ?? ('published' as const),
  }

  const found = await payload.find({
    collection: 'products',
    where: { slug: { equals: seed.slug } },
    limit: 1,
  })

  const product = found.docs[0]
    ? await payload.update({
        collection: 'products',
        id: found.docs[0].id,
        data: data as never,
        context: skipRevalidation,
      })
    : await payload.create({
        collection: 'products',
        data: data as never,
        context: skipRevalidation,
      })

  console.log(`  · ${seed.title}`)

  if (!seed.withStones) {
    // Re-running after moving the stones elsewhere must not leave orphans behind.
    const orphans = await payload.find({
      collection: 'variants',
      where: { product: { equals: product.id } },
      limit: 100,
    })
    for (const orphan of orphans.docs) {
      await payload.delete({ collection: 'variants', id: orphan.id, context: skipRevalidation })
      console.log('      removed a stone that no longer belongs here')
    }
    continue
  }

  // Variants are created after the product, because `validateOptions` checks that each option's
  // variant type is actually enabled on the parent.
  for (const spec of stoneSpecs) {
    const stone = need(stones, spec.value, 'stone')
    const existing = await payload.find({
      collection: 'variants',
      where: { product: { equals: product.id }, options: { equals: stone.id } },
      limit: 1,
    })

    const variantData = {
      product: product.id,
      options: [stone.id],
      inventory: spec.inventory,
      priceInUSDEnabled: true,
      priceInUSD: usd(seed.price + spec.price),
      _status: seed.status ?? ('published' as const),
    }

    if (existing.docs[0]) {
      await payload.update({
        collection: 'variants',
        id: existing.docs[0].id,
        data: variantData as never,
        context: skipRevalidation,
      })
    } else {
      await payload.create({
        collection: 'variants',
        data: variantData as never,
        context: skipRevalidation,
      })
    }
    console.log(
      `      ${spec.label} — $${(seed.price + spec.price).toLocaleString()}, ${spec.inventory} available`,
    )
  }
}

console.log('› shop settings')
await payload.updateGlobal({
  slug: 'shop',
  data: {
    warranty: richText([
      'Every piece carries a three year warranty against manufacturing defects.',
      'Returns are free within thirty days, in original condition.',
    ]),
    delivery: richText([
      'Insured worldwide delivery, dispatched within two business days.',
      'Made to order pieces are dispatched within three to four weeks.',
    ]),
    listingSubtitle: 'Timeless brilliance, made for every moment',
  } as never,
  context: skipRevalidation,
})


console.log('› the FAQ')
/**
 * The questions drawn at the bottom of the story page.
 *
 * They live in their own collection rather than on the page (FR-031), so this seeds them first and
 * the story page below refers to them. That indirection is the whole point of the model: the
 * standalone `/faq` page will read these same rows with nothing to migrate.
 */
const SEED_QUESTIONS: [string, string[]][] = [
  ['Do you ship internationally?', ['Yes, we ship all over the world. Shipping costs apply and are added at checkout.']],
  ['How long will my order take?', ['Ready-to-wear pieces are dispatched within two business days. Made-to-order pieces take three to four weeks.']],
  ['Are your diamonds certified?', ['Every stone is independently graded and arrives with its certificate.']],
  ['What are lab-grown diamonds?', ['They are chemically, physically and optically identical to mined diamonds, grown rather than extracted.']],
  ['Can I return or exchange my order?', ['Returns are free within thirty days, in original condition and with the paperwork it arrived with.']],
  ['How should I care for my jewelry?', ['Warm water, a drop of mild soap and a soft brush. We are happy to clean and check any piece for you.']],
]

const questionIds: number[] = []
for (const [index, [question, paragraphs]] of SEED_QUESTIONS.entries()) {
  const existing = await payload.find({
    collection: 'questions',
    where: { question: { equals: question } },
    limit: 1,
    context: skipRevalidation,
  })

  const doc =
    existing.docs[0] ??
    (await payload.create({
      collection: 'questions',
      data: {
        question,
        answer: richText(paragraphs),
        order: index,
        _status: 'published',
      } as never,
      context: skipRevalidation,
    }))

  questionIds.push(doc.id)
}

console.log('› the story page')
/**
 * The seven photographs the Our Story page is drawn with (006/T062, FR-052).
 *
 * **The copy ships as the blocks field's `defaultValue`; the pictures cannot.** A media slot holds a
 * relationship to a document, and a default cannot conjure one — so an install that never runs this
 * script renders the drawn page with its media slots collapsed, which is correct under FR-024b but
 * is not the drawn page. This closes that gap.
 *
 * **It writes the whole composition rather than patching the slots**, because there is no stable
 * handle on an individual block: block rows have generated ids, and matching by position would
 * quietly attach the crafted-to-last plate to whatever band an editor had dragged into fourth
 * place. Seeding is a fresh-install operation, so replacing the body is the honest thing to do —
 * and `upsertMedia` keeps a re-run from uploading eight more copies of the same photographs.
 */
const storyMedia = {
  opening: await upsertMedia('story-opening-plate.webp', 'A solitaire ring resting on red silk'),
  closerLook: await upsertMedia('story-closer-look.webp', 'A diamond and ruby collar necklace'),
  standard: await upsertMedia('story-standard-banner.webp', 'A brilliant-cut diamond held in tweezers'),
  craftedToLast: await upsertMedia('story-crafted-to-last.webp', 'A pendant and ring worn together'),
  select: await upsertMedia('story-step-1-select.webp', 'Loose diamonds sorted with tweezers'),
  craft: await upsertMedia('story-step-2-craft.webp', 'A jeweller setting a stone by hand'),
  create: await upsertMedia('story-step-3-create.webp', 'A finished halo ring on red silk'),
}

const photo = (id: number) => ({ kind: 'photo', photo: id })

await payload.updateGlobal({
  slug: 'story-page',
  data: {
    body: [
      {
        blockType: 'page-header',
        eyebrow: 'OUR STORY',
        heading: 'IMMORTALIZING MEMORIES AND EMOTIONS IN EXTRAORDINARY, TIMELESS CREATIONS',
      },
      { blockType: 'media-plate', media: photo(storyMedia.opening.id) },
      {
        blockType: 'closer-look',
        body: 'Exceptional diamonds begin with exceptional standards. Aurum combines innovation, timeless design, and uncompromising attention to detail',
        chips: [
          { label: 'Lab-Grown Diamonds' },
          { label: 'Fine Jewelry' },
          { label: 'Exceptional Quality' },
          { label: 'Timeless Design' },
          { label: 'Craftsmanship' },
          { label: 'Certified Diamonds' },
        ],
        figures: [
          { word: 'CERTIFIED', caption: 'selected diamonds' },
          { word: 'EXCEPTIONAL', caption: 'quality standards' },
          { word: 'TIMELESS', caption: 'designed to last' },
        ],
        media: photo(storyMedia.closerLook.id),
      },
      {
        blockType: 'banner',
        eyebrow: 'THE AURUM STANDARD',
        heading: 'SELECTED FOR BRILLIANCE. CRAFTED WITHOUT COMPROMISE.',
        body: 'Every diamond is carefully considered for its beauty, character, and exceptional quality. Because for us, meeting the standard is only the beginning.',
        cta: { label: 'EXPLORE THE COLLECTION', href: '/all-jewelry' },
        media: photo(storyMedia.standard.id),
        textSide: 'left',
      },
      {
        blockType: 'process-steps',
        heading: 'FROM DIAMOND TO JEWEL',
        steps: [
          {
            title: 'SELECT',
            caption: 'Exceptional diamonds, carefully chosen',
            media: photo(storyMedia.select.id),
          },
          {
            title: 'CRAFT',
            caption: 'Precision and attention in every detail',
            media: photo(storyMedia.craft.id),
          },
          {
            title: 'CREATE',
            caption: 'Timeless jewelry made to be yours',
            media: photo(storyMedia.create.id),
          },
        ],
      },
      {
        blockType: 'banner',
        heading: 'CRAFTED TO LAST',
        body: 'Jewelry made for the moments that become memories.',
        media: photo(storyMedia.craftedToLast.id),
        textSide: 'right',
      },
      {
        blockType: 'faq',
        heading: 'EVERY DETAIL, ANSWERED',
        body: 'From choosing the perfect diamond to delivery and jewelry care, we\u2019re here to make every step of your Aurum experience simple and effortless. Have a question you can\u2019t find here? Our team is always ready to help.',
        cta: { label: 'CONTACT US', href: '/contact' },
        questions: questionIds,
      },
    ],
    _status: 'published',
  } as never,
  context: skipRevalidation,
})

console.log(`      seven bands, seven photographs, ${questionIds.length} questions`)

console.log('\n› the blog')
/**
 * The blog, as Figma section `312:7335` draws it (007/T060).
 *
 * **Seven articles, because seven is one complete mosaic cycle.** The drawn index shows exactly one
 * — wide, narrow / narrow, narrow, narrow / narrow, wide — and seeding six or eight would leave a
 * developer looking at a rhythm the design never draws and wondering which of the two is wrong.
 *
 * **The drawn titles repeat and these do not.** The mock shows "Lab-Grown Diamonds: Beauty
 * Reimagined" three times, which is placeholder behaviour rather than editorial intent; seven cards
 * carrying four titles makes the index look broken and makes every card's link indistinguishable
 * from its neighbours in a test. The four drawn titles are kept and three more written to match
 * their categories.
 *
 * **Only the first article has chapters.** It is the one the design draws a full page for
 * (`312:8140`), and it is the one every test opens. The other six exist to fill the mosaic; giving
 * them bodies would be inventing six articles nobody has written, and an article with one chapter
 * correctly renders no contents rail — which is a state worth having in the seed anyway.
 */
const blogMedia = {
  ringsOnLinen: await upsertMedia('blog-rings-on-linen.webp', 'Five diamond rings arranged on linen'),
  ringsOnBlocks: await upsertMedia('blog-rings-on-blocks.webp', 'Three diamond rings on pale blue and pink blocks'),
  underGlass: await upsertMedia('blog-diamond-under-glass.webp', 'A diamond held under a magnifying glass'),
  haloInHand: await upsertMedia('blog-halo-ring-in-hand.webp', 'A halo diamond ring held between fingertips'),
  gemstones: await upsertMedia('blog-coloured-gemstones.webp', 'Coloured gemstones scattered on a grey ground'),
  braceletWorn: await upsertMedia('blog-bracelet-worn.webp', 'A diamond bracelet worn on a raised wrist'),
  ringAtDusk: await upsertMedia('blog-ring-at-dusk.webp', 'A solitaire ring on a desk against a city skyline at dusk'),
  tweezers: await upsertMedia('blog-diamond-in-tweezers.webp', 'An oval diamond held in tweezers over red velvet'),
}

const BLOG_CATEGORIES: [string, string][] = [
  ['Diamonds', 'diamonds'],
  ['Jewelry', 'jewelry'],
  ['Guides', 'guides'],
  ['Stories', 'stories'],
]

const blogCategories: Record<string, number> = {}
for (const [index, [title, slug]] of BLOG_CATEGORIES.entries()) {
  const doc = await upsert('article-categories', 'slug', slug, { title, slug, order: index })
  blogCategories[slug] = doc.id
}

await payload.updateGlobal({
  slug: 'blog-page',
  data: {
    eyebrow: 'OUR BLOG',
    heading: 'Stories of diamonds, craftsmanship, and timeless beauty',
    emptyTitle: 'Nothing published yet',
    emptyDescription: 'The first stories are being written. Check back soon.',
    _status: 'published',
  } as never,
  context: skipRevalidation,
})

/**
 * The article the design draws a full page for (`312:8140`), chapter by chapter.
 *
 * The pull quote and the lede are separate fields rather than markup inside the body — see
 * `src/collections/articles.ts` for where that line is drawn.
 */
const FEATURE_CHAPTERS = [
  {
    heading: 'Understanding the 4Cs',
    tocLabel: 'Understanding the 4Cs',
    lede: 'What defines a diamond',
    body: richText([
      'Every diamond is unique, but four characteristics help define its quality: Cut, Color, Clarity and Carat Weight. Understanding how they work together makes choosing the right diamond much easier.',
      'Cut — brilliance and light performance. Color — absence or presence of color. Clarity — natural characteristics of the stone. Carat — diamond weight.',
    ]),
  },
  {
    heading: 'Cut: Where Brilliance Begins',
    tocLabel: 'Diamond Cut & Brilliance',
    lede: 'The most important detail isn\u2019t always size.',
    body: richText([
      'A beautifully cut diamond captures light, reflects it through its facets and returns it as brilliance and fire. Even a large diamond can appear less impressive when its proportions are poorly balanced.',
    ]),
    pullQuote: 'A great diamond doesn\u2019t simply reflect light. It comes alive in it.',
  },
  {
    heading: 'Color: Finding the Right Balance',
    tocLabel: 'Color: What to Look For',
    body: richText([
      'Diamonds are graded from D to Z, from colorless to increasingly noticeable warm tones.',
      'D\u2013F Colorless. G\u2013J Near Colorless. K\u2013M Faint Color.',
    ]),
  },
  {
    heading: 'Clarity: Beauty Beyond Perfection',
    tocLabel: 'Understanding Diamond Clarity',
    body: richText([
      'Clarity describes the tiny natural characteristics found within a diamond. Many are invisible to the naked eye and have little impact on its beauty.',
      'FL / IF — Flawless. VVS — Very, Very Slightly Included. VS — Very Slightly Included. SI — Slightly Included.',
      'Our approach: choose a diamond that looks beautifully clean to the eye rather than paying only for a higher grade on paper.',
    ]),
  },
]

interface SeedArticle {
  title: string
  slug: string
  standfirst: string
  category: string
  publishedOn: string
  hero: number
  chapters?: typeof FEATURE_CHAPTERS
}

const SEED_ARTICLES: SeedArticle[] = [
  {
    title: 'How to Choose the Perfect Diamond: A Guide to Cut, Clarity, Color & Carat',
    slug: 'how-to-choose-the-perfect-diamond',
    standfirst:
      'Discover what defines an exceptional diamond and learn how to choose a stone that balances beauty, brilliance, and individuality.',
    category: 'diamonds',
    publishedOn: '2026-08-13T00:00:00.000Z',
    hero: blogMedia.tweezers.id,
    chapters: FEATURE_CHAPTERS,
  },
  {
    title: 'Lab-Grown Diamonds: Beauty Reimagined',
    slug: 'lab-grown-diamonds-beauty-reimagined',
    standfirst:
      'Grown rather than extracted, and identical in every way that matters. What a lab-grown stone is, and what it is not.',
    category: 'diamonds',
    publishedOn: '2026-08-12T00:00:00.000Z',
    hero: blogMedia.ringsOnLinen.id,
  },
  {
    title: 'The Art of Choosing the Perfect Diamond',
    slug: 'the-art-of-choosing-the-perfect-diamond',
    standfirst: 'Proportion, symmetry and light. Why two stones of the same weight can look nothing alike.',
    category: 'jewelry',
    publishedOn: '2026-08-11T00:00:00.000Z',
    hero: blogMedia.ringsOnBlocks.id,
  },
  {
    title: 'A Guide to Diamond Shapes',
    slug: 'a-guide-to-diamond-shapes',
    standfirst: 'Round, oval, emerald, pear. What each shape does with light, and who each one suits.',
    category: 'guides',
    publishedOn: '2026-08-08T00:00:00.000Z',
    hero: blogMedia.underGlass.id,
  },
  {
    title: 'Reading a Diamond Certificate',
    slug: 'reading-a-diamond-certificate',
    standfirst: 'Every stone arrives with paperwork. Here is what each line of it actually tells you.',
    category: 'guides',
    publishedOn: '2026-08-06T00:00:00.000Z',
    hero: blogMedia.gemstones.id,
  },
  {
    title: 'Behind the Craftsmanship: Hand-Set Pave',
    slug: 'behind-the-craftsmanship-hand-set-pave',
    standfirst: 'Sixty stones, one setter, and a week of work. Inside the slowest part of making a ring.',
    category: 'stories',
    publishedOn: '2026-08-04T00:00:00.000Z',
    hero: blogMedia.haloInHand.id,
  },
  {
    title: 'The Pieces That Mark a Moment',
    slug: 'the-pieces-that-mark-a-moment',
    standfirst: 'Engagements, anniversaries, and the quieter occasions. What people actually buy, and why.',
    category: 'stories',
    publishedOn: '2026-08-01T00:00:00.000Z',
    hero: blogMedia.braceletWorn.id,
  },
]

for (const article of SEED_ARTICLES) {
  await upsert('articles', 'slug', article.slug, {
    title: article.title,
    slug: article.slug,
    standfirst: article.standfirst,
    category: need(blogCategories, article.category, 'blog category'),
    publishedOn: article.publishedOn,
    hero: { kind: 'photo', photo: article.hero },
    ...(article.chapters ? { chapters: article.chapters } : {}),
    _status: 'published',
  } as never)
}

console.log(
  `      ${BLOG_CATEGORIES.length} categories, ${SEED_ARTICLES.length} articles, ${FEATURE_CHAPTERS.length} chapters on the feature`,
)

/*
  The contact page's photograph (008/T096).

  **The copy ships as the global's field defaults; the picture cannot** — an upload references a
  media document that has to exist first, which is the same limitation `story-page` records above.
  Without this the band renders without a photograph, which is correct under FR-023 and simply
  thinner than drawn.

  The questions band is deliberately left unselected: FR-032 means it does not appear until an
  editor chooses questions, and a seed that picked some for them would put words on the page that
  nobody decided to say.
*/
console.log('› the home page')
/**
 * The home page's two photographs (spec 010).
 *
 * **Only the photographs, like the contact page above.** Every string in `home-page` is a field
 * default, so writing them here would create a second copy of the shipped wording that could drift
 * from the one in the global.
 *
 * They were served straight from `public/photography` while the page read `src/mocks/home.ts`. Now
 * that it reads Payload, the owner has to be able to change the picture behind the headline without
 * a deployment — the same reasoning the category tiles followed one spec earlier.
 */
const heroPhoto = await upsertMedia('hero.webp', 'A model wearing a diamond necklace and earrings')
const aboutPhoto = await upsertMedia(
  'about.webp',
  'A ruby and diamond collar from the Aurum collection',
)

await payload.updateGlobal({
  slug: 'home-page',
  data: { hero: { photo: heroPhoto.id }, about: { photo: aboutPhoto.id } } as never,
  context: skipRevalidation,
})

console.log('      2 photographs on the home page')

console.log('› contact page')
const contactPhoto = await upsertMedia(
  'contact-send-us-a-message.webp',
  'A diamond necklace and matching earrings in an open jewellery case',
)

await payload.updateGlobal({
  slug: 'contact-page',
  // Only the photograph. Every string on this page is a field default, so writing them here would
  // create a second copy of the shipped wording that could drift from the one in the global.
  data: { form: { photo: contactPhoto.id } } as never,
  context: skipRevalidation,
})

console.log('      1 photograph on the contact form')

console.log('\nSeeded.')
process.exit(0)

