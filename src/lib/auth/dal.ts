import 'server-only'

import config from '@payload-config'
import { headers as nextHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { getPayload } from 'payload'

/**
 * Where "is this customer signed in?" is actually decided (spec 004, research R9).
 *
 * **Not in a layout.** The obvious place to guard `/account` is its layout, and Next's own
 * documentation for this version says not to: layouts do not re-render on client-side navigation
 * under partial rendering, and a layout does not control whether the rest of the route renders
 * anyway — route segments are rendered by the router, so hiding children in a layout neither stops
 * them running nor keeps them out of the RSC payload. The check belongs next to the data, which is
 * here.
 *
 * **Not in the proxy either.** `src/proxy.ts` redirects on the absence of a cookie, which is a
 * courtesy — it saves an anonymous visitor from rendering a shell they cannot use. It runs on
 * prefetches and must stay cheap, so it never verifies anything. A forged cookie sails past it and
 * is refused here.
 *
 * **The DTO is the point of the return type.** What crosses into a component is five fields, not
 * the Payload document: a component handed the whole record is handed `_verificationToken`,
 * `loginAttempts` and the hashed password, and sooner or later one of them gets rendered or
 * serialised into a client payload.
 */

export interface CustomerSession {
  email: string
  firstName: null | string
  id: number
  lastName: null | string
  marketingEmail: boolean
}

/**
 * Memoized for the render pass with React's `cache`, so a page that asks three times — the header,
 * the profile card, an action — verifies once.
 */
export const getCustomer = cache(async (): Promise<CustomerSession | null> => {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await nextHeaders() })

  // An admin session is not a customer session. The two collections are separate on purpose, and
  // this is the storefront side of that boundary.
  if (!user || user.collection !== 'customers') return null

  // Unverified is not signed in (FR-008). Payload's login already refuses these, but a session
  // could predate verification being switched on, and the profile is not reachable without it.
  if (user._verified !== true) return null

  return {
    email: user.email,
    firstName: user.firstName ?? null,
    id: user.id,
    lastName: user.lastName ?? null,
    marketingEmail: Boolean(user.marketingEmail),
  }
})

/**
 * The same check, for places that cannot render without a customer.
 *
 * Redirects rather than returning null so the caller cannot forget to handle the null — the shape
 * of the function is what enforces the guard. `next` is carried so signing in returns the customer
 * to the page they asked for rather than dumping them on the profile.
 */
export async function requireCustomer(next?: string): Promise<CustomerSession> {
  const customer = await getCustomer()
  if (customer) return customer

  const target = next ? `/sign-in?next=${encodeURIComponent(next)}` : '/sign-in'
  redirect(target)
}
