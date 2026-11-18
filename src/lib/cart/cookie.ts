import { cookies } from 'next/headers'

import { CART_COOKIE, CART_COUNT_COOKIE } from './types'

/**
 * Where a guest's claim on their cart is kept.
 *
 * Two cookies, and the difference between them is the whole design.
 *
 * **`aurum-cart` is a bearer credential and is `httpOnly`.** The plugin mints the secret in its
 * `beforeChange` hook and hands it back exactly once, on the creation response; the field's own
 * access is `read: () => false` forever after. So it has to be kept somewhere, and the collection's
 * `read`, `update` **and `delete`** rules all resolve through it — anything holding this secret can
 * empty a stranger's cart. The plugin's own React provider puts it in `localStorage`, where any
 * script on the origin can read it. This does not.
 *
 * **`aurum-cart-count` is a number and is deliberately readable.** It exists so the header badge
 * can be drawn without the root layout calling `cookies()`, which would opt every route into
 * dynamic rendering and cost the prerendered catalogue. It carries no id and no
 * secret; losing it costs a stale number, never a cart.
 *
 * **`sameSite: 'lax'`, not `'strict'`.** The customer leaves for WhatsApp and comes back, and a
 * strict cookie is not sent on that return — the cart would appear empty in front of somebody who
 * had just built it. `lax` covers the top-level navigation that brings them home.
 *
 * **Neither is gated behind cookie consent.** The constitution gates *non-essential*
 * cookies; one of these is the credential without which a visitor cannot reopen their own cart and
 * the other is a count. Neither is used for analytics and neither identifies a person to anything
 * but the cart they already own. A cart the visitor cannot keep is not a cart.
 *
 * **Writes only work inside a Server Action or a Route Handler.** Next refuses a cookie write
 * during render, which is the right constraint here rather than an obstacle: it is what keeps the
 * read-only loader from creating carts as a side effect of somebody looking at a page.
 */

export { CART_COOKIE, CART_COUNT_COOKIE }

/** Thirty days, matching the guest-cart retention period exactly. */
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30

export interface CartCookie {
  id: number
  secret: string
}

const secure = process.env.NODE_ENV === 'production'

/**
 * `id:secret`. The secret is 40 hex characters from `crypto.randomBytes(20)`, so it can never
 * contain the separator — which is what lets this be a split rather than JSON.
 */
function encode({ id, secret }: CartCookie): string {
  return `${id}:${secret}`
}

function decode(raw: string): CartCookie | null {
  const separator = raw.indexOf(':')
  if (separator < 1) return null

  const id = Number(raw.slice(0, separator))
  const secret = raw.slice(separator + 1)

  // A non-numeric id or an empty secret means a cookie we did not write, or one from a previous
  // encoding. Treated as absent rather than repaired — the visitor gets a new cart, which is
  // recoverable, instead of a query built from a value of unknown shape.
  if (!Number.isInteger(id) || id <= 0 || secret.length === 0) return null

  return { id, secret }
}

export async function readCartCookie(): Promise<CartCookie | null> {
  const store = await cookies()
  const raw = store.get(CART_COOKIE)?.value
  return raw ? decode(raw) : null
}

/** Server Actions and Route Handlers only. */
export async function writeCartCookie(value: CartCookie): Promise<void> {
  const store = await cookies()
  store.set(CART_COOKIE, encode(value), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: CART_COOKIE_MAX_AGE,
  })
}

/**
 * The badge's number, readable by the client on purpose.
 *
 * Written alongside every cart mutation. It is allowed to be briefly wrong — the cart page is the
 * authority — and it is never read back by anything that decides what a customer may do.
 */
export async function writeCartCount(count: number): Promise<void> {
  const store = await cookies()
  store.set(CART_COUNT_COOKIE, String(Math.max(0, Math.trunc(count))), {
    httpOnly: false,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: CART_COOKIE_MAX_AGE,
  })
}

/**
 * Both together, always.
 *
 * Clearing the credential without the count leaves a badge advertising a cart the visitor can no
 * longer open, which is worse than either alone.
 */
export async function clearCartCookies(): Promise<void> {
  const store = await cookies()
  store.delete(CART_COOKIE)
  store.delete(CART_COUNT_COOKIE)
}
