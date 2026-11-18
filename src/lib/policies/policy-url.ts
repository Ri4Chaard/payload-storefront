/**
 * Where a policy lives.
 *
 * One function, because the address is assembled in four places — the route's canonical tag, the
 * footer's links, the sitemap, and the banner's link to the Cookie Policy — and four copies of
 * `` `/legal/${slug}` `` is four chances for one of them to drift when the prefix changes. The blog
 * made the same call in `src/lib/blog/blog-url.ts`.
 *
 * **The prefix is not cosmetic.** Next permits one dynamic segment per path position and the site's
 * root one belongs to `(shop)/[category]`; serving policies at bare root addresses would have meant
 * replacing the catalogue's route with a shared resolver.
 */

/** The segment policies live under. Nothing else is served from here. */
export const LEGAL_ROOT = '/legal'

export const policyHref = (slug: string): string => `${LEGAL_ROOT}/${slug}`
