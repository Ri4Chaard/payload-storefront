import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { addLine, createCartFor } from '@/lib/cart/operations'
import { ownerRequest, type CartOwner } from '@/lib/cart/session'
import { resolveCart, type RawCartLine } from '@/lib/cart/totals'
import { formatPrice } from '@/lib/catalog/price'
import { getProduct, getProductsByIds } from '@/lib/catalog/queries'
import type { ProductDetail } from '@/lib/catalog/types'
import { skipRevalidation } from '@/lib/revalidate'

/**
 * Revalidation against the live catalogue — [cart-loader.md §4](../../specs/005-checkout-handoff/contracts/cart-loader.md).
 * FR-014.
 *
 * **These change the catalogue underneath a cart that already exists**, which is the only honest
 * way to test staleness: the unit suite can pass a `ProductDetail` that says whatever it likes, but
 * it cannot prove that unpublishing a product in Payload makes it vanish from
 * `getProductsByIds` — and that disappearance is the whole mechanism. Every product touched here is
 * put back before its test ends.
 *
 * `skipRevalidation` on every write: these run under `payload run`, outside a request scope, where
 * `revalidatePath` throws rather than doing nothing.
 *
 * **Each test undoes its own edit before it ends**, rather than queueing the undo for `afterAll`.
 * Deferring cost a run: the first test left the pendant unpublished, and the price test three
 * blocks later was then asserting against a product the published catalogue could no longer see.
 * The `restore` list survives as a safety net for a test that throws part way.
 */

const payload = await getPayload({ config })

const carts: number[] = []
/** Products edited by this suite, and what to restore. */
const restore: (() => Promise<unknown>)[] = []

let pendant: ProductDetail

beforeAll(async () => {
  const withNone = await getProduct('butterfly-diamond-pendant', 'en')
  if (!withNone) throw new Error('Seed the catalogue first: pnpm seed')
  pendant = withNone
})

afterAll(async () => {
  for (const undo of restore) await undo()
  for (const id of carts) {
    await payload.delete({ collection: 'carts', id, overrideAccess: true }).catch(() => {})
  }
})

async function guest(): Promise<CartOwner & { kind: 'guest' }> {
  const { cartId, secret } = await createCartFor({ kind: 'none' })
  carts.push(cartId)
  if (secret === null) throw new Error('a guest cart must come back with its secret')
  return { kind: 'guest', cartId, secret }
}

async function rowsOf(owner: CartOwner): Promise<RawCartLine[]> {
  const cart = await payload.findByID({
    collection: 'carts',
    id: (owner as { cartId: number }).cartId,
    depth: 0,
    overrideAccess: false,
    req: ownerRequest(owner),
  })
  return (cart.items ?? []) as RawCartLine[]
}

/** What the page would render, right now, for this cart. */
async function view(owner: CartOwner) {
  const rows = await rowsOf(owner)
  const ids = rows.map((row) => Number(row.product)).filter((id) => Number.isInteger(id))
  return resolveCart(rows, await getProductsByIds(ids, 'en'))
}

const intentFor = (product: ProductDetail, quantity = 1) => ({
  productId: product.id,
  quantity,
  ...(product.diamondOptions[0] ? { variantId: product.diamondOptions[0].id } : {}),
})

const edit = (id: number, data: Record<string, unknown>) =>
  payload.update({ collection: 'products', id, data, context: skipRevalidation, overrideAccess: true })

/**
 * Change a product, run the assertions, put it back — even if they fail.
 *
 * The `finally` is the point. Without it a failing assertion leaves the catalogue edited and every
 * later test in the file measures a shop that is not the seeded one.
 */
async function whileChanged(
  id: number,
  data: Record<string, unknown>,
  undo: Record<string, unknown>,
  body: () => Promise<void>,
) {
  const putBack = () => edit(id, undo)
  restore.push(putBack)
  await edit(id, data)
  try {
    await body()
  } finally {
    await putBack()
  }
}

