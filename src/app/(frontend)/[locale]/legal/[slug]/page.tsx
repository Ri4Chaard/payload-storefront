import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import React from 'react'

import { localeAlternates } from '@/lib/i18n/alternates'
import { currentLocale } from '@/i18n/locale'
import { PageHeaderBlock } from '@/components/blocks/page-header'
import { Container, EmptyState, RichText } from '@/components/ui'
import { policyHref } from '@/lib/policies/policy-url'
import { getPolicyBySlug } from '@/lib/policies/queries'

/**
 * A policy page — `/legal/privacy`, `/legal/terms`, `/legal/cookies`, `/legal/shipping`, and
 * whatever else the owner creates (spec 009, T018, T019; contract `policy-route.md`).
 *
 * **This route closes the last four dead links on the site.** The footer has carried all four
 * destinations since spec 001 and every one of them was a 404 in production. Spec 008 claimed it had
 * made every link on this site resolve; that was true of the chrome above the footer's bottom rail
 * and false of the rail itself.
 *
 * **Under a prefix, and the prefix is the whole routing decision** (009/research.md R1). Next
 * permits one dynamic segment per path position, and the site's root one belongs to
 * `(shop)/[category]` — which matches `/category-1` and answers the 404 for every unrecognised single
 * segment. Serving policies at bare root addresses would have meant replacing that route with a
 * resolver trying category first and policy second, re-routing the catalogue as a side effect of
 * shipping legal pages. The prefix costs four `href`s in the footer and nothing else; nothing under
 * `src/app/(frontend)/(shop)/` is touched by this feature.
 *
 * **Nothing here is a new component.** The band above is the page header from spec 006, the prose is
 * the kit's `RichText`, and the empty branch is the kit's `EmptyState`. They are composed directly
 * in the route rather than wrapped in a `PolicyPage` component, exactly as
 * `src/app/(frontend)/faq/page.tsx` composes its own — a single-consumer wrapper holding no logic is
 * what Constitution II argues against.
 *
 * **Rendered per request.** The reason `/`, `/about`, `/blog`, `/contact` and `/faq` all record: the
 * production image is built with no database, so a prerendered page would bake empty on a first
 * deploy and stay that way until somebody happened to edit something. Two things follow and both are
 * wanted — publishing is visible to the very next visitor with no revalidation at all (FR-056), and
 * there is no hook here to reach for the shared `invalidate()`, which walks every product slug and
 * would evict the entire catalogue because somebody fixed a typo in a paragraph.
 */
export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = await currentLocale()
  const { slug } = await params
  const policy = await getPolicyBySlug(slug, locale)

  // No database — a container build. Emit nothing rather than throwing; the first real request
  // replaces it. `/faq` takes the same precaution for the same reason.
  if (!policy) return {}

  const title = policy.seo.title ?? policy.title
  const description = policy.seo.description
  const href = policyHref(policy.slug)

  return {
    title,
    ...(description ? { description } : {}),
    // Canonical plus every language this page exists in, filtered to what is on offer.
    alternates: await localeAlternates(href, locale),
    openGraph: {
      type: 'website',
      title,
      ...(description ? { description } : {}),
      url: href,
      ...(policy.seo.image
        ? {
            images: [
              {
                url: policy.seo.image.src,
                width: policy.seo.image.width,
                height: policy.seo.image.height,
                ...(policy.seo.image.alt ? { alt: policy.seo.image.alt } : {}),
              },
            ],
          }
        : {}),
    },
  }
}

/*
 * There is deliberately no structured data here.
 *
 * `/faq` emits `schema.org/FAQPage` because the page is nothing but an FAQ, and the claim is
 * therefore honest. There is no schema.org type that describes a privacy policy or a returns policy
 * usefully, and marking one up as something it is not would be a claim to a crawler that the page
 * does not support.
 */

export default async function PolicyPage({ params }: Params) {
  const locale = await currentLocale()
  const t_legal = await getTranslations('legal')
  const { slug } = await params
  const policy = await getPolicyBySlug(slug, locale)

  if (!policy) notFound()

  return (
    <>
      <PageHeaderBlock headingLevel={1} heading={policy.title} body={policy.subtitle} />

      {policy.bodyHtml ? (
        <Container as="section" className="pb-15 xl:pb-25">
          {/*
            Capped and centred on the same terms as the header above it. The drawn measure is a
            single column inside a much wider band — legal prose set full-bleed across 1720px is a
            wall of text nobody finishes, and the four frames all cap it.
          */}
          <RichText html={policy.bodyHtml} className="mx-auto max-w-4xl" />
        </Container>
      ) : (
        /*
          A published policy with nothing written in it yet renders its title and this, never a 404
          (FR-006). The site links to these pages from every page it serves, and answering a link the
          site itself publishes with "not found" is worse than a thin page. `/faq` and `/blog` both
          reached the same conclusion.

          An unpublished policy is a different case and does 404 above — correct, and consistent:
          FR-015c removes its footer link at the same moment, so nothing points at it.
        */
        <EmptyState
          title={t_legal('nothingHereYet')}
          description={t_legal('beingWritten')}
          action={{ href: '/contact', label: t_legal('contactUs') }}
        />
      )}
    </>
  )
}
