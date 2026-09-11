import { describe, expect, it, vi } from 'vitest'

import { loadMessages } from '@/i18n/messages'
import { BCP47, DEFAULT_LOCALE, LOCALES, LOCALE_LABELS, SECONDARY_LOCALES } from '@/i18n/routing'

/**
 * Locale narrowing and the English fallback (spec 010, T010 — FR-037, FR-046).
 *
 * **`asLocale` is imported through a mock of `next/root-params`.** The module it lives in imports
 * that framework module at the top level, and `next/root-params` only resolves inside a Next render
 * — so without the mock this file fails at import time rather than at assertion time. The mock is
 * only load-bearing for `currentLocale`, which is covered by the e2e suite against a real render;
 * what matters here is the pure narrowing beneath it.
 */
vi.mock('next/root-params', () => ({ locale: async () => undefined }))

const { asLocale } = await import('@/i18n/locale')

describe('asLocale', () => {
  it('accepts each of the three languages', () => {
    for (const locale of LOCALES) expect(asLocale(locale)).toBe(locale)
  })

  it('refuses anything that is not one of them', () => {
    // `de` is a real language and still not one this site offers; `EN` is the DISPLAY code, which
    // is what a careless caller would pass in from `LOCALE_LABELS`.
    for (const value of ['de', 'EN', 'en-US', 'ru-RU', '', ' ', 'enn']) {
      expect(asLocale(value)).toBeUndefined()
    }
  })

  it('refuses an absent value rather than guessing', () => {
    // This is the `string | undefined` that `next/root-params` hands back when a request is served
    // by the OTHER root layout — Payload's. Guessing a default here would render the admin's
    // shared utilities in a language nobody asked for.
    expect(asLocale(undefined)).toBeUndefined()
    expect(asLocale(null)).toBeUndefined()
  })
})

describe('the locale constants', () => {
  it('names English as the default and excludes it from the toggleable set', () => {
    // FR-029: English has no checkbox in `language-settings`, so it cannot be switched off.
    expect(DEFAULT_LOCALE).toBe('en')
    expect(SECONDARY_LOCALES).toEqual(['ru', 'uk'])
    expect(SECONDARY_LOCALES).not.toContain(DEFAULT_LOCALE)
  })

  it('gives every locale a display code, a name in its own language, and a formatting tag', () => {
    for (const locale of LOCALES) {
      expect(LOCALE_LABELS[locale].code).toBe(locale.toUpperCase())
      expect(LOCALE_LABELS[locale].label.length).toBeGreaterThan(0)
      // A region is named on purpose: `Intl` resolving differently on the server and in the browser
      // is what makes a formatted price flicker on hydration.
      expect(BCP47[locale]).toMatch(/^[a-z]{2}-[A-Z]{2}$/)
    }
  })
})

describe('loadMessages', () => {
  it('returns English untouched for the default locale', () => {
    expect(loadMessages('en')).toBe(loadMessages('en'))
  })

  it('falls back to English for a key the locale has not translated', () => {
    // FR-037. next-intl's own default is to render the KEY, which puts `catalog.applied` on a
    // Russian page — worse than the English sentence it replaced.
    const en = loadMessages('en') as Record<string, unknown>
    const ru = loadMessages('ru') as Record<string, unknown>
    for (const key of Object.keys(en)) expect(ru).toHaveProperty(key)
  })
})
