'use server'

import { refresh } from 'next/cache'

import type { Locale } from '@/i18n/routing'
import type { CustomerUser } from '@/lib/auth/dal'
import type { CartIntent } from '@/lib/catalog/cart-intent'
import { CATALOG_CURRENCY, formatPrice } from '@/lib/catalog/price'
import type { ProductDetail } from '@/lib/catalog/types'

import { messengerLink } from '@/lib/messengers/links'
import { composeMessage } from '@/lib/messengers/message'
import { getContactDetails, getMessageTemplate, getMessengers } from '@/lib/messengers/settings'

import { clearCartCookies, readCartCookie, writeCartCookie, writeCartCount } from './cookie'
import { getCart, getCartCount } from './loader'
import { getMessageCustomer } from './message-customer'
import { mergeGuestCart } from './merge'
import { addLine, changeQuantity, checkIntent, createCartFor, dropLine } from './operations'
import { findCartId, payloadClient, resolveCartOwner, type CartOwner } from './session'
import type { CheckoutResult } from './actions-types'
import type { CartActionResult, CartView } from './types'

/**
 * The whole mutation surface of the cart (spec 005, T009, T010,
 * [cart-actions.md](../../../specs/005-checkout-handoff/contracts/cart-actions.md)).
 *
 * **Every export here is a public POST endpoint.** Next's own documentation says so plainly: Server
 * Functions are reachable by direct request, not only through the UI, so authorisation is checked
 * inside each one. That is why nothing below takes a cart id as an argument — ownership is
 * re-derived from the session or the cookie on every call, and a line id names a row *within* a cart
 * the caller has already proved they may open.
 *
 * **This file is deliberately thin.** It reads cookies, resolves who is asking, and settles the
 * badge afterwards. Every rule about what may go in a cart lives one layer down in
 * `./operations.ts`, which takes its owner as an argument — the same seam `src/lib/auth/login.ts`
 * draws under `src/lib/auth/actions.ts`, and for the same reason: `cookies()` needs a request scope
 * that a test runner does not have, so the rules have to be reachable without it.
 *
 * **Failures are returned, never thrown.** A thrown error in a Server Action reaches the client as
 * an opaque digest, which cannot satisfy FR-002's requirement that a refusal name in words what is
 * wrong. The `field` travels; the sentence belongs to whatever interface has to say it, in whatever
 * language it is speaking.
 *
 * **`refresh()`, never `revalidatePath`.** A cart is per-visitor. `revalidatePath` invalidates a
 * cache entry shared by everyone, so calling it here would evict catalogue pages for the whole world
 * because one person changed a quantity. `refresh()` refreshes the calling client's router and
 * nothing else, and may only be called from a Server Action — which is why all of these are one.
 */

/**
 * The owner's cart, creating one if they have none.
 *
 * Only reachable from a Server Action, because creating a guest cart writes the credential cookie
 * and Next refuses a cookie write during render. The loader deliberately has no equivalent — which
 * is what stops a page being looked at from creating rows.
 */
async function ensureCart(owner: CartOwner): Promise<{ cartId: number; owner: CartOwner }> {
  const existing = await findCartId(owner)
  if (existing !== null) return { cartId: existing, owner }

  const { cartId, secret } = await createCartFor(owner)

  if (secret === null) return { cartId, owner }

  await writeCartCookie({ id: cartId, secret })
  return { cartId, owner: { kind: 'guest', cartId, secret } }
}

/** Written after every mutation so the header badge follows without a second round trip (R8). */
async function settle(): Promise<number> {
  const count = await getCartCount()
  await writeCartCount(count)
  refresh()
  return count
}

/**
 * Put a chosen piece in the cart (FR-001 – FR-004).
 *
 * The intent carries identifiers and nothing else — no price, no title, no formatted string. That
 * is not defensive style, it is what stops a displayed price from becoming a charged one:
 * everything the total is built from is read on the server, from the published catalogue.
 */
