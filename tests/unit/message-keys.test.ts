import { describe, expect, it } from 'vitest'

import en from '@/i18n/messages/en.json' with { type: 'json' }
import ru from '@/i18n/messages/ru.json' with { type: 'json' }
import uk from '@/i18n/messages/uk.json' with { type: 'json' }
import { LOCALES } from '@/i18n/routing'

/**
 * The message files agree with each other.
 *
 * A key present in English and missing elsewhere is *handled* — `loadMessages` merges English
 * underneath every locale, so it renders the English sentence rather than the raw key. This file is
 * about the other direction and about shape: a key that exists only in Russian is dead weight
 * nobody will ever see, and a plural that parses in one language and not another is a crash on a
 * page nobody tested.
 */
const FILES: Record<string, unknown> = { en, ru, uk }

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value }
  if (typeof value !== 'object' || value === null) return {}
  return Object.entries(value).reduce<Record<string, string>>(
    (acc, [key, child]) => ({ ...acc, ...flatten(child, prefix ? `${prefix}.${key}` : key) }),
    {},
  )
}

const flat = Object.fromEntries(Object.entries(FILES).map(([code, file]) => [code, flatten(file)]))

describe('the message files', () => {
  it('has a file for every language the site offers', () => {
    for (const locale of LOCALES) expect(FILES[locale]).toBeDefined()
  })

  it('defines every key in English', () => {
    // English is the type source and the fallback. A key it does not have cannot be typed, and
    // cannot fall back to anything.
    const english = new Set(Object.keys(flat.en ?? {}))
    for (const locale of ['ru', 'uk']) {
      const orphans = Object.keys(flat[locale] ?? {}).filter((key) => !english.has(key))
      expect(orphans, `${locale} has keys English does not`).toEqual([])
    }
  })

  it('translates every key in every language', () => {
    // Not required by the fallback — but an untranslated key here means an English sentence on a
    // Russian page, and this is the list of them.
    for (const locale of ['ru', 'uk']) {
      const missing = Object.keys(flat.en ?? {}).filter((key) => !(key in (flat[locale] ?? {})))
      expect(missing, `${locale} is missing translations`).toEqual([])
    }
  })

  it('never leaves a translated string identical to the English one', () => {
    // A copy-paste that was never translated looks exactly like a deliberate loan word. The few
    // genuine ones are listed, so adding to that list is a decision rather than an accident.
    const LOANWORDS: string[] = []
    for (const locale of ['ru', 'uk']) {
      const untranslated = Object.entries(flat[locale] ?? {})
        .filter(([key, value]) => flat.en?.[key] === value && !LOANWORDS.includes(key))
        .map(([key]) => key)
      expect(untranslated, `${locale} has untranslated strings`).toEqual([])
    }
  })

  it('gives Russian and Ukrainian all three plural categories', () => {
    /*
      FR-036. English has `one` and `other`; Russian and Ukrainian need `one`, `few` and `many` —
      1 товар, 2 товара, 5 товаров. A translator who supplied only `one`/`other` produces a string
      that is wrong for most numbers, and nothing else in the suite would notice.
    */
    const plurals = Object.entries(flat.en ?? {})
      .filter(([, value]) => value.includes(', plural,'))
      .map(([key]) => key)
    expect(plurals.length).toBeGreaterThan(0)

    for (const locale of ['ru', 'uk']) {
      for (const key of plurals) {
        const value = flat[locale]?.[key] ?? ''
        for (const category of ['one {', 'few {', 'many {']) {
          expect(value, `${locale}.${key} is missing the "${category}" case`).toContain(category)
        }
      }
    }
  })

  it('keeps every placeholder a string carries', () => {
    // Dropping `{code}` from a verification email turns it into an email with no code in it.
    const placeholders = (value: string) =>
      [...value.matchAll(/\{(\w+)[,}]/g)].map((match) => match[1]).sort()

    for (const locale of ['ru', 'uk']) {
      for (const [key, english] of Object.entries(flat.en ?? {})) {
        const translated = flat[locale]?.[key]
        if (!translated) continue
        expect(placeholders(translated), `${locale}.${key} placeholders`).toEqual(
          placeholders(english),
        )
      }
    }
  })
})
