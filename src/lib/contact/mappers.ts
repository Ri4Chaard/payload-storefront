import { toCatalogImage } from '@/lib/catalog/mappers'
import { toQuestions } from '@/lib/questions/mappers'
import type { ContactPage as ContactPageDocument } from '@/payload-types'

import type { ContactFaq, ContactForm, ContactPage, ContactSeo } from './types'

/**
 * The contact page document to its view model.
 *
 * **The only file in this feature that names a `ContactPage` document.** Everything above it sees
 * `./types.ts` — the seam `catalog/no-document-types` enforces.
 *
 * Two rules run through it, and both exist so no component downstream has to think about them:
 *
 * 1. **A band with nothing to show is absent, not rendered empty**. Here that is the FAQ:
 *    `faq` comes back `undefined` when the editor chose no questions, or when every question they
 *    chose has since been unpublished. A renderer that also checked would be a second place for the
 *    rule to live, and the two would drift.
 * 2. **The metadata fallbacks are computed from what the page actually says**, so a `<title>` can
 *    never name a heading the editor has emptied.
 */

/** Trim to `undefined`, so "the editor left it empty" and "the editor typed spaces" agree. */
const text = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * A required string with the shipped wording behind it.
 *
 * Every copy field on the global carries a `defaultValue`, so in practice this fallback is only
 * reached when an editor saves the page with a required field blanked — which Payload's own
 * validation refuses — or when the global has never been saved and Payload hands back a partial.
 * It exists so the view model's type can promise a string rather than making every component ask.
 */
const required = (value: string | null | undefined, fallback: string): string =>
  text(value) ?? fallback

const form = (document: ContactPageDocument): ContactForm => {
  const photo = toCatalogImage(document.form?.photo)

  return {
    heading: required(document.form?.heading, 'SEND US A MESSAGE'),
    ...(text(document.form?.body) ? { body: text(document.form?.body)! } : {}),
    labels: {
      name: required(document.form?.nameLabel, 'Name'),
      email: required(document.form?.emailLabel, 'E-mail'),
      message: required(document.form?.messageLabel, 'Message'),
    },
    submitLabel: required(document.form?.submitLabel, 'SEND MESSAGE'),
    ...(text(document.form?.footnote) ? { footnote: text(document.form?.footnote)! } : {}),
    messages: {
      success: required(
        document.form?.successMessage,
        'Thank you — your message has reached us. We’ll be in touch as soon as we can.',
      ),
      error: required(
        document.form?.errorMessage,
        'We couldn’t receive your message just now. Please try again, or reach us on WhatsApp, Telegram or Instagram.',
      ),
    },
    // A deleted media document leaves a dangling reference; the band renders without it rather than
    // throwing, and the layout reserves no space for a picture that is not there.
    ...(photo ? { photo } : {}),
  }
}

/**
 * The questions band, or nothing.
 *
 * The questions arrive already resolved — the loader reads the global at `depth: 2`, so there is no
 * second query here and no `getSelectedQuestions` anywhere. `toQuestions` de-duplicates
 * and drops anything unpublished; if that empties the list, the band goes with it.
 */
const faq = (document: ContactPageDocument): ContactFaq | undefined => {
  const heading = text(document.faq?.heading)
  const questions = toQuestions(document.faq?.questions)

  if (!heading || questions.length === 0) return undefined
  return { heading, questions }
}

const seo = (value: ContactPageDocument['seo']): ContactSeo => {
  const image = toCatalogImage(value?.image)
  return {
    ...(text(value?.title) ? { title: text(value?.title)! } : {}),
    ...(text(value?.description) ? { description: text(value?.description)! } : {}),
    ...(image ? { image } : {}),
  }
}

export function toContactPage(document: ContactPageDocument): ContactPage {
  const heading = required(document.heading, 'WE’RE HERE TO HELP')
  const intro = text(document.intro)
  const band = form(document)
  const questions = faq(document)

  return {
    ...(text(document.eyebrow) ? { eyebrow: text(document.eyebrow)! } : {}),
    heading,
    ...(intro ? { intro } : {}),
    form: band,
    ...(questions ? { faq: questions } : {}),
    seo: seo(document.seo),
    /*
      Read off the MAPPED page rather than the document, so every fallback describes something a
      visitor can actually see: the title is the headline as rendered, the description is the intro
      as rendered, and the image is the one photograph this page has.
    */
    fallbacks: {
      title: heading,
      ...(intro ? { description: intro } : {}),
      ...(band.photo ? { image: band.photo } : {}),
    },
  }
}
