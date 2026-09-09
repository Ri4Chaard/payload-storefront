import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { addLine, changeQuantity, checkIntent, createCartFor, dropLine } from '@/lib/cart/operations'
import type { CartOwner } from '@/lib/cart/session'
import { resolveCart, type RawCartLine } from '@/lib/cart/totals'
import { getProduct, getProductsByIds } from '@/lib/catalog/queries'
import type { ProductDetail } from '@/lib/catalog/types'

/**
 * Adding, changing and removing lines — [cart-actions.md §3](../../specs/005-checkout-handoff/contracts/cart-actions.md).
 * FR-001 – FR-004, FR-009.
 *
 * **`operations.ts` rather than the actions themselves**, because an action reads cookies and
 * `cookies()` needs a request that does not exist here. The seam exists precisely so these
 * assertions have somewhere to live — the same decision `tests/integration/us2-sign-in.test.ts`
 * records for `authenticateCustomer`.
 *
 * The assertion that matters most is the first one. Two sizes of one ring must be two lines: the
 * plugin's own default matcher would merge them into a quantity of two, producing an order the
 * seller cannot fulfil, and `src/collections/carts.ts` exists to stop exactly that.
 */

const payload = await getPayload({ config })

const carts: number[] = []

/** A guest owner built directly, since there is no cookie to read one from. */
async function guest(): Promise<CartOwner & { kind: 'guest' }> {
  const { cartId, secret } = await createCartFor({ kind: 'none' })
  carts.push(cartId)
  if (secret === null) throw new Error('a guest cart must come back with its secret')
  return { kind: 'guest', cartId, secret }
}

async function rowsOf(owner: CartOwner & { kind: 'guest' }): Promise<RawCartLine[]> {
  const cart = await payload.findByID({
    collection: 'carts',
    id: owner.cartId,
    depth: 0,
    overrideAccess: false,
    req: { context: { cartSecret: owner.secret } },
  })
  return (cart.items ?? []) as RawCartLine[]
}

/** The seeded piece with both a stone and a size — the only shape that can prove FR-004. */
let ring: ProductDetail
/** The seeded piece with neither. */
let pendant: ProductDetail

beforeAll(async () => {
  const withOptions = await getProduct('paragon-emerald-cut-diamond-engagement-ring')
  const withNone = await getProduct('butterfly-diamond-pendant')
  if (!withOptions || !withNone) {
    throw new Error('Seed the catalogue first: pnpm seed')
  }
  ring = withOptions
  pendant = withNone
})

afterAll(async () => {
  for (const id of carts) {
    await payload.delete({ collection: 'carts', id, overrideAccess: true }).catch(() => {})
  }
})

const intentFor = (product: ProductDetail, over: Partial<{ sizeId: number; variantId: number; quantity: number }> = {}) => ({
  productId: product.id,
  quantity: 1,
  ...(product.diamondOptions[0] ? { variantId: product.diamondOptions[0].id } : {}),
  ...(product.sizes[0] ? { sizeId: product.sizes[0].id } : {}),
  ...over,
})

describe('line identity (FR-004)', () => {
  it('treats the same ring in two sizes as two lines, not a quantity of two', async () => {
    const owner = await guest()
    const [first, second] = ring.sizes

    expect(second, 'the seeded ring needs at least two sizes for this to mean anything').toBeDefined()

    await addLine(owner, owner.cartId, intentFor(ring, { sizeId: first!.id }))
    await addLine(owner, owner.cartId, intentFor(ring, { sizeId: second!.id }))

    const rows = await rowsOf(owner)
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.quantity === 1)).toBe(true)
  })

  it('sums into one line when the product, stone and size all match', async () => {
    const owner = await guest()

    await addLine(owner, owner.cartId, intentFor(ring))
    await addLine(owner, owner.cartId, intentFor(ring, { quantity: 2 }))

    const rows = await rowsOf(owner)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.quantity).toBe(3)
  })

  it('treats the same ring with two different stones as two lines', async () => {
    const owner = await guest()
    const [first, second] = ring.diamondOptions
    expect(second).toBeDefined()

    await addLine(owner, owner.cartId, intentFor(ring, { variantId: first!.id }))
    await addLine(owner, owner.cartId, intentFor(ring, { variantId: second!.id }))

    expect(await rowsOf(owner)).toHaveLength(2)
  })

  it('carries the chosen size onto the row, which is the whole reason the column exists', async () => {
    const owner = await guest()
    const size = ring.sizes[0]!

    await addLine(owner, owner.cartId, intentFor(ring, { sizeId: size.id }))

    const rows = await rowsOf(owner)
    expect(rows[0]?.size).toBe(size.id)
  })
})

