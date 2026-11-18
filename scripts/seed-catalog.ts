/**
 * Seeds a development catalogue: reference data, then two kinds of product.
 *
 * Run with `pnpm seed`. It goes through Payload's Local API, so every hook, default and access rule
 * that a real editor would hit applies here too — which is the point. A seed that writes SQL proves
 * nothing about the model.
 *
 * **Idempotent.** Everything is looked up by its slug or name and updated in place, so it can be
 * re-run after the photography lands without duplicating a catalogue.
 *
 * **Every write passes `context: skipRevalidation`.** Seeding is not publishing: this runs in its
 * own process, where `revalidatePath` has no request scope to reach and throws rather than doing
 * nothing — and a dev server running alongside is a different process whose cache this one could
 * not have invalidated anyway. See `src/lib/revalidate.ts`.
 *
 * This is development fixture data, not content. The owner's real catalogue is authored in the
 * admin; what this script guarantees is that there is always something to develop against, and that
 * both option paths — a product with variant options and a product without — exist for spec FR-008.
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
  T extends
    | 'categories'
    | 'attributes'
    | 'article-categories'
    | 'articles',
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

/**
 * Find-or-create a Media document by its file name — the alt text is placeholder copy several
 * images may share, so it cannot be the handle. The alt is kept in step on a re-run.
 */
async function upsertMedia(file: string, alt: string) {
  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: file } },
    limit: 1,
  })
  if (existing.docs[0]) {
    return payload.update({
      collection: 'media',
      id: existing.docs[0].id,
      data: { alt },
      context: skipRevalidation,
    })
  }
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
  category1: await upsertMedia('category-1.webp', 'Category 1 image'),
  category2: await upsertMedia('category-2.webp', 'Category 2 image'),
  category3: await upsertMedia('category-3.webp', 'Category 3 image'),
  category4: await upsertMedia('category-4.webp', 'Category 4 image'),
}

const categories = {
  'category-1': await upsert('categories', 'slug', 'category-1', {
    image: categoryMedia.category1.id,
    title: 'Category 1',
    slug: 'category-1',
    subtitle: 'A short description of this category',
    order: 1,
    showInHeader: true,
  }),
  'category-2': await upsert('categories', 'slug', 'category-2', {
    image: categoryMedia.category2.id,
    title: 'Category 2',
    slug: 'category-2',
    subtitle: 'A short description of this category',
    order: 2,
    showInHeader: true,
  }),
  'category-3': await upsert('categories', 'slug', 'category-3', {
    image: categoryMedia.category3.id,
    title: 'Category 3',
    slug: 'category-3',
    subtitle: 'A short description of this category',
    order: 3,
    showInHeader: true,
  }),
  'category-4': await upsert('categories', 'slug', 'category-4', {
    image: categoryMedia.category4.id,
    title: 'Category 4',
    slug: 'category-4',
    subtitle: 'A short description of this category',
    order: 4,
    showInHeader: true,
  }),
}

console.log('› attributes')
/*
  Every property a product has is an attribute the owner defines. Two LIST attributes — their values
  are documents of their own below — and three typed ones written on each product.

  The two list attributes keep the query keys and values the shop has always used, so a link to
  `?colour=black` or `?collection=collection-a` still filters.
*/
const attributes = {
  colour: await upsert('attributes', 'name', 'colour', {
    label: 'Colour',
    name: 'colour',
    type: 'list',
    filterable: true,
    showInDetails: true,
    relatesProducts: false,
    order: 1,
  }),
  collection: await upsert('attributes', 'name', 'collection', {
    label: 'Collection',
    name: 'collection',
    type: 'list',
    filterable: true,
    showInDetails: false,
    relatesProducts: true,
    order: 2,
  }),
  material: await upsert('attributes', 'name', 'material', {
    label: 'Material',
    name: 'material',
    type: 'text',
    showInDetails: true,
    order: 3,
  }),
  weight: await upsert('attributes', 'name', 'weight', {
    label: 'Weight',
    name: 'weight',
    type: 'text',
    showInDetails: true,
    order: 4,
  }),
  origin: await upsert('attributes', 'name', 'origin', {
    label: 'Origin',
    name: 'origin',
    type: 'text',
    showInDetails: true,
    order: 5,
  }),
}

