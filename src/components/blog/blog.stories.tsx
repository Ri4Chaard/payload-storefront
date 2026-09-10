import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { emphasisFor } from '@/lib/blog/mappers'
import type { ArticleCard as ArticleCardModel, BlogCategory, ContentsEntry } from '@/lib/blog/types'

import { ArticleMosaic } from './article-mosaic'
import { CategoryTabs } from './category-tabs'
import { TableOfContents } from './table-of-contents'

/**
 * The blog's four new components (007/T078).
 *
 * **One stories file for all four, rather than four files**, the same call `blocks.stories.tsx`
 * makes for the story page's bands: these are not independent kit primitives, they are the parts of
 * two pages, and the questions worth asking about them are about how they behave TOGETHER and at
 * a count nobody drew.
 *
 * `check:stories` does not reach here — it guards `src/components/ui/` — so this exists because
 * the mosaic's rhythm needs looking at rather than because a script demands it. And it is the only
 * place the rhythm can be looked at with an article count the seed does not produce, which is the
 * whole reason the counts below go 1, 3, 7 and 15.
 *
 * The photographs are the seeded ones, so a story shows what the real page shows.
 */

const PHOTOGRAPHS = [
  ['blog-diamond-in-tweezers.webp', 'An oval diamond held in tweezers over red velvet'],
  ['blog-rings-on-linen.webp', 'Five diamond rings arranged on linen'],
  ['blog-rings-on-blocks.webp', 'Three diamond rings on pale blue and pink blocks'],
  ['blog-diamond-under-glass.webp', 'A diamond held under a magnifying glass'],
  ['blog-coloured-gemstones.webp', 'Coloured gemstones scattered on a grey ground'],
  ['blog-bracelet-worn.webp', 'A diamond bracelet worn on a raised wrist'],
  ['blog-ring-at-dusk.webp', 'A solitaire ring on a desk against a city skyline at dusk'],
] as const

const CATEGORIES: BlogCategory[] = [
  { id: 1, title: 'Diamonds', slug: 'diamonds', href: '/blog?category=diamonds' },
  { id: 2, title: 'Jewelry', slug: 'jewelry', href: '/blog?category=jewelry' },
  { id: 3, title: 'Guides', slug: 'guides', href: '/blog?category=guides' },
  { id: 4, title: 'Stories', slug: 'stories', href: '/blog?category=stories' },
]

const TITLES = [
  'How to Choose the Perfect Diamond: A Guide to Cut, Clarity, Color & Carat',
  'Lab-Grown Diamonds: Beauty Reimagined',
  'The Art of Choosing the Perfect Diamond',
  'A Guide to Diamond Shapes',
  'Reading a Diamond Certificate',
  'Behind the Craftsmanship: Hand-Set Pavé',
  'The Pieces That Mark a Moment',
]

/** `emphasisFor` rather than a literal, so a story cannot disagree with the page about the rhythm. */
const cards = (count: number): ArticleCardModel[] =>
  [...Array(count).keys()].map((index) => {
    const [file, alt] = PHOTOGRAPHS[index % PHOTOGRAPHS.length]!
    return {
      id: index + 1,
      title: TITLES[index % TITLES.length]!,
      href: `/blog/article-${index + 1}`,
      publishedOn: '2026-08-13T00:00:00.000Z',
      publishedLabel: 'August 13, 2026',
      category: CATEGORIES[index % CATEGORIES.length]!,
      media: { kind: 'photo', src: `/photography/${file}`, width: 1600, height: 1000, alt },
      emphasis: emphasisFor(index),
    }
  })

const meta = {
  title: 'Blog/Mosaic',
  component: ArticleMosaic,
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
  args: { articles: cards(7), label: 'Latest articles' },
} satisfies Meta<typeof ArticleMosaic>

export default meta
type Story = StoryObj<typeof meta>

/** One complete cycle, exactly as `312:7367` draws it: wide + narrow, three narrow, narrow + wide. */
export const OneCycle: Story = {}

/**
 * A page and a bit. The second cycle starts over, so card 7 is wide again — which is what makes
 * the rhythm a rhythm rather than a one-off arrangement.
 */
