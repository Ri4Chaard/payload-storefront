import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { DEFAULT_FILTERS } from '@/lib/catalog/filters'
import { getFilterFacets, getListing } from '@/lib/catalog/queries'

/**
 * Colour as an owner-managed vocabulary (spec 011, US3).
 *
 * **This is where "an unknown colour is dropped" now lives.** It used to be a unit test against
 * `parseFilters`, which could judge a closed set written in the same file. Colour is the owner's
 * now, so only a catalogue can say whether `purple` is a colour — which means the assertion needs a
 * database, and belongs here (011/research.md R2).
 *
 * The other half is the promise the whole migration rests on: the four values that were an enum
 * still filter, so every link bookmarked or indexed before this feature still resolves (FR-020).
 */

const payload = await getPayload({ config })
const context = { disableRevalidate: true }

const made: number[] = []

afterAll(async () => {
  if (made.length === 0) return
  await payload.delete({
    collection: 'colours',
    context,
    overrideAccess: true,
    where: { id: { in: made } },
  })
})

describe('the four colours that were an enum (FR-020)', () => {
  it('are rows, keeping the values every existing link carries', async () => {
    const { docs } = await payload.find({
      collection: 'colours',
      limit: 0,
      overrideAccess: true,
      sort: 'order',
    })

    expect(docs.map((colour) => colour.value)).toEqual(['black', 'clear', 'green', 'multicolor'])
  })

  it('still filter the catalogue', async () => {
    const { products, ignored, appliedChips } = await getListing(
      { ...DEFAULT_FILTERS, colour: ['clear'] },
      'en',
    )

    expect(ignored).toEqual([])
    expect(appliedChips).toContainEqual({ key: 'colour', value: 'clear', label: 'Clear' })
    expect(products.length, 'the seeded catalogue has clear products').toBeGreaterThan(0)
  })

  it('carry a localized label, which is what the drawer shows', async () => {
    const [black] = (
      await payload.find({
        collection: 'colours',
        limit: 1,
        locale: 'uk',
        overrideAccess: true,
        where: { value: { equals: 'black' } },
      })
    ).docs

    expect(black?.label).toBe('Чорний')
  })
})

describe('an unknown colour (FR-030)', () => {
  it('is reported and does not narrow the grid', async () => {
    const all = await getListing({ ...DEFAULT_FILTERS }, 'en')
    const bogus = await getListing({ ...DEFAULT_FILTERS, colour: ['purple'] }, 'en')

    expect(bogus.ignored).toContainEqual({ key: 'colour', value: 'purple' })
    // A dropped value must not narrow the result — the notice names it, the grid ignores it.
    expect(bogus.products.length).toBe(all.products.length)
  })
})

describe('the facets read from the catalogue (FR-022)', () => {
  /**
   * **A colour nothing uses is offered, with a count of zero — and that is deliberate.**
   *
   * This spec's FR-022 originally said the opposite, and it was wrong: `getFilterFacets` has said
   * since spec 003 that "hiding them makes the panel change shape as a visitor filters, which loses
   * the option they were about to press; showing a zero is the honest answer to 'do you have this'".
   * Every other facet behaves this way, and the owner's instruction for this feature was that the
   * colour LOGIC stays as it is. So the requirement was reversed, not the code.
   */
  it('offers a colour nothing carries, with a zero count', async () => {
    const unused = await payload.create({
      collection: 'colours',
      context,
      data: { label: 'Unused', order: 99, value: `unused-${Date.now()}` },
      overrideAccess: true,
    })
    made.push(unused.id)

    const facets = await getFilterFacets('en')
    const offered = facets.colours.find((option) => option.value === unused.value)

    expect(offered, 'an owner-added colour must reach the drawer immediately').toBeDefined()
    expect(offered?.count).toBe(0)
  })

  it('labels each option from the row rather than from a message file', async () => {
    const facets = await getFilterFacets('en')
    const black = facets.colours.find((option) => option.value === 'black')

    expect(black?.label).toBe('Black')
  })
})

describe('a colour still in use cannot be deleted (FR-023)', () => {
  it('refuses, and says how many products are in the way', async () => {
    const [clear] = (
      await payload.find({
        collection: 'colours',
        limit: 1,
        overrideAccess: true,
        where: { value: { equals: 'clear' } },
      })
    ).docs

    await expect(
      payload.delete({ collection: 'colours', context, id: clear!.id, overrideAccess: true }),
    ).rejects.toThrow(/still used by \d+ product/)
  })

  it('allows one nothing points at', async () => {
    const spare = await payload.create({
      collection: 'colours',
      context,
      data: { label: 'Spare', order: 98, value: `spare-${Date.now()}` },
      overrideAccess: true,
    })

    await expect(
      payload.delete({ collection: 'colours', context, id: spare.id, overrideAccess: true }),
    ).resolves.toBeTruthy()
  })
})
