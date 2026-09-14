import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import React from 'react'

import { localeAlternates } from '@/lib/i18n/alternates'
import { currentLocale } from '@/i18n/locale'
import { ArticleBody } from '@/components/blog/article-body'
import { ArticleHeader } from '@/components/blog/article-header'
import { TableOfContents } from '@/components/blog/table-of-contents'
import { Container, Media } from '@/components/ui'
import { BLOG_ROOT } from '@/lib/blog/blog-url'
import type { ArticleView } from '@/lib/blog/types'
import { getArticle, getArticleSlugs } from '@/lib/blog/queries'
import { prerenderable } from '@/lib/catalog/prerender'

/**
 * One article (007/T032, T033), from Figma nodes `312:8140`, `418:8580`, `418:8881`.
 *
 * **The two-column arrangement is a grid, and the rail is second in the DOM.** The design puts the
 * contents rail beside the article from tablet up — 220px at 768 (`418:8674`), 500px at 1920
 * (`312:8409`) — and above it on a phone (`418:8938`). Source order follows the phone — header,
 * hero, contents, article — because that is the order it is read in, and the grid moves the rail
 * sideways at the width where it becomes a rail. Ordering the DOM for the desktop layout instead
 * would put a shortcut list before the thing it shortcuts on every phone.
 *
 * **The rail spans BOTH rows, and that is what makes it stick.** `position: sticky` is constrained
 * by the element's containing block, which for a grid item is its grid AREA — so a rail placed in
 * row 1 only sticks until row 1 has scrolled past, which on this page is about a screen and a half.
 * It looked correct in a screenshot and failed the moment anybody scrolled. `row-span-2` with
 * `self-start` gives it an area the height of the whole article and a box the height of its own
 * content, which is the pair of facts stickiness needs.
 *
 * **The hero is `priority`, and it is the only image on the page that is.** It is the LCP candidate
 * on every article — unlike `/about`, where an editor can reorder the bands and "which picture is
 * first" is a question about the composition. Here the answer is fixed by the template.
 *
 * **A fragment, NOT a `<main>`.** `src/app/(frontend)/layout.tsx` already wraps every route in
 * `<main id="main">` — the landmark the skip link targets — so a second one here nests two `main`
 * elements and gives a screen reader two identical landmarks to choose between. Every route in this
 * app returns a fragment for the same reason.
 */
/**
 * The articles that are ready before the first visitor (007/T054).
 *
 * **`dynamicParams` is left at its default**, so an article published after the build still renders
 * on demand and is cached from then on. This list decides what is ready in advance, not what
 * exists — which is also why `prerenderable` can hand back nothing when the container image is
 * built with no database: the list empties, and every page takes the path a newly published article
 * already takes.
 *
 * Both halves would go stale on their own. `revalidateArticleOnChange` is the other half: a write in
 * the admin marks this article's path for regeneration, so the prerendered page and the on-demand
 * one are invalidated by the same signal.
 */
export async function generateStaticParams() {
  const slugs = await prerenderable('article pages', getArticleSlugs)
  return slugs.map((slug) => ({ slug }))
}

