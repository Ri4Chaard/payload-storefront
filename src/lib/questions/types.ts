import type { CatalogImage } from '@/lib/catalog/types'

/**
 * The shop's questions, as three pages draw them.
 *
 * **Promoted out of `src/lib/story/`, where this lived as `StoryQuestion`.** That was the right home
 * when the FAQ band on `/about` was the only consumer. It is now one of three — `/about`, `/contact`
 * and `/faq` all draw the same rows — and `src/lib/story/queries.ts` predicted this page while
 * guessing the wrong home for it: "When `/faq` is built it adds its own function to this file."
 *
 * A `/faq` page reading its content out of a module named `story` is the coupling spec 007 had to
 * undo on `PageHeaderBlock`, recorded in that component's own doc comment. Constitution II says the
 * second consumer is the trigger to promote rather than to duplicate; this is the third.
 */

/**
 * One question, with its answer already serialised out of lexical.
 *
 * `id` is the document's own number rather than a string. It was `number` as `StoryQuestion` and
 * stays `number` here, because the promotion is a move: a view model that changes shape in the same
 * change that changes its address gives a reviewer two things to verify instead of one.
 */
export interface Question {
  id: number
  question: string
  answerHtml: string
}

/** What the editor set for search engines and link previews. Fallbacks are the route's to apply. */
export interface FaqPageSeo {
  title?: string
  description?: string
  image?: CatalogImage
}

/**
 * The `/faq` page's own copy.
 *
 * Deliberately tiny: the page's content is the questions themselves, and everything here is what
 * wraps them. The empty pair is not an afterthought — FR-039 requires a heading and a plain message
 * rather than a 404 when nothing is published, because every page on the site links here.
 */
export interface FaqPage {
  heading: string
  empty: { title: string; description: string }
  seo: FaqPageSeo
  fallbacks: { title?: string; description?: string }
}
