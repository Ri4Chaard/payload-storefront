import type { CatalogImage } from '@/lib/catalog/types'
import type { StoryPage as StoryPageDocument } from '@/payload-types'

/**
 * The view models for the story page (spec 006, T020) — what a block renderer is allowed to see.
 *
 * The same tier `src/lib/catalog/types.ts` is for the catalogue, and it exists for the same
 * enforced reason: `catalog/no-document-types` forbids components from importing
 * `@/payload-types`, because a component holding a document can render a draft or decide
 * publication state for itself.
 *
 * Derived from the generated types rather than restated beside them, so a schema change surfaces
 * here as a type error rather than as a band that quietly renders nothing.
 *
 * Deliberately NARROWER than the documents. No `_status`, no unresolved relationships, no lexical
 * trees, and no `blockName` — all of which are the admin's business rather than the page's.
 */

/** Every block variant Payload can put in `body`, keyed by its discriminant. */
type BlockDocument = NonNullable<StoryPageDocument['body']>[number]
export type BlockType = BlockDocument['blockType']

/**
 * A photograph or a video, ready to render.
 *
 * **`src`, `width` and `height` are always a STILL image** — the photograph itself, or the video's
 * poster. This is the single load-bearing decision in the shape: it means a consumer reserves the
 * right box before anything loads, whatever the slot holds, so layout shift is structurally
 * impossible rather than carefully avoided (FR-024b).
 *
 * A slot with no still is not represented — the mapper drops it — because a frame with nothing to
 * put in it must collapse rather than reserve blank space.
 */
export type StoryMedia = CatalogImage & {
  kind: 'photo' | 'video'
  /** Present only when `kind` is `'video'`. The file to play once it is allowed to load. */
  videoSrc?: string
}

/** A button. The whole object is absent when the editor left it empty (FR-011, FR-013). */
export interface Cta {
  label: string
  href: string
}

/** A word over a caption — `CERTIFIED` / `selected diamonds`. Never a number and a unit. */
export interface Figure {
  word: string
  caption: string
}

/** A tile in the numbered sequence. The ordinal is its index, never a stored field (FR-012). */
export interface Step {
  title: string
  caption?: string
  media?: StoryMedia
}

/** One question, with its answer already serialised out of lexical. */
export interface StoryQuestion {
  id: number
  question: string
  answerHtml: string
}

/**
 * Which heading level a band's own heading renders at.
 *
 * Assigned by the mapper and never chosen by a component (006/research.md R7). An editor can
 * reorder the page, delete the page header or add a second one, so "am I the top heading?" is a
 * question about the composition rather than about any one band — and answering it in one function
 * over an array is what keeps FR-006 true in arrangements nobody drew.
 */
export type HeadingLevel = 1 | 2

interface WithHeading {
  headingLevel: HeadingLevel
}

export type StoryBlock =
  | (WithHeading & { type: 'page-header'; eyebrow?: string; heading: string })
  | { type: 'media-plate'; media: StoryMedia }
  | (WithHeading & {
      type: 'closer-look'
      body?: string
      chips: string[]
      figures: Figure[]
      media?: StoryMedia
    })
  | (WithHeading & {
      type: 'banner'
      eyebrow?: string
      heading: string
      body?: string
      cta?: Cta
      media?: StoryMedia
      textSide: 'left' | 'right'
    })
  | (WithHeading & { type: 'process-steps'; heading: string; steps: Step[] })
  | (WithHeading & {
      type: 'faq'
      heading: string
      body?: string
      cta?: Cta
      questions: StoryQuestion[]
    })

/** What the editor set for search engines and link previews. Fallbacks are the route's to apply. */
export interface StorySeo {
  title?: string
  description?: string
  image?: CatalogImage
}

/**
 * What the page would say about itself if the editor set no metadata (FR-039).
 *
 * Derived from the composition rather than guessed at by the route: the title is whichever block
 * ended up owning the top heading, the description is the first paragraph on the page, and the
 * image is the first picture. All three therefore follow a reorder, which a hardcoded fallback
 * could not.
 */
export interface StoryFallbacks {
  title?: string
  description?: string
  image?: CatalogImage
}

export interface StoryPage {
  blocks: StoryBlock[]
  seo: StorySeo
  fallbacks: StoryFallbacks
}
