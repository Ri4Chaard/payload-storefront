import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { localeAlternates } from '@/lib/i18n/alternates'
import { currentLocale } from '@/i18n/locale'
import { ArticleMosaic } from '@/components/blog/article-mosaic'
import { CategoryTabs } from '@/components/blog/category-tabs'
import { PageHeaderBlock } from '@/components/blocks/page-header'
import { Container, EmptyState, LoadMore } from '@/components/ui'
import { BLOG_ROOT, blogHref, parseCategory, parsePage } from '@/lib/blog/blog-url'
import { getBlogIndex } from '@/lib/blog/queries'

/**
 * The blog, from Figma nodes `312:6976`, `415:7900`, `415:8018`.
 *
 * **This route closes the last dead link in the site chrome.** The footer has carried
 * *Our Blog → /blog* under ABOUT since spec 001, and until now it was a 404 in production.
 *
 * **Rendered per request, for two independent reasons — either alone would be enough.** It reads
 * `searchParams`, so a narrowed and paged grid is a function of the query string, exactly as
 * `/[category]` is. And it has no dynamic segment, so without this Next would try to prerender it
 * during a container build that has no database — `src/lib/catalog/prerender.ts` records that
 * chicken-and-egg in full, and it is why `/` and `/about` are both `force-dynamic` too.
 *
 * Nothing here is cached, so nothing here needs invalidating: a publish is visible to the next
 * visitor. The article pages ARE cached, and `revalidateArticleOnChange` is the other half of that.
 *
 * **The header is `PageHeaderBlock`, reused rather than rebuilt.** This page is not block-composed —
 * see 007/research.md R2 for why the mosaic cannot be a band an editor moves — so the fields come
 * from the `blog-page` global and the drawn band is the one `/about` already uses. That reuse is
 * what 007/T008 made possible by typing the component against what it draws.
 */
export const dynamic = 'force-dynamic'

/**
 * The blog's own metadata.
 *
 * **The canonical is the bare `/blog`, always.** A narrowed or paged view is a view of the blog
 * rather than a page of its own, and letting `?category=guides&page=3` become its own indexable
 * address would put five near-identical pages into a search index competing with the one anybody
 * should land on. `src/app/(frontend)/(shop)/listing.tsx` records the identical decision for the
 * catalogue's filters.
 *
 * No image fallback: nothing on this page is the page's own, and a link preview built from the
 * newest article's photograph would misrepresent the blog as that article.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t_blog = await getTranslations('blog')
  const locale = await currentLocale()
  const index = await getBlogIndex({ locale, page: 1 })

  // No database — a container build. Emit the bare title rather than nothing; the first real
  // request replaces it.
  if (!index) return { title: t_blog('ourBlog') }

  const title = index.seo.title ?? index.fallbacks.title
  const description = index.seo.description

  return {
    title,
    ...(description ? { description } : {}),
    // Canonical plus every language this page exists in, filtered to what is on offer.
    alternates: await localeAlternates(BLOG_ROOT, locale),
    openGraph: {
      type: 'website',
      title,
      ...(description ? { description } : {}),
      url: BLOG_ROOT,
      ...(index.seo.image
        ? {
            images: [
              {
                url: index.seo.image.src,
                width: index.seo.image.width,
                height: index.seo.image.height,
                ...(index.seo.image.alt ? { alt: index.seo.image.alt } : {}),
              },
            ],
          }
        : {}),
    },
  }
}

interface BlogIndexProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function BlogIndexPage({ searchParams }: BlogIndexProps) {
  const locale = await currentLocale()
  const t_catalog = await getTranslations('catalog')
  const t_blog = await getTranslations('blog')
  const query = await searchParams
  const category = parseCategory(query.category)
  const page = parsePage(query.page)

  const index = await getBlogIndex({ locale, ...(category ? { category } : {}), page })

  /*
    `null` means the database was unreachable — a container build, and nothing else. Render the
    chrome and nothing between, exactly as `/about` does: three places on this site link here, and
    answering a link the site itself publishes with "not found" is worse than a thin page.
  */
  if (!index) return null

  /*
    A category slug nobody has ever used is a claim about content, and the honest answer to a claim
    about content that is false is the same answer any unknown address gets. This check
    lives here rather than in the loader because deciding what an address MEANS is the route's job —
    the loader only reads.
  */
  if (category && !index.categories.some((entry) => entry.slug === category)) notFound()

  const active = index.categories.find((entry) => entry.slug === category)
  const listLabel = active ? `Articles in ${active.title}` : t_blog('latestArticles')

  return (
    <>
      <PageHeaderBlock
        {...(index.eyebrow ? { eyebrow: index.eyebrow } : {})}
        heading={index.heading}
        headingLevel={1}
      />

      <Container className="pb-10 xl:pb-12.5">
        <CategoryTabs
          categories={index.categories}
          {...(category ? { active: category } : {})}
          allHref={blogHref()}
        />
      </Container>

      {index.cards.length === 0 ? (
        <EmptyState
          title={index.empty.title}
          description={index.empty.description}
          /*
            A tab with nothing in it has somewhere useful to send a visitor; a blog with nothing
            published does not, and a button offering to clear a filter nobody applied would be a
            control that admits it cannot help. This is the case `EmptyState.action` was made
            optional for.
          */
          {...(active ? { action: { href: BLOG_ROOT, label: t_blog('allArticles') } } : {})}
        />
      ) : (
        <>
          <Container>
            <ArticleMosaic articles={index.cards} label={listLabel} />
          </Container>

          <Container className="py-10 xl:py-15">
            <LoadMore
              label={t_catalog('loadMore')}
              shown={index.shown}
              total={index.total}
              moreHref={index.moreHref}
              noun="articles"
            />
          </Container>
        </>
      )}
    </>
  )
}