console.log('› attribute values')
/** Find-or-create one value of one list attribute — unique by the pair, not by `value` alone. */
async function upsertValue(
  attribute: { id: number },
  value: string,
  data: { label: string; order: number },
) {
  const existing = await payload.find({
    collection: 'attribute-values',
    where: { and: [{ attribute: { equals: attribute.id } }, { value: { equals: value } }] },
    limit: 1,
  })
  const doc = { attribute: attribute.id, value, ...data }
  if (existing.docs[0]) {
    return payload.update({
      collection: 'attribute-values',
      id: existing.docs[0].id,
      data: doc,
      context: skipRevalidation,
    })
  }
  return payload.create({ collection: 'attribute-values', data: doc, context: skipRevalidation })
}

const colours: Record<string, { id: number }> = {}
for (const [index, [value, label]] of (
  [
    ['black', 'Black'],
    ['clear', 'Clear'],
    ['green', 'Green'],
    ['multicolor', 'Multicolor'],
  ] as const
).entries()) {
  colours[value] = await upsertValue(attributes.colour, value, { label, order: index + 1 })
}

const collections: Record<string, { id: number }> = {}
for (const [index, letter] of (['A', 'B', 'C', 'D'] as const).entries()) {
  const value = `collection-${letter.toLowerCase()}`
  collections[value] = await upsertValue(attributes.collection, value, {
    label: `Collection ${letter}`,
    order: index + 1,
  })
}

console.log('› the option variant type and its options')
const existingType = await payload.find({
  collection: 'variantTypes',
  where: { name: { equals: 'option' } },
  limit: 1,
})
const optionType =
  existingType.docs[0] ??
  (await payload.create({
    collection: 'variantTypes',
    data: { name: 'option', label: 'Option' },
    context: skipRevalidation,
  }))

/** Each option moves the price by `price` dollars on top of the product's own. */
const variantSpecs = [
  { label: 'Option A', value: 'option-a', price: 0, inventory: 4 },
  { label: 'Option B', value: 'option-b', price: 4200, inventory: 2 },
  { label: 'Option C', value: 'option-c', price: 9600, inventory: 1 },
  // Deliberately taken — spec FR-040 needs an option that cannot be chosen.
  { label: 'Option D', value: 'option-d', price: 18400, inventory: 0 },
]

const variantOptions: Record<string, { id: number | string }> = {}
for (const spec of variantSpecs) {
  const found = await payload.find({
    collection: 'variantOptions',
    where: { value: { equals: spec.value } },
    limit: 1,
  })
  variantOptions[spec.value] =
    found.docs[0] ??
    (await payload.create({
      collection: 'variantOptions',
      data: { variantType: optionType.id, label: spec.label, value: spec.value },
      context: skipRevalidation,
    }))
}

console.log('› photography')
/*
  Placeholder images. The FILE names are historical and kept so nothing that refers to them moves;
  the alt text is what a visitor reads, and it says only what the picture is for.
*/
const media = {
  // The five product-page thumbnails, in the order the rail shows them (node 297:4568).
  product1a: await upsertMedia('product-1-a.webp', 'Product image 1'),
  product1b: await upsertMedia('product-1-c.webp', 'Product image 2'),
  product1c: await upsertMedia('product-1-d.webp', 'Product image 3'),
  product1d: await upsertMedia('product-1-b.webp', 'Product image 4'),
  product1e: await upsertMedia('product-1-e.webp', 'Product image 5'),
  product2: await upsertMedia('product-2.webp', 'Product image 6'),
  product4: await upsertMedia('product-4.webp', 'Product image 7'),
  product3: await upsertMedia('product-3.webp', 'Product image 8'),
  product5: await upsertMedia('product-5.webp', 'Product image 9'),
}

console.log('› products')

/** One placeholder sentence for every product; the owner writes the real ones in the admin. */
const DESCRIPTION = 'Short product description. Replace it with your own text.'
/** The second paragraph of the "Product details" accordion. */
const DETAILS_NOTE = 'Add product details, specifications and care instructions here.'

/** Placeholder attribute values. The translation script finds them by this exact English text. */
const MATERIAL = ['Material A', 'Material B', 'Material C'] as const
const WEIGHT = ['1.0 kg', '2.5 kg'] as const
const ORIGIN = 'Sample origin'

