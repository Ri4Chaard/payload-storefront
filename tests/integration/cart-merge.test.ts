import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { CustomerUser } from '@/lib/auth/dal'
import { mergeGuestCart } from '@/lib/cart/merge'
import { addLine, createCartFor } from '@/lib/cart/operations'
import { findCartId, ownerRequest, type CartOwner } from '@/lib/cart/session'
import { relationId, type RawCartLine } from '@/lib/cart/totals'
import { getProduct } from '@/lib/catalog/queries'
import type { ProductDetail } from '@/lib/catalog/types'

/**
 * A guest cart meeting an account cart at sign-in — FR-005.
 *
 * **The first test is the whole reason this module exists.** The plugin ships a merge whose matcher
 * compares product and variant and stops, so a product in size 6 meeting the same product in size 7 comes
 * out as one line of quantity two — an order the seller cannot fulfil. FR-005 says the merge must
 * drop nothing from either side, and a matcher that collapses two sizes drops a size.
 */

const payload = await getPayload({ config })

const carts: number[] = []

let optioned: ProductDetail
let plain: ProductDetail

beforeAll(async () => {
  const withOptions = await getProduct('product-1', 'en')
  const withNone = await getProduct('product-3', 'en')
  if (!withOptions || !withNone) throw new Error('Seed the catalogue first: pnpm seed')
  optioned = withOptions
  plain = withNone
})

afterAll(async () => {
  for (const id of carts) {
    await payload.delete({ collection: 'carts', id, overrideAccess: true }).catch(() => {})
  }
  await payload.delete({
    collection: 'customers',
    overrideAccess: true,
    where: { email: { like: '@merge.aurum-testing.dev' } },
  })
})

async function customer(): Promise<CartOwner & { kind: 'customer' }> {
  const created = await payload.create({
    collection: 'customers',
    data: {
      email: `merge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@merge.aurum-testing.dev`,
      password: 'a-long-enough-password',
    },
    disableVerificationEmail: true,
    overrideAccess: true,
  })
  const user = await payload.findByID({
    collection: 'customers',
    id: created.id,
    depth: 0,
    overrideAccess: true,
  })
  return { kind: 'customer', user: { ...user, collection: 'customers' } as CustomerUser }
}

async function guest(): Promise<CartOwner & { kind: 'guest' }> {
  const { cartId, secret } = await createCartFor({ kind: 'none' })
  carts.push(cartId)
  if (secret === null) throw new Error('a guest cart must come back with its secret')
  return { kind: 'guest', cartId, secret }
}

async function rowsOf(owner: CartOwner, cartId: number): Promise<RawCartLine[]> {
  const cart = await payload.findByID({
    collection: 'carts',
    id: cartId,
    depth: 0,
    overrideAccess: false,
    req: ownerRequest(owner),
  })
  return (cart.items ?? []) as RawCartLine[]
}

const intentFor = (
  product: ProductDetail,
  over: Partial<{ quantity: number; sizeId: number; variantId: number }> = {},
) => ({
  productId: product.id,
  quantity: 1,
  ...(product.variantOptions[0] ? { variantId: product.variantOptions[0].id } : {}),
  ...over,
})

