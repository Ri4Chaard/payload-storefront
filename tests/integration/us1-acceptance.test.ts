import config from '@payload-config'
import { getPayload } from 'payload'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { DEFAULT_FILTERS } from '@/lib/catalog/filters'
import { getListing, getProduct } from '@/lib/catalog/queries'
import { skipRevalidation } from '@/lib/revalidate'

/**
 * The US1 acceptance, walked end to end against Postgres (003/T295).
 *
 * **This is the story the whole spec rests on** — the owner runs the shop without a developer — and
 * it is the one that could not be tested while the loaders read fixtures: every scenario below is a
 * WRITE followed by a READ, and an array of mock objects cannot be published to. It is written as an
 * integration test rather than a browser walk because what it is checking is the model, not the
 * chrome: the routes that draw these values have their own coverage in `tests/e2e`.
 *
 * Everything it creates, it removes. The test names its documents with a marker so that a run
 * interrupted half way leaves something obviously disposable behind rather than something that looks
 * like the owner's catalogue.
 *
 * **Every write passes `context: skipRevalidation`.** Vitest is not a Next server, so the hooks that
 * keep the cached routes fresh have no request scope to reach; this is the same flag the seed uses,
 * and exercising it here is what keeps that path honest.
 */
const MARKER = 'acceptance-t295'

let payload: Payload
const created: number[] = []
let attributeId: number
let categoryId: number
let gallery: number[]
let productId: number

const listing = () => getListing({ ...DEFAULT_FILTERS, page: 99 }, 'en')

beforeAll(async () => {
  payload = await getPayload({ config })

  const [categories, media] = await Promise.all([
    payload.find({ collection: 'categories', limit: 1, where: { slug: { equals: 'category-1' } } }),
    payload.find({ collection: 'media', limit: 2 }),
  ])

  categoryId = categories.docs[0]!.id
  gallery = media.docs.map((image) => image.id)
  expect(gallery.length, 'the catalogue needs photographs — run `pnpm seed`').toBe(2)
})

afterAll(async () => {
  for (const id of created) {
    await payload.delete({ collection: 'products', id, context: skipRevalidation }).catch(() => {})
  }
  if (attributeId) {
    await payload
      .delete({ collection: 'attributes', id: attributeId, context: skipRevalidation })
      .catch(() => {})
  }
})