export const TwoCycles: Story = { args: { articles: cards(15) } }

/** The first article on a new blog. A one-card grid has to look deliberate, not broken. */
export const OneArticle: Story = { args: { articles: cards(1) } }

/**
 * A partial cycle, which is the state a real blog spends most of its life in.
 *
 * Nothing stretches and nothing leaves a hole in the middle: spans are assigned left to right from
 * each card's index, so the last row is simply short. That is FR-009, and this story is where it is
 * looked at rather than asserted.
 */
export const PartialCycle: Story = { args: { articles: cards(3) } }

/** A card whose hero was never set, or whose photograph was deleted from the library. */
export const MissingPhotograph: Story = {
  args: {
    articles: cards(3).map((card, index) =>
      index === 1 ? { ...card, media: undefined } : card,
    ),
  },
}

/**
 * A card whose category was deleted out from under it (FR-041).
 *
 * The article stays published and loses its badge rather than its page — the visual half of the
 * assertion in `tests/integration/blog-articles.test.ts`.
 */
export const MissingCategory: Story = {
  args: {
    articles: cards(3).map((card, index) =>
      index === 0 ? { ...card, category: undefined } : card,
    ),
  },
}

/**
 * The tab strip, with LATEST current.
 *
 * The thing to look at is that the current tab is distinguished by the rule beneath it and not by
 * colour alone — which is the change this feature makes against the desktop frame (007 spec, design
 * inconsistency 4).
 */
export const Tabs: StoryObj<typeof CategoryTabs> = {
  render: () => <CategoryTabs categories={CATEGORIES} allHref="/blog" />,
}

export const TabsNarrowed: StoryObj<typeof CategoryTabs> = {
  render: () => <CategoryTabs categories={CATEGORIES} active="guides" allHref="/blog" />,
}

const CONTENTS: ContentsEntry[] = [
  { anchor: 'key-takeaways', label: 'Key Takeaways' },
  { anchor: 'understanding-the-4cs', label: 'Understanding the 4Cs' },
  { anchor: 'diamond-cut-brilliance', label: 'Diamond Cut & Brilliance' },
  { anchor: 'color-what-to-look-for', label: 'Color: What to Look For' },
  { anchor: 'understanding-diamond-clarity', label: 'Understanding Diamond Clarity' },
  { anchor: 'choosing-the-right-carat-weight', label: 'Choosing the Right Carat Weight' },
  { anchor: 'diamond-shapes-their-character', label: 'Diamond Shapes & Their Character' },
  { anchor: 'lab-grown-vs-natural-diamonds', label: 'Lab-Grown vs. Natural Diamonds' },
  { anchor: 'diamond-certification', label: 'Diamond Certification' },
  { anchor: 'how-aurum-selects-diamonds', label: 'How Aurum Selects Diamonds' },
]

/**
 * The contents rail with the ten entries the design draws (`312:8409`).
 *
 * At phone width this shows five and a computed count of the rest — the drawn `+ 5 more chapters
 * below` is a placeholder, and the number here follows the list.
 */
export const Contents: StoryObj<typeof TableOfContents> = {
  render: () => <TableOfContents entries={CONTENTS} className="max-w-125" />,
}

/** Two chapters is the minimum at which a contents list says anything (FR-028). */
export const ContentsMinimum: StoryObj<typeof TableOfContents> = {
  render: () => <TableOfContents entries={CONTENTS.slice(0, 2)} className="max-w-125" />,
}

/**
 * One chapter renders nothing at all: the list would point at what is already on screen.
 *
 * The caption is not decoration. `test:stories` treats a story that renders nothing as broken —
 * correctly, since a blank frame is indistinguishable from a crash — so the absence has to be
 * something a reader can see. The behaviour itself is pinned down in
 * `tests/unit/blog-mappers.test.ts`.
 */
export const ContentsBelowMinimum: StoryObj<typeof TableOfContents> = {
  render: () => (
    <div className="max-w-125">
      <p className="text-body-small text-neutral-secondary mb-4">
        One chapter — the rail draws nothing below:
      </p>
      <TableOfContents entries={CONTENTS.slice(0, 1)} />
    </div>
  ),
}
