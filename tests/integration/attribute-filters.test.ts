import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { DEFAULT_FILTERS, parseFilters } from '@/lib/catalog/filters'
import {
  getFilterFacets,
  getHeaderCategories,
  getListing,
  getProduct,
  getRelated,
} from '@/lib/catalog/queries'

/**
 * Owner-defined attributes, against the seeded catalogue.
 *
 * Everything a pure module cannot judge lives here: whether `?shape=round` names an attribute the
 * shop filters by, whether `purple` is one of its values, what the drawer offers, what relates two
 * products, and which categories the header carries. Only a catalogue can answer those.
 *
 * The seed defines `colour` (filterable, shown in the details) and `collection` (filterable, relates
 * products, not shown), keeping the query keys and values links have always carried.
 */

const payload = await getPayload({ config })
const context = { disableRevalidate: true }

const madeValues: number[] = []
const madeAttributes: number[] = []
const restoreCategories: { id: number; showInHeader: boolean; order: number }[] = []

afterAll(async () => {
  if (madeValues.length > 0) {
    await payload.delete({
      collection: 'attribute-values',
      context,
      overrideAccess: true,
      where: { id: { in: madeValues } },
    })
  }
  if (madeAttributes.length > 0) {
    await payload.delete({
      collection: 'attributes',
      context,
      overrideAccess: true,
      where: { id: { in: madeAttributes } },
    })
  }
  for (const { id, showInHeader, order } of restoreCategories) {
    await payload.update({
      collection: 'categories',
      id,
      context,
      overrideAccess: true,
      data: { showInHeader, order },
    })
  }
})

const attributeNamed = async (name: string) => {
  const { docs } = await payload.find({
    collection: 'attributes',
    limit: 1,
    overrideAccess: true,
    where: { name: { equals: name } },
  })
  if (!docs[0]) throw new Error(`the seed has no attribute "${name}"`)
  return docs[0]
}

describe('links that existed before attributes', () => {
  it('?colour=black and ?collection=collection-a still filter', async () => {
    for (const query of ['colour=black', 'collection=collection-a']) {
      const { filters, dropped } = parseFilters(new URLSearchParams(query))
      const result = await getListing(filters, 'en')

      expect(dropped).toEqual([])
      expect(result.ignored, query).toEqual([])
      expect(result.products.length, `${query} matches seeded products`).toBeGreaterThan(0)
      expect(result.total).toBeLessThan((await getListing(DEFAULT_FILTERS, 'en')).total)
    }
  })

  it('labels each chip with the value’s own label, in the visitor’s language', async () => {
    const english = await getListing(
      { ...DEFAULT_FILTERS, attributes: { colour: ['clear'] } },
      'en',
    )
    const ukrainian = await getListing(
      { ...DEFAULT_FILTERS, attributes: { colour: ['black'] } },
      'uk',
    )

    expect(english.appliedChips).toContainEqual({ key: 'colour', value: 'clear', label: 'Clear' })
    expect(ukrainian.appliedChips).toContainEqual({
      key: 'colour',
      value: 'black',
      label: 'Чорний',
    })
  })
})

describe('what the catalogue does not have', () => {
  it('drops and reports an unknown value, without narrowing the grid', async () => {
    const all = await getListing(DEFAULT_FILTERS, 'en')
    const bogus = await getListing({ ...DEFAULT_FILTERS, attributes: { colour: ['purple'] } }, 'en')

    expect(bogus.ignored).toContainEqual({ key: 'colour', value: 'purple' })
    expect(bogus.appliedChips).toEqual([])
    expect(bogus.total).toBe(all.total)
  })

  it('drops and reports an attribute the shop does not filter by', async () => {
    const all = await getListing(DEFAULT_FILTERS, 'en')
    // `material` exists, but it is a typed attribute — never a filter.
    const result = await getListing(
      { ...DEFAULT_FILTERS, attributes: { shape: ['round'], material: ['material-a'] } },
      'en',
    )

    expect(result.ignored).toEqual(
      expect.arrayContaining([
        { key: 'shape', value: 'round' },
        { key: 'material', value: 'material-a' },
      ]),
    )
    expect(result.total).toBe(all.total)
  })
})

