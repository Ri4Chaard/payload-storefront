import { describe, expect, it } from 'vitest'

import { emphasisFor, toArticleCard, toArticleView } from '@/lib/blog/mappers'
import { BLOG_PAGE_SIZE, blogHref, parseCategory, parsePage } from '@/lib/blog/blog-url'
import type { Article } from '@/payload-types'

/**
 * The blog's mapper (007/T034, T047, T076).
 *
 * Four derivations live in `src/lib/blog/mappers.ts`, and each one exists because the alternative
 * was to store something an editor would then have to maintain by hand:
 *
 *   - a chapter's ANCHOR, which is its heading slugified and deduplicated per article;
 *   - the CONTENTS list, which is the chapters and nothing else;
 *   - the mosaic's EMPHASIS, which is a function of a card's index and of nothing stored;
 *   - the DATE, formatted once so a card, an article and a JSON-LD block cannot disagree.
 *
 * All four are pure functions over documents, so they are pinned down here without rendering
 * anything — the same treatment `story-mappers.test.ts` gives the block composition rules.
 */

type Chapters = NonNullable<Article['chapters']>
type ChapterInput = Partial<Chapters[number]> & { heading: string }

/** Lexical's document shape, one paragraph. Matches the seed script's helper. */
const body = (text: string) =>
  ({
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: [
        {
          type: 'paragraph',
          format: '' as const,
          indent: 0,
          version: 1,
          direction: 'ltr' as const,
          textFormat: 0,
          children: [
            { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 },
          ],
        },
      ],
    },
  }) as unknown as Chapters[number]['body']

const chapter = (input: ChapterInput): Chapters[number] =>
  ({
    heading: input.heading,
    body: input.body ?? body(`The body of ${input.heading}.`),
    ...(input.tocLabel ? { tocLabel: input.tocLabel } : {}),
    ...(input.lede ? { lede: input.lede } : {}),
    ...(input.pullQuote ? { pullQuote: input.pullQuote } : {}),
  }) as Chapters[number]

/**
 * A published article, with only what a test cares about filled in.
 *
 * The cast is the seam between the generated document type and a fixture: a real document carries
 * `createdAt`, `_status` and a resolved relationship, none of which any assertion below reads.
 */
const article = (overrides: Partial<Article> = {}): Article =>
  ({
    id: 1,
    title: 'How to Choose the Perfect Diamond',
    slug: 'how-to-choose-the-perfect-diamond',
    standfirst: 'What defines an exceptional stone.',
    category: 7,
    publishedOn: '2026-08-08T00:00:00.000Z',
    updatedAt: '2026-09-01T09:00:00.000Z',
    createdAt: '2026-08-01T09:00:00.000Z',
    hero: { kind: 'photo' },
    ...overrides,
  }) as Article

describe('anchors', () => {
  it('slugifies a heading the same way a slug field would', () => {
    const view = toArticleView(
      article({
        chapters: [
          chapter({ heading: 'Cut: Where Brilliance Begins' }),
          chapter({ heading: 'Colour' }),
        ],
      }),
      'en',
    )

    expect(view.chapters[0]?.anchor).toBe('cut-where-brilliance-begins')
  })

  /**
   * Two chapters can legitimately share a heading — "Summary" twice in a long piece — and a visitor
   * choosing the second entry in the contents list must not land on the first. This is FR-026, and
   * it is the assertion the whole dedupe pass exists for.
   */
  it('gives two chapters with the same heading distinct anchors', () => {
    const view = toArticleView(
      article({
        chapters: [
          chapter({ heading: 'Summary' }),
          chapter({ heading: 'The middle' }),
          chapter({ heading: 'Summary' }),
        ],
      }),
      'en',
    )

    expect(view.chapters.map((entry) => entry.anchor)).toEqual([
      'summary',
      'the-middle',
      'summary-2',
    ])
    expect(view.contents.map((entry) => entry.anchor)).toEqual([
      'summary',
      'the-middle',
      'summary-2',
    ])
  })

  /** Punctuation alone slugifies to nothing, and an empty `id` is not a jump target. */
  it('falls back to the chapter position when a heading has nothing to slugify', () => {
    const view = toArticleView(
      article({ chapters: [chapter({ heading: '???' }), chapter({ heading: 'Real' })] }),
      'en',
    )

    expect(view.chapters[0]?.anchor).toBe('chapter-1')
  })
})

