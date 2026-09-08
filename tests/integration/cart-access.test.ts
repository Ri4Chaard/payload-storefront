import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { createCartFor, dropLine } from '@/lib/cart/operations'
import { findCartId, ownerRequest, type CartOwner } from '@/lib/cart/session'
import type { CustomerUser } from '@/lib/auth/dal'

/**
 * Who may open a cart — [cart-actions.md §2](../../specs/005-checkout-handoff/contracts/cart-actions.md).
 * FR-006, FR-007, SC-010.
 *
 * **This file opens with the T004 spike, which blocks the rest of Phase 2.** Research R3 reads the
 * plugin's source and concludes that a Local API call into a cart operation must carry a `req`, or
 * the guest secret is silently dropped: `createRequestWithSecret` returns `req` unchanged when
 * `req` is falsy, so an omitted request means `hasCartSecretAccess` sees neither a user nor a
 * secret and refuses the read. That conclusion was reached by reading rather than by running, which
 * is why it gets a test before anything is built on top of it.
 *
 * The failure mode it guards against is the expensive kind: an operation reporting "cart not found"
 * for a cart that plainly exists, which reads like a bug in our code and is not.
 */

const payload = await getPayload({ config })

const carts: number[] = []

/** A guest cart is one with no customer. Empty on purpose — the spike is about access, not items. */
async function guestCart(): Promise<{ id: number; secret: string }> {
  const created = await payload.create({
    collection: 'carts',
    data: { items: [] },
    // The collection's own rule allows an unauthenticated create when guest carts are enabled, and
    // that is worth exercising rather than bypassing — `overrideAccess: true` would prove nothing.
    overrideAccess: false,
    req: {},
  })

  const secret = (created as { secret?: unknown }).secret
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new Error(
      'The plugin returns the cart secret once, on creation, via its afterRead hook. It did not ' +
        'come back — everything downstream depends on capturing it here.',
    )
  }

  carts.push(created.id as number)
  return { id: created.id as number, secret }
}

afterAll(async () => {
  for (const id of carts) {
    await payload.delete({ collection: 'carts', id, overrideAccess: true }).catch(() => {})
  }
})

describe('guest cart access (T004 spike)', () => {
  /**
   * The whole of R3, in one assertion.
   *
   * If this fails, **stop**: adopt the documented fallback — `payload.find` with
   * `overrideAccess: true` and an explicit `{ and: [{ id }, { secret }] }` where clause, the shape
   * the plugin's own `mergeCart` uses — and record the change in research.md before continuing.
   */
  it('returns the cart for a request carrying only the secret in context', async () => {
    const { id, secret } = await guestCart()

    const read = await payload.findByID({
      collection: 'carts',
      id,
      overrideAccess: false,
      req: { context: { cartSecret: secret } },
    })

    expect(read.id).toBe(id)
  })

  it('hands the secret back exactly once, and never again', async () => {
    const { id, secret } = await guestCart()

    const read = await payload.findByID({
      collection: 'carts',
      id,
      overrideAccess: false,
      req: { context: { cartSecret: secret } },
    })

    // The field's own access is `read: () => false`; the creation response is the single exception,
    // which is why R2 puts the value in a cookie the moment it arrives.
    expect((read as { secret?: unknown }).secret).toBeUndefined()
  })

  it('refuses a request carrying no secret at all', async () => {
    const { id } = await guestCart()

    await expect(
      payload.findByID({ collection: 'carts', id, overrideAccess: false, req: {} }),
    ).rejects.toThrow()
  })

  it('refuses a request carrying the wrong secret', async () => {
    const { id } = await guestCart()
    const other = await guestCart()

    await expect(
      payload.findByID({
        collection: 'carts',
        id,
        overrideAccess: false,
        req: { context: { cartSecret: other.secret } },
      }),
    ).rejects.toThrow()
  })

  /**
   * The omission R3 predicts. Passing the secret as an argument without a `req` to hang it on is
   * the mistake the whole spike exists to make impossible to write by accident.
   */
  it('refuses when the secret is not attached to a request', async () => {
    const { id } = await guestCart()

    await expect(
      payload.findByID({ collection: 'carts', id, overrideAccess: false }),
    ).rejects.toThrow()
  })
})

/**
 * Whose cart is whose (T014) — FR-006, FR-007, SC-010.
 *
 * Constitution VI puts this among the rules that do not move for schedule: one customer must never
 * be able to read or change another's. It is asserted at the operations layer rather than through
 * the actions, because an action reads cookies and `cookies()` needs a request scope a test runner
 * does not have — the seam `src/lib/cart/operations.ts` exists to make this reachable.
 */
describe('cart ownership', () => {
  const email = () =>
    `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@cart.aurum-testing.dev`

  async function customer(): Promise<CartOwner & { kind: 'customer' }> {
    const created = await payload.create({
      collection: 'customers',
      data: { email: email(), password: 'a-long-enough-password' },
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

  async function cartFor(owner: CartOwner & { kind: 'customer' }): Promise<number> {
    const { cartId } = await createCartFor(owner)
    carts.push(cartId)
    return cartId
  }

  afterAll(async () => {
    await payload.delete({
      collection: 'customers',
      overrideAccess: true,
      where: { email: { like: '@cart.aurum-testing.dev' } },
    })
  })

  it('refuses to let one customer read another customer cart', async () => {
    const [alice, bob] = [await customer(), await customer()]
    const aliceCart = await cartFor(alice)

    await expect(
      payload.findByID({
        collection: 'carts',
        id: aliceCart,
        overrideAccess: false,
        req: ownerRequest(bob),
      }),
    ).rejects.toThrow()
  })

  it('refuses to let one customer change another customer cart', async () => {
    const [alice, bob] = [await customer(), await customer()]
    const aliceCart = await cartFor(alice)

    await expect(dropLine(bob, aliceCart, 'any-row')).rejects.toThrow()
  })

  it('refuses a guest secret against a customer cart', async () => {
    const alice = await customer()
    const aliceCart = await cartFor(alice)
    const stranger = await guestCart()

    await expect(
      payload.findByID({
        collection: 'carts',
        id: aliceCart,
        overrideAccess: false,
        req: { context: { cartSecret: stranger.secret } },
      }),
    ).rejects.toThrow()
  })

  /**
   * FR-006. A customer's cart is found by their account, never by a cookie — which is what makes it
   * follow them to a second device. The owner here is rebuilt from scratch with no cookie in sight,
   * which is exactly the state a fresh browser is in.
   */
  it('finds a customer cart from a session alone, with no cookie anywhere', async () => {
    const alice = await customer()
    const aliceCart = await cartFor(alice)

    const elsewhere: CartOwner = { kind: 'customer', user: alice.user }
    expect(await findCartId(elsewhere)).toBe(aliceCart)
  })

  it('finds nothing for a visitor who is neither signed in nor carrying a cookie', async () => {
    expect(await findCartId({ kind: 'none' })).toBeNull()
  })
})
