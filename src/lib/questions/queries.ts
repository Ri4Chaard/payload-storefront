import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import { DEFAULT_LOCALE, type Locale } from '@/i18n/routing'
import { toCatalogImage } from '@/lib/catalog/mappers'
import { isDatabaseUnreachable } from '@/lib/catalog/prerender'
import type { FaqPage as FaqPageDocument } from '@/payload-types'

import { toQuestion } from './mappers'
import type { FaqPage, Question } from './types'

/**
 * Reading the questions, and the page that is nothing but them.
 *
 * **There is no `getSelectedQuestions` here, and that is a correction rather than an omission.**
 * The plan assumed `/about` loaded its chosen questions through a query it could share. It does
 * not: the `faq` block holds a relationship, and `src/lib/story/queries.ts` resolves it with
 * `depth: 2` on the single global read — as `src/lib/contact/queries.ts` now does for `/contact`.
 * A loader taking ids would be a **second round trip fetching rows Payload has already returned**.
 *
 * So the split is mapper-versus-loader, not two loaders: pages that pick their own questions share
 * `./mappers.ts`, and only `/faq` — which shows every published one — needs a query of its own.
 */

const client = cache(async () => getPayload({ config }))

/**
 * Every published question, in the collection's own order.
 *
 * **`order` ascending is the field spec 006 reserved for this page.** Its admin description has
 * read "Lowest first, in this list and on the FAQ page. A page that picks its own questions uses
 * its own order instead" since before this page existed, and these two loaders are that sentence
 * made executable.
 *
 * **No status filter, deliberately.** `adminOrPublishedStatus` on the collection makes a draft
 * unreachable rather than filtered, so a second check here would put the publication rule
 * in two places — and the one nobody looks at is where it drifts.
 *
 * `limit: 0` — every question, not a page of them. The shop has tens of these at most, and a page
 * that silently truncated its own FAQ would be worse than a slow one. If that ever stops being
 * true, this is the line to revisit rather than a `LoadMore` somebody bolts on.
 */
export const getAllPublishedQuestions = cache(async (locale: Locale): Promise<Question[]> => {
  try {
    const payload = await client()
    const found = await payload.find({
      locale,
      fallbackLocale: DEFAULT_LOCALE,
      collection: 'questions',
      sort: 'order',
      limit: 0,
      depth: 0,
      overrideAccess: false,
      draft: false,
    })

    return found.docs.flatMap((document) => {
      const question = toQuestion(document)
      return question ? [question] : []
    })
  } catch (error) {
    if (!isDatabaseUnreachable(error)) throw error

    console.warn(
      '  ⚠ No database at build time — /faq renders empty. This is expected when building the ' +
        'container image; the first request reads the real questions.',
    )
    return []
  }
})

const text = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * The FAQ page's own copy.
 *
 * **Here rather than in a tier of its own**, because the FAQ page *is* the questions — a separate
 * module for a heading and an empty message would be ceremony around four fields.
 *
 * Tolerates a build with no database for the reason `src/lib/catalog/prerender.ts` records at
 * length: the production image runs `next build` before the migrations, so nothing is reachable.
 */
export const getFaqPage = cache(async (locale: Locale): Promise<FaqPage | null> => {
  try {
    const payload = await client()
    const document: FaqPageDocument = await payload.findGlobal({
      locale,
      fallbackLocale: DEFAULT_LOCALE,
      slug: 'faq-page',
      depth: 1,
      overrideAccess: false,
      draft: false,
    })

    const heading = text(document.heading) ?? 'Frequently Asked Questions'
    const image = toCatalogImage(document.seo?.image)

    return {
      heading,
      empty: {
        title: text(document.emptyTitle) ?? 'Nothing here yet',
        description:
          text(document.emptyDescription) ??
          'We’re writing the answers to the questions we’re asked most. In the meantime, our team is a message away.',
      },
      seo: {
        ...(text(document.seo?.title) ? { title: text(document.seo?.title)! } : {}),
        ...(text(document.seo?.description)
          ? { description: text(document.seo?.description)! }
          : {}),
        ...(image ? { image } : {}),
      },
      // The page has one heading and no prose of its own, so that heading is the only honest
      // fallback title. There is deliberately no description fallback: inventing one out of the
      // first answer would describe a question rather than the page.
      fallbacks: { title: heading },
    }
  } catch (error) {
    if (!isDatabaseUnreachable(error)) throw error
    return null
  }
})