describe('mergeGuestCart', () => {
  /**
   * **Two OPTIONS, where this used to say two sizes**.
   *
   * The claim is the same and the axis moved: a merge must not collapse two lines a customer
   * deliberately made distinct. Size was that axis until it was deprecated, and the option is what
   * remains — so the test follows the rule rather than the removed field.
   */
  it('keeps two options of one product rather than collapsing them into a quantity of two', async () => {
    const alice = await customer()
    const anon = await guest()
    const [first, second] = optioned.variantOptions
    expect(second, 'the seeded product needs two options').toBeDefined()

    const accountCart = (await createCartFor(alice)).cartId
    carts.push(accountCart)
    await addLine(alice, accountCart, intentFor(optioned, { variantId: first!.id }))
    await addLine(anon, anon.cartId, intentFor(optioned, { variantId: second!.id }))

    const { cartId } = await mergeGuestCart(alice, { cartId: anon.cartId, secret: anon.secret })

    const rows = await rowsOf(alice, cartId)
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.quantity === 1)).toBe(true)
    expect(new Set(rows.map((row) => relationId(row.variant)))).toEqual(
      new Set([first!.id, second!.id]),
    )
  })

  it('sums the quantities of lines that genuinely match', async () => {
    const alice = await customer()
    const anon = await guest()

    const accountCart = (await createCartFor(alice)).cartId
    carts.push(accountCart)
    await addLine(alice, accountCart, intentFor(optioned, { quantity: 2 }))
    await addLine(anon, anon.cartId, intentFor(optioned, { quantity: 3 }))

    const { cartId } = await mergeGuestCart(alice, { cartId: anon.cartId, secret: anon.secret })

    const rows = await rowsOf(alice, cartId)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.quantity).toBe(5)
  })

  it('drops nothing from either side', async () => {
    const alice = await customer()
    const anon = await guest()

    const accountCart = (await createCartFor(alice)).cartId
    carts.push(accountCart)
    await addLine(alice, accountCart, intentFor(optioned))
    await addLine(anon, anon.cartId, intentFor(plain))

    const { cartId } = await mergeGuestCart(alice, { cartId: anon.cartId, secret: anon.secret })

    const products = (await rowsOf(alice, cartId)).map((row) => relationId(row.product))
    expect(new Set(products)).toEqual(new Set([optioned.id, plain.id]))
  })

  it('gives a customer with no cart one, carrying the guest lines into it', async () => {
    const alice = await customer()
    const anon = await guest()
    await addLine(anon, anon.cartId, intentFor(plain, { quantity: 4 }))

    expect(await findCartId(alice)).toBeNull()

    const { cartId, merged } = await mergeGuestCart(alice, {
      cartId: anon.cartId,
      secret: anon.secret,
    })
    carts.push(cartId)

    expect(merged).toBe(1)
    expect((await rowsOf(alice, cartId))[0]?.quantity).toBe(4)
  })

  it('deletes the guest cart afterwards, so nothing is left holding a secret', async () => {
    const alice = await customer()
    const anon = await guest()
    await addLine(anon, anon.cartId, intentFor(plain))

    await mergeGuestCart(alice, { cartId: anon.cartId, secret: anon.secret })

    await expect(
      payload.findByID({ collection: 'carts', id: anon.cartId, overrideAccess: true }),
    ).rejects.toThrow()
  })

  /**
   * A stale cookie, a purged cart, or a secret that no longer matches. Signing in must still work —
   * `src/lib/auth/actions.ts` swallows a failure here for exactly this reason — and the customer
   * must still end up with a usable cart.
   */
  it('survives a cookie naming a cart that is gone', async () => {
    const alice = await customer()

    const { cartId, merged } = await mergeGuestCart(alice, { cartId: 999_999, secret: 'nonsense' })
    carts.push(cartId)

    expect(merged).toBe(0)
    expect(await rowsOf(alice, cartId)).toEqual([])
  })

  it('refuses to carry lines across on a wrong secret', async () => {
    const alice = await customer()
    const anon = await guest()
    await addLine(anon, anon.cartId, intentFor(plain))

    const { cartId, merged } = await mergeGuestCart(alice, {
      cartId: anon.cartId,
      secret: 'not-the-secret',
    })
    carts.push(cartId)

    expect(merged).toBe(0)
    expect(await rowsOf(alice, cartId)).toEqual([])
  })

  it('gives the account cart fresh row ids rather than reusing the guest cart ones', async () => {
    const alice = await customer()
    const anon = await guest()
    await addLine(anon, anon.cartId, intentFor(optioned))

    const guestRowId = (await rowsOf(anon, anon.cartId))[0]?.id
    const { cartId } = await mergeGuestCart(alice, { cartId: anon.cartId, secret: anon.secret })
    carts.push(cartId)

    const merged = await rowsOf(alice, cartId)
    expect(merged).toHaveLength(1)
    expect(merged[0]?.id).not.toBe(guestRowId)
  })
})