describe('the facets', () => {
  it('offer one group per filterable attribute, in the attributes’ order, labelled from the rows', async () => {
    const facets = await getFilterFacets('en')

    expect(facets.attributes.map((group) => [group.name, group.label])).toEqual([
      ['colour', 'Colour'],
      ['collection', 'Collection'],
    ])
    expect(facets.attributes[0]?.options.map((option) => option.value)).toEqual([
      'black',
      'clear',
      'green',
      'multicolor',
    ])
  })

  it('are labelled in the visitor’s language', async () => {
    const facets = await getFilterFacets('ru')
    expect(facets.attributes[0]?.label).toBe('Цвет')
    expect(facets.attributes[0]?.options[0]?.label).toBe('Чёрный')
  })

  /**
   * Zero-count options are offered on purpose: hiding them makes the panel change shape as a visitor
   * filters. And a value the owner just added reaches the drawer at once — no code, no deploy.
   */
  it('offer an owner-added value immediately, with a zero count', async () => {
    const colour = await attributeNamed('colour')
    const unused = await payload.create({
      collection: 'attribute-values',
      context,
      overrideAccess: true,
      data: { attribute: colour.id, label: 'Unused', value: `unused-${Date.now()}`, order: 99 },
    })
    madeValues.push(unused.id)

    const facets = await getFilterFacets('en')
    const offered = facets.attributes
      .find((group) => group.name === 'colour')
      ?.options.find((option) => option.value === unused.value)

    expect(offered, 'an owner-added value must reach the drawer immediately').toBeDefined()
    expect(offered?.count).toBe(0)
  })

  it('offer a whole new attribute the moment it is made filterable', async () => {
    const shape = await payload.create({
      collection: 'attributes',
      context,
      overrideAccess: true,
      data: {
        label: 'Shape',
        name: `shape-${Date.now()}`,
        type: 'list',
        filterable: true,
        order: 50,
      },
    })
    madeAttributes.push(shape.id)
    const round = await payload.create({
      collection: 'attribute-values',
      context,
      overrideAccess: true,
      data: { attribute: shape.id, label: 'Round', value: 'round', order: 1 },
    })
    madeValues.push(round.id)

    const facets = await getFilterFacets('en')
    const group = facets.attributes.find((entry) => entry.name === shape.name)
    expect(group?.label).toBe('Shape')
    expect(group?.options).toEqual([{ value: 'round', label: 'Round', count: 0 }])
    // After the seeded two, because its order is higher.
    expect(facets.attributes.map((entry) => entry.name).indexOf(shape.name)).toBe(2)
  })
})

describe('the admin keeps the vocabulary consistent', () => {
  it('refuses an attribute named like one of the listing’s own keys', async () => {
    await expect(
      payload.create({
        collection: 'attributes',
        context,
        overrideAccess: true,
        data: { label: 'Sort', name: 'sort', type: 'list' },
      }),
    ).rejects.toThrow()
  })

  it('refuses a name or value that is not kebab-case', async () => {
    await expect(
      payload.create({
        collection: 'attributes',
        context,
        overrideAccess: true,
        data: { label: 'Frame size', name: 'Frame Size', type: 'list' },
      }),
    ).rejects.toThrow()

    const colour = await attributeNamed('colour')
    await expect(
      payload.create({
        collection: 'attribute-values',
        context,
        overrideAccess: true,
        data: { attribute: colour.id, label: 'Light blue', value: 'Light Blue' },
      }),
    ).rejects.toThrow()
  })

  it('refuses a second value with the same `value` in one attribute, but allows it in another', async () => {
    const colour = await attributeNamed('colour')
    const collection = await attributeNamed('collection')

    await expect(
      payload.create({
        collection: 'attribute-values',
        context,
        overrideAccess: true,
        data: { attribute: colour.id, label: 'Black again', value: 'black' },
      }),
    ).rejects.toThrow()

    const shared = await payload.create({
      collection: 'attribute-values',
      context,
      overrideAccess: true,
      data: { attribute: collection.id, label: 'Black', value: 'black', order: 99 },
    })
    madeValues.push(shared.id)
    expect(shared.title).toBe('Collection: Black')
  })

  it('refuses to delete a value still used by a product, and says how many', async () => {
    const colour = await attributeNamed('colour')
    const [clear] = (
      await payload.find({
        collection: 'attribute-values',
        limit: 1,
        overrideAccess: true,
        where: { and: [{ attribute: { equals: colour.id } }, { value: { equals: 'clear' } }] },
      })
    ).docs

    await expect(
      payload.delete({
        collection: 'attribute-values',
        context,
        id: clear!.id,
        overrideAccess: true,
      }),
    ).rejects.toThrow(/still used by \d+ product/)
  })

  it('refuses to delete an attribute that still has values', async () => {
    const colour = await attributeNamed('colour')
    await expect(
      payload.delete({ collection: 'attributes', context, id: colour.id, overrideAccess: true }),
    ).rejects.toThrow(/still has \d+ value/)
  })
})