describe('contents', () => {
  it('prefers the contents label over the heading where the editor set one', () => {
    const view = toArticleView(
      article({
        chapters: [
          chapter({
            heading: 'Cut: Where Brilliance Begins',
            tocLabel: 'Diamond Cut & Brilliance',
          }),
          chapter({ heading: 'Colour' }),
        ],
      }),
      'en',
    )

    expect(view.contents.map((entry) => entry.label)).toEqual([
      'Diamond Cut & Brilliance',
      'Colour',
    ])
    // The chapter still renders its real heading — the short form is for the rail only.
    expect(view.chapters[0]?.heading).toBe('Cut: Where Brilliance Begins')
  })

  /** FR-028. A contents list of one entry is a control that points at what is already on screen. */
  it('is empty for a single chapter and for none at all', () => {
    expect(
      toArticleView(article({ chapters: [chapter({ heading: 'Only' })] }), 'en').contents,
    ).toEqual([])
    expect(toArticleView(article({ chapters: [] }), 'en').contents).toEqual([])
    expect(toArticleView(article({}), 'en').chapters).toEqual([])
  })

  it('drops a chapter with no heading rather than rendering an unreachable section', () => {
    const view = toArticleView(
      article({
        chapters: [
          chapter({ heading: '  ' }),
          chapter({ heading: 'Real' }),
          chapter({ heading: 'Also real' }),
        ],
      }),
      'en',
    )

    expect(view.chapters).toHaveLength(2)
  })
})

describe('chapter content', () => {
  it('serialises the body out of lexical and keeps the lede and pull quote as text', () => {
    const view = toArticleView(
      article({
        chapters: [
          chapter({
            heading: 'Cut',
            lede: 'The most important detail is not always size.',
            pullQuote: 'A great diamond comes alive in the light.',
            body: body('A beautifully cut diamond captures light.'),
          }),
          chapter({ heading: 'Colour' }),
        ],
      }),
      'en',
    )

    expect(view.chapters[0]?.bodyHtml).toContain('<p>A beautifully cut diamond captures light.</p>')
    expect(view.chapters[0]?.lede).toBe('The most important detail is not always size.')
    expect(view.chapters[0]?.pullQuote).toBe('A great diamond comes alive in the light.')
    // Absent rather than empty, so a renderer closes the layout over them.
    expect(view.chapters[1]?.lede).toBeUndefined()
    expect(view.chapters[1]?.pullQuote).toBeUndefined()
  })
})

describe('mosaic emphasis', () => {
  /**
   * The drawn rhythm, read straight off `312:7367` and `415:7933`:
   *
   *   xl   wide, narrow / narrow, narrow, narrow / narrow, wide
   *   md   lead / narrow, narrow / narrow, narrow
   *
   * The two disagree at card 5, which leads the tablet grid and is narrow on desktop. That
   * disagreement is the whole reason emphasis is computed rather than stored — the assertion below
   * is what a `featured` checkbox could not satisfy.
   */
  it('follows the drawn cycle at each breakpoint', () => {
    const wide = [...Array(14).keys()].map((index) => emphasisFor(index).desktopWide)
    const lead = [...Array(14).keys()].map((index) => emphasisFor(index).tabletLead)

    expect(wide).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
    ])
    expect(lead).toEqual([
      true,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ])
  })

  it('disagrees between breakpoints at card 5, which is the point', () => {
    expect(emphasisFor(5)).toEqual({ tabletLead: true, desktopWide: false })
  })

  it('reaches a card through the mapper, keyed by its position in the page', () => {
    expect(toArticleCard(article(), 6, 'en').emphasis.desktopWide).toBe(true)
    expect(toArticleCard(article(), 1, 'en').emphasis.desktopWide).toBe(false)
  })
})

