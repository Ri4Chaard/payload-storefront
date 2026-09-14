import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import React from 'react'

import { localeAlternates } from '@/lib/i18n/alternates'
import { currentLocale } from '@/i18n/locale'
import { BlockRenderer } from '@/components/blocks'
import { getStoryPage } from '@/lib/story/queries'

/**
 * The Our Story page (006/T035), from Figma section `220:699`.
 *
 * **This route closes three dead links.** The header's "About us", the footer's "Our Story" and the
 * home page's "Discover our story" have all pointed at `/about` since spec 001, and until now it
 * was a 404 in production.
 *
 * **Rendered per request, deliberately — and it is the same trade the home page made.** A page with
 * no dynamic segment is prerendered at build if Next can, and the production image is built with no
 * database: `src/lib/catalog/prerender.ts` records the whole chicken-and-egg. A prerendered `/about`
 * would therefore bake empty on a first deploy and stay that way until somebody happened to edit
 * something in the admin. An empty page that never heals is worse than two small queries, and
 * `src/app/(frontend)/page.tsx` reached the same conclusion for the same reason.
 *
 * The two queries are the whole cost — one global and its questions, both deduplicated within a
 * render by `cache()`, both from a database in the same process. The photographs are what a visitor
 * actually waits for, and they are unaffected.
 *
 * **It also removes a staleness bug rather than solving one.** `src/lib/revalidate.ts` invalidates
 * by walking every product slug, so hooking the story page into it would evict the entire catalogue
 * because somebody fixed a typo in a paragraph. Nothing is cached here, so a publish is visible to
 * the next visitor with no invalidation at all (FR-016, FR-041).
 */
export const dynamic = 'force-dynamic'

/** The address this page is canonically at. One constant, used by the tag and the preview alike. */
const HREF = '/about'

/**
 * Editor-controlled metadata, falling back to what the page itself says (FR-039, FR-040).
 *
 * Constitution V requires the owner rather than a developer to decide how this appears in a search
 * result, and requires a canonical URL. Every SEO field is optional, so the fallbacks are what an
 * owner who fills in nothing still gets — and they are computed from the composed page, which means
 * they follow a reorder instead of naming a band that has moved or gone.
 *
 * This calls `getStoryPage(locale)` a second time and pays nothing for it: the loader is `cache()`-wrapped,
 * so the render and the metadata share one read.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t_meta = await getTranslations('meta')
  const locale = await currentLocale()
  const page = await getStoryPage(locale)

  // No database — a container build. Emit the bare title rather than nothing; the first real
  // request replaces it.
  if (!page) return { title: t_meta('ourStory') }

  const title = page.seo.title ?? page.fallbacks.title ?? t_meta('ourStory')
  const description = page.seo.description ?? page.fallbacks.description
  const image = page.seo.image ?? page.fallbacks.image

  return {
    title,
    ...(description ? { description } : {}),
    // Canonical plus every language this page exists in, filtered to what is on offer.
    alternates: await localeAlternates(HREF, locale),
    openGraph: {
      type: 'website',
      title,
      ...(description ? { description } : {}),
      url: HREF,
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

export default async function AboutPage() {
  const locale = await currentLocale()
  const page = await getStoryPage(locale)

  /*
    `null` means the database was unreachable — a container build, and nothing else. An empty
    composition means the owner has not written the page yet. Both render the chrome and nothing
    between (FR-053), and neither is a 404: three places on this site link here, and answering a
    link the site itself publishes with "not found" is worse than a thin page.
  */
  /*
    A fragment, NOT a `<main>`. `src/app/(frontend)/layout.tsx` already wraps every route in
    `<main id="main">` — the landmark the skip link targets — so a second one here nests two `main`
    elements, which is invalid HTML and gives the page two identical landmarks for a screen reader
    to choose between. Every other route in this app returns a fragment for the same reason.
  */
  return <>{page ? <BlockRenderer blocks={page.blocks} /> : null}</>
}
