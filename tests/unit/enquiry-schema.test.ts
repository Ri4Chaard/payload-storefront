import { describe, expect, it } from 'vitest'

import { ENQUIRY_MAX } from '@/lib/contact/config'
import { enquirySchema, readEnquiryForm } from '@/lib/contact/enquiry-schema'

/**
 * The contact form's one shape (008/T042, contracts/enquiry-action.md §9).
 *
 * **The point of this file is that the schema and the collection cannot disagree.** Both read
 * `ENQUIRY_MAX`, so a value this accepts is a value Payload will store — the alternative is a form
 * that says everything is fine and then 500s on the write.
 */

const valid = {
  name: 'Yara',
  email: 'yara@example.com',
  message: 'Do you have this in a 1.5ct emerald cut?',
  website: '',
}

const parse = (overrides: Partial<typeof valid> = {}) =>
  enquirySchema.safeParse({ ...valid, ...overrides })

/** The first message key for a field, which is what the action turns into a sentence. */
const errorFor = (result: ReturnType<typeof parse>, field: string): string | undefined =>
  result.success ? undefined : result.error.issues.find((i) => i.path[0] === field)?.message

describe('enquirySchema', () => {
  it('accepts a filled form', () => {
    expect(parse().success).toBe(true)
  })

  describe('required fields', () => {
    it.each(['name', 'email', 'message'] as const)('rejects an empty %s', (field) => {
      expect(errorFor(parse({ [field]: '' }), field)).toBe(`${field}Required`)
    })

    /*
      Trimmed before every check, so " " is empty rather than a one-character name — and so the
      value that reaches the database is the value that was validated.
    */
    it.each(['name', 'email', 'message'] as const)('rejects a whitespace-only %s', (field) => {
      expect(errorFor(parse({ [field]: '   ' }), field)).toBeDefined()
    })

    it('trims what it accepts', () => {
      const result = parse({ name: '  Yara  ', message: '  Hello.  ' })
      expect(result.success && result.data.name).toBe('Yara')
      expect(result.success && result.data.message).toBe('Hello.')
    })
  })

  describe('the email address', () => {
    it.each(['not-an-email', 'yara@', '@example.com', 'yara example.com'])(
      'rejects %s',
      (email) => {
        expect(errorFor(parse({ email }), 'email')).toBe('emailInvalid')
      },
    )

    /*
      `EMAIL_SHAPE` is the account forms' regex, reused rather than restated. Its own comment calls
      it "good enough to catch a typo, and not an attempt to out-parse RFC 5322" — so a plus-address
      and a subdomain must both pass.
    */
    it.each(['yara+jewellery@example.com', 'yara@mail.example.co.uk'])('accepts %s', (email) => {
      expect(parse({ email }).success).toBe(true)
    })

    /*
      Not lowercased, unlike the account forms: this address is a reply-to rather than an identity,
      and the owner sees it as the visitor wrote it.
    */
    it('keeps the visitor’s own capitalisation', () => {
      const result = parse({ email: 'Yara@Example.com' })
      expect(result.success && result.data.email).toBe('Yara@Example.com')
    })
  })

  describe('the maxima, which the collection shares', () => {
    it('accepts a value exactly at the limit', () => {
      expect(parse({ name: 'y'.repeat(ENQUIRY_MAX.name) }).success).toBe(true)
      expect(parse({ message: 'm'.repeat(ENQUIRY_MAX.message) }).success).toBe(true)
    })

    it('rejects one character more', () => {
      expect(errorFor(parse({ name: 'y'.repeat(ENQUIRY_MAX.name + 1) }), 'name')).toBe('nameTooLong')
      expect(errorFor(parse({ message: 'm'.repeat(ENQUIRY_MAX.message + 1) }), 'message')).toBe(
        'messageTooLong',
      )
    })

    it('rejects an address longer than RFC 5321 allows', () => {
      const long = `${'y'.repeat(ENQUIRY_MAX.email)}@example.com`
      expect(errorFor(parse({ email: long }), 'email')).toBe('emailTooLong')
    })
  })

  /*
    The honeypot is optional — a browser that does not submit an empty hidden input is not a bot.
    The schema only carries it; refusing a filled one is the action's job, and it does so with the
    SUCCESS shape so a bot learns nothing.
  */
  describe('the honeypot', () => {
    it('passes validation whether empty or filled', () => {
      expect(parse({ website: '' }).success).toBe(true)
      expect(parse({ website: 'http://spam.example' }).success).toBe(true)
    })

    it('is optional', () => {
      const withoutHoneypot = { name: valid.name, email: valid.email, message: valid.message }
      expect(enquirySchema.safeParse(withoutHoneypot).success).toBe(true)
    })
  })
})

describe('readEnquiryForm', () => {
  it('reads the five fields off a form encoding', () => {
    const data = new FormData()
    data.set('name', 'Yara')
    data.set('email', 'yara@example.com')
    data.set('message', 'Hello.')
    data.set('website', '')
    // The hidden language field spec 010 added (FR-043) — the page knows which language it is.
    data.set('locale', 'ru')

    expect(readEnquiryForm(data)).toEqual({
      name: 'Yara',
      email: 'yara@example.com',
      message: 'Hello.',
      website: '',
      locale: 'ru',
    })
  })

  /*
    A missing field becomes `''` rather than `undefined`, so "the browser sent nothing" and "the
    visitor typed nothing" produce the same error. Without this the no-JavaScript path would fail
    differently to the enhanced one, which is the class of bug FR-018 is most likely to hide.
  */
  it('treats a missing field as empty rather than absent', () => {
    expect(readEnquiryForm(new FormData())).toEqual({
      name: '',
      email: '',
      message: '',
      website: '',
      // Spec 010: absent like the rest, and the schema catches it back to English rather than
      // failing the submission — a broken language tag must not cost somebody their enquiry.
      locale: '',
    })
  })

  /** A file posted into a text field is not a string; it must not become "[object File]". */
  it('ignores a non-string value', () => {
    const data = new FormData()
    data.set('name', new File(['x'], 'x.txt'))
    expect(readEnquiryForm(data).name).toBe('')
  })
})
