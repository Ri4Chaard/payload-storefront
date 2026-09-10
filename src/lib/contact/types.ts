import type { CatalogImage } from '@/lib/catalog/types'
import type { Question } from '@/lib/questions/types'

/**
 * The view models for `/contact` (spec 008, T024) — what the route and its components are allowed
 * to see.
 *
 * The same tier `src/lib/catalog/types.ts` is for the catalogue and `src/lib/story/types.ts` is for
 * `/about`, and it exists for the same enforced reason: `catalog/no-document-types` forbids
 * components from importing `@/payload-types`, because a component holding a document can render a
 * draft or decide publication state for itself.
 *
 * **Deliberately narrower than the document.** No `_status`, no unresolved relationships, no lexical
 * trees — all of which are the admin's business rather than the page's.
 */

/** The labels on the three controls. Fields, because FR-042 names them. */
export interface ContactFormLabels {
  name: string
  email: string
  message: string
}

/** What the visitor is told once the outcome is known. Both are editor-written. */
export interface ContactFormMessages {
  success: string
  error: string
}

export interface ContactForm {
  heading: string
  body?: string
  labels: ContactFormLabels
  submitLabel: string
  footnote?: string
  messages: ContactFormMessages
  photo?: CatalogImage
}

/**
 * The questions band, or nothing.
 *
 * **This is `undefined` rather than `{ questions: [] }` when the editor has chosen none, or when
 * every question they chose has been unpublished.** FR-032 requires the band to be absent rather
 * than a heading over an empty column, and making that a property of the view model means the
 * component cannot forget it and the empty case is unit-testable without rendering anything.
 */
export interface ContactFaq {
  heading: string
  questions: Question[]
}

/** What the editor set for search engines and link previews. Fallbacks are the route's to apply. */
export interface ContactSeo {
  title?: string
  description?: string
  image?: CatalogImage
}

/**
 * What the page would say about itself if the editor set no metadata (FR-048).
 *
 * Computed here from the page's own heading, intro and photograph, so `generateMetadata` never
 * reaches back into a document to work it out.
 */
export interface ContactFallbacks {
  title?: string
  description?: string
  image?: CatalogImage
}

export interface ContactPage {
  eyebrow?: string
  heading: string
  intro?: string
  form: ContactForm
  faq?: ContactFaq
  seo: ContactSeo
  fallbacks: ContactFallbacks
}
