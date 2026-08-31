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
 * This is development fixture data, not content. The owner's real catalogue is authored in the
 * admin; what this script guarantees is that there is always something to develop against, and that
 * both option paths — a piece with stones and a piece without — exist for spec FR-008.
 */

import { resolve } from 'node:path'
import { getPayload } from 'payload'
import config from '@payload-config'

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
async function upsert<T extends 'categories' | 'collections' | 'sizes' | 'attributes'>(
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
    })
  }

  return payload.create({ collection, data: data as never })
}

async function upsertMedia(file: string, alt: string) {
  const existing = await payload.find({
    collection: 'media',
    where: { alt: { equals: alt } },
    limit: 1,
  })
  if (existing.docs[0]) return existing.docs[0]
  return payload.create({ collection: 'media', data: { alt }, filePath: photograph(file) })
}

console.log('› categories')
const categories = {
  rings: await upsert('categories', 'slug', 'rings', {
    title: 'Diamond Rings',
    slug: 'rings',
    subtitle: 'Timeless brilliance, made for every moment',
    order: 1,
  }),
  bracelets: await upsert('categories', 'slug', 'bracelets', {
    title: 'Diamond Bracelets',
    slug: 'bracelets',
    subtitle: 'Timeless brilliance, made for every moment',
    order: 2,
  }),
  earrings: await upsert('categories', 'slug', 'earrings', {
    title: 'Diamond Earrings',
    slug: 'earrings',
    subtitle: 'Timeless brilliance, made for every moment',
    order: 3,
  }),
  necklaces: await upsert('categories', 'slug', 'necklaces', {
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
]

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
    _status: 'published' as const,
  }

  const found = await payload.find({
    collection: 'products',
    where: { slug: { equals: seed.slug } },
    limit: 1,
  })

  const product = found.docs[0]
    ? await payload.update({ collection: 'products', id: found.docs[0].id, data: data as never })
    : await payload.create({ collection: 'products', data: data as never })

  console.log(`  · ${seed.title}`)

  if (!seed.withStones) {
    // Re-running after moving the stones elsewhere must not leave orphans behind.
    const orphans = await payload.find({
      collection: 'variants',
      where: { product: { equals: product.id } },
      limit: 100,
    })
    for (const orphan of orphans.docs) {
      await payload.delete({ collection: 'variants', id: orphan.id })
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
      _status: 'published' as const,
    }

    if (existing.docs[0]) {
      await payload.update({
        collection: 'variants',
        id: existing.docs[0].id,
        data: variantData as never,
      })
    } else {
      await payload.create({ collection: 'variants', data: variantData as never })
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
})

console.log('\nSeeded.')
process.exit(0)