/**
 * Editor-controlled metadata, falling back to what the article itself says (007/T070, FR-043).
 *
 * Constitution V requires the owner rather than a developer to decide how this appears in a search
 * result, and requires a canonical URL. Every SEO field is optional, so the fallbacks are what an
 * owner who fills in nothing still gets — and they are computed from the article in the mapper,
 * which means they follow an edit instead of naming a field that has moved.
 *
 * This calls `getArticle()` a second time and pays nothing for it: the loader is `cache()`-wrapped,
 * so the render and the metadata share one read.
 *
 * `openGraph.type` is `article` rather than `website`, and it carries `publishedTime` — the one
 * place the two differ in a way a link preview actually shows.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const locale = await currentLocale()
  const { slug } = await params
  const article = await getArticle(slug, locale)
  if (!article) return {}

  const title = article.seo.title ?? article.fallbacks.title
  const description = article.seo.description ?? article.fallbacks.description
  const image = article.seo.image ?? article.fallbacks.image

  return {
    title,
    ...(description ? { description } : {}),
    // Canonical plus every language this page exists in, filtered to what is on offer.
    alternates: await localeAlternates(article.href, locale),
    openGraph: {
      type: 'article',
      title,
      ...(description ? { description } : {}),
      url: article.href,
      publishedTime: article.publishedOn,
      modifiedTime: article.updatedOn,
      ...(image
        ? {
            images: [
              {
                url: image.src,
                width: image.width,
                height: image.height,
                ...(image.alt ? { alt: image.alt } : {}),
              },
            ],
          }
        : {}),
    },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const t_blog = await getTranslations('blog')
  const locale = await currentLocale()
  const { slug } = await params
  const article = await getArticle(slug, locale)

  /*
    `null` covers three cases and answers all of them the same way: no such article, an article that
    exists only as a draft, and an article whose only version was unpublished. That indistinguishability
    is FR-037 — the access rule is what filters the draft, so this route never learns the difference
    and cannot leak it.
  */
  if (!article) notFound()

  return (
    <Container as="article" className="py-10 xl:py-12.5">
      <ArticleSchema article={article} />
      <div className="md:grid md:grid-cols-[1fr_13.75rem] md:gap-8 xl:grid-cols-[1fr_31.25rem] xl:gap-5">
        <div className="md:col-start-1 md:row-start-1">
          <ArticleHeader
            eyebrow={{ label: t_blog('ourBlog'), href: BLOG_ROOT }}
            title={article.title}
            standfirst={article.standfirst}
          />

          {article.hero ? (
            <Media
              media={article.hero}
              priority
              sizes="(min-width: 1280px) 75vw, 100vw"
              className="mt-8 h-60 w-full md:h-105 xl:h-125"
            />
          ) : null}
        </div>

        {/* Second in the DOM, beside the article from md up. On a phone it stays exactly here. */}
        <TableOfContents
          entries={article.contents}
          label={t_blog('onThisPage')}
          className="mt-8 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0 md:self-start"
        />

        <ArticleBody
          chapters={article.chapters}
          className="mt-12 md:col-start-1 md:row-start-2 xl:mt-15"
        />
      </div>
    </Container>
  )
}

/**
 * `schema.org/Article` and `BreadcrumbList` (007/T072, T073 — Constitution V).
 *
 * Constitution V names both by name for an article page. The shape follows
 * `src/app/(frontend)/products/[slug]/page.tsx` so the site emits structured data one way rather
 * than two.
 *
 * **The breadcrumb is emitted as data and is not drawn anywhere**, which is a real tension rather
 * than an oversight, and it is recorded here because this is where somebody will look for it. None
 * of the three article frames draws a breadcrumb trail; spec 006 set the precedent of not adding
 * elements nobody has approved, and the constitution requires the structured data. The hierarchy
 * itself is genuine — the header and the footer both expose the route from home to the blog to
 * here — so the data is true even though the trail is not painted. 007/research.md R13 flags it for
 * the designer: either draw the trail, or amend the constitution's list. Do not resolve it by
 * quietly deleting this.
 *
 * `dateModified` is Payload's own `updatedAt` rather than a field an editor maintains. An editor
 * asked to keep a "last updated" date honest will not, and a wrong one is worse than none.
 */
function ArticleSchema({ article }: { article: ArticleView }) {
  const document = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.standfirst,
      ...(article.hero ? { image: [article.hero.src] } : {}),
      datePublished: article.publishedOn,
      dateModified: article.updatedOn,
      ...(article.category ? { articleSection: article.category.title } : {}),
      mainEntityOfPage: { '@type': 'WebPage', '@id': article.href },
      publisher: { '@type': 'Organization', name: 'Aurum' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
        { '@type': 'ListItem', position: 2, name: 'Our Blog', item: BLOG_ROOT },
        { '@type': 'ListItem', position: 3, name: article.title, item: article.href },
      ],
    },
  ]

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(document) }}
    />
  )
}
