/**
 * Where a filter state lives (003/T273, contract §4).
 *
 * One rule, in one function: **a single category is a path, and everything else is a query.**
 * `/rings?colour=black` rather than `/all-jewelry?category=rings&colour=black`, because the two
 * would otherwise be two addresses for one grid — two cache entries, two things for a crawler to
 * index, and two answers to "what is the canonical URL of the ring listing".
 *
 * Every control that commits goes through here — the chips, the shape row, the in-stock link, the
 * sort menu, the drawer's APPLY, and the pagination. That is deliberate. The alternative is each of
 * them assembling `basePath + toQueryString(...)` and each of them having to remember that the
 * route's own category must not be written twice, which is a rule six places would eventually
 * disagree about.
 *
 * **Zero categories, or more than one, is the whole shop.** There is no route for "rings and
 * bracelets" and inventing one would mean a page per combination; `/all-jewelry?category=rings&
 * category=bracelets` says exactly what it is.
 */

import { toQueryString } from './filters'
import type { FilterState } from './types'

/** The listing that has no category of its own. Also the form target — see `canonicalListing`. */
export const ALL_JEWELRY = '/all-jewelry'

/** Just enough of a `CategorySummary` to place it. Kept narrow so tests can supply two fields. */
export interface CategoryRoute {
  slug: string
  href: string
}

export function listingHref(
  filters: FilterState,
  categories: readonly CategoryRoute[],
): string {
  const [only] = filters.category
  const route =
    filters.category.length === 1 ? categories.find((entry) => entry.slug === only) : undefined

  if (route) return `${route.href}${toQueryString({ ...filters, category: [] })}`
  return `${ALL_JEWELRY}${toQueryString(filters)}`
}

/**
 * Where a shop-wide listing request should have been, or `null` when it is already right.
 *
 * This exists because of the no-JavaScript path. A `<form method="GET">` posts to a fixed `action`
 * and cannot choose a path from what is ticked inside it, so the drawer always submits to
 * `/all-jewelry` — with the category as a query parameter, and with both ends of the price slider
 * whether or not anyone touched it. Without this, a visitor with scripting off would end up at a
 * different address from everyone else's for the same grid, and FR-029 asks for the same URL rather
 * than merely the same products.
 *
 * `requested` is what the address bar holds, rebuilt through the same encoder so that key order and
 * defaults are not mistaken for a difference. `settled` is that state after the route has finished
 * reading it — the empty price range dropped. Anything the two disagree about is worth a redirect,
 * and once redirected they agree, so this cannot cycle.
 *
 * **It refuses to move anything it would lose.** A URL carrying a value the catalogue rejected has
 * a notice to render (FR-030), and that notice is built from the raw query — redirecting would
 * rewrite the query from the parsed state and silently drop the very thing being reported. So a
 * request with anything dropped stays where it is and explains itself.
 */
export function canonicalListing(
  requested: FilterState,
  settled: FilterState,
  categories: readonly CategoryRoute[],
  dropped: readonly unknown[],
): string | null {
  if (dropped.length > 0) return null

  const href = listingHref(settled, categories)
  return href === `${ALL_JEWELRY}${toQueryString(requested)}` ? null : href
}