describe('the product page', () => {
  it('lists a shown list attribute beside the typed rows, and leaves a hidden one out', async () => {
    const product = await getProduct('product-1', 'en')
    const names = product!.attributes.map((row) => row.name)

    expect(names[0]).toBe('colour')
    expect(product!.attributes[0]?.value).toBe('Clear')
    expect(names).not.toContain('collection')
    expect(names).toEqual(expect.arrayContaining(['material', 'weight', 'origin']))
  })

  it('falls back to the same category when nothing shares a relating value', async () => {
    const product = await getProduct('product-1', 'en')
    const collection = await attributeNamed('collection')

    await payload.update({
      collection: 'attributes',
      id: collection.id,
      context,
      overrideAccess: true,
      data: { relatesProducts: false },
    })
    try {
      const related = await getRelated(product!.id, 'en')
      expect(related.length).toBeGreaterThan(0)
      const sameCategory = await getListing(
        { ...DEFAULT_FILTERS, category: [product!.categorySlug], page: 99 },
        'en',
      )
      const ids = sameCategory.products.map((entry) => entry.id)
      for (const entry of related) expect(ids).toContain(entry.id)
      expect(related.map((entry) => entry.id)).not.toContain(product!.id)
    } finally {
      await payload.update({
        collection: 'attributes',
        id: collection.id,
        context,
        overrideAccess: true,
        data: { relatesProducts: true },
      })
    }
  })
})

describe('the header’s categories', () => {
  it('are the ones marked "show in the header", in their order, in the visitor’s language', async () => {
    const { docs } = await payload.find({
      collection: 'categories',
      limit: 0,
      overrideAccess: true,
      sort: 'order',
    })
    for (const doc of docs) {
      restoreCategories.push({
        id: doc.id,
        showInHeader: doc.showInHeader ?? false,
        order: doc.order ?? 0,
      })
    }

    const [first, second, third] = docs
    // Hide the first, and put the third ahead of the second.
    await payload.update({
      collection: 'categories',
      id: first!.id,
      context,
      overrideAccess: true,
      data: { showInHeader: false },
    })
    await payload.update({
      collection: 'categories',
      id: third!.id,
      context,
      overrideAccess: true,
      data: { order: (second!.order ?? 0) - 1 },
    })

    const english = await getHeaderCategories('en')
    expect(english.map((link) => link.href)).toEqual([
      `/${third!.slug}`,
      `/${second!.slug}`,
      ...docs.slice(3).map((doc) => `/${doc.slug}`),
    ])
    expect(english.map((link) => link.href)).not.toContain(`/${first!.slug}`)

    const russian = await getHeaderCategories('ru')
    expect(russian[0]?.label).toMatch(/^Категория \d$/)
  })

  it('can be none at all', async () => {
    const { docs } = await payload.find({
      collection: 'categories',
      limit: 0,
      overrideAccess: true,
    })
    for (const doc of docs) {
      if (!restoreCategories.some((entry) => entry.id === doc.id)) {
        restoreCategories.push({
          id: doc.id,
          showInHeader: doc.showInHeader ?? false,
          order: doc.order ?? 0,
        })
      }
      await payload.update({
        collection: 'categories',
        id: doc.id,
        context,
        overrideAccess: true,
        data: { showInHeader: false },
      })
    }

    expect(await getHeaderCategories('en')).toEqual([])
  })
})
