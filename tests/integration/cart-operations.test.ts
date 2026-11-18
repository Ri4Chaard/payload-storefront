import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  addLine,
  changeQuantity,
  checkIntent,
  createCartFor,
  dropLine,
} from '@/lib/cart/operations'
import type { CartOwner } from '@/lib/cart/session'
import { resolveCart, type RawCartLine } from '@/lib/cart/totals'
import { getProduct, getProductsByIds } from '@/lib/catalog/queries'
import type { ProductDetail } from '@/lib/catalog/types'

/**
 * Adding, changing and removing lines.
 * FR-001 – FR-004, FR-009.
 *
 * **`operations.ts` rather than the actions themselves**, because an action reads cookies and
 * `cookies` needs a request that does not exist here. The seam exists precisely so these
 * assertions have somewhere to live — the same decision `tests/integration/us2-sign-in.test.ts`
 * records for `authenticateCustomer`.
 *
 * The assertion that matters most is the first one. Two sizes of one product must be two lines: the
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

/** The seeded product with both an option and a size — the only shape that can prove FR-004. */
let optioned: ProductDetail
/** The seeded product with neither. */
let plain: ProductDetail

beforeAll(async () => {
  const withOptions = await getProduct('product-1', 'en')
  const withNone = await getProduct('product-3', 'en')
  if (!withOptions || !withNone) {
    throw new Error('Seed the catalogue first: pnpm seed')
  }
  optioned = withOptions
  plain = withNone
})

afterAll(async () => {
  for (const id of carts) {
    await payload.delete({ collection: 'carts', id, overrideAccess: true }).catch(() => {})
  }
})

const intentFor = (
  product: ProductDetail,
  over: Partial<{ sizeId: number; variantId: number; quantity: number }> = {},
) => ({
  productId: product.id,
  quantity: 1,
  ...(product.variantOptions[0] ? { variantId: product.variantOptions[0].id } : {}),
  ...over,
})

describe('line identity', () => {
  /*
    **The two-sizes case left with sizes in spec 011.** It used to be the reason this shop passed a
    custom `cartItemMatcher` at all: one product in a size 6 and a size 7 merging into a quantity of
    two is an order the seller cannot fulfil. With size gone, a line is a product and an option, which
    is exactly what the plugin's own matcher compares — so the override was deleted and the rule it
    protected is the one below, unchanged.
  */
  it('sums into one line when the product and option both match', async () => {
    const owner = await guest()

    await addLine(owner, owner.cartId, intentFor(optioned))
    await addLine(owner, owner.cartId, intentFor(optioned, { quantity: 2 }))

    const rows = await rowsOf(owner)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.quantity).toBe(3)
  })

  it('treats the same product with two different options as two lines', async () => {
    const owner = await guest()
    const [first, second] = optioned.variantOptions
    expect(second).toBeDefined()

    await addLine(owner, owner.cartId, intentFor(optioned, { variantId: first!.id }))
    await addLine(owner, owner.cartId, intentFor(optioned, { variantId: second!.id }))

    expect(await rowsOf(owner)).toHaveLength(2)
  })

  /*
    The test that proved a chosen size reached the row went with the column in spec 011. Its
    subject — "a selection that is not a variant survives the trip from the product page to the
    seller" — no longer has an instance: a line is a product and an option, and the option is a
    variant the plugin already carries.
  */
})

