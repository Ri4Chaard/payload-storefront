import { locale as localeParam } from 'next/root-params'

import { DEFAULT_LOCALE, LOCALES, type Locale } from './routing'

/**
 * Narrowing the locale, in one place (spec 010, research R2).
 *
 * **`await localeParam()` is `string | undefined` here, not `string`, and that is not a mistake in
 * the type.** `next/root-params` widens a getter to include `undefined` when the parameter is absent
 * from any root layout, and this app has two: the storefront's `[locale]` one and Payload's at
 * `src/app/(payload)/layout.tsx`. Rather than every caller inventing its own guess, the narrowing
 * happens here and returns something usable.
 *
 * **Where these cannot be called**, per the framework, and what to use instead:
 *
 * | Context                                   | Use                                    |
 * | ----------------------------------------- | -------------------------------------- |
 * | Server Components and the utilities they call | `currentLocale()`                  |
 * | Client Components                         | `useLocale()` from next-intl           |
 * | Server Actions                            | an explicit argument — see FR-042      |
 * | Route Handlers, `sitemap.ts`              | iterate `LOCALES`                      |
 * | `unstable_cache`                          | `"use cache"`, which tracks root params |
 *
 * The Server Action restriction is permanent and the Route Handler one is "planned for a future
 * release", which is why `src/lib` loaders take a locale parameter instead of reaching for one.
 */
export function asLocale(value: string | undefined | null): Locale | undefined {
  if (!value) return undefined
  return (LOCALES as readonly string[]).includes(value) ? (value as Locale) : undefined
}

/**
 * The locale the current request is being rendered in.
 *
 * Falls back to the default rather than throwing: a Server Component rendered outside the `[locale]`
 * tree — Payload's admin shell reaching for a shared utility, say — should render English, not crash.
 * A request whose segment is genuinely not a locale is rejected in the layout with `notFound()`,
 * which is the right place for it because it can produce a page.
 */
export async function currentLocale(): Promise<Locale> {
  return asLocale(await localeParam()) ?? DEFAULT_LOCALE
}