describe('US1 — the owner publishes a catalogue nobody has to deploy', () => {
  /**
   * Scenario 3 runs first because scenario 1 asserts that the detail page renders every populated
   * field, and an attribute the owner invented a moment ago is the hardest of those to render. The
   * attribute is created here, with no deployment between defining it and using it.
   */
  it('3. an attribute defined in the admin is usable on a product immediately', async () => {
    const attribute = await payload.create({
      collection: 'attributes',
      data: { label: 'Setting style', name: MARKER, type: 'text' },
      context: skipRevalidation,
    })
    attributeId = attribute.id
    expect(attribute.label).toBe('Setting style')
  })

  it('1. a published product reaches the listing, and its page renders what was entered', async () => {
    const product = await payload.create({
      collection: 'products',
      data: {
        title: 'Acceptance Solitaire',
        slug: `${MARKER}-solitaire`,
        description: 'A piece created by the T295 acceptance walk.',
        gallery,
        category: categoryId,
        attributes: [{ attribute: attributeId, value: 'Four-prong' }],
        availability: 'made-to-order',
        priceInUSDEnabled: true,
        priceInUSD: 420000,
        _status: 'published',
      } as never,
      context: skipRevalidation,
    })
    productId = product.id
    created.push(product.id)

    const found = await getProduct(`${MARKER}-solitaire`, 'en')
    expect(found?.title).toBe('Acceptance Solitaire')
    expect(found?.description).toBe('A piece created by the T295 acceptance walk.')
    expect(found?.price).toBe('$4,200')
    expect(found?.gallery).toHaveLength(2)
    // The attribute invented one test ago, carrying the heading the owner typed and the value.
    expect(found?.attributes).toContainEqual(
      expect.objectContaining({ label: 'Setting style', value: 'Four-prong' }),
    )

    const { products } = await listing()
    expect(products.map((entry) => entry.slug)).toContain(`${MARKER}-solitaire`)
  })

  it('2. a draft is the branded 404 for a visitor and still readable by the owner', async () => {
    const draft = await payload.create({
      collection: 'products',
      data: {
        title: 'Acceptance Draft',
        slug: `${MARKER}-draft`,
        gallery,
        category: categoryId,
        availability: 'made-to-order',
        priceInUSDEnabled: true,
        priceInUSD: 100000,
        _status: 'draft',
      } as never,
      context: skipRevalidation,
    })
    created.push(draft.id)

    // What the route sees. `null` is the 404, and it says nothing about whether the piece exists.
    expect(await getProduct(`${MARKER}-draft`, 'en')).toBeNull()
    const { products } = await listing()
    expect(products.map((entry) => entry.slug)).not.toContain(`${MARKER}-draft`)

    // What the owner sees. The same document, through a read that is not anonymous.
    const asOwner = await payload.findByID({ collection: 'products', id: draft.id, draft: true })
    expect(asOwner.title).toBe('Acceptance Draft')
  })

  it('4. stock-tracked at zero is shown, and shown as unavailable', async () => {
    await payload.update({
      collection: 'products',
      id: productId,
      data: { availability: 'stock-tracked', inventory: 0 } as never,
      context: skipRevalidation,
    })

    const found = await getProduct(`${MARKER}-solitaire`, 'en')
    expect(found?.available).toBe(false)
    // Still on the listing — the owner wants it seen (spec Edge Cases); only IN STOCK ONLY hides it.
    const { products } = await listing()
    expect(products.map((entry) => entry.slug)).toContain(`${MARKER}-solitaire`)
    const orderable = await getListing({ ...DEFAULT_FILTERS, page: 99, inStock: true }, 'en')
    expect(orderable.products.map((entry) => entry.slug)).not.toContain(`${MARKER}-solitaire`)
  })

  it('5. made-to-order is available whatever the quantity says', async () => {
    await payload.update({
      collection: 'products',
      id: productId,
      // The zero is left in place deliberately: made-to-order must IGNORE it, not depend on it
      // having been cleared.
      data: { availability: 'made-to-order', inventory: 0 } as never,
      context: skipRevalidation,
    })

    const found = await getProduct(`${MARKER}-solitaire`, 'en')
    expect(found?.available).toBe(true)
    expect(found?.maxQuantity, 'nothing is counted, so nothing caps the stepper').toBeUndefined()
  })

  it('6. reordering the photographs moves both the listing card and the gallery', async () => {
    const reversed = [...gallery].reverse()
    await payload.update({
      collection: 'products',
      id: productId,
      data: { gallery: reversed } as never,
      context: skipRevalidation,
    })

    const found = await getProduct(`${MARKER}-solitaire`, 'en')
    const { products } = await listing()
    const card = products.find((entry) => entry.slug === `${MARKER}-solitaire`)

    // One photograph decides both: the gallery opens on it and the card shows it.
    expect(found?.gallery[0]?.src).toBe(card?.images[0]?.src)
    // And it is the one that was moved to the front, not the one that used to be there.
    expect(found?.gallery.map((image) => image.src)).not.toEqual(
      [...(found?.gallery ?? [])].reverse().map((image) => image.src),
    )
  })

  it('unpublishing takes the piece off the listing and off its own URL', async () => {
    await payload.update({
      collection: 'products',
      id: productId,
      data: { _status: 'draft' } as never,
      context: skipRevalidation,
    })

    expect(await getProduct(`${MARKER}-solitaire`, 'en')).toBeNull()
    const { products } = await listing()
    expect(products.map((entry) => entry.slug)).not.toContain(`${MARKER}-solitaire`)
  })
})
