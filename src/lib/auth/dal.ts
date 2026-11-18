import config from '@payload-config'
import { headers as nextHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { getPayload, type Payload } from 'payload'

/**
 * Where "is this customer signed in?" is actually decided.
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
 * Derived from `payload.auth` rather than restated from `payload-types`.
 *
 * The same move `src/fields/address-fields.ts` makes for the plugin's own field override: the
 * authenticated user is a union across every auth-enabled collection, discriminated by
 * `collection`, and narrowing that union is both shorter than `Customer & { collection }` and
 * correct on the day a third auth collection appears. It also keeps this file out of
 * `payload-types`, which the catalogue boundary reserves for the Payload-side tiers.
 */
type AuthenticatedUser = NonNullable<Awaited<ReturnType<Payload['auth']>>['user']>

export type CustomerUser = Extract<AuthenticatedUser, { collection: 'customers' }>

/**
 * The authenticated Payload user, unabridged.
 *
 * **Server-only, and narrower in audience than {@link getCustomer} rather than wider in trust.**
 * Nothing that renders may call this — that is what the DTO above is for. It exists because a
 * handful of server actions must act *as* the customer instead of merely knowing who they are:
 * Payload's local API runs collection access control only when it is handed a `user`, and the
 * addresses collection's `isDocumentOwner` rule is a check we want to keep running in production
 * rather than route around with `overrideAccess`.
 */
const authenticate = cache(async (): Promise<CustomerUser | null> => {
  // **These two lines are in this order on purpose, and swapping them breaks the container build.**
  // Reading the headers is what tells Next this route cannot be prerendered; `getPayload` opens a
  // Postgres connection. Called the other way round, the connection is attempted first and throws
  // before the bailout can happen — and the image is built with no database at all (see
  // src/lib/catalog/prerender.ts), so `next build` fails on every page that asks who is signed in
  // rather than marking them dynamic. Reading first costs nothing at runtime and means no route
  // that consumes this DAL has to remember `export const dynamic`.
  const headers = await nextHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  // An admin session is not a customer session. The two collections are separate on purpose, and
  // this is the storefront side of that boundary.
  if (!user || user.collection !== 'customers') return null

  // Unverified is not signed in. Payload's login already refuses these, but a session
  // could predate verification being switched on, and the profile is not reachable without it.
  if (user._verified !== true) return null

  return user
})

/**
 * Memoized for the render pass with React's `cache`, so a page that asks three times — the header,
 * the profile card, an action — verifies once. `authenticate` carries the same `cache`, so routing
 * both accessors through it keeps that to one `payload.auth` call rather than two.
 */
export const getCustomer = cache(async (): Promise<CustomerSession | null> => {
  const user = await authenticate()
  if (!user) return null

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

/**
 * {@link requireCustomer}, for the actions that have to pass a `user` to Payload.
 *
 * Same guard, same redirect, a different return: the whole document rather than the five fields a
 * component may see. Kept as a separate function instead of a flag on `requireCustomer`, so that
 * every caller of the full record is greppable — there should never be many, and the day one of
 * them appears in a component is the day this stops being safe.
 */
export async function requireCustomerUser(next?: string): Promise<CustomerUser> {
  const user = await authenticate()
  if (user) return user

  const target = next ? `/sign-in?next=${encodeURIComponent(next)}` : '/sign-in'
  redirect(target)
}
