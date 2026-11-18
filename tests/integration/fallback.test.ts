import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { LOCALES } from '@/i18n/routing'
import { skipRevalidation } from '@/lib/revalidate'

/**
 * A half-translated site is the normal state, not the broken one.
 *
 * **`fallback: true` is what makes this work, and it is worth testing rather than trusting.** It is
 * Payload's default, so nothing in a diff would show it being switched off — the config states it
 * explicitly for that reason, and this asserts the behaviour it buys.
 */
const payload = await getPayload({ config })
const created: number[] = []

afterAll(async () => {
  for (const id of created) {
    await payload.delete({ collection: 'policies', id, overrideAccess: true }).catch(() => undefined)
  }
})

const makePolicy = async () => {
  const doc = await payload.create({
    collection: 'policies',
    overrideAccess: true,
    context: skipRevalidation,
    data: {
      title: 'Fallback Test Policy',
      footerPlacement: 'legal',
      footerOrder: 99,
      slug: `fallback-test-${Date.now()}`,
      subtitle: 'An English subtitle',
      body: {
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
              children: [{ type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text: 'English body.', version: 1 }],
            },
          ],
        },
      },
      _status: 'published',
    },
  })
  created.push(doc.id as number)
  return doc
}

describe('an untranslated document', () => {
  it('is readable in every language', async () => {
    // FR-048. A document that exists only in English must not 404 in Russian — the visitor came for
    // the page, not for the translation.
    const doc = await makePolicy()

    for (const locale of LOCALES) {
      const read = await payload.findByID({
        collection: 'policies',
        id: doc.id,
        locale,
        overrideAccess: true,
      })
      expect(read, `readable in ${locale}`).toBeTruthy()
      expect(read.title).toBe('Fallback Test Policy')
    }
  })

  it('returns the English words rather than nothing', async () => {
    // FR-046. The alternative — empty strings — renders a page with a blank heading, which is worse
    // than an untranslated one because it looks like a bug rather than a to-do.
    const doc = await makePolicy()
    const russian = await payload.findByID({
      collection: 'policies',
      id: doc.id,
      locale: 'ru',
      overrideAccess: true,
    })

    expect(russian.title).toBe('Fallback Test Policy')
    expect(russian.subtitle).toBe('An English subtitle')
    expect(russian.body).toBeTruthy()
  })
})

describe('a partly translated document', () => {
  it('mixes the translation with the fallback, field by field', async () => {
    /*
      The state a real site spends months in: the title translated because it is short, the subtitle
      not yet. Fallback is per FIELD, not per document — a document is not "translated" or
      "untranslated", each of its fields is.
    */
    const doc = await makePolicy()
    await payload.update({
      collection: 'policies',
      id: doc.id,
      locale: 'ru',
      overrideAccess: true,
      context: skipRevalidation,
      data: { title: 'Переведённый заголовок' },
    })

    const russian = await payload.findByID({
      collection: 'policies',
      id: doc.id,
      locale: 'ru',
      overrideAccess: true,
    })
    expect(russian.title).toBe('Переведённый заголовок')
    expect(russian.subtitle).toBe('An English subtitle')

    // …and English is untouched by the Russian write.
    const english = await payload.findByID({
      collection: 'policies',
      id: doc.id,
      locale: 'en',
      overrideAccess: true,
    })
    expect(english.title).toBe('Fallback Test Policy')
  })

  it('distinguishes translated from falling back when asked to', async () => {
    /*
      FR-024 — the admin has to show an editor what is left to do, and turning the fallback OFF is
      how anything can tell the difference. With it on, "translated to the same words" and "not
      translated at all" are indistinguishable; with it off, an untranslated field reads null.

      **The value is the STRING `'null'`, not `null`.** `sanitizeFallbackLocale` treats a real `null`
      as "unspecified" and falls back to the default locale — so the obvious spelling silently does
      the opposite of what it looks like. `'false'` and `'none'` work too; there is no boolean form.
    */
    const doc = await makePolicy()
    const raw = await payload.findByID({
      collection: 'policies',
      id: doc.id,
      locale: 'ru',
      fallbackLocale: 'null',
      overrideAccess: true,
    })
    expect(raw.title ?? null).toBeNull()
  })
})