export async function addToCart(intent: CartIntent, locale: Locale): Promise<CartActionResult> {
  try {
    const checked = await checkIntent(intent, locale)
    if (!checked.ok) return checked

    const owner = await resolveCartOwner()
    const { cartId, owner: resolved } = await ensureCart(owner)

    const added = await addLine(resolved, cartId, intent)
    if (!added.ok) return added

    return { ok: true, itemCount: await settle() }
  } catch {
    // Never the database's own words. A message from here reaches a public endpoint's caller.
    return { ok: false, reason: 'error' }
  }
}

/**
 * Change how many of a line the customer wants (FR-009).
 *
 * The ceiling is enforced by the loader, which clamps what it shows against current stock; this
 * refuses only what is structurally wrong. A quantity below one is refused rather than removing the
 * line, because removal has its own confirmation.
 */
export async function setLineQuantity(
  lineId: string,
  quantity: number,
): Promise<CartActionResult> {
  try {
    const owner = await resolveCartOwner()
    const cartId = await findCartId(owner)
    if (cartId === null) return { ok: false, reason: 'not-found' }

    const changed = await changeQuantity(owner, cartId, lineId, quantity)
    if (!changed.ok) return changed

    return { ok: true, itemCount: await settle() }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * Take a line out (FR-010).
 *
 * Unconditional by design. The confirmation happens in the interface; a `confirmed: true` crossing
 * the wire would be the caller authorising itself, which is not authorisation.
 */
export async function removeLine(lineId: string): Promise<CartActionResult> {
  try {
    const owner = await resolveCartOwner()
    const cartId = await findCartId(owner)
    if (cartId === null) return { ok: false, reason: 'not-found' }

    const dropped = await dropLine(owner, cartId, lineId)
    if (!dropped.ok) return dropped

    // An emptied guest cart keeps its row and its cookie: the visitor may add something else in a
    // moment, and a fresh cart would cost them the one they were already holding.
    return { ok: true, itemCount: await settle() }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * Open the handoff (FR-019, FR-021, FR-022, FR-026, FR-027).
 *
 * **Reads, composes, and writes nothing.** No order, no reference, no record — FR-029 removed all
 * three, and the conversation the customer is about to open is the record. The cart is not cleared
 * either (FR-027): the site cannot know whether the message was actually sent, and clearing on a
 * guess destroys work that is not recoverable.
 *
 * **Composed once, here.** The message is built from one read of the cart and held by the modal for
 * its lifetime, which is what FR-026 means now that there is no row to be idempotent about: the
 * risk is not two records, it is two messages built from two reads of a cart whose price changed in
 * between, so the customer sees one total and the seller receives another.
 *
 * **`no-messengers` is not a failure.** An owner who has configured none still leaves the customer a
 * copyable message and the shop's contact details — the modal always offers that (FR-024), so an
 * empty messenger list is an ordinary success with an empty array.
 */
export async function beginCheckout(locale: Locale): Promise<CheckoutResult> {
  try {
    // Re-read rather than trusting whatever the page was rendered with. A cart can go stale between
    // the render and the press, and the message must describe what is true now.
    const cart = await getCart(locale)
    if (cart.empty) return { ok: false, reason: 'empty' }
    if (cart.issues.length > 0) return { ok: false, reason: 'issues' }

    const [template, messengers, customer, contact] = await Promise.all([
      getMessageTemplate(locale),
      getMessengers(),
      // Optional by construction: `null` for an anonymous visitor, and never a redirect (FR-046).
      getMessageCustomer(),
      getContactDetails(),
    ])

    const message = composeMessage(cart, template, customer)

    return {
      ok: true,
      contact,
      message,
      messengers: messengers.map((messenger) => messengerLink(messenger, message)),
    }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * One piece, straight to the seller, without touching the cart (FR-019, FR-020, T068).
 *
 * **FR-020 is a property of this code path, not a check inside one.** The cart is never read and
 * never written here: no `resolveCartOwner`, no `ensureCart`, no `addLine`, no `settle`. That is
 * the whole guarantee — a customer with three pieces in their basket who presses BUY NOW on a
 * fourth must find their three exactly as they left them, and the surest way to promise that is to
 * have no code that could disturb them.
 *
 * The piece is validated exactly as ADD TO CART validates it, against the published catalogue, then
 * described to the composer as a one-line cart. It never becomes a row anywhere.
 */
export async function buyNow(intent: CartIntent, locale: Locale): Promise<CheckoutResult> {
  try {
    const checked = await checkIntent(intent, locale)
    if (!checked.ok) {
      // The refusals BUY NOW can raise are the ones ADD TO CART raises; the product page already
      // has words for them, so this reports the same shape rather than inventing a second set.
      return { ok: false, reason: 'error' }
    }

    const [template, messengers, customer, contact] = await Promise.all([
      getMessageTemplate(locale),
      getMessengers(),
      getMessageCustomer(),
      getContactDetails(),
    ])

    const message = composeMessage(singleLineCart(checked.product, intent), template, customer)

    return {
      ok: true,
      contact,
      message,
      messengers: messengers.map((messenger) => messengerLink(messenger, message)),
    }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * The chosen piece, shaped as the one-line cart the composer takes.
 *
 * Built here rather than by adding a row and reading it back, which would be the obvious
 * implementation and would violate FR-020 on the way. Every amount still comes from the published
 * catalogue — the intent contributes identifiers and a quantity, nothing else.
 */
function singleLineCart(product: ProductDetail, intent: CartIntent): CartView {
  const chosen = product.variantOptions.find((option) => option.id === intent.variantId)

  const unitMinor = chosen ? chosen.priceMinor : product.priceMinor
  const total = unitMinor * intent.quantity

  return {
    lines: [
      {
        id: 'buy-now',
        title: product.title,
        href: product.href,
        image: product.images[0] ?? null,
        variantChoice: chosen?.label ?? null,
        unitPrice: formatPrice(unitMinor),
        lineTotal: formatPrice(total),
        unitMinor,
        quantity: intent.quantity,
        maxQuantity: chosen ? chosen.maxQuantity : product.maxQuantity,
        available: true,
      },
    ],
    itemCount: intent.quantity,
    subtotal: formatPrice(total),
    shipping: formatPrice(0),
    currency: CATALOG_CURRENCY,
    issues: [],
    empty: false,
  }
}

/**
 * Carry a guest cart into the account being signed into (FR-005, T019).
 *
 * Called by `src/lib/auth/actions.ts` immediately after the session is established. It cannot use
 * `resolveCartOwner`: that reads the *incoming* request's headers, which do not carry the cookie
 * that was just written, so it would still answer "guest". The customer is therefore loaded by the
 * id the authentication returned.
 *
 * **Failure is swallowed on purpose.** A merge that throws must never stop somebody signing in —
 * the worst case is a cart that stays where it was, which the customer can rebuild, against a
 * sign-in that failed for reasons they cannot see or fix.
 */
export async function mergeCartOnSignIn(customerId: number): Promise<void> {
  try {
    const cookie = await readCartCookie()
    if (!cookie) return

    const payload = await payloadClient()
    const user = await payload.findByID({
      collection: 'customers',
      id: customerId,
      depth: 0,
      overrideAccess: true,
    })

    await mergeGuestCart(
      { kind: 'customer', user: { ...user, collection: 'customers' } as CustomerUser },
      { cartId: cookie.id, secret: cookie.secret },
    )
  } catch {
    // Deliberately silent. See above.
  } finally {
    // The guest credential is spent either way: the cart it named has been merged, was never
    // reachable, or belongs to somebody else. Leaving it would let a later request write to a cart
    // this customer does not own.
    await clearCartCookies()
  }
}

/**
 * Forget a guest cart entirely. Here so that clearing the credential and clearing the count stay
 * one operation with one caller.
 */
export async function forgetGuestCart(): Promise<void> {
  await clearCartCookies()
}
