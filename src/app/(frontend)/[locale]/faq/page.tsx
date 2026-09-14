import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import React from 'react'

import { localeAlternates } from '@/lib/i18n/alternates'
import { currentLocale } from '@/i18n/locale'
import { PageHeaderBlock } from '@/components/blocks/page-header'
import { Container, EmptyState, QuestionList } from '@/components/ui'
import { getAllPublishedQuestions, getFaqPage } from '@/lib/questions/queries'
import type { Question } from '@/lib/questions/types'

/**
 * The FAQ page (008/T070 – T072), from Figma section `266:4856`.
 *
 * **This route closes the last dead link in the site chrome.** The footer has carried
 * *FAQ → /faq* under CUSTOMER CARE since spec 001, and until now it was a 404 in production. With
 * it, every navigation item, footer link and call to action on this site resolves (SC-001).
 *
 * **One band over the chrome, and that is the whole page.** It is this small because
 * `src/collections/questions.ts` was written in spec 006 to carry this page's content before the
 * page existed — its own comment says the collection is separate precisely so "a standalone `/faq`
 * page reads the same rows" with nothing to re-type.
 *
 * **Rendered per request**, for the reason `/`, `/about`, `/blog` and `/contact` all record: the
 * production image is built with no database, so a prerendered page would bake empty on a first
 * deploy and stay that way until somebody happened to edit something. Nothing is cached, so
 * publishing a question is visible to the next visitor with no invalidation at all (FR-044).
 */
export const dynamic = 'force-dynamic'

/** The address this page is canonically at. One constant, used by the tag and the JSON-LD alike. */
const HREF = '/faq'

export async function generateMetadata(): Promise<Metadata> {
  const t_meta = await getTranslations('meta')
  const locale = await currentLocale()
  const page = await getFaqPage(locale)

  // No database — a container build. Emit the bare title rather than nothing; the first real
  // request replaces it.
  if (!page) return { title: t_meta('faq') }

  const title = page.seo.title ?? page.fallbacks.title
  const description = page.seo.description

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
      ...(page.seo.image
        ? {
            images: [
              {
                url: page.seo.image.src,
                width: page.seo.image.width,
                height: page.seo.image.height,
                ...(page.seo.image.alt ? { alt: page.seo.image.alt } : {}),
              },
            ],
          }
        : {}),
    },
  }
}

/**
 * `schema.org/FAQPage` (FR-052).
 *
 * **Built from the view models, never from documents**, so it cannot disagree with what is drawn
 * and cannot leak a draft — the rows here are the rows rendered below.
 *
 * **`/contact` deliberately does not emit this.** Its questions are an editor-chosen subset in the
 * page's fourth band, and marking that page as an FAQ would overstate what it is. This page is
 * nothing else, so the claim is honest.
 *
 * The answer is sent as HTML because that is what it is — `acceptedAnswer.text` permits markup, and
 * stripping it would hand a crawler a different answer to the one a visitor reads.
 */
function faqStructuredData(questions: Question[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((question) => ({
      '@type': 'Question',
      name: question.question,
      acceptedAnswer: { '@type': 'Answer', text: question.answerHtml },
    })),
  }
}

export default async function FaqPage() {
  const locale = await currentLocale()
  const [page, questions] = await Promise.all([
    getFaqPage(locale),
    getAllPublishedQuestions(locale),
  ])

  /*
    `null` means the database was unreachable — a container build, and nothing else. The chrome
    renders and nothing sits between it. Not a 404: every page on this site links here, and
    answering a link the site itself publishes with "not found" is worse than a thin page.
  */
  if (!page) return null

  /*
    A fragment, NOT a `<main>`. `src/app/(frontend)/layout.tsx` already wraps every route in
    `<main id="main">` — the landmark the skip link targets — so a second one nests two `main`
    elements and gives a screen reader two identical landmarks to choose between.
  */
  return (
    <>
      {questions.length > 0 ? (
        <script
          type="application/ld+json"
          // The payload is built from our own view models, not from anything a visitor supplied.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData(questions)) }}
        />
      ) : null}

      <PageHeaderBlock heading={page.heading} headingLevel={1} />

      {questions.length === 0 ? (
        /*
          FR-039. A heading and a plain message, and a 200 rather than a 404 — the case
          `EmptyState` was given an optional action for: there is nowhere useful to send a visitor
          when a shop has published no answers yet, and a button admitting that would be worse than
          none. `/blog` reached the same conclusion for the same reason.
        */
        <EmptyState title={page.empty.title} description={page.empty.description} />
      ) : (
        <Container as="section" className="pb-10 xl:pb-12.5">
          {/*
            Centred at 850 inside a 1720 band, as drawn — `max-w-212.5`. The same measure the
            centred FAQ band on `/contact` uses, and for the same reason: a column of sentences set
            full-bleed is a wall.
          */}
          <div className="mx-auto w-full max-w-212.5">
            <QuestionList
              questions={questions}
              headingLevel={2}
              /*
                The drawing shows the first question open at every width. It is the page's only
                content, so opening it is what tells a visitor these rows expand at all.
              */
              defaultOpen={questions[0] ? [questions[0].id] : []}
            />
          </div>
        </Container>
      )}
    </>
  )
}