type ProductSeed = {
  slug: string
  title: string
  category: { id: number | string }
  gallery: (number | string)[]
  price: number
  description: string
  /** Collection values, by `value`. */
  collections?: string[]
  /** Colour values, by `value`. */
  colour?: string[]
  availability: 'made-to-order' | 'stock-tracked'
  inventory?: number
  withVariants?: boolean
  attributes?: { attribute: number | string; value: string }[]
  /** Published unless it says otherwise. One draft exists so FR-009 is exercised, not assumed. */
  status?: 'draft' | 'published'
}

const productSeeds: ProductSeed[] = [
  {
    // The product the product page is drawn around (node 231:1901): options that move the price,
    // and five photographs in the drawn thumbnail order.
    slug: 'product-1',
    title: 'Product 1',
    category: categories['category-1'],
    gallery: [
      media.product1a.id,
      media.product1b.id,
      media.product1c.id,
      media.product1d.id,
      media.product1e.id,
    ],
    price: 38320,
    description: DESCRIPTION,
    collections: ['collection-a'],
    colour: ['clear'],
    availability: 'made-to-order',
    withVariants: true,
    attributes: [
      { attribute: attributes.material.id, value: MATERIAL[0] },
      { attribute: attributes.weight.id, value: WEIGHT[0] },
      { attribute: attributes.origin.id, value: ORIGIN },
    ],
  },
  {
    // NO options — the middle case of FR-008's "neither, either, or both".
    slug: 'product-2',
    title: 'Product 2',
    category: categories['category-2'],
    gallery: [media.product2.id, media.product3.id],
    price: 37400,
    description: DESCRIPTION,
    collections: ['collection-c'],
    colour: ['clear'],
    availability: 'made-to-order',
    attributes: [
      { attribute: attributes.material.id, value: MATERIAL[0] },
      { attribute: attributes.weight.id, value: WEIGHT[1] },
    ],
  },
  {
    // NEITHER option type — orderable immediately, no selectors drawn.
    slug: 'product-3',
    title: 'Product 3',
    category: categories['category-4'],
    gallery: [media.product3.id],
    price: 24900,
    description: DESCRIPTION,
    collections: ['collection-a'],
    colour: ['clear'],
    availability: 'made-to-order',
    attributes: [{ attribute: attributes.material.id, value: MATERIAL[0] }],
  },
  {
    // Stock tracked, at zero — visible in the listing, unavailable on its page.
    slug: 'product-4',
    title: 'Product 4',
    category: categories['category-3'],
    gallery: [media.product4.id],
    price: 38000,
    description: DESCRIPTION,
    collections: ['collection-b'],
    colour: ['multicolor'],
    availability: 'stock-tracked',
    inventory: 0,
    attributes: [{ attribute: attributes.material.id, value: MATERIAL[1] }],
  },
  {
    // Stock tracked with stock — the ordinary case.
    slug: 'product-5',
    title: 'Product 5',
    category: categories['category-4'],
    gallery: [media.product5.id],
    price: 19000,
    description: DESCRIPTION,
    collections: ['collection-d'],
    colour: ['multicolor'],
    availability: 'stock-tracked',
    inventory: 3,
    attributes: [{ attribute: attributes.material.id, value: MATERIAL[1] }],
  },
  {
    /**
     * A product titled in Cyrillic.
     *
     * Not decoration. The messenger message is carried in a URL, and the budget that governs it is
     * measured AFTER percent-encoding — where one Cyrillic character costs six, because it is two
     * UTF-8 bytes and each byte becomes a `%XX` escape. A truncation rule tested only against Latin
     * titles passes while doing nothing for the customers it was written for.
     *
     * The slug is written out rather than derived. The generator below strips everything outside
     * `a-z0-9`, so deriving one from this title would produce an empty string.
     */
    slug: 'tovar-s-kirillicheskim-nazvaniem',
    title: 'Товар с кириллическим названием',
    category: categories['category-1'],
    gallery: [media.product1a.id, media.product1d.id],
    price: 21500,
    description: 'Краткое описание товара. Замените его своим текстом.',
    collections: ['collection-a'],
    colour: ['clear'],
    availability: 'made-to-order',
    attributes: [{ attribute: attributes.material.id, value: MATERIAL[0] }],
  },
]

