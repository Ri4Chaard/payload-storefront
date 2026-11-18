import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { LOCALES } from '@/i18n/routing'
import { enquirySchema, readEnquiryForm } from '@/lib/contact/enquiry-schema'

/**
 * An enquiry remembers the language it was written in.
 *
 * The shop answers by hand, in a messenger, hours later — so the language has to be recorded on the
 * enquiry rather than inferred from the prose when somebody gets round to reading it.
 */
const payload = await getPayload({ config })
const created: number[] = []

afterAll(async () => {
  for (const id of created) {
    await payload.delete({ collection: 'enquiries', id, overrideAccess: true }).catch(() => undefined)
  }
})

describe('the enquiry form', () => {
  it('carries the language as a hidden field', () => {
    const form = new FormData()
    form.set('name', 'Оксана')
    form.set('email', 'oksana@aurum-testing.dev')
    form.set('message', 'Доброго дня.')
    form.set('locale', 'uk')

    const parsed = enquirySchema.parse(readEnquiryForm(form))
    expect(parsed.locale).toBe('uk')
  })

  it('falls back to English rather than refusing the enquiry', () => {
    /*
      A broken or absent language tag must never cost somebody their message. `z.enum().catch()` is
      what makes that true — an unknown value becomes English instead of a validation failure the
      visitor cannot act on, because there is no control on the page for them to fix.
    */
    for (const value of ['', 'de', 'EN', 'not-a-locale']) {
      const form = new FormData()
      form.set('name', 'Test')
      form.set('email', 'test@aurum-testing.dev')
      form.set('message', 'Hello.')
      form.set('locale', value)
      expect(enquirySchema.parse(readEnquiryForm(form)).locale).toBe('en')
    }
  })
})

describe('the stored enquiry', () => {
  it('keeps the language it arrived in', async () => {
    for (const locale of LOCALES) {
      const doc = await payload.create({
        collection: 'enquiries',
        overrideAccess: true,
        data: {
          name: 'Language Test',
          email: `lang-${locale}@aurum-testing.dev`,
          message: 'x',
          notification: 'pending',
          locale,
        },
      })
      created.push(doc.id as number)
      expect(doc.locale).toBe(locale)
    }
  })

  it('is not localized — it is a fact about one submission', async () => {
    // The field records which language the visitor was reading, so it must read the same whichever
    // language an administrator happens to be viewing the admin in.
    const doc = await payload.create({
      collection: 'enquiries',
      overrideAccess: true,
      data: {
        name: 'Shared Field',
        email: 'shared@aurum-testing.dev',
        message: 'x',
        notification: 'pending',
        locale: 'uk',
      },
    })
    created.push(doc.id as number)

    const inRussian = await payload.findByID({
      collection: 'enquiries',
      id: doc.id,
      locale: 'ru',
      overrideAccess: true,
    })
    expect(inRussian.locale).toBe('uk')
  })
})
