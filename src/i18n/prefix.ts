import { DEFAULT_LOCALE, LOCALES, type Locale } from './routing'

/**
 * Path arithmetic for the locale prefix (spec 010, FR-006, FR-008).
 *
 * Pure, and deliberately so: `src/proxy.ts` cannot be imported by a test — next-intl's middleware
 * reaches for `next/server`, which only resolves inside a Next build — so the decisions it makes
 * live here where they can be asserted directly.
 *
 * The prefix is optional by design (`localePrefix: 'as-needed'`), which is what keeps every address
 * the site published before spec 010 resolving. Everything below is written once and works for both
 * shapes because `splitLocale` normalises them.
 */

export type SplitPath = {
  locale: Locale
  /** The path with any locale prefix removed — always starts with `/`. */
  path: string
  /** Whether the original path actually carried a prefix, as opposed to defaulting to English. */
  prefixed: boolean
}

export function splitLocale(pathname: string): SplitPath {
  const [, head = '', ...tail] = pathname.split('/')
  if ((LOCALES as readonly string[]).includes(head)) {
    return { locale: head as Locale, path: `/${tail.join('/')}`, prefixed: true }
  }
  return { locale: DEFAULT_LOCALE, path: pathname, prefixed: false }
}

/** The same path under a given language. English is unprefixed; the other two are not. */
export function localeHref(locale: Locale, path: string): string {
  const normalised = path.startsWith('/') ? path : `/${path}`
  if (locale === DEFAULT_LOCALE) return normalised
  return normalised === '/' ? `/${locale}` : `/${locale}${normalised}`
}

/**
 * Where a visitor with a remembered choice should be sent, or `undefined` to leave them alone.
 *
 * **This is ours rather than next-intl's, and the reason is worth keeping.** The library's
 * `localeDetection` is a single boolean covering both the `accept-language` header and the cookie,
 * and FR-010 forbids the first while FR-008 requires the second. So detection is off and the cookie
 * is read here — on an unprefixed path only.
 *
 * A crawler carries no cookie, so `/` stays English for indexing and stays prerendered. A visitor
 * who chose Russian yesterday and types the bare domain lands on `/ru`. Neither page is
 * personalised: the redirect happens before the cache is consulted, not inside the render.
 */
export function rememberedRedirect(pathname: string, cookieValue: string | undefined): string | undefined {
  if (!cookieValue) return undefined

  const { prefixed } = splitLocale(pathname)
  // A prefix in the address always wins over a remembered preference — otherwise a Russian visitor
  // could never read one page in English, and a shared link would not survive being opened.
  if (prefixed) return undefined

  if (!(LOCALES as readonly string[]).includes(cookieValue)) return undefined
  const remembered = cookieValue as Locale
  if (remembered === DEFAULT_LOCALE) return undefined

  return localeHref(remembered, pathname)
}