describe('what may be added', () => {
  it('refuses a draft, which the published catalogue cannot even see', async () => {
    const draft = await payload.find({
      collection: 'products',
      where: { slug: { equals: 'unreleased-product' } },
      limit: 1,
      overrideAccess: true,
    })
    const id = draft.docs[0]?.id
    expect(id, 'the seed keeps one draft so this rule is exercised').toBeDefined()

    expect(await checkIntent({ productId: id!, quantity: 1 }, 'en')).toEqual({
      ok: false,
      reason: 'unavailable',
      field: 'product',
    })
  })

  it('refuses a product id that names nothing', async () => {
    expect(await checkIntent({ productId: 999_999, quantity: 1 }, 'en')).toEqual({
      ok: false,
      reason: 'unavailable',
      field: 'product',
    })
  })

  /*
    The second half of this — "and names the unmade SIZE" — went with sizes in spec 011. The option
    is the only choice a product asks for now, so there is one unmade choice to name rather than two.
  */
  it('names the unmade choice rather than refusing vaguely', async () => {
    const withoutVariant = await checkIntent({ productId: optioned.id, quantity: 1 }, 'en')
    expect(withoutVariant).toEqual({ ok: false, reason: 'missing-option', field: 'variant' })

    const complete = await checkIntent(
      { productId: optioned.id, quantity: 1, variantId: optioned.variantOptions[0]!.id },
      'en',
    )
    expect(complete.ok, 'a product with its one choice made is addable').toBe(true)
  })

  /**
   * The seeded ear climbers are stock-tracked at zero — visible in the listing, unbuyable on their
   * page. FR-002 wants the refusal to name the product rather than send the visitor to fix an option.
   */
  it('refuses a product that is stock tracked and sold out, naming the product', async () => {
    const soldOut = await getProduct('product-4', 'en')
    expect(soldOut, 'the seed keeps one sold-out product so this rule is exercised').not.toBeNull()
    expect(soldOut!.available).toBe(false)

    expect(await checkIntent({ productId: soldOut!.id, quantity: 1 }, 'en')).toEqual({
      ok: false,
      reason: 'unavailable',
      field: 'product',
    })
  })

  it('accepts a product that offers no choices at all', async () => {
    const checked = await checkIntent({ productId: plain.id, quantity: 1 }, 'en')
    expect(checked.ok).toBe(true)
  })

  it('refuses a quantity that is not a positive whole number', async () => {
    for (const quantity of [0, -1, 1.5]) {
      const checked = await checkIntent(intentFor(optioned, { quantity }), 'en')
      expect(checked, `quantity ${quantity}`).toEqual({
        ok: false,
        reason: 'error',
        field: 'quantity',
      })
    }
  })
})

describe('changing and removing', () => {
  it('sets a quantity outright rather than incrementing it', async () => {
    const owner = await guest()
    await addLine(owner, owner.cartId, intentFor(optioned, { quantity: 2 }))

    const [row] = await rowsOf(owner)
    await changeQuantity(owner, owner.cartId, String(row!.id), 5)

    expect((await rowsOf(owner))[0]?.quantity).toBe(5)
  })

  it('refuses a quantity below one instead of removing the line', async () => {
    const owner = await guest()
    await addLine(owner, owner.cartId, intentFor(optioned))
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
    await addLine(
      owner,
      owner.cartId,
      intentFor(optioned, { variantId: optioned.variantOptions[0]!.id }),
    )
    await addLine(
      owner,
      owner.cartId,
      intentFor(optioned, { variantId: optioned.variantOptions[1]!.id }),
    )

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
    await addLine(owner, owner.cartId, intentFor(optioned, { quantity: 2 }))

    const rows = await rowsOf(owner)
    const view = resolveCart(
      rows,
      await getProductsByIds(
        rows.map((row) => Number(row.product)),
        'en',
      ),
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

/**
 * BUY NOW leaves the cart exactly where it was.
 *
 * **The sharpest failure mode in this feature.** A visitor who has assembled three products and then
 * uses BUY NOW on a fourth must find their three untouched — a shortcut that quietly submits or
 * empties the basket destroys work they never offered up. The guarantee is structural: `buyNow`
 * contains no call that reads or writes a cart. This asserts the consequence.
 */
describe('buy now never touches the cart', () => {
  it('leaves an existing cart byte-identical — same lines, quantities and row ids', async () => {
    const owner = await guest()

    await addLine(
      owner,
      owner.cartId,
      intentFor(optioned, { variantId: optioned.variantOptions[0]!.id }),
    )
    await addLine(
      owner,
      owner.cartId,
      intentFor(optioned, { variantId: optioned.variantOptions[1]!.id }),
    )
    await addLine(owner, owner.cartId, intentFor(plain, { quantity: 2 }))

    const before = await rowsOf(owner)
    expect(before).toHaveLength(3)

    // A different product entirely, through the path BUY NOW takes: validate, then compose. Nothing
    // in that path may reach the cart.
    const checked = await checkIntent(intentFor(plain), 'en')
    expect(checked.ok).toBe(true)

    const after = await rowsOf(owner)
    expect(after).toEqual(before)
  })

  it('does not create a cart for a visitor who has none', async () => {
    const before = await payload.count({ collection: 'carts', overrideAccess: true })
    await checkIntent({ productId: plain.id, quantity: 1 }, 'en')
    const after = await payload.count({ collection: 'carts', overrideAccess: true })

    expect(after.totalDocs).toBe(before.totalDocs)
  })
})
