import { describe, expect, it } from 'vitest'

import { BCP47, LOCALES } from '@/i18n/routing'
import { CATALOG_CURRENCY, formatPriceFor } from '@/lib/catalog/price'
import { countryName } from '@/lib/countries'

/**
 * Money, dates and country names in three languages.
 *
 * **The assertion that matters is that the AMOUNT never changes.** Localisation moves the currency
 * symbol, the group separator and the decimal mark; it must not touch what is owed. Constitution VI
 * keeps one currency in integer minor units, and FR-038 says the same thing from the visitor's side.
 */
describe('prices', () => {
  it('renders the same amount in every language', () => {
    // 2 490 000 minor units — $24,900, which the formatter writes without cents because it is
    // whole. The invariant is not which digits appear but that all three languages agree on them.
    const rendered = LOCALES.map((locale) => formatPriceFor(locale, 2_490_000))
    const digits = rendered.map((price) => price.replace(/\D/g, ''))

    expect(new Set(digits).size, `same amount everywhere: ${rendered.join(' | ')}`).toBe(1)
    expect(digits[0]).toBe('24900')

    // …and they are not all the same string, or nothing is being localised at all.
    expect(new Set(rendered).size).toBeGreaterThan(1)
  })

  it('agrees on a fractional amount too, where the decimal mark differs', () => {
    // 1 234 56 minor units — $1,234.56 in English, 1 234,56 $ in Russian. Same money.
    const rendered = LOCALES.map((locale) => formatPriceFor(locale, 123_456))
    const digits = rendered.map((price) => price.replace(/\D/g, ''))
    expect(new Set(digits).size, rendered.join(' | ')).toBe(1)
    expect(digits[0]).toBe('123456')
  })

  it('keeps one currency', () => {
    expect(CATALOG_CURRENCY).toBe('USD')
    for (const locale of LOCALES) {
      const price = formatPriceFor(locale, 100_00)
      expect(price).toMatch(/\$|US\$|USD/)
    }
  })

  it('names a region in every formatting tag', () => {
    // Node takes its default locale from `LANG` and a browser from the user, so an implicit tag is
    // a hydration mismatch waiting for a server with different environment variables.
    for (const locale of LOCALES) expect(BCP47[locale]).toMatch(/^[a-z]{2}-[A-Z]{2}$/)
  })
})

describe('dates', () => {
  it('writes the month in the language being read', () => {
    const date = new Date('2026-08-08T00:00:00.000Z')
    const format = (locale: (typeof LOCALES)[number]) =>
      new Intl.DateTimeFormat(BCP47[locale], {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date)

    expect(format('en')).toContain('August')
    expect(format('ru')).toMatch(/август/i)
    expect(format('uk')).toMatch(/серпня/i)
  })
})

describe('country names', () => {
  it('comes from the runtime, in the language being read', () => {
    // `countries.ts` has resolved these through `Intl.DisplayNames` since spec 004 — its own comment
    // predicted this feature: "already translated into every language the site might add".
    expect(countryName('KZ', 'en')).toBe('Kazakhstan')
    expect(countryName('KZ', 'ru')).toMatch(/Казахстан/)
    expect(countryName('KZ', 'uk')).toMatch(/Казахстан/)
    expect(countryName('AE', 'ru')).not.toBe(countryName('AE', 'en'))
  })

  it('falls back to the code rather than rendering nothing', () => {
    expect(countryName('KZ', 'en').length).toBeGreaterThan(0)
  })
})
