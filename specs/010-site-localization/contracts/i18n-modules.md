# Contract: The `src/i18n/` module surface

**Feature**: `010-site-localization` | Governs FR-033 – FR-041, FR-042 – FR-046

Everything language-related that is not a Payload field lives under `src/i18n/`. Nothing outside it
hardcodes a locale code.

---

## 1. `src/i18n/routing.ts` — the single definition of "three languages"

```ts
export const LOCALES = ['en', 'ru', 'uk'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

/** Display code and spoken name — FR-003. `code` is what the selector shows. */
export const LOCALE_LABELS: Record<Locale, { code: string; label: string }> = {
  en: { code: 'EN', label: 'English' },
  ru: { code: 'RU', label: 'Русский' },
  uk: { code: 'UK', label: 'Українська' },
}

/** Money, dates and country names — R14. */
export const BCP47: Record<Locale, string> = { en: 'en-US', ru: 'ru-RU', uk: 'uk-UA' }

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
  localeDetection: false,
  localeCookie: { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' },
  alternateLinks: false,
})
```

Every one of those five options is a requirement, not a preference: `as-needed` is FR-013,
`localeDetection: false` is FR-010, `localeCookie.maxAge` is FR-008, `alternateLinks: false` is FR-027
(R12). Changing one changes a requirement.

`LOCALES` is also what generates `language-settings`' checkbox fields and Payload's `localization.locales`,
so the three languages have one definition in the repository.

---

## 2. `src/i18n/locale.ts` — narrowing, once

```ts
/** The current locale in a Server Component. Never returns undefined. */
export async function currentLocale(): Promise<Locale>

/** Narrow an unknown string, e.g. a route param or a cookie value. */
export function asLocale(value: string | undefined): Locale | undefined
```

`currentLocale()` wraps `next/root-params`, which returns **`string | undefined`** here rather than
`string`: this app has two root layouts — the storefront's `[locale]` one and Payload's — and the docs
state that a parameter absent from one of them widens to include `undefined`. That narrowing happens in
this file and nowhere else.

**Where it cannot be used**, per the framework, and what to do instead:

| Context | Available? | Instead |
| --- | --- | --- |
| Server Components, server utilities they call | Yes | — |
| Client Components | No | `useLocale()` from next-intl |
| Server Actions | No | An explicit argument or form field (§5) |
| Route Handlers, `sitemap.ts` | No | Iterate `LOCALES`, or read the path |
| `unstable_cache` | No | `"use cache"`, which tracks root params as cache keys |

---

## 3. `src/i18n/request.ts` — messages per request

```ts
export default getRequestConfig(async ({ locale }) => {
  const resolved = asLocale(locale) ?? (await currentLocale())
  return { locale: resolved, messages: await loadMessages(resolved) }
})
```

`loadMessages` deep-merges `en` **beneath** the requested locale, so a key with no translation renders
the English sentence instead of the raw key (FR-037). English is merged once per request, on the
server.

The `requestLocale` parameter is **not** used: next-intl 4.14.4 marks it
`@deprecated Please migrate to next/root-params`, and `AGENTS.md` says to heed deprecations.

---

## 4. Reading a string

| Context | Call |
| --- | --- |
| Server Component | `const t = await getTranslations('catalog')` |
| Client Component | `const t = useTranslations('catalog')` |
| Server Action / email | `await getTranslations({ locale, namespace: 'email' })` — the one place a locale is passed explicitly |
| UI-kit primitive | **No call.** It keeps taking text as a prop, as it already does |

The last row is the rule that keeps this feature small. `src/components/ui/**` primitives already
accept copy as props with English defaults (`label = 'Load more'`); a translated string arrives where a
string already arrived, and the default becomes a development fallback. Only the ~25 feature components
that hold their own copy call `useTranslations`.

`NextIntlClientProvider` sits in the root layout carrying **only** the namespaces client components
read — `common`, `header`, `nav`, `cart`, `account`, `forms`, `errors`. Legal, blog and product prose
never enters the flight payload.

---

## 5. Server Actions

Every action that produces user-visible text takes the locale as **input**:

```ts
submitEnquiry({ …fields, locale })      // src/lib/contact/actions.ts
requestPasswordReset({ email, locale }) // src/lib/auth/actions.ts
```

Not read from the environment, and specifically **not** read from `NEXT_LOCALE`: a visitor who arrives
on `/ru/contact` from a link and never touches the selector has no cookie, and their acknowledgement
would go out in English (FR-042). The client component knows its locale from `useLocale()` and sends it;
zod validates it against `LOCALES` on arrival like any other input.

---

## 6. The data layer

Every loader takes an explicit locale:

```ts
getProduct(slug: string, locale: Locale)
getArticles({ locale, … })
getPolicy(slug: string, locale: Locale)
getShopSettings(locale: Locale)
```

which becomes `payload.find({ …, locale, fallbackLocale: DEFAULT_LOCALE })`.

A parameter rather than an internal `currentLocale()` call, because `src/app/sitemap.ts` is a Route
Handler and the server actions are Server Actions — both places root params do not reach. A loader that
works in a page and throws in the sitemap is worse than an argument (R13).

**Fallback is on** (`localization.fallback: true`), so an untranslated field returns the English value
and a page never renders a blank region (FR-046, FR-047).

---

## 7. Formatting

| What | How | Note |
| --- | --- | --- |
| Money | `formatPrice(amount, currency, BCP47[locale])` | `src/lib/catalog/price.ts` already takes a locale. One currency, integer minor units, unchanged (FR-038, Constitution VI) |
| Dates | `Intl.DateTimeFormat(BCP47[locale])` | FR-039 |
| Country names | `countryName(code, locale)` | `src/lib/countries.ts` already resolves through `Intl.DisplayNames` and already takes the argument (FR-040) |
| Plurals | ICU `plural` in the message file, `one/few/many/other` | Russian and Ukrainian have three categories; English two (FR-036) |

The same locale must be used on the server and on the client for any formatted value that hydrates, or
React reports a mismatch — `price.ts` already carries that warning in its own comment, and the locale
now arrives explicitly instead of being defaulted.

---

## 8. Links

| Seam | Change |
| --- | --- |
| `src/components/ui/link`, `src/components/ui/nav-link` | Use next-intl's `Link`, so every internal href carries the current prefix |
| 13 direct `next/link` imports | Repointed at the kit primitive or at next-intl's `Link` |
| `src/lib/catalog/listing-url.ts`, `src/lib/blog/blog-url.ts`, `src/lib/policies/policy-url.ts` | Unchanged. They keep returning unprefixed, locale-independent paths; prefixing is the link layer's job |
| Absolute URLs for metadata and the sitemap | One helper, `absoluteHref(locale, path)` |

Keeping the href builders locale-free is deliberate: a path is a fact about a document, and a prefix is
a fact about a request. Mixing them would mean every builder needed a locale and every test needed one
too.
