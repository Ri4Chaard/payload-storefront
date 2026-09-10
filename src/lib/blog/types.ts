import type { CatalogImage } from '@/lib/catalog/types'
import type { StoryMedia } from '@/lib/story/types'
import type { Article, ArticleCategory } from '@/payload-types'

/**
 * The view models for the blog (spec 007, T017) — what a component is allowed to see.
 *
 * The third instance of the tier `src/lib/catalog/types.ts` and `src/lib/story/types.ts` already
 * are, and it exists for the same enforced reason: `catalog/no-document-types` forbids components
 * from importing `@/payload-types`, because a component holding a document can render a draft or
 * decide publication state for itself.
 *
 * Derived from the generated types rather than restated beside them, so a schema change surfaces
 * here as a type error rather than as a card that quietly renders nothing.
 *
 * Deliberately NARROWER than the documents. No `_status`, no unresolved relationships, no lexical
 * trees. Two shapes are worth reading twice:
 *
 * - **`category` is optional on both the card and the article.** Not defensive typing — FR-041.
 *   A category can be deleted while published articles still point at it, and the requirement is
 *   that those articles stay published. The optionality here IS that requirement; a required field
 *   would force the mapper to invent a category or drop the article.
 * - **`media` is `StoryMedia`, reused rather than redefined.** Its `src`/`width`/`height` are
 *   always a STILL — the photograph itself, or a video's poster — which is what lets a card reserve
 *   its box before anything loads. Layout shift is structurally impossible rather than carefully
 *   avoided, and that property is worth more than a blog-specific type name.
 */

/** The article document's chapter rows, derived rather than restated. */
type ChapterDocument = NonNullable<Article['chapters']>[number]

/** A tab, and the address it narrows to. */
export interface BlogCategory {
  id: ArticleCategory['id']
  title: string
  slug: string
  href: string
}

/** One card in the mosaic. */
export interface ArticleCard {
  id: Article['id']
  title: string
  href: string
  /** ISO, for `<time datetime>`. Never formatted for a human. */
  publishedOn: string
  /** Formatted once, in the mapper — see 007/research.md R12. */
  publishedLabel: string
  category?: BlogCategory
  media?: StoryMedia
  /**
   * Where this card sits in the drawn rhythm, decided by its INDEX and nothing stored.
   *
   * Two flags rather than one because each breakpoint draws a different rhythm — a card can lead
   * the tablet grid and be narrow on desktop — which is precisely why an editorial "feature this
   * one" checkbox could not express the design (007/research.md R4).
   */
  emphasis: CardEmphasis
}

export interface CardEmphasis {
  /** Spans both columns at the middle breakpoint. */
  tabletLead: boolean
  /** Spans two of three columns at the widest. */
  desktopWide: boolean
}

/** One entry in the contents list. Generated from a chapter, never authored beside it. */
export interface ContentsEntry {
  anchor: string
  label: string
}

/** One named section of an article. */
export interface Chapter {
  /** Unique within the article, even when two headings read alike (FR-026). */
  anchor: string
  heading: string
  lede?: string
  /** Serialised out of lexical in the mapper. A component never sees an editor state. */
  bodyHtml: string
  pullQuote?: string
}

/** What the editor set for search engines and link previews. Fallbacks are the route's to apply. */
export interface BlogSeo {
  title?: string
  description?: string
  image?: CatalogImage
}

/** What a page says about itself when the editor filled in no SEO override. */
export interface BlogFallbacks {
  title: string
  description?: string
  image?: CatalogImage
}

/** One article, ready to render. */
export interface ArticleView {
  id: Article['id']
  title: string
  href: string
  standfirst: string
  publishedOn: string
  publishedLabel: string
  /** When Payload last wrote the document — `dateModified` in the structured data. */
  updatedOn: string
  category?: BlogCategory
  hero?: StoryMedia
  chapters: Chapter[]
  /** Empty below two chapters (FR-028). The renderer never has to ask. */
  contents: ContentsEntry[]
  seo: BlogSeo
  fallbacks: BlogFallbacks
}

/** The index, narrowed and paged as the route asked for it. */
export interface BlogIndexView {
  eyebrow?: string
  heading: string
  empty: { title: string; description: string }
  /** Every category, in the editor's order. LATEST is not one of them — it is their absence. */
  categories: BlogCategory[]
  /** The slug currently narrowed to, or `undefined` for LATEST. */
  activeCategory?: string
  cards: ArticleCard[]
  /** How many cards are on screen, against how many the narrowing matches. */
  shown: number
  total: number
  /** The next page's address, or `null` when everything is already shown. */
  moreHref: string | null
  seo: BlogSeo
  fallbacks: BlogFallbacks
}

export type { ChapterDocument }
