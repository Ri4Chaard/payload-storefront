import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import { DEFAULT_LOCALE, type Locale } from '@/i18n/routing'
import { isDatabaseUnreachable } from '@/lib/catalog/prerender'

import { BLOG_PAGE_SIZE } from './blog-url'
import { toArticleView, toBlogCategories, toBlogIndex } from './mappers'
import type { ArticleView, BlogCategory, BlogIndexView } from './types'

/**
 * Reading the blog.
 *
 * **The only module that knows the blog came from Payload.** Everything above it sees the view
 * models in `./types.ts` — the same seam `src/lib/catalog/queries.ts` and `src/lib/story/queries.ts`
 * are, and the reason a lint rule keeps documents out of components.
 *
 * Four rules run through every function below:
 *
 * 1. **Published only, always.** Every read is `overrideAccess: false`, so `adminOrPublishedStatus`
 *    applies and a draft is absent from the index, from `getArticleSlugs` — and therefore from
 *    `generateStaticParams` and the sitemap — and from `getArticle`. There is no `_status` check
 *    anywhere in this tier, because the constraint is part of the query rather than a filter
 *    somebody could forget to apply.
 * 2. **`null` means the database was unreachable, and nothing else.** An empty blog and an
 *    unreadable one have to stay distinguishable, or the day the database is misconfigured looks
 *    exactly like the day nothing has been written. `src/lib/catalog/prerender.ts` records the
 *    whole chicken-and-egg; the container image is built with no database, which is not an edge
 *    case here but the normal path.
 * 3. **Depth is stated, not defaulted.** Constitution IV rules out taking Payload's defaults by
 *    omission. The index needs the category and the hero's still — one hop — and the article needs
 *    the same, since a chapter's fields are plain.
 * 4. **Deduplicated per request, not cached across requests.** `cache()` collapses the two reads a
 *    single render makes (the page body and `generateMetadata`) into one. Anything longer-lived
 *    would need an invalidation story of its own, and the route already has one — see
 *    `revalidateArticleOnChange`.
 */

const client = cache(async () => getPayload({ config }))

/** The warning a build with no database prints, once per read that could not happen. */
const warnNoDatabase = (what: string): void => {
  console.warn(
    `  ⚠ No database at build time — ${what}. This is expected when building the container ` +
      'image; the first real request reads the real content.',
  )
}

/**
 * Every category, in the editor's order.
 *
 * Public and unversioned, so this is the one read in the tier with nothing to say about drafts.
 * Returns `[]` rather than `null` when the database is unreachable: a tab strip with no tabs is a
 * correct rendering of "no categories", and the index above it already handles the `null` case
 * through `getBlogIndex`.
 */
export const getBlogCategories = cache(async (locale: Locale): Promise<BlogCategory[]> => {
  try {
    const payload = await client()
    const { docs } = await payload.find({
      locale,
      fallbackLocale: DEFAULT_LOCALE,
      collection: 'article-categories',
      depth: 0,
      limit: 0,
      sort: 'order',
      overrideAccess: false,
    })

    return toBlogCategories(docs)
  } catch (error) {
    if (!isDatabaseUnreachable(error)) throw error
    warnNoDatabase('the blog has no categories')
    return []
  }
})

/**
 * Every published article's slug, for `generateStaticParams` and the sitemap.
 *
 * `select: { slug: true }` because that is all either caller needs — resolving every hero and every
 * chapter to throw them away would make a build pay for a render it is not doing.
 */
export const getArticleSlugs = cache(async (): Promise<string[]> => {
  const payload = await client()
  const { docs } = await payload.find({
    /* No locale: `slug` is shared across languages, so this read is language-free. */
    collection: 'articles',
    depth: 0,
    limit: 0,
    sort: '-publishedOn',
    overrideAccess: false,
    select: { slug: true },
  })

  return docs.map((document) => document.slug)
})

/**
 * One article, or `null`.
 *
 * `null` for a slug that does not exist AND for one that exists only as a draft, and the caller
 * cannot tell the two apart — which is the point. The route answers both with `notFound()`, so an
 * unpublished address is indistinguishable from a nonexistent one from outside.
 *
 * Never throws for a missing slug. A URL somebody mistyped is not an error condition.
 */
export const getArticle = cache(
  async (slug: string, locale: Locale): Promise<ArticleView | null> => {
    const payload = await client()
    const { docs } = await payload.find({
      locale,
      fallbackLocale: DEFAULT_LOCALE,
      collection: 'articles',
      where: { slug: { equals: slug } },
      // The category and the hero's uploads. A chapter's own fields are plain text and lexical.
      depth: 1,
      limit: 1,
      overrideAccess: false,
      draft: false,
    })

    const document = docs[0]
    return document ? toArticleView(document, locale) : null
  },
)

export interface BlogIndexRequest {
  /** The language the index is rendered in. */
  locale: Locale
  /** A category slug, already known to exist — the route 404s before it gets here. */
  category?: string
  /** Inclusive from one. Page 2 means the first fourteen articles. */
  page: number
}

/**
 * The index, narrowed and paged as the route asked for it.
 *
 * **Paging ACCUMULATES**, which is the catalogue's semantics and what makes `LoadMore` reusable
 * unchanged: `?page=2` returns the first fourteen rather than the second seven, so pressing the
 * control grows the grid under the visitor's eye and a shared link reproduces what they were
 * looking at.
 *
 * **A page beyond the end is coherent rather than an error.** Asking for page 99 of a nine-article
 * blog returns all nine and a `moreHref` of `null`; the mapper computes the next address from what
 * was actually shown, so it cannot offer a page 100 that does not exist.
 *
 * **`total` is counted after narrowing**, which is what "Showing 7 of 23 articles" means when a tab
 * is selected.
 */
export const getBlogIndex = cache(
  async ({ category, locale, page }: BlogIndexRequest): Promise<BlogIndexView | null> => {
    try {
      const payload = await client()

      const [blogPage, categories, articles] = await Promise.all([
        payload.findGlobal({
          locale,
          fallbackLocale: DEFAULT_LOCALE,
          slug: 'blog-page',
          depth: 1,
          overrideAccess: false,
          draft: false,
        }),
        payload.find({
          locale,
          fallbackLocale: DEFAULT_LOCALE,
          collection: 'article-categories',
          depth: 0,
          limit: 0,
          sort: 'order',
          overrideAccess: false,
        }),
        payload.find({
          locale,
          fallbackLocale: DEFAULT_LOCALE,
          collection: 'articles',
          ...(category ? { where: { 'category.slug': { equals: category } } } : {}),
          depth: 1,
          limit: page * BLOG_PAGE_SIZE,
          sort: '-publishedOn',
          overrideAccess: false,
          draft: false,
        }),
      ])

      return toBlogIndex({
        locale,
        page: blogPage,
        categories: categories.docs,
        articles: articles.docs,
        total: articles.totalDocs,
        ...(category ? { activeCategory: category } : {}),
      })
    } catch (error) {
      if (!isDatabaseUnreachable(error)) throw error
      warnNoDatabase('/blog renders empty')
      return null
    }
  },
)