describe('a line whose product is withdrawn (FR-014)', () => {
  it('keeps the row, names it, gives it nowhere to go, and drops it from the total', async () => {
    const owner = await guest()
    await addLine(owner, owner.cartId, intentFor(pendant, 2))

    const before = await view(owner)
    expect(before.itemCount).toBe(2)
    expect(before.subtotal).not.toBe(formatPrice(0))

    await whileChanged(pendant.id, { _status: 'draft' }, { _status: 'published' }, async () => {
      const after = await view(owner)
      expect(after.lines).toHaveLength(1)
      expect(after.lines[0]?.href).toBeNull()
      expect(after.lines[0]?.available).toBe(false)
      expect(after.itemCount).toBe(0)
      expect(after.subtotal).toBe(formatPrice(0))
      expect(after.issues).toEqual([
        expect.objectContaining({ kind: 'unpublished', lineId: after.lines[0]?.id }),
      ])
    })
  })
})

describe('a line whose stock has gone (FR-014)', () => {
  it('is excluded from the total but still rendered, with the reason in words', async () => {
    const owner = await guest()
    const soldOut = await getProduct('butterfly-ruby-pink-sapphire-diamond-mini-pendant', 'en')
    expect(soldOut, 'the seed keeps a stock-tracked piece with stock').not.toBeNull()

    await addLine(owner, owner.cartId, intentFor(soldOut!, 1))
    expect((await view(owner)).itemCount).toBe(1)

    await whileChanged(soldOut!.id, { inventory: 0 }, { inventory: 3 }, async () => {
      const after = await view(owner)
      expect(after.lines).toHaveLength(1)
      expect(after.lines[0]?.available).toBe(false)
      expect(after.itemCount).toBe(0)
      expect(after.issues[0]?.kind).toBe('unavailable')
      expect(after.issues[0]?.message).toMatch(/no longer available/i)
    })
  })
})

describe('a line priced differently than when it was added (FR-014)', () => {
  it('uses the current price, not the one the cart was built at', async () => {
    const owner = await guest()
    await addLine(owner, owner.cartId, intentFor(pendant, 1))

    const before = await view(owner)
    const wasMinor = before.lines[0]!.unitMinor

    await whileChanged(
      pendant.id,
      { priceInUSD: wasMinor + 100_000 },
      { priceInUSD: wasMinor },
      async () => {
        const after = await view(owner)
        expect(after.lines[0]?.unitMinor).toBe(wasMinor + 100_000)
        expect(after.subtotal).toBe(formatPrice(wasMinor + 100_000))
      },
    )
  })
})

describe('a line asking for more than is left (FR-014)', () => {
  it('clamps the quantity to what remains and says by how much', async () => {
    const owner = await guest()
    const stocked = await getProduct('butterfly-ruby-pink-sapphire-diamond-mini-pendant', 'en')

    await addLine(owner, owner.cartId, intentFor(stocked!, 3))

    await whileChanged(stocked!.id, { inventory: 1 }, { inventory: 3 }, async () => {
      const after = await view(owner)
      expect(after.lines[0]?.quantity).toBe(1)
      expect(after.itemCount).toBe(1)
      expect(after.issues[0]?.kind).toBe('quantity-reduced')
    })
  })
})

describe('a line whose product has been deleted outright', () => {
  it('renders a named row rather than throwing', async () => {
    const owner = await guest()
    const doomed = await payload.create({
      collection: 'products',
      data: {
        title: 'Temporary piece for the deletion test',
        slug: `temp-${Date.now()}`,
        priceInUSDEnabled: true,
        priceInUSD: 100_000,
        availability: 'made-to-order',
        category: (await payload.find({ collection: 'categories', limit: 1, overrideAccess: true }))
          .docs[0]!.id,
        // Required by the collection. Any existing upload will do — this piece exists for one
        // assertion and is deleted inside the test.
        gallery: [
          (await payload.find({ collection: 'media', limit: 1, overrideAccess: true })).docs[0]!.id,
        ],
        _status: 'published',
      },
      context: skipRevalidation,
      overrideAccess: true,
    })

    await addLine(owner, owner.cartId, { productId: doomed.id, quantity: 1 })
    await payload.delete({
      collection: 'products',
      id: doomed.id,
      context: skipRevalidation,
      overrideAccess: true,
    })

    const after = await view(owner)
    expect(after.lines).toHaveLength(1)
    expect(after.lines[0]?.href).toBeNull()
    expect(after.lines[0]?.title).toMatch(/no longer available/i)
    expect(after.subtotal).toBe(formatPrice(0))
    expect(after.issues[0]?.kind).toBe('unpublished')
  })
})