describe('dates', () => {
  /** FR-011: one format across every card, every article page and the structured data. */
  it('formats as drawn, with a two-digit day, and leaves the machine value untouched', () => {
    const card = toArticleCard(article({ publishedOn: '2026-08-08T00:00:00.000Z' }), 0, 'en')

    expect(card.publishedLabel).toBe('August 08, 2026')
    expect(card.publishedOn).toBe('2026-08-08T00:00:00.000Z')
  })

  it('does not shift the day for a timezone', () => {
    expect(
      toArticleCard(article({ publishedOn: '2026-08-13T23:30:00.000Z' }), 0, 'en').publishedLabel,
    ).toBe('August 13, 2026')
  })
})

describe('a category that has been deleted', () => {
  /**
   * FR-041. A category can be deleted while published articles still point at it, and the
   * requirement is that those articles stay published and lose their badge rather than their page.
   * An unresolved relationship reaches the mapper as a bare id.
   */
  it('leaves the article intact and the badge absent', () => {
    const card = toArticleCard(article({ category: 42 }), 0, 'en')
    const view = toArticleView(article({ category: 42 }), 'en')

    expect(card.category).toBeUndefined()
    expect(card.title).toBe('How to Choose the Perfect Diamond')
    expect(view.category).toBeUndefined()
    expect(view.href).toBe('/blog/how-to-choose-the-perfect-diamond')
  })
})

describe('metadata fallbacks', () => {
  it('uses the article itself when the editor set no overrides', () => {
    const view = toArticleView(article({}), 'en')

    expect(view.seo).toEqual({})
    expect(view.fallbacks.title).toBe('How to Choose the Perfect Diamond')
    expect(view.fallbacks.description).toBe('What defines an exceptional stone.')
  })

  it('keeps the editor overrides separate from the fallbacks so the route can prefer them', () => {
    const view = toArticleView(
      article({
        seo: { title: 'A better title', description: 'A better description' },
      } as Partial<Article>),
      'en',
    )

    expect(view.seo.title).toBe('A better title')
    expect(view.seo.description).toBe('A better description')
    expect(view.fallbacks.title).toBe('How to Choose the Perfect Diamond')
  })
})

describe('blog addresses', () => {
  /** Contract §3: two callers asking for one view produce byte-identical strings. */
  it('omits the parameters that mean "the default"', () => {
    expect(blogHref()).toBe('/blog')
    expect(blogHref({ page: 1 })).toBe('/blog')
    expect(blogHref({ category: 'guides' })).toBe('/blog?category=guides')
    expect(blogHref({ category: 'guides', page: 3 })).toBe('/blog?category=guides&page=3')
    expect(blogHref({ page: 2 })).toBe('/blog?page=2')
  })

  it('parses a page, falling back to one rather than erroring', () => {
    expect(parsePage('3')).toBe(3)
    expect(parsePage(undefined)).toBe(1)
    expect(parsePage('banana')).toBe(1)
    expect(parsePage('0')).toBe(1)
    expect(parsePage('-4')).toBe(1)
    expect(parsePage(['2', '5'])).toBe(2)
  })

  it('treats a blank category as no narrowing', () => {
    expect(parseCategory('guides')).toBe('guides')
    expect(parseCategory('  ')).toBeUndefined()
    expect(parseCategory(undefined)).toBeUndefined()
  })

  /** Seven is one complete mosaic cycle, which is what the design draws before its LOAD MORE. */
  it('pages by one whole mosaic cycle', () => {
    expect(BLOG_PAGE_SIZE).toBe(7)
  })
})
