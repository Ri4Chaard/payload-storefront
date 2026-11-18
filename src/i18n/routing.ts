import { defineRouting } from 'next-intl/routing'

/**
 * The three languages, defined once.
 *
 * Everything downstream reads from here: Payload's `localization.locales`, the `language-settings`
 * global's checkbox fields, the header's switcher, the sitemap, and the proxy. A fourth language is
 * a schema change — every localized field gains a column — so this list is deliberately a code-level
 * fact rather than something the admin can extend.
 */
export const LOCALES = ['en', 'ru', 'uk'] as const

export type Locale = (typeof LOCALES)[number]

/**
 * The language a visitor gets when they have not asked for one, the language untranslated content
 * falls back to, and the one that cannot be switched off.
 */
export const DEFAULT_LOCALE: Locale = 'en'

/** Every locale except the default — the set the owner can actually toggle. */
export const SECONDARY_LOCALES = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE) as Exclude<
  Locale,
  typeof DEFAULT_LOCALE
>[]

/**
 * What the switcher shows and what a screen reader says.
 *
 * `code` is the two letters on the trigger; `label` is the language's name **in that language**,
 * because "Русский" reads correctly to someone working in any of the three, where "Russian" only
 * reads correctly to one of them.
 */
export const LOCALE_LABELS: Record<Locale, { code: string; label: string }> = {
  en: { code: 'EN', label: 'English' },
  ru: { code: 'RU', label: 'Русский' },
  uk: { code: 'UK', label: 'Українська' },
}

/**
 * The tag `Intl` wants, which is not the tag the URL carries.
 *
 * `ru` alone formats money as `24 900,00 $` with a non-breaking group separator, which is correct;
 * the region is still named so that the server and the browser cannot resolve it differently. A
 * price that formats one way during the render and another during hydration is a React mismatch
 * warning and a visibly flickering number.
 */
export const BCP47: Record<Locale, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  uk: 'uk-UA',
}

/**
 * **Every option here implements a requirement. None of them is a preference.**
 *
 * - `localePrefix: 'as-needed'` — English stays unprefixed so every address the site published
 *   before this feature keeps resolving. Prefixing all three would move every indexed URL.
 * - `localeDetection: false` — the browser's `accept-language` is never acted on. This one
 *   boolean also stops next-intl reading the cookie, which looks like it breaks FR-008 and does not:
 *   cookie *writing* lives in the library's `syncCookie` and is gated on `localeCookie` instead, so
 *   the memory is kept and `src/proxy.ts` decides what to do with it.
 * - `localeCookie.maxAge` — twelve months, which is FR-008's "return visit" in one number.
 * - `alternateLinks: false` — the library's automatic `Link` header advertises every *configured*
 *   locale, including one the owner has switched off. Alternates are emitted from `generateMetadata`
 *   instead, where the enabled set is known.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
  localeDetection: false,
  localeCookie: { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' },
  alternateLinks: false,
})

/** The cookie next-intl keeps the visitor's choice in. Named here so `src/proxy.ts` agrees with it. */
export const LOCALE_COOKIE = 'NEXT_LOCALE'
