import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * The availability mirror (spec 011, US1, FR-001, FR-004; research R5).
 *
 * **What is being tested is a denormalised column, which is the thing worth testing.**
 * `variants.availability` duplicates the parent's value and exists for one reason: `admin.condition`
 * is synchronous and cannot reach a parent document, so without a value on the stone itself the
 * quantity field cannot hide. A duplicate is only safe while something keeps it in step, and these
 * are that something.
 *
 * The storefront never reads this column — `mappers.ts` takes availability from the parent it
 * already has — so a drift here misdraws an admin form rather than selling what should not be sold.
 * `tests/unit/catalog-availability.test.ts` covers the rule customers actually meet.
 *
 * **`disableRevalidate`** on every write: `revalidateOnChange` calls `revalidatePath`, which throws
 * outside a request, and a test runner is outside a request. The hook offers the flag for exactly
 * this.
 */

const payload = await getPayload({ config })
const context = { disableRevalidate: true }

const products: number[] = []

const fresh = (label: string) => `mto-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

async function piece(availability: 'made-to-order' | 'stock-tracked') {
  const [category] = (await payload.find({ collection: 'categories', limit: 1, overrideAccess: true }))
    .docs
  const [image] = (await payload.find({ collection: 'media', limit: 1, overrideAccess: true })).docs

  const created = await payload.create({
    collection: 'products',
    context,
    data: {
      availability,
      category: category!.id,
      enableVariants: true,
      gallery: [image!.id],
      priceInUSD: 100_000,
      slug: fresh(availability),
      title: 'Availability fixture',
      _status: 'published',
    } as never,
    overrideAccess: true,
  })

  products.push(created.id)
  return created
}

/**
 * A stone on a piece.
 *
 * `options` is required by the plugin, and the combination must be UNIQUE within a product — two
 * stones sharing an option fail validation with "Variant options is invalid", which is a message
 * about the fixture rather than about anything under test. Hence `slot`.
 */
async function stone(productId: number, inventory: number, slot = 0) {
  const option = (
    await payload.find({
      collection: 'variantOptions',
      limit: 10,
      overrideAccess: true,
      sort: 'id',
    })
  ).docs[slot]

  return payload.create({
    collection: 'variants',
    context,
    data: {
      inventory,
      options: [option!.id],
      priceInUSD: 100_000,
      product: productId,
      _status: 'published',
    } as never,
    overrideAccess: true,
  })
}

const reread = async (id: number) =>
  payload.findByID({ collection: 'variants', depth: 0, id, overrideAccess: true })

const setMode = async (id: number, availability: 'made-to-order' | 'stock-tracked') =>
  payload.update({
    collection: 'products',
    context,
    data: { availability },
    id,
    overrideAccess: true,
  })

afterAll(async () => {
  if (products.length === 0) return
  await payload.delete({
    collection: 'products',
    context,
    overrideAccess: true,
    where: { id: { in: products } },
  })
})

describe('a stone is stamped with its parent’s mode', () => {
  it('on creation, against a piece that is already made to order', async () => {
    const ring = await piece('made-to-order')
    const created = await stone(ring.id, 0)

    // The common case, and the one a cascade alone would miss: nothing about the product changes
    // when a variant is added to it, so only the variant's own hook can catch this.
    expect(created.availability).toBe('made-to-order')
  })

  it('on creation, against a stock-tracked piece', async () => {
    const ring = await piece('stock-tracked')
    const created = await stone(ring.id, 4)

    expect(created.availability).toBe('stock-tracked')
  })
})

describe('the piece carries its mode down (FR-001)', () => {
  it('reaches stones that already existed', async () => {
    const ring = await piece('stock-tracked')
    const a = await stone(ring.id, 2, 0)
    const b = await stone(ring.id, 5, 1)

    await setMode(ring.id, 'made-to-order')

    expect((await reread(a.id)).availability).toBe('made-to-order')
    expect((await reread(b.id)).availability).toBe('made-to-order')
  })

  /**
   * FR-004 — switching modes is non-destructive.
   *
   * The quantity stops being asked for, not stored. An owner who tries made-to-order for a week and
   * changes their mind should not come back to a shelf of zeroes.
   */
  it('never clears a quantity it stops asking for', async () => {
    const ring = await piece('stock-tracked')
    const only = await stone(ring.id, 7)

    await setMode(ring.id, 'made-to-order')
    expect((await reread(only.id)).inventory).toBe(7)

    await setMode(ring.id, 'stock-tracked')
    const back = await reread(only.id)
    expect(back.availability).toBe('stock-tracked')
    expect(back.inventory).toBe(7)
  })

  it('leaves other pieces alone', async () => {
    const mine = await piece('stock-tracked')
    const theirs = await piece('stock-tracked')
    const untouched = await stone(theirs.id, 1)

    await setMode(mine.id, 'made-to-order')

    expect((await reread(untouched.id)).availability).toBe('stock-tracked')
  })
})