describe('what may be added (FR-002, FR-003)', () => {
  it('refuses a draft, which the published catalogue cannot even see', async () => {
    const draft = await payload.find({
      collection: 'products',
      where: { slug: { equals: 'unreleased-spartan-cuff' } },
      limit: 1,
      overrideAccess: true,
    })
    const id = draft.docs[0]?.id
    expect(id, 'the seed keeps one draft so this rule is exercised').toBeDefined()

    expect(await checkIntent({ productId: id!, quantity: 1 })).toEqual({
      ok: false,
      reason: 'unavailable',
      field: 'product',
    })
  })

  it('refuses a product id that names nothing', async () => {
    expect(await checkIntent({ productId: 999_999, quantity: 1 })).toEqual({
      ok: false,
      reason: 'unavailable',
      field: 'product',
    })
  })

  it('names the unmade choice rather than refusing vaguely', async () => {
    const withoutStone = await checkIntent({ productId: ring.id, quantity: 1, sizeId: ring.sizes[0]!.id })
    expect(withoutStone).toEqual({ ok: false, reason: 'missing-option', field: 'diamond' })

    const withoutSize = await checkIntent({
      productId: ring.id,
      quantity: 1,
      variantId: ring.diamondOptions[0]!.id,
    })
    expect(withoutSize).toEqual({ ok: false, reason: 'missing-option', field: 'size' })
  })

  /**
   * The seeded ear climbers are stock-tracked at zero — visible in the listing, unbuyable on their
   * page. FR-002 wants the refusal to name the piece rather than send the visitor to fix a stone.
   */
  it('refuses a piece that is stock tracked and sold out, naming the piece', async () => {
    const soldOut = await getProduct('butterfly-ruby-pink-sapphire-diamond-ear-climbers')
    expect(soldOut, 'the seed keeps one sold-out piece so this rule is exercised').not.toBeNull()
    expect(soldOut!.available).toBe(false)

    expect(await checkIntent({ productId: soldOut!.id, quantity: 1 })).toEqual({
      ok: false,
      reason: 'unavailable',
      field: 'product',
    })
  })

  it('accepts a piece that offers no choices at all', async () => {
    const checked = await checkIntent({ productId: pendant.id, quantity: 1 })
    expect(checked.ok).toBe(true)
  })

  it('refuses a quantity that is not a positive whole number', async () => {
    for (const quantity of [0, -1, 1.5]) {
      const checked = await checkIntent(intentFor(ring, { quantity }))
      expect(checked, `quantity ${quantity}`).toEqual({
        ok: false,
        reason: 'error',
        field: 'quantity',
      })
    }
  })
})

describe('changing and removing (FR-009, FR-010)', () => {
  it('sets a quantity outright rather than incrementing it', async () => {
    const owner = await guest()
    await addLine(owner, owner.cartId, intentFor(ring, { quantity: 2 }))

    const [row] = await rowsOf(owner)
    await changeQuantity(owner, owner.cartId, String(row!.id), 5)

    expect((await rowsOf(owner))[0]?.quantity).toBe(5)
  })

  it('refuses a quantity below one instead of removing the line', async () => {
    const owner = await guest()
    await addLine(owner, owner.cartId, intentFor(ring))
    const [row] = await rowsOf(owner)

    expect(await changeQuantity(owner, owner.cartId, String(row!.id), 0)).toEqual({
      ok: false,
      reason: 'error',
      field: 'quantity',
    })
    expect(await rowsOf(owner)).toHaveLength(1)
  })

  it('removes the line it is given and leaves the rest', async () => {
    const owner = await guest()
    await addLine(owner, owner.cartId, intentFor(ring, { sizeId: ring.sizes[0]!.id }))
    await addLine(owner, owner.cartId, intentFor(ring, { sizeId: ring.sizes[1]!.id }))

    const rows = await rowsOf(owner)
    await dropLine(owner, owner.cartId, String(rows[0]!.id))

    const left = await rowsOf(owner)
    expect(left).toHaveLength(1)
    expect(left[0]?.id).toBe(rows[1]?.id)
  })

  it('reports a line that is not there rather than throwing', async () => {
    const owner = await guest()
    expect(await dropLine(owner, owner.cartId, 'no-such-row')).toEqual({
      ok: false,
      reason: 'not-found',
    })
  })
})

/**
 * Research R5, asserted rather than trusted.
 *
 * The plugin computes a `subtotal` on every save, and it counts items whose product has since been
 * withdrawn — it reads prices with a bare `findByID`, no access rule and no status filter. FR-014
 * requires those excluded, so the two numbers are allowed to disagree; what must never happen is
 * the storefront rendering the plugin's one. A negative like that stays true only while something
 * checks it.
 */
describe('the displayed total is computed here, not read from the cart row', () => {
  it('does not take its subtotal from cart.subtotal', async () => {
    const owner = await guest()
    await addLine(owner, owner.cartId, intentFor(ring, { quantity: 2 }))

    const rows = await rowsOf(owner)
    const view = resolveCart(
      rows,
      await getProductsByIds(rows.map((row) => Number(row.product))),
    )

    const stored = await payload.findByID({
      collection: 'carts',
      id: owner.cartId,
      depth: 0,
      overrideAccess: true,
    })

    // They agree here, because nothing is stale — the point is that the view was built without
    // ever reading the stored figure.
    expect(view.lines).toHaveLength(1)
    expect(view.subtotal).toBe(view.lines[0]!.lineTotal)
    expect(Object.keys(view)).not.toContain('subtotal_from_cart')
    expect(stored).toHaveProperty('subtotal')
  })
})
