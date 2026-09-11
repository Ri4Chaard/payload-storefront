import type { MetadataRoute } from 'next'

import { BLOG_ROOT, articleHref } from '@/lib/blog/blog-url'
import { getArticleSlugs } from '@/lib/blog/queries'
import { ALL_JEWELRY } from '@/lib/catalog/listing-url'
import { isDatabaseUnreachable } from '@/lib/catalog/prerender'
import { getCategories, getProductSlugs } from '@/lib/catalog/queries'
import { env } from '@/env'

/**
 * The site's machine-readable list of addresses (007/T074, T075 — FR-044, Constitution V).
 *
 * **New work this spec had to do, because the site had none.** FR-044 requires published articles
 * to appear in "the site's list of addresses", and there was no such list. It covers the whole
 * public site rather than the blog alone: a sitemap is a claim about what exists, and one listing
 * seven articles and no products actively misinforms a crawler. Recorded in the plan's Complexity
 * Tracking so the scope is challengeable rather than discovered in a diff.
 *
 * **`force-dynamic`, and this is the load-bearing line in the file.** Next's own documentation
 * (`01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`) says a `sitemap.ts` is "a
 * special Route Handler that is cached by default unless it uses a Request-time API or dynamic
 * config option". Cached by default is exactly the failure this codebase has already met once: the
 * production image is built with no database, so a cached sitemap would be generated empty at build
 * and served empty forever. `src/lib/catalog/prerender.ts` records the whole chicken-and-egg; this
 * is the same fix `/`, `/about` and `/blog` all take.
 *
 * **Drafts are absent for free.** Every read below goes through the data tiers, which read with
 * default access — so `adminOrPublishedStatus` on `articles` means an unpublished one never reaches
 * this file. There is no status filter here, and there must not be one: a second place to enforce
 * publication is a second place to get it wrong.
 *
 * **A build with no database emits the static routes and nothing else**, rather than failing. Only a
 * CONNECTION failure is tolerated — a bad query still stops the build, or the day the database is
 * misconfigured looks exactly like the day the shop is empty.
 */
export const dynamic = 'force-dynamic'

/** Absolute, as the sitemap protocol requires. Root-relative addresses are `blog-url.ts`'s job. */
const absolute = (path: string): string => new URL(path, env.NEXT_PUBLIC_SERVER_URL).toString()

/** Every address that exists whether or not anything has been published. */
const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] =
  [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: ALL_JEWELRY, changeFrequency: 'daily', priority: 0.9 },
    { path: BLOG_ROOT, changeFrequency: 'weekly', priority: 0.8 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
    /*
      Contact and FAQ (008/T088). Both exist whether or not anything is published — `/faq` renders
      a heading and a message rather than a 404 when no question is — so they belong in the static
      list beside `/about` rather than among the rows built from content below.
    */
    { path: '/contact', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/faq', changeFrequency: 'monthly', priority: 0.6 },
  ]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()

  const base: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absolute(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  try {
    const [categories, products, articles] = await Promise.all([
      getCategories(),
      getProductSlugs(),
      getArticleSlugs(),
    ])

    return [
      ...base,
      ...categories.map((category) => ({
        url: absolute(category.href),
        lastModified,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })),
      ...products.map((slug) => ({
        url: absolute(`/products/${slug}`),
        lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      ...articles.map((slug) => ({
        url: absolute(articleHref(slug)),
        lastModified,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
    ]
  } catch (error) {
    if (!isDatabaseUnreachable(error)) throw error

    console.warn(
      '  ⚠ No database at build time — the sitemap lists only the static routes. This is expected ' +
        'when building the container image; the first real request lists everything.',
    )
    return base
  }
}
