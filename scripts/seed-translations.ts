import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import { SECONDARY_LOCALES, type Locale } from '@/i18n/routing'
import { skipRevalidation } from '@/lib/revalidate'

import {
  ARTICLES,
  ARTICLE_CATEGORIES,
  ATTRIBUTES,
  COLOURS,
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
  TEXT,
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
 * **Long-form text is translated by its English wording.** Story-page bands, article chapters,
 * product details and attributes, and policy bodies sit in arrays, blocks and rich text whose rows
 * have no slug. For those the English document is read, every string found in `TEXT` is swapped for
 * its translation, and the result is written back in the other language — row ids included, because
 * an array's rows are shared across languages and a row written without its id is a NEW row, which
 * would take the English words with the old one. An English string with no translation is reported
 * and left as it is, which is the per-field fallback doing its job.
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
type Tally = { missing: string[]; refused: string[]; untranslated: Set<string>; written: number }

const tally = (): Tally => ({ missing: [], refused: [], untranslated: new Set(), written: 0 })

/** The keys under which a string is words a reader sees, rather than a value, a key or a URL. */
const WORDS = new Set([
  'body',
  'caption',
  'eyebrow',
  'heading',
  'label',
  'lede',
  'pullQuote',
  'text',
  'title',
  'tocLabel',
  'value',
  'word',
])

/**
 * A copy of `value` with every string that `TEXT` knows replaced by its `locale` twin. Everything
 * else — ids, relationship ids, block types, Lexical's own bookkeeping — is copied as it is, so the
 * structure written back is exactly the structure read.
 */
function translateDeep(value: unknown, locale: 'ru' | 'uk', counts: Tally, key = ''): unknown {
  if (typeof value === 'string') {
    const pair = TEXT[value]
    if (pair) return pair[locale]
    if (WORDS.has(key) && value.trim() !== '') counts.untranslated.add(value)
    return value
  }
  if (Array.isArray(value)) return value.map((item) => translateDeep(item, locale, counts, key))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, translateDeep(v, locale, counts, k)]),
    )
  }
  return value
}

const report = (label: string, locale: Locale, counts: Tally): void => {
  const parts = [`${counts.written} written`]
  if (counts.missing.length > 0) parts.push(`${counts.missing.length} not found`)
  if (counts.refused.length > 0) parts.push(`${counts.refused.length} refused`)
  if (counts.untranslated.size > 0) parts.push(`${counts.untranslated.size} strings left in English`)
  const mark =
    counts.refused.length > 0
      ? '!'
      : counts.missing.length > 0 || counts.untranslated.size > 0
        ? '–'
        : '✓'
  console.log(`  ${mark} ${locale}: ${label} — ${parts.join(', ')}`)
  for (const slug of counts.missing) console.log(`      not found: ${slug}`)
  for (const detail of counts.refused) console.log(`      refused: ${detail}`)
  for (const text of counts.untranslated) console.log(`      no translation: ${JSON.stringify(text)}`)
}

/**
 * Update one document per entry of a `{ key: { ru, uk } }` map, found by a field rather than an id.
 *
 * `field` is `slug` for almost everything; `media` has no slug and is found by `filename`, and
 * `questions` and `attributes` by the English text itself. Passing the lookup field in is what lets
 * one function serve all six collections.
 *
 * `deep` names fields copied from the English document through `translateDeep` — the arrays, blocks
 * and rich text that have no key of their own to translate by.
 */
async function translateCollection(
  payload: Payload,
  collection: string,
  field: string,
  locale: Locale,
  entries: Record<string, Record<string, unknown>>,
  label: string,
  deep: string[] = [],
): Promise<void> {
  const counts = tally()

  for (const [key, data] of Object.entries(entries)) {
    const { docs } = await payload.find({
      collection: collection as never,
      where: { [field]: { equals: key } },
      limit: 1,
      overrideAccess: true,
    })

    const doc = docs[0] as ({ id: number | string } & Record<string, unknown>) | undefined
    if (!doc) {
      counts.missing.push(key)
      continue
    }

    const translated: Record<string, unknown> = { ...data }
    if (deep.length > 0) {
      // Read in English, at depth 0, so relationships come back as the ids they are written as.
      const english = (await payload.findByID({
        collection: collection as never,
        id: doc.id,
        locale: 'en',
        depth: 0,
        draft: true,
        overrideAccess: true,
      })) as unknown as Record<string, unknown>
      for (const name of deep) {
        if (english[name] != null && locale !== 'en') {
          translated[name] = translateDeep(english[name], locale, counts, name)
        }
      }
    }

    try {
      await payload.update({
        collection: collection as never,
        id: doc.id,
        locale,
        data: translated as never,
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
  counts: Tally = tally(),
): Promise<void> {
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
    await translateCollection(payload, 'colours', 'value', locale, forLocale(COLOURS, locale), 'colours')
    await translateCollection(payload, 'products', 'slug', locale, forLocale(PRODUCTS, locale), 'products', ['details', 'attributes'])
    await translateCollection(payload, 'articles', 'slug', locale, forLocale(ARTICLES, locale), 'articles', ['chapters'])

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
      Titles and subtitles by slug; the bodies through `TEXT`, keeping every heading, paragraph and
      list item where it is — `tests/e2e/fallback.spec.ts` measures that `/legal/terms` is built from
      the same number of blocks in all three languages.
    */
    await translateCollection(payload, 'policies', 'slug', locale, forLocale(POLICIES, locale), 'policies', ['body'])

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
    const englishHome = await payload.findGlobal({
      slug: 'home-page',
      locale: 'en',
      depth: 0,
      overrideAccess: true,
    })
    const aboutBody = home.aboutBody as string[]
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
          // The array's ROWS are shared across locales; only the text inside them is localized. So
          // the English rows are written back with their ids — a row without one is a new row, and
          // the English words would go with the old.
          body: (englishHome.about?.body ?? []).map((row, index) => ({
            ...row,
            text: aboutBody[index] ?? row.text,
          })),
        },
      },
      'the home page',
    )

    await translateGlobal(payload, 'blog-page', locale, BLOG_PAGE[locale], 'the blog page')
    await translateGlobal(payload, 'faq-page', locale, FAQ_PAGE[locale], 'the FAQ page')
    const { faqHeading, ...contact } = CONTACT_PAGE[locale]
    await translateGlobal(
      payload,
      'contact-page',
      locale,
      { ...contact, form: CONTACT_FORM[locale], faq: { heading: faqHeading } },
      'the contact page',
    )

    // The Story page's bands: read in English, every known string swapped, written back whole.
    const story = await payload.findGlobal({
      slug: 'story-page',
      locale: 'en',
      depth: 0,
      overrideAccess: true,
    })
    const storyCounts = tally()
    const storyBody = translateDeep(story.body, locale, storyCounts, 'body')
    await translateGlobal(
      payload,
      'story-page',
      locale,
      { body: storyBody, _status: 'published' },
      'the story page',
      storyCounts,
    )

    console.log('')
  }

  console.log('Done.')
  process.exit(0)
}

await seed()
