import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import { SECONDARY_LOCALES, type Locale } from '@/i18n/routing'
import { skipRevalidation } from '@/lib/revalidate'

import {
  ARTICLES,
  ARTICLE_CATEGORIES,
  ATTRIBUTES,
  BLOG_PAGE,
  CATEGORIES,
  COLLECTIONS,
  CONTACT_FORM,
  CONTACT_PAGE,
  FAQ_PAGE,
  HOME_PAGE,
  MEDIA,
  POLICIES,
  PRODUCTS,
  QUESTIONS,
  SHOP,
} from './seed-translations-data'

/**
 * Russian and Ukrainian for everything the English seeds create (spec 010, T110).
 *
 * **Run it after `pnpm seed` and `pnpm seed:policies`, never instead of them.** Those two write the
 * documents; this one writes the other two languages into documents that already exist. A document
 * it cannot find is reported and skipped rather than created, because a translation with nothing to
 * attach to is a sign the English seed did not run, and silently creating a half-document would hide
 * that.
 *
 * **Idempotent.** Every write is an update keyed by slug, so re-running overwrites the same fields
 * with the same words. It is safe to run against a database that is already translated, and safe to
 * run twice.
 *
 * **Every write passes `context: skipRevalidation`.** This runs under `payload run`, where there is
 * no request scope for `revalidatePath` to reach — it throws `Invariant: static generation store
 * missing` rather than doing nothing — and a dev server running alongside is a different process
 * whose cache this one could not invalidate anyway. The same rule every other seed script follows.
 *
 * **What it deliberately leaves in English**, so that a reviewer can see the fallback working on a
 * real page rather than only in a test: the article chapter bodies, the policy bodies (see
 * `seed-translations-data.ts` for why those are a special case), and the Story page's blocks. Those
 * are the long-form editorial that a real site spends months translating, and a seed that hid that
 * state would be lying about what the site looks like the week after this ships.
 */

/** Lexical's node shape, as Payload's generated type describes it. */
type Node = { [k: string]: unknown; type: string; version: number }

const paragraph = (text: string): Node => ({
  type: 'paragraph',
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  textFormat: 0,
  children: [{ type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 }],
})

/** `direction` is a literal union in the generated type, so it is narrowed rather than inferred. */
const richText = (...paragraphs: string[]) => ({
  root: {
    type: 'root' as const,
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: paragraphs.map(paragraph),
  },
})

/** What happened, counted rather than narrated — one line per collection instead of per document. */
type Tally = { missing: string[]; refused: string[]; written: number }

const tally = (): Tally => ({ missing: [], refused: [], written: 0 })

const report = (label: string, locale: Locale, counts: Tally): void => {
  const parts = [`${counts.written} written`]
  if (counts.missing.length > 0) parts.push(`${counts.missing.length} not found`)
  if (counts.refused.length > 0) parts.push(`${counts.refused.length} refused`)
  const mark = counts.refused.length > 0 ? '!' : counts.missing.length > 0 ? '–' : '✓'
  console.log(`  ${mark} ${locale}: ${label} — ${parts.join(', ')}`)
  for (const slug of counts.missing) console.log(`      not found: ${slug}`)
  for (const detail of counts.refused) console.log(`      refused: ${detail}`)
}

/**
 * Update one document per entry of a `{ key: { ru, uk } }` map, found by a field rather than an id.
 *
 * `field` is `slug` for almost everything; `media` has no slug and is found by `filename`, and
 * `questions` and `attributes` by the English text itself. Passing the lookup field in is what lets
 * one function serve all six collections.
 */
async function translateCollection(
  payload: Payload,
  collection: string,
  field: string,
  locale: Locale,
  entries: Record<string, Record<string, unknown>>,
  label: string,
): Promise<void> {
  const counts = tally()

  for (const [key, data] of Object.entries(entries)) {
    const { docs } = await payload.find({
      collection: collection as never,
      where: { [field]: { equals: key } },
      limit: 1,
      overrideAccess: true,
    })

    const doc = docs[0] as { id: number | string } | undefined
    if (!doc) {
      counts.missing.push(key)
      continue
    }

    try {
      await payload.update({
        collection: collection as never,
        id: doc.id,
        locale,
        data: data as never,
        context: skipRevalidation,
        overrideAccess: true,
      })
      counts.written += 1
    } catch (error) {
      const detail = (error as { data?: { errors?: { message?: string; path?: string }[] } }).data
      counts.refused.push(`${key} — ${JSON.stringify(detail?.errors ?? String(error))}`)
    }
  }

  report(label, locale, counts)
}

