import { describe, expect, it } from 'vitest'

import { toContactPage } from '@/lib/contact/mappers'
import type { ContactPage as ContactPageDocument, Question as QuestionDocument } from '@/payload-types'

/**
 * The contact page's mapper (008/T027, contracts/contact-loader.md §6).
 *
 * The rules pinned down here are the ones a component must never have to re-derive — above all
 * FR-032's "the band is absent when there is nothing to show", which is a property of the view
 * model rather than a condition a renderer remembers.
 */

const answer = (text: string): QuestionDocument['answer'] =>
  ({
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          children: [{ type: 'text', format: 0, style: '', text, version: 1, detail: 0, mode: 'normal' }],
        },
      ],
    },
  }) as unknown as QuestionDocument['answer']

const question = (id: number, text: string): QuestionDocument =>
  ({
    id,
    question: text,
    answer: answer('Yes.'),
    order: 0,
    updatedAt: '2026-09-10T00:00:00.000Z',
    createdAt: '2026-09-10T00:00:00.000Z',
  }) as QuestionDocument

/** A resolved upload, as Payload hands it back at depth. */
const photo = () =>
  ({
    id: 1,
    alt: 'A necklace and earrings in a case',
    url: '/media/contact.webp',
    width: 960,
    height: 750,
    updatedAt: '2026-09-10T00:00:00.000Z',
    createdAt: '2026-09-10T00:00:00.000Z',
  }) as never

const page = (overrides: Partial<ContactPageDocument> = {}): ContactPageDocument =>
  ({
    id: 1,
    eyebrow: 'CONTACT US',
    heading: 'WE’RE HERE TO HELP',
    intro: 'Questions, custom requests, or styling advice — our team is here for you',
    form: {
      heading: 'SEND US A MESSAGE',
      body: 'To make an enquiry, please use the contact form below.',
      nameLabel: 'Name',
      emailLabel: 'E-mail',
      messageLabel: 'Message',
      submitLabel: 'SEND MESSAGE',
      footnote: 'We’ll get back to you as soon as possible.',
      successMessage: 'Thank you.',
      errorMessage: 'Sorry.',
    },
    faq: { heading: 'Frequently Asked Questions', questions: [] },
    updatedAt: '2026-09-10T00:00:00.000Z',
    createdAt: '2026-09-10T00:00:00.000Z',
    ...overrides,
  }) as ContactPageDocument

describe('toContactPage', () => {
  it('maps the drawn page', () => {
    const view = toContactPage(page())

    expect(view.eyebrow).toBe('CONTACT US')
    expect(view.heading).toBe('WE’RE HERE TO HELP')
    expect(view.form.labels).toEqual({ name: 'Name', email: 'E-mail', message: 'Message' })
    expect(view.form.submitLabel).toBe('SEND MESSAGE')
    expect(view.form.messages).toEqual({ success: 'Thank you.', error: 'Sorry.' })
  })

  /*
    An unsaved global hands back a partial document. Every copy field has a `defaultValue`, so this
    is defence rather than the common path — but the view model promises a string, and a component
    that has to check is a component that will forget.
  */
  it('falls back to the shipped wording when the global has never been saved', () => {
    const view = toContactPage({ id: 1 } as ContactPageDocument)

    expect(view.heading).toBe('WE’RE HERE TO HELP')
    expect(view.form.heading).toBe('SEND US A MESSAGE')
    expect(view.form.labels.email).toBe('E-mail')
    expect(view.form.messages.success).toContain('Thank you')
  })

  it('drops an eyebrow, intro or footnote the editor emptied', () => {
    const view = toContactPage(
      page({
        eyebrow: '   ',
        intro: '',
        form: { ...page().form, footnote: '  ' },
      } as Partial<ContactPageDocument>),
    )

    expect(view.eyebrow).toBeUndefined()
    expect(view.intro).toBeUndefined()
    expect(view.form.footnote).toBeUndefined()
  })

  describe('the questions band (FR-032)', () => {
    it('keeps the editor’s chosen order, not the collection’s', () => {
      const view = toContactPage(
        page({
          faq: {
            heading: 'Frequently Asked Questions',
            questions: [question(3, 'Third'), question(1, 'First'), question(2, 'Second')],
          },
        } as Partial<ContactPageDocument>),
      )

      expect(view.faq?.questions.map((row) => row.question)).toEqual(['Third', 'First', 'Second'])
    })

    it('is absent when the editor has chosen none', () => {
      expect(toContactPage(page()).faq).toBeUndefined()
    })

    /*
      The loader reads with `overrideAccess: false`, so an unpublished question never arrives — it
      is absent rather than filtered. If that empties the list, the band goes with it (FR-033).
    */
    it('is absent when every chosen question has been unpublished', () => {
      const view = toContactPage(
        page({
          faq: { heading: 'Frequently Asked Questions', questions: [] },
        } as Partial<ContactPageDocument>),
      )

      expect(view.faq).toBeUndefined()
    })
  })

  describe('metadata fallbacks (FR-048)', () => {
    it('derive from what the page actually says', () => {
      const view = toContactPage(page({ form: { ...page().form, photo: photo() } } as Partial<ContactPageDocument>))

      expect(view.fallbacks.title).toBe('WE’RE HERE TO HELP')
      expect(view.fallbacks.description).toContain('Questions, custom requests')
      expect(view.fallbacks.image?.src).toBe('/media/contact.webp')
    })

    it('survive an intro and a photograph the editor never set', () => {
      const view = toContactPage(page({ intro: '' } as Partial<ContactPageDocument>))

      expect(view.fallbacks.title).toBe('WE’RE HERE TO HELP')
      expect(view.fallbacks.description).toBeUndefined()
      expect(view.fallbacks.image).toBeUndefined()
    })

    it('prefer the editor’s own metadata where it is set', () => {
      const view = toContactPage(
        page({
          seo: { title: 'Talk to Aurum', description: 'Reach us any way you like.' },
        } as Partial<ContactPageDocument>),
      )

      expect(view.seo.title).toBe('Talk to Aurum')
      expect(view.seo.description).toBe('Reach us any way you like.')
    })
  })

  /*
    A media document deleted out from under the reference. The band renders without a picture rather
    than throwing — a missing photograph is a thinner page, not a broken route.
  */
  it('renders without a photograph whose media document has gone', () => {
    const view = toContactPage(page({ form: { ...page().form, photo: 99 } } as Partial<ContactPageDocument>))

    expect(view.form.photo).toBeUndefined()
    expect(view.form.heading).toBe('SEND US A MESSAGE')
  })
})
