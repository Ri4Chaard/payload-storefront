import type { MetadataRoute } from 'next'

import { localeHref } from '@/i18n/prefix'
import { DEFAULT_LOCALE, type Locale } from '@/i18n/routing'
import { getEnabledLocales } from '@/lib/i18n/enabled'
import { BLOG_ROOT, articleHref } from '@/lib/blog/blog-url'
import { getArticleSlugs } from '@/lib/blog/queries'
import { ALL_PRODUCTS } from '@/lib/catalog/listing-url'
import { isDatabaseUnreachable } from '@/lib/catalog/prerender'
import { getCategories, getProductSlugs } from '@/lib/catalog/queries'
import { policyHref } from '@/lib/policies/policy-url'
import { getPolicySlugs } from '@/lib/policies/queries'
import { env } from '@/env'

/**
 * The site's machine-readable list of addresses.
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

/**
 * One address becomes one entry per language it is offered in.
 *
 * **`alternates.languages` on every entry, which is the half a crawler actually reads.** A sitemap
 * that lists three unrelated URLs says three pages exist; one that lists three URLs each naming the
 * other two says the same page exists in three languages, which is what stops them competing with
 * each other in search results.
 *
 * **Filtered by the enabled set**, so a language the owner has switched off disappears from here as
 * well as from the site. And iterated explicitly rather than resolved: `sitemap.ts` is a
 * special Route Handler, and `next/root-params` does not reach one.
 */
function localisedEntries(
  path: string,
  enabled: readonly Locale[],
  rest: Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'>,
): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    enabled.map((code) => [code, absolute(localeHref(code, path))]),
  )

  return enabled.map((code) => ({
    url: absolute(localeHref(code, path)),
    ...rest,
    alternates: { languages },
  }))
}

/** Every address that exists whether or not anything has been published. */
const STATIC_ROUTES: {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: ALL_PRODUCTS, changeFrequency: 'daily', priority: 0.9 },
  { path: BLOG_ROOT, changeFrequency: 'weekly', priority: 0.8 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
  /*
      Contact and FAQ. Both exist whether or not anything is published — `/faq` renders
      a heading and a message rather than a 404 when no question is — so they belong in the static
      list beside `/about` rather than among the rows built from content below.
    */
  { path: '/contact', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.6 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()

  const enabled = await getEnabledLocales()

  const base: MetadataRoute.Sitemap = STATIC_ROUTES.flatMap((route) =>
    localisedEntries(route.path, enabled, {
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }),
  )

  try {
    const [categories, products, articles, policies] = await Promise.all([
      /*
        The default language. A sitemap lists ADDRESSES, and a category's address is its slug, which
        is shared across languages — so the language here only decides which words
        are read and thrown away. It is named rather than inferred because `sitemap.ts` is a Route
        Handler, and `next/root-params` does not reach one.
      */
      getCategories(DEFAULT_LOCALE),
      getProductSlugs(),
      getArticleSlugs(),
      /*
        Policy pages. Built from content rather than listed in `STATIC_ROUTES` above,
        unlike `/contact` and `/faq`: those two exist whether or not anything is published, and a
        policy address does not. Unpublishing one removes it from here, which is the same rule the
        footer follows.
      */
      getPolicySlugs(),
    ])

    return [
      ...base,
      ...categories.flatMap((category) =>
        localisedEntries(category.href, enabled, {
          lastModified,
          changeFrequency: 'daily' as const,
          priority: 0.8,
        }),
      ),
      ...products.flatMap((slug) =>
        localisedEntries(`/products/${slug}`, enabled, {
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }),
      ),
      ...articles.flatMap((slug) =>
        localisedEntries(articleHref(slug), enabled, {
          lastModified,
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        }),
      ),
      ...policies.flatMap((slug) =>
        localisedEntries(policyHref(slug), enabled, {
          lastModified,
          // Policies change rarely and matter less to a crawler than a product — but they ARE a
          // genuine search destination: somebody comparing shops looks up returns terms.
          changeFrequency: 'yearly' as const,
          priority: 0.3,
        }),
      ),
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