async function translateGlobal(
  payload: Payload,
  slug: string,
  locale: Locale,
  data: Record<string, unknown>,
  label: string,
): Promise<void> {
  const counts = tally()
  try {
    await payload.updateGlobal({
      slug: slug as never,
      locale,
      data: data as never,
      context: skipRevalidation,
      overrideAccess: true,
    })
    counts.written = 1
  } catch (error) {
    const detail = (error as { data?: { errors?: { message?: string; path?: string }[] } }).data
    counts.refused.push(`${slug} — ${JSON.stringify(detail?.errors ?? String(error))}`)
  }
  report(label, locale, counts)
}

/** `{ slug: { ru: {...}, uk: {...} } }` narrowed to one locale: `{ slug: {...} }`. */
const forLocale = <T extends Record<string, unknown>>(
  entries: Record<string, Record<'ru' | 'uk', T>>,
  locale: 'ru' | 'uk',
): Record<string, T> =>
  Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, value[locale]]))

async function seed(): Promise<void> {
  const payload = await getPayload({ config })

  console.log('Seeding Russian and Ukrainian content…\n')

  for (const locale of SECONDARY_LOCALES) {
    await translateCollection(payload, 'categories', 'slug', locale, forLocale(CATEGORIES, locale), 'categories')
    await translateCollection(payload, 'collections', 'slug', locale, forLocale(COLLECTIONS, locale), 'collections')
    await translateCollection(payload, 'article-categories', 'slug', locale, forLocale(ARTICLE_CATEGORIES, locale), 'article categories')
    await translateCollection(payload, 'attributes', 'name', locale, forLocale(ATTRIBUTES, locale), 'attributes')
    await translateCollection(payload, 'products', 'slug', locale, forLocale(PRODUCTS, locale), 'products')
    await translateCollection(payload, 'articles', 'slug', locale, forLocale(ARTICLES, locale), 'articles')

    // `media` is found by filename, and carries exactly one word-bearing field.
    await translateCollection(
      payload,
      'media',
      'filename',
      locale,
      Object.fromEntries(Object.entries(MEDIA).map(([file, alt]) => [file, { alt: alt[locale] }])),
      'photographs',
    )

    // The FAQ's answers are one paragraph each, wrapped here rather than in the data file.
    await translateCollection(
      payload,
      'questions',
      'question',
      locale,
      Object.fromEntries(
        Object.entries(QUESTIONS).map(([english, value]) => [
          english,
          { question: value[locale].question, answer: richText(value[locale].answer) },
        ]),
      ),
      'the FAQ',
    )

    /*
      **Titles and subtitles only — the bodies fall back, and that is the product decision.**

      The first version of this wrote a short paragraph saying "the translation is not ready yet".
      That is worse than the fallback in the one place it matters most: it REPLACES the legal text a
      visitor came to read with a note about its absence. A policy falling back to the authoritative
      English is a reader who can still read the terms; a placeholder is a reader who cannot.

      It is also what `tests/e2e/fallback.spec.ts` measures — `/legal/terms` must render the same
      number of blocks in all three languages — and that test was right to fail on the placeholder.
    */
    await translateCollection(payload, 'policies', 'slug', locale, forLocale(POLICIES, locale), 'policies')

    const shop = SHOP[locale]
    await translateGlobal(
      payload,
      'shop',
      locale,
      {
        detailsTitle: shop.detailsTitle,
        warrantyTitle: shop.warrantyTitle,
        deliveryTitle: shop.deliveryTitle,
        listingSubtitle: shop.listingSubtitle,
        warranty: richText(...(shop.warranty as string[])),
        delivery: richText(...(shop.delivery as string[])),
      },
      'shop settings',
    )

    const home = HOME_PAGE[locale]
    await translateGlobal(
      payload,
      'home-page',
      locale,
      {
        hero: {
          headline: home.heroHeadline,
          lede: home.heroLede,
          ctaLabel: home.heroCtaLabel,
        },
        categoriesHeading: home.categoriesHeading,
        featuredHeading: home.featuredHeading,
        featuredCtaLabel: home.featuredCtaLabel,
        about: {
          headingLead: home.aboutHeadingLead,
          headingEmphasis: home.aboutHeadingEmphasis,
          ctaLabel: home.aboutCtaLabel,
          // The array's ROWS are shared across locales; only the text inside them is localized.
          body: (home.aboutBody as string[]).map((text) => ({ text })),
        },
      },
      'the home page',
    )

    await translateGlobal(payload, 'blog-page', locale, BLOG_PAGE[locale], 'the blog page')
    await translateGlobal(payload, 'faq-page', locale, FAQ_PAGE[locale], 'the FAQ page')
    await translateGlobal(
      payload,
      'contact-page',
      locale,
      { ...CONTACT_PAGE[locale], form: CONTACT_FORM[locale] },
      'the contact page',
    )

    console.log('')
  }

  console.log(
    'Done. Article bodies, policy bodies and the Story page stay English on purpose — that is the\n' +
      'per-field fallback, and it is what a half-translated site actually looks like.',
  )
  process.exit(0)
}

await seed()
