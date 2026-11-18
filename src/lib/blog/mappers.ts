import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import { BCP47, type Locale } from '@/i18n/routing'
import { toCatalogImage } from '@/lib/catalog/mappers'
import type { CatalogImage } from '@/lib/catalog/types'
import type { StoryMedia } from '@/lib/story/types'
import type { Article, ArticleCategory, BlogPage } from '@/payload-types'

import { BLOG_PAGE_SIZE, articleHref, blogHref } from './blog-url'
import type {
  ArticleCard,
  ArticleView,
  BlogCategory,
  BlogIndexView,
  CardEmphasis,
  Chapter,
  ContentsEntry,
} from './types'

/**
 * Documents to view models for the blog (spec 007, T019 – T022).
 *
 * Four derivations live here, and each is here rather than in a component because each is a rule
 * the design implies and nothing stores:
 *
 * 1. **A chapter's ANCHOR** — its heading slugified, deduplicated within the article.
 * 2. **The CONTENTS list** — the chapters, and nothing else, above a minimum of two.
 * 3. **The mosaic's EMPHASIS** — a function of a card's index at each breakpoint.
 * 4. **The DATE** — formatted once, so a card, an article and a JSON-LD block cannot disagree.
 *
 * All four are pure functions over documents, which is what makes them testable without rendering
 * anything — the same treatment `src/lib/story/mappers.ts` gives the block composition rules.
 */

/** A relationship or upload field is an id until Payload resolves it at depth. */
const resolved = <T>(value: number | T | null | undefined): T | null =>
  value && typeof value === 'object' ? (value as T) : null

/** Trim to `undefined`, so "the editor left it empty" and "the editor typed spaces" agree. */
const text = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * The same rules `src/fields/slug.ts` applies to a title.
 *
 * Repeated rather than imported because that function is a Payload `beforeValidate` hook wrapped
 * around this arithmetic, and importing a field config into the read tier to reach eight lines
 * inside it would couple two things that share only a convention. If the convention ever changes,
 * both move together — which is what the shared test in `blog-mappers.test.ts` is for.
 */
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * One display string per date, made here rather than in a component.
 *
 * **Formatting in a component means formatting twice** — once on the server and again on the
 * client, against whatever locale the visitor's browser reports — which is the classic hydration
 * mismatch and shows up as a React error in production rather than as a visual bug. Doing it once
 * also means one format across every card, every article page and the structured data, which is
 * what FR-011 asks for.
 *
 * `August 08, 2026`, as drawn: a two-digit day, so a column of dates lines up.
 *
 * **One formatter per language, built once (spec 010, FR-039).** The tag was fixed at `en-US`, which
 * printed an English month name on a Russian article. It is now the requested language's — and
 * still explicit rather than the runtime default, for the reason the paragraph above gives: Node
 * takes its default from `LANG` and the browser from the user, so an implicit locale is a hydration
 * mismatch waiting for a server with different environment variables.
 */
const DATE_FORMATS = new Map<Locale, Intl.DateTimeFormat>()