/**
 * Twenty-four more products, and one draft.
 *
 * Ported from `src/mocks/catalog.ts` deliberately: until 003/T290 the storefront read those
 * fixtures, and the acceptance written against them — that the listing pages at twelve, that a
 * price filter has something on both sides of it, that IN-STOCK ONLY has both a stocked product and
 * an empty one to tell apart — only means anything if the database describes the same shop. Five
 * hand-written products cannot page.
 *
 * They are filler in the sense that the copy is generated, not in the sense that they are
 * disposable: every one of them is what makes some rule testable.
 */
const FILLER: { title: string; categorySlug: keyof typeof categories }[] = [
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

const FILLER_COLOURS = [['clear'], ['black'], ['green'], ['multicolor'], ['clear', 'black']]
/** Each category gets its own placeholder photographs, so a listing is not one picture repeated. */
const GALLERY_FOR: Record<string, (number | string)[]> = {
  'category-1': [media.product1a.id, media.product1b.id],
  'category-2': [media.product2.id],
  'category-3': [media.product4.id],
  'category-4': [media.product3.id, media.product5.id],
}

const pick = <T,>(list: readonly T[], index: number): T => {
  const found = list[index % list.length]
  if (found === undefined) throw new Error('cannot pick from an empty list')
  return found
}

for (const [index, { title, categorySlug }] of FILLER.entries()) {
  // Every fourth product is stock tracked, and one of THOSE is empty — IN-STOCK ONLY needs both a
  // product it keeps and a product it hides, or the filter passes by doing nothing.
  const stocked = index % 4 === 3

  productSeeds.push({
    slug: title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    title,
    category: categories[categorySlug],
    gallery: GALLERY_FOR[categorySlug] ?? [media.product1a.id],
    // 1,200 → 46,050 in even steps, so a price filter always has something on each side of it.
    price: 1200 + index * 1950,
    description: DESCRIPTION,
    collections: [pick(['collection-a', 'collection-b', 'collection-c', 'collection-d'], index)],
    colour: pick(FILLER_COLOURS, index),
    availability: stocked ? 'stock-tracked' : 'made-to-order',
    inventory: index === 7 ? 0 : 2,
    attributes: [
      { attribute: attributes.material.id, value: index % 2 === 0 ? MATERIAL[0] : MATERIAL[2] },
    ],
  })
}

/**
 * A draft. It has a slug, it is complete, and nothing anonymous may reach it — `getProduct` returns
 * null for it and the listing never contains it. Keeping one here is what stops FR-009 from being a
 * rule nobody ever exercises.
 */
productSeeds.push({
  slug: 'unreleased-product',
  title: 'Unreleased Product',
  category: categories['category-2'],
  gallery: [media.product2.id],
  price: 28000,
  description: 'Not yet announced.',
  collections: ['collection-d'],
  colour: ['clear'],
  availability: 'made-to-order',
  status: 'draft',
})

for (const seed of productSeeds) {
  const data = {
    title: seed.title,
    slug: seed.slug,
    description: seed.description,
    gallery: seed.gallery,
    details: richText([seed.description, DETAILS_NOTE]),
    category: seed.category.id,
    // Every list-attribute value the product carries, in one field: its colours, then its collection.
    values: [
      ...(seed.colour ?? []).map((value) => need(colours, value, 'colour').id),
      ...(seed.collections ?? []).map((value) => need(collections, value, 'collection').id),
    ],
    attributes: seed.attributes ?? [],
    availability: seed.availability,
    ...(seed.availability === 'stock-tracked' ? { inventory: seed.inventory ?? 0 } : {}),
    priceInUSDEnabled: true,
    priceInUSD: usd(seed.price),
    enableVariants: Boolean(seed.withVariants),
    ...(seed.withVariants ? { variantTypes: [optionType.id] } : {}),
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

  if (!seed.withVariants) {
    // Re-running after taking the options off a product must not leave orphans behind.
    const orphans = await payload.find({
      collection: 'variants',
      where: { product: { equals: product.id } },
      limit: 100,
    })
    for (const orphan of orphans.docs) {
      await payload.delete({ collection: 'variants', id: orphan.id, context: skipRevalidation })
      console.log('      removed a variant that no longer belongs here')
    }
    continue
  }

  // Variants are created after the product, because `validateOptions` checks that each option's
  // variant type is actually enabled on the parent.
  for (const spec of variantSpecs) {
    const option = need(variantOptions, spec.value, 'variant option')
    const existing = await payload.find({
      collection: 'variants',
      where: { product: { equals: product.id }, options: { equals: option.id } },
      limit: 1,
    })

    const variantData = {
      product: product.id,
      options: [option.id],
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
    detailsTitle: 'PRODUCT DETAILS',
    warrantyTitle: 'WARRANTY AND RETURNS',
    deliveryTitle: 'DELIVERY',
    warranty: richText([
      'Describe your warranty here: what it covers and for how long.',
      'Describe your returns here: how many days a customer has and in what condition.',
    ]),
    delivery: richText([
      'Describe your delivery options here: where you ship and how quickly.',
      'Describe how long made-to-order products take before they are dispatched.',
    ]),
    listingSubtitle: 'A short subtitle for your product listing',
  } as never,
  context: skipRevalidation,
})

console.log('› the FAQ')
/**
 * The questions drawn at the bottom of the story page.
 *
 * They live in their own collection rather than on the page, so this seeds them first and
 * the story page below refers to them. That indirection is the whole point of the model: the
 * standalone `/faq` page will read these same rows with nothing to migrate.
 */
const SEED_QUESTIONS: [string, string[]][] = [1, 2, 3, 4, 5, 6].map((n) => [
  `Question ${n}?`,
  [`Placeholder answer to question ${n}. Replace it with your own text in the admin panel.`],
])

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
 * The seven photographs the Our Story page is drawn with.
 *
 * **The copy ships as the blocks field's `defaultValue`; the pictures cannot.** A media slot holds a
 * relationship to a document, and a default cannot conjure one — so an install that never runs this
 * script renders the drawn page with its media slots collapsed, which is correct under FR-024b but
 * is not the drawn page. This closes that gap.
 *
 * **It writes the whole composition rather than patching the slots**, because there is no stable
 * handle on an individual block: block rows have generated ids, and matching by position would
 * quietly attach the wrong plate to whatever band an editor had dragged into fourth place. Seeding
 * is a fresh-install operation, so replacing the body is the honest thing to do — and `upsertMedia`
 * keeps a re-run from uploading seven more copies of the same photographs.
 *
 * Every string here has a Russian and a Ukrainian twin in `seed-translations-data.ts`, found by
 * this exact English text — change one and change the other.
 */
const storyMedia = {
  opening: await upsertMedia('story-opening-plate.webp', 'Story image 1'),
  closerLook: await upsertMedia('story-closer-look.webp', 'Story image 2'),
  standard: await upsertMedia('story-standard-banner.webp', 'Story image 3'),
  craftedToLast: await upsertMedia('story-crafted-to-last.webp', 'Story image 4'),
  step1: await upsertMedia('story-step-1-select.webp', 'Story image 5'),
  step2: await upsertMedia('story-step-2-craft.webp', 'Story image 6'),
  step3: await upsertMedia('story-step-3-create.webp', 'Story image 7'),
}

const photo = (id: number) => ({ kind: 'photo', photo: id })

await payload.updateGlobal({
  slug: 'story-page',
  data: {
    body: [
      {
        blockType: 'page-header',
        eyebrow: 'OUR STORY',
        heading: 'A HEADLINE ABOUT YOUR STORE',
      },
      { blockType: 'media-plate', media: photo(storyMedia.opening.id) },
      {
        blockType: 'closer-look',
        body: 'A short paragraph about what your store offers and what sets it apart.',
        chips: [
          { label: 'Feature 1' },
          { label: 'Feature 2' },
          { label: 'Feature 3' },
          { label: 'Feature 4' },
          { label: 'Feature 5' },
          { label: 'Feature 6' },
        ],
        figures: [
          { word: 'WORD 1', caption: 'a short caption' },
          { word: 'WORD 2', caption: 'a short caption' },
          { word: 'WORD 3', caption: 'a short caption' },
        ],
        media: photo(storyMedia.closerLook.id),
      },
      {
        blockType: 'banner',
        eyebrow: 'SECTION LABEL',
        heading: 'A HEADLINE FOR THIS BAND',
        body: 'A short paragraph that supports the headline above.',
        cta: { label: 'VIEW ALL PRODUCTS', href: '/all-products' },
        media: photo(storyMedia.standard.id),
        textSide: 'left',
      },
      {
        blockType: 'process-steps',
        heading: 'HOW IT WORKS',
        steps: [
          {
            title: 'STEP 1',
            caption: 'A short caption for this step',
            media: photo(storyMedia.step1.id),
          },
          {
            title: 'STEP 2',
            caption: 'A short caption for this step',
            media: photo(storyMedia.step2.id),
          },
          {
            title: 'STEP 3',
            caption: 'A short caption for this step',
            media: photo(storyMedia.step3.id),
          },
        ],
      },
      {
        blockType: 'banner',
        heading: 'A SECOND HEADLINE',
        body: 'A short sentence for this band.',
        media: photo(storyMedia.craftedToLast.id),
        textSide: 'right',
      },
      {
        blockType: 'faq',
        heading: 'EVERY DETAIL, ANSWERED',
        body: 'A short paragraph introducing the questions below. Have a question you can’t find here? Our team is always ready to help.',
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
 * The blog, as Figma section `312:7335` draws it.
 *
 * **Seven articles, because seven is one complete mosaic cycle.** The drawn index shows exactly one
 * — wide, narrow / narrow, narrow, narrow / narrow, wide — and seeding six or eight would leave a
 * developer looking at a rhythm the design never draws and wondering which of the two is wrong.
 *
 * **Every title is distinct**, so every card's link can be told from its neighbours in a test.
 *
 * **Only the first article has chapters.** It is the one the design draws a full page for
 * (`312:8140`), and it is the one every test opens. The other six exist to fill the mosaic; an
 * article with one chapter correctly renders no contents rail — which is a state worth having in the
 * seed anyway.
 */
const blogMedia = {
  image1: await upsertMedia('blog-8.webp', 'Blog image 1'),
  image2: await upsertMedia('blog-7.webp', 'Blog image 2'),
  image3: await upsertMedia('blog-4.webp', 'Blog image 3'),
  image4: await upsertMedia('blog-5.webp', 'Blog image 4'),
  image5: await upsertMedia('blog-2.webp', 'Blog image 5'),
  image6: await upsertMedia('blog-1.webp', 'Blog image 6'),
  image7: await upsertMedia('blog-6.webp', 'Blog image 7'),
  image8: await upsertMedia('blog-3.webp', 'Blog image 8'),
}

const BLOG_CATEGORIES: [string, string][] = [
  ['Topic 1', 'topic-1'],
  ['Topic 2', 'topic-2'],
  ['Topic 3', 'topic-3'],
  ['Topic 4', 'topic-4'],
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
    heading: 'A headline for your blog',
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
 * `src/collections/articles.ts` for where that line is drawn. Every string has a Russian and a
 * Ukrainian twin in `seed-translations-data.ts`, found by this exact English text.
 */
const FEATURE_CHAPTERS = [
  {
    heading: 'Chapter heading 1',
    tocLabel: 'Chapter 1',
    lede: 'A short lede for this chapter',
    body: richText([
      'This is placeholder text for an article section. Replace it with your own content in the admin panel.',
      'Use this paragraph to expand on the topic: add details, examples or anything your readers need to know.',
    ]),
  },
  {
    heading: 'Chapter heading 2',
    tocLabel: 'Chapter 2',
    lede: 'Another short lede for this chapter.',
    body: richText([
      'This is placeholder text for an article section. Replace it with your own content in the admin panel.',
    ]),
    pullQuote: 'A short pull quote that stands out from the rest of the text.',
  },
  {
    heading: 'Chapter heading 3',
    tocLabel: 'Chapter 3',
    body: richText([
      'This is placeholder text for an article section. Replace it with your own content in the admin panel.',
      'A second paragraph can list the key points of the section, one after another.',
    ]),
  },
  {
    heading: 'Chapter heading 4',
    tocLabel: 'Chapter 4',
    body: richText([
      'This is placeholder text for an article section. Replace it with your own content in the admin panel.',
      'Use this paragraph to expand on the topic: add details, examples or anything your readers need to know.',
      'A closing paragraph can sum up the article and point the reader to what to do next.',
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

/** The excerpt every card shows. One sentence, the same on each, like the product descriptions. */
const STANDFIRST =
  'A short excerpt that introduces the article. Replace it with your own text in the admin panel.'

const SEED_ARTICLES: SeedArticle[] = [
  {
    title: 'Article title 1',
    slug: 'article-1',
    standfirst: STANDFIRST,
    category: 'topic-1',
    publishedOn: '2026-08-13T00:00:00.000Z',
    hero: blogMedia.image8.id,
    chapters: FEATURE_CHAPTERS,
  },
  {
    title: 'Article title 2',
    slug: 'article-2',
    standfirst: STANDFIRST,
    category: 'topic-1',
    publishedOn: '2026-08-12T00:00:00.000Z',
    hero: blogMedia.image1.id,
  },
  {
    title: 'Article title 3',
    slug: 'article-3',
    standfirst: STANDFIRST,
    category: 'topic-2',
    publishedOn: '2026-08-11T00:00:00.000Z',
    hero: blogMedia.image2.id,
  },
  {
    title: 'Article title 4',
    slug: 'article-4',
    standfirst: STANDFIRST,
    category: 'topic-3',
    publishedOn: '2026-08-08T00:00:00.000Z',
    hero: blogMedia.image3.id,
  },
  {
    title: 'Article title 5',
    slug: 'article-5',
    standfirst: STANDFIRST,
    category: 'topic-3',
    publishedOn: '2026-08-06T00:00:00.000Z',
    hero: blogMedia.image5.id,
  },
  {
    title: 'Article title 6',
    slug: 'article-6',
    standfirst: STANDFIRST,
    category: 'topic-4',
    publishedOn: '2026-08-04T00:00:00.000Z',
    hero: blogMedia.image4.id,
  },
  {
    title: 'Article title 7',
    slug: 'article-7',
    standfirst: STANDFIRST,
    category: 'topic-4',
    publishedOn: '2026-08-01T00:00:00.000Z',
    hero: blogMedia.image6.id,
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

console.log('› the home page')
/**
 * The home page's photographs and words.
 *
 * The words are written out here as well as being the global's field defaults, so that a database
 * which already saved the page once is brought back to the placeholder copy, and so that the
 * translation script has an English row to attach Russian and Ukrainian to.
 */
const heroPhoto = await upsertMedia('hero.webp', 'Hero image')
const aboutPhoto = await upsertMedia('about.webp', 'About image')

await payload.updateGlobal({
  slug: 'home-page',
  data: {
    hero: {
      headline: 'A headline about your store',
      lede: 'A short sentence under the headline that says what your store offers.',
      ctaLabel: 'Shop now',
      photo: heroPhoto.id,
    },
    categoriesHeading: 'Shop by category',
    featuredHeading: 'All products',
    featuredCtaLabel: 'View all',
    about: {
      headingLead: 'About',
      headingEmphasis: 'us',
      body: [
        { text: 'A short paragraph about your store.' },
        { text: 'A second paragraph about what you sell and why it is worth a look.' },
      ],
      ctaLabel: 'Discover our story',
      photo: aboutPhoto.id,
    },
  } as never,
  context: skipRevalidation,
})

console.log('      2 photographs on the home page')

/*
  The contact page: its photograph, and its words for the same reason the home page has
  them above.

  The questions band is deliberately left unselected: FR-032 means it does not appear until an
  editor chooses questions, and a seed that picked some for them would put words on the page that
  nobody decided to say.
*/
console.log('› contact page')
const contactPhoto = await upsertMedia('contact-send-us-a-message.webp', 'Contact image')

await payload.updateGlobal({
  slug: 'contact-page',
  data: {
    eyebrow: 'CONTACT US',
    heading: 'WE’RE HERE TO HELP',
    intro: 'A short line about how your team can help',
    form: {
      heading: 'SEND US A MESSAGE',
      body: 'To make an enquiry, please use the contact form below. Our team will be happy to help with orders, delivery, or any other questions.',
      nameLabel: 'Name',
      emailLabel: 'E-mail',
      messageLabel: 'Message',
      submitLabel: 'SEND MESSAGE',
      footnote: 'We’ll get back to you as soon as possible.',
      successMessage:
        'Thank you — your message has reached us. We’ll be in touch as soon as we can.',
      errorMessage:
        'We couldn’t receive your message just now. Please try again, or reach us on WhatsApp, Telegram or Instagram.',
      photo: contactPhoto.id,
    },
    faq: { heading: 'Frequently Asked Questions' },
  } as never,
  context: skipRevalidation,
})

console.log('      1 photograph on the contact form')

console.log('\nSeeded.')
process.exit(0)
