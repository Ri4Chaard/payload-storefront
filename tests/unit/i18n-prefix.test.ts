import { describe, expect, it } from 'vitest'

import { localeHref, rememberedRedirect, splitLocale } from '@/i18n/prefix'

/**
 * The prefix rules.
 *
 * These are the decisions `src/proxy.ts` makes on every request, lifted into a pure module so they
 * can be asserted without a `NextRequest`. The proxy itself is exercised against a real server in
 * `tests/e2e/language-switch.spec.ts`.
 */

describe('splitLocale', () => {
  it('reads the prefix when there is one', () => {
    expect(splitLocale('/ru/legal/privacy')).toEqual({
      locale: 'ru',
      path: '/legal/privacy',
      prefixed: true,
    })
    expect(splitLocale('/uk')).toEqual({ locale: 'uk', path: '/', prefixed: true })
  })

  it('defaults to English when there is none, and says so', () => {
    // `prefixed: false` is what distinguishes "English by default" from "English by request", and
    // the remembered-choice rule turns on exactly that distinction.
    expect(splitLocale('/legal/privacy')).toEqual({
      locale: 'en',
      path: '/legal/privacy',
      prefixed: false,
    })
  })

  it('does not mistake a path segment that merely starts like a locale', () => {
    // `/rugs` is not Russian. Splitting on the string rather than the segment would make it so.
    expect(splitLocale('/rugs').prefixed).toBe(false)
    expect(splitLocale('/uk-collection').prefixed).toBe(false)
  })
})

describe('localeHref', () => {
  it('leaves English unprefixed — this is FR-013 in one line', () => {
    expect(localeHref('en', '/legal/privacy')).toBe('/legal/privacy')
    expect(localeHref('en', '/')).toBe('/')
  })

  it('prefixes the other two, including the root', () => {
    expect(localeHref('ru', '/legal/privacy')).toBe('/ru/legal/privacy')
    // `/ru/` with a trailing slash would be a second address for the same page.
    expect(localeHref('ru', '/')).toBe('/ru')
    expect(localeHref('uk', '/cart')).toBe('/uk/cart')
  })
})

describe('rememberedRedirect', () => {
  it('sends a visitor who chose Russian back to Russian on an unprefixed path', () => {
    expect(rememberedRedirect('/', 'ru')).toBe('/ru')
    expect(rememberedRedirect('/legal/privacy', 'ru')).toBe('/ru/legal/privacy')
  })

  it('leaves a prefixed address alone, whatever the cookie says', () => {
    // A shared link must survive being opened. Without this, a Russian reader could never open one
    // page in English and an emailed `/legal/privacy` would silently change language.
    expect(rememberedRedirect('/uk/cart', 'ru')).toBeUndefined()
    expect(rememberedRedirect('/ru/cart', 'ru')).toBeUndefined()
  })

  it('does nothing for a first-time visitor', () => {
    // FR-010. No cookie means no opinion, and the browser's languages are never consulted — that is
    // the difference between this and next-intl's own `localeDetection`.
    expect(rememberedRedirect('/', undefined)).toBeUndefined()
    expect(rememberedRedirect('/', '')).toBeUndefined()
  })

  it('does nothing when the remembered language is the default', () => {
    // Redirecting `/` to `/` is a loop, and next-intl writes `NEXT_LOCALE=en` for a visitor whose
    // browser asked for something else — so this case is reached on ordinary traffic, not in theory.
    expect(rememberedRedirect('/', 'en')).toBeUndefined()
  })

  it('ignores a cookie naming a language this site does not have', () => {
    expect(rememberedRedirect('/', 'de')).toBeUndefined()
    expect(rememberedRedirect('/', 'RU')).toBeUndefined()
  })
})