const dateFormat = (locale: Locale): Intl.DateTimeFormat => {
  const existing = DATE_FORMATS.get(locale)
  if (existing) return existing

  const created = new Intl.DateTimeFormat(BCP47[locale], {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
  DATE_FORMATS.set(locale, created)
  return created
}

const publishedLabel = (iso: string, locale: Locale): string => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : dateFormat(locale).format(date)
}

/** A chapter's body, as stored. Derived rather than restated — Constitution I. */
type ChapterBody = NonNullable<Article['chapters']>[number]['body']

/** `undefined` where the field is empty, so a renderer can close the layout over it. */
const html = (value: ChapterBody | undefined): string | undefined => {
  if (!value) return undefined

  // The generated type describes the same document `SerializedEditorState` does, one field at a
  // time, and the two descriptions are not assignable to each other. The cast is the seam between
  // Payload's generated shape and lexical's own; it is not hiding an unknown.
  const output = convertLexicalToHTML({
    data: value as unknown as SerializedEditorState,
    disableContainer: true,
  }).trim()

  return output === '' ? undefined : output
}

/**
 * A media slot, or nothing.
 *
 * Identical in shape to the story page's, and for the identical reason: the STILL decides whether
 * the slot exists at all. For a photograph that is the photograph; for a video it is the poster,
 * which the field config requires. A slot with neither is a frame with nothing to put in it, and it
 * collapses rather than reserving blank space.
 */
const media = (slot: Article['hero'] | undefined): StoryMedia | undefined => {
  if (!slot) return undefined

  if (slot.kind === 'photo') {
    const image = toCatalogImage(slot.photo)
    return image ? { ...image, kind: 'photo' } : undefined
  }

  const poster = toCatalogImage(slot.poster)
  const video = resolved<{ url?: string | null }>(slot.video)
  if (!poster || !video?.url) return undefined

  return { ...poster, kind: 'video', videoSrc: video.url }
}

/**
 * A category, or nothing.
 *
 * **`undefined` is FR-041, not defensive typing.** A category can be deleted while published
 * articles still point at it; the requirement is that those articles stay published and lose their
 * badge rather than their page. An unresolved relationship — an id Payload could not join — reaches
 * here as a number and leaves as `undefined`.
 */
export const toBlogCategory = (
  value: number | ArticleCategory | null | undefined,
): BlogCategory | undefined => {
  const document = resolved<ArticleCategory>(value)
  if (!document) return undefined

  return {
    id: document.id,
    title: document.title,
    slug: document.slug,
    href: blogHref({ category: document.slug }),
  }
}

/**
 * Where a card sits in the drawn rhythm (FR-006 – FR-008).
 *
 * Read straight off the design, which draws the same arrangement regardless of what is in the
 * cells:
 *
 * ```
 * xl   [ wide ][ narrow ]      i % 7 === 0 or 6
 *      [ narrow ][ narrow ][ narrow ]
 *      [ narrow ][ wide ]
 *
 * md   [ lead, full width ]    i % 5 === 0
 *      [ narrow ][ narrow ]
 *      [ narrow ][ narrow ]
 * ```
 *
 * **Two flags, not one**, because the two rhythms disagree: card 5 leads the tablet grid and is
 * narrow on desktop. That disagreement is the whole reason this is computed rather than stored —
 * a `featured` checkbox on the article cannot be true at 1920 and false at 768 (007/research.md R4).
 *
 * A partial final row falls out for free. Spans are assigned left to right and always sum to a
 * whole number of rows, so any article count from one upward ends short rather than holed (FR-009).
 */
export const emphasisFor = (index: number): CardEmphasis => ({
  tabletLead: index % 5 === 0,
  desktopWide: index % 7 === 0 || index % 7 === 6,
})

export function toArticleCard(document: Article, index: number, locale: Locale): ArticleCard {
  const category = toBlogCategory(document.category)
  const image = media(document.hero)

  return {
    id: document.id,
    title: document.title,
    href: articleHref(document.slug),
    publishedOn: document.publishedOn,
    publishedLabel: publishedLabel(document.publishedOn, locale),
    ...(category ? { category } : {}),
    ...(image ? { media: image } : {}),
    emphasis: emphasisFor(index),
  }
}

/**
 * The chapters, each with an anchor that is unique within the article (FR-026).
 *
 * **Two chapters can legitimately share a heading** — "Summary" twice in a long article — and a
 * visitor choosing the second entry in the contents list must not land on the first. So a repeated
 * slug takes `-2`, `-3` in document order, which is the same convention a file system uses and the
 * one a reader is least surprised by.
 *
 * A heading that slugifies to nothing at all (punctuation only) falls back to its position, because
 * an empty `id` is not a jump target.
 *
 * **The trade-off, stated where somebody will find it**: renaming a heading changes its anchor, so
 * a previously shared deep link stops landing on that chapter. It still lands on the article. A
 * stored anchor would fix that and would introduce a field editors have to maintain by hand; for a
 * marketing blog the cheaper failure is the right one. 007/research.md R10 records what the other
 * choice would cost.
 */
export function toChapters(rows: Article['chapters']): Chapter[] {
  const seen = new Map<string, number>()

  return (rows ?? []).flatMap((row, index) => {
    const heading = text(row.heading)
    const bodyHtml = html(row.body)
    // A chapter with no heading or no body is an unfinished edit rather than a section. Both are
    // required at field level, so reaching this means the document predates that rule.
    if (!heading || !bodyHtml) return []

    const base = slugify(heading) || `chapter-${index + 1}`
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)

    return [
      {
        anchor: count === 1 ? base : `${base}-${count}`,
        heading,
        ...(text(row.lede) ? { lede: text(row.lede) } : {}),
        bodyHtml,
        ...(text(row.pullQuote) ? { pullQuote: text(row.pullQuote) } : {}),
      },
    ]
  })
}

