import type { Metadata } from 'next'

import { localeHref } from '@/i18n/prefix'
import { DEFAULT_LOCALE, type Locale } from '@/i18n/routing'
import { getEnabledLocales } from '@/lib/i18n/enabled'

/**
 * The cross-language links every page carries (spec 010, FR-016, research R12).
 *
 * **Three indexable pages, not one page with two duplicates.** Each language names ITSELF canonical
 * — pointing all three at the English address would ask Google to drop the other two, which is the
 * failure this whole feature exists to avoid. Then each names its siblings as alternates, and the
 * relationship is reciprocal because every page computes the same set from the same list.
 *
 * **Filtered by what is actually on offer.** next-intl's middleware can emit these as `Link` headers
 * on its own, and it defaults to doing so — but it emits every CONFIGURED locale, so it would keep
 * advertising Ukrainian to a crawler the day the owner switched Ukrainian off. `alternateLinks:
 * false` in the routing config turns that off and this function replaces it, because the render can
 * read the enabled set and the proxy cannot.
 *
 * **`x-default` is always English.** It is what a crawler uses for a visitor whose language matches
 * none of ours, and English is the language the site falls back to everywhere else.
 *
 * `path` is the address WITHOUT a prefix — `/legal/privacy`, the value the href builders already
 * return. Prefixing is this function's job.
 */
export async function localeAlternates(
  path: string,
  locale: Locale,
): Promise<Metadata['alternates']> {
  const enabled = await getEnabledLocales()

  const languages = Object.fromEntries(
    enabled.map((code) => [code, localeHref(code, path)]),
  ) as Record<string, string>

  return {
    canonical: localeHref(locale, path),
    languages: {
      ...languages,
      'x-default': localeHref(DEFAULT_LOCALE, path),
    },
  }
}
