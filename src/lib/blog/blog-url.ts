/**
 * Where a blog view lives (spec 007, T018, contracts/blog-url.md).
 *
 * **One module writes every `/blog` address**, which is `src/lib/catalog/listing-url.ts`'s lesson
 * restated rather than rediscovered: six callers assembling `basePath + query` themselves is six
 * chances to disagree, and the disagreement surfaces as two URLs for one view — two things for a
 * crawler to index, and two answers to "what is the canonical address of the Guides tab".
 *
 * Three rules make two callers asking for one view produce byte-identical strings:
 *
 * 1. **LATEST is the ABSENCE of `category`.** There is no `?category=latest`; a tab whose slug was
 *    `latest` would be a real category with articles in it.
 * 2. **Page one is the ABSENCE of `page`.** So the first screen has exactly one address, which is
 *    the one `alternates.canonical` points at.
 * 3. **Parameters are emitted in a fixed order** — `category`, then `page`.
 *
 * **A blog tab is a query, not a path**, unlike the shop where a single category IS the path. The
 * shop's rule exists because a category listing there is a merchandising page with its own copy,
 * its own photograph and its own metadata. A blog tab narrows one grid, and `/blog/guides` would
 * also read like an article to anybody looking at the URL.
 */

export const BLOG_ROOT = '/blog'

/**
 * One complete mosaic cycle: wide + narrow, three narrow, narrow + wide.
 *
 * Seven is what the design draws before its LOAD MORE, and it is a cycle rather than a round
 * number — a page of ten would end mid-rhythm every time. The catalogue's twelve is a uniform grid
 * and does not transfer.
 */
export const BLOG_PAGE_SIZE = 7

export interface BlogHrefOptions {
  /** A category slug, or nothing for LATEST. */
  category?: string
  /** Inclusive from one. `2` means the first fourteen articles, not the second seven. */
  page?: number
}

export function blogHref({ category, page }: BlogHrefOptions = {}): string {
  const params: string[] = []

  if (category) params.push(`category=${encodeURIComponent(category)}`)
  if (page && page > 1) params.push(`page=${page}`)

  return params.length > 0 ? `${BLOG_ROOT}?${params.join('&')}` : BLOG_ROOT
}

/** An article's own address. The only place `/blog/<slug>` is written. */
export function articleHref(slug: string): string {
  return `${BLOG_ROOT}/${slug}`
}

/**
 * The page a `?page=` parameter asked for.
 *
 * **Malformed input falls back to one rather than erroring**, which is deliberate and is where this
 * module stops: a category that does not exist is a 404 the ROUTE raises, because that is a claim
 * about content, while `?page=banana` is a claim about nothing at all. Answering it with a 404
 * would turn a mistyped URL into a dead end instead of the first screen.
 */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const page = Number(raw)
  return Number.isInteger(page) && page > 1 ? page : 1
}

/** The `?category=` parameter, or `undefined`. Whether it names a real category is the route's. */
export function parseCategory(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = raw?.trim()
  return trimmed ? trimmed : undefined
}