/**
 * The contents list, generated from the chapters and never authored beside them (FR-027).
 *
 * The design draws ten entries against four chapters, with four labels that are not the headings
 * they point at — read as a drafting placeholder rather than as a second data source (007 spec,
 * design inconsistency 2). `tocLabel` is what absorbs the real version of that problem: a heading
 * too long for the rail gets a short form, and the rail and the chapter still cannot drift apart.
 *
 * **Empty below two chapters** (FR-028). A contents list of one entry is a control that points at
 * the thing already on screen.
 */
export function toContents(chapters: Chapter[], rows: Article['chapters']): ContentsEntry[] {
  if (chapters.length < 2) return []

  const labels = new Map<string, string>()
  for (const [index, chapter] of chapters.entries()) {
    const label = text(rows?.[index]?.tocLabel)
    if (label) labels.set(chapter.anchor, label)
  }

  return chapters.map((chapter) => ({
    anchor: chapter.anchor,
    label: labels.get(chapter.anchor) ?? chapter.heading,
  }))
}

const seoOf = (seo: Article['seo'] | BlogPage['seo']) => ({
  ...(text(seo?.title) ? { title: text(seo?.title) } : {}),
  ...(text(seo?.description) ? { description: text(seo?.description) } : {}),
  ...(toCatalogImage(seo?.image) ? { image: toCatalogImage(seo?.image) as CatalogImage } : {}),
})

export function toArticleView(document: Article, locale: Locale): ArticleView {
  const chapters = toChapters(document.chapters)
  const hero = media(document.hero)
  const category = toBlogCategory(document.category)

  return {
    id: document.id,
    title: document.title,
    href: articleHref(document.slug),
    standfirst: document.standfirst,
    publishedOn: document.publishedOn,
    publishedLabel: publishedLabel(document.publishedOn, locale),
    updatedOn: document.updatedAt,
    ...(category ? { category } : {}),
    ...(hero ? { hero } : {}),
    chapters,
    contents: toContents(chapters, document.chapters),
    seo: seoOf(document.seo),
    /*
      What the page would say about itself with no overrides (FR-043). Computed from the article
      rather than hardcoded in the route, so it follows an edit instead of naming a field that has
      moved. The hero doubles as the social image — for a video slot that is its poster, which is
      the only frame of it a link preview could show anyway.
    */
    fallbacks: {
      title: document.title,
      description: document.standfirst,
      ...(hero
        ? {
            image: {
              src: hero.src,
              width: hero.width,
              height: hero.height,
              ...(hero.alt ? { alt: hero.alt } : {}),
            },
          }
        : {}),
    },
  }
}

export function toBlogCategories(documents: ArticleCategory[]): BlogCategory[] {
  return documents.flatMap((document) => {
    const category = toBlogCategory(document)
    return category ? [category] : []
  })
}

export interface BlogIndexInput {
  /** The language the cards' dates are written in (spec 010, FR-039). */
  locale: Locale

  page: BlogPage
  categories: ArticleCategory[]
  articles: Article[]
  /** Matching the narrowing, before paging. */
  total: number
  activeCategory?: string
}

export function toBlogIndex({
  page,
  categories,
  articles,
  total,
  activeCategory,
  locale,
}: BlogIndexInput): BlogIndexView {
  const cards = articles.map((article, index) => toArticleCard(article, index, locale))
  const seo = seoOf(page.seo)

  return {
    ...(text(page.eyebrow) ? { eyebrow: text(page.eyebrow) } : {}),
    heading: page.heading,
    empty: { title: page.emptyTitle, description: page.emptyDescription },
    categories: toBlogCategories(categories),
    ...(activeCategory ? { activeCategory } : {}),
    cards,
    shown: cards.length,
    total,
    /*
      `null` the moment everything is on screen, so `LoadMore` draws its count and no control.

      The next page is computed from what was SHOWN rather than from the page that was asked for: a
      `?page=99` on a blog of nine articles is clamped by the query, and building the next address
      from the unclamped number would offer 100 after 99.
    */
    moreHref:
      cards.length < total
        ? blogHref({
            category: activeCategory,
            page: Math.floor(cards.length / BLOG_PAGE_SIZE) + 1,
          })
        : null,
    seo,
    /*
      The index has one thing to say about itself and it is the heading. No description fallback and
      no image: nothing on this page is the page's own, and a link preview built from the first
      article's photograph would misrepresent the blog as that article.
    */
    fallbacks: { title: page.heading },
  }
}
