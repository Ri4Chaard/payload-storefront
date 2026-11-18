import config from '@payload-config'
import { cache } from 'react'
import { createLocalReq, getPayload, type PayloadRequest } from 'payload'

import { getCustomer } from '@/lib/auth/dal'
import type { CustomerUser } from '@/lib/auth/dal'

import { readCartCookie } from './cookie'

/**
 * Whose cart is this? (spec 005, T007)
 *
 * Called first by every action and by the loader, because **ownership is re-derived on every call
 * and never taken from an argument.** Next's own documentation is blunt about why: a Server Action
 * is a public POST endpoint reachable without going near the UI, so a line id or a cart id arriving
 * in a request proves nothing about who may touch it. What proves it is the session cookie or the
 * cart secret, both read here.
 *
 * **A customer session always beats a cookie.** A signed-in visitor writes to the cart their account
 * owns, never to whatever a stale guest cookie names — otherwise signing in on a shared machine
 * would hand one person's session the previous person's cart. Merging the two is spec 005 US1
 * (`./merge.ts`); until that runs, the guest cookie is simply ignored while a customer is present.
 *
 * **Every Payload call gets a `req`, and that is not optional.** `createRequestWithSecret` in the
 * plugin returns its argument unchanged when `req` is falsy, so omitting it silently drops the
 * secret and the read is refused — an operation reporting "cart not found" for a cart that plainly
 * exists. Research R3 predicted it; `tests/integration/cart-access.test.ts` proves it, including
 * the omission itself.
 */

export type CartOwner =
  | { kind: 'customer'; user: CustomerUser }
  | { kind: 'guest'; cartId: number; secret: string }
  | { kind: 'none' }

const client = cache(async () => getPayload({ config }))

/**
 * Memoised per render pass. A page that asks the loader and then an action within the same request
 * verifies the session once rather than three times — the same trick `getCustomer` already plays,
 * and routing through it keeps that to one `payload.auth` call.
 */
export const resolveCartOwner = cache(async (): Promise<CartOwner> => {
  // `getCustomer` returns null rather than redirecting. That distinction is load-bearing all the
  // way through this feature: an anonymous visitor completes the entire flow, and a guard that
  // redirected here would put a sign-in gate in the middle of checkout.
  const customer = await getCustomer()
  if (customer) {
    const payload = await client()
    const user = await payload.findByID({
      collection: 'customers',
      id: customer.id,
      depth: 0,
      overrideAccess: true,
    })
    return { kind: 'customer', user: { ...user, collection: 'customers' } as CustomerUser }
  }

  const cookie = await readCartCookie()
  if (cookie) return { kind: 'guest', cartId: cookie.id, secret: cookie.secret }

  return { kind: 'none' }
})

/**
 * The request every Payload call in this feature is handed.
 *
 * A customer's carries the user, so `isDocumentOwner` runs. A guest's carries the secret in
 * `context`, so `hasCartSecretAccess` runs. Both are real access rules doing their job, which is
 * why nothing here passes `overrideAccess: true` — Constitution IV treats re-deriving access in a
 * `where` clause as the thing access rules exist to prevent.
 */
export function ownerRequest(owner: CartOwner): Partial<PayloadRequest> {
  if (owner.kind === 'customer') return { user: owner.user }
  if (owner.kind === 'guest') return { context: { cartSecret: owner.secret } }
  return {}
}

/**
 * The same thing, as a **complete** `PayloadRequest`.
 *
 * The Local API is happy with a partial; the plugin's cart operations are typed for the full
 * object, and they are right to be — they pass it on to `payload.update` and to the access
 * functions, which may read more of it than we happen to set. `createLocalReq` is Payload's own
 * builder for exactly this case, so the missing halves come from Payload rather than from a cast
 * that would be wrong the day something reads `req.locale`.
 */
export async function ownerLocalReq(owner: CartOwner): Promise<PayloadRequest> {
  const payload = await client()
  return createLocalReq(
    {
      ...(owner.kind === 'customer' ? { user: owner.user } : {}),
      ...(owner.kind === 'guest' ? { context: { cartSecret: owner.secret } } : {}),
    },
    payload,
  )
}

/**
 * The owner's existing cart id, or `null`.
 *
 * **Never creates one.** Creation writes a cookie, and a cookie write during render is refused by
 * Next — which is the right constraint rather than an obstacle, because it is what stops a page
 * being looked at from creating rows. `ensureCart` in `./actions.ts` is the only thing that
 * creates, and it only runs inside a Server Action.
 */
export async function findCartId(owner: CartOwner): Promise<null | number> {
  if (owner.kind === 'none') return null
  if (owner.kind === 'guest') return owner.cartId

  const payload = await client()
  const { docs } = await payload.find({
    collection: 'carts',
    where: { customer: { equals: owner.user.id } },
    depth: 0,
    limit: 1,
    // Newest wins if a customer somehow has two. One is the invariant; this is what keeps a
    // duplicate from being a silent coin flip between requests.
    sort: '-updatedAt',
    overrideAccess: false,
    req: ownerRequest(owner),
  })

  return docs[0]?.id ?? null
}

export { client as payloadClient }
