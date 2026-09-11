# Contract: Addresses, redirects and language resolution

**Feature**: `010-site-localization` | Governs FR-005 – FR-018, FR-026 – FR-032

---

## 1. Address shape

| Language | Prefix | Home | Product | Policy |
| --- | --- | --- | --- | --- |
| English (default) | none | `/` | `/products/paragon-ring` | `/legal/privacy` |
| Russian | `/ru` | `/ru` | `/ru/products/paragon-ring` | `/ru/legal/privacy` |
| Ukrainian | `/uk` | `/uk` | `/uk/products/paragon-ring` | `/uk/legal/privacy` |

The slug segment is identical in all three (R7). A cross-language link is a prefix operation on the
current pathname and never a lookup.

**Never prefixed**: `/admin/**` and `/api/**` (Payload), `/_next/**`, `/sitemap.xml`,
`/language/reset`, and any path containing a dot.

**Invariant (FR-013)**: every address the site served before this feature serves the same content
after it. `/legal/privacy` is English and stays English.

---

## 2. `src/proxy.ts`

Next.js 16 renamed `middleware.ts` to `proxy.ts` (R3). The file exports `proxy` and a `config.matcher`:

```
matcher: ['/((?!api|admin|_next|_vercel|language|.*\\..*).*)']
```

Behaviour, in order:

| # | Condition | Response |
| --- | --- | --- |
| 1 | Path starts with `/ru` or `/uk` | Delegate to next-intl. The prefix wins over everything |
| 2 | Path is unprefixed **and** `NEXT_LOCALE` is `ru` or `uk` | `307` to `/<locale><pathname><search>` |
| 3 | Path is unprefixed, no cookie or cookie is `en` | Delegate. English, rewritten internally to `/en/…` |

Rule 2 is the whole of FR-008's return visit, and it is the only place the cookie is acted on.
`localeDetection: false` means next-intl itself never reads the cookie or `accept-language`, so a
first-time visitor always gets English (FR-010) and a crawler — which carries no cookie — always sees
the English page at the unprefixed address.

**The proxy performs no database read and imports nothing from Payload.** Next's own documentation
says Proxy "should not attempt relying on shared modules or globals". Which languages are *offered* is
decided in the render, never here.

---

## 3. Disabled languages

`language-settings` says which non-default locales visitors are offered. Enforcement:

| Where | What it does |
| --- | --- |
| `[locale]/layout.tsx` | Reads the global. If the requested locale is disabled → `redirect('/language/reset?next=<pathname>')` |
| `/language/reset` (Route Handler) | Clears `NEXT_LOCALE`, then `307` to the default-locale equivalent of `next` |
| The language selector | Only ever lists enabled locales, so the cookie cannot normally hold a disabled one |
| `generateMetadata`, `sitemap.ts` | Omit disabled locales from `hreflang` and from the address list |

**Why the reset hop exists**: without it, a visitor holding `NEXT_LOCALE=uk` after Ukrainian is
switched off loops forever — the proxy sends `/` to `/uk`, the layout sends `/uk` back to `/`. A Server
Component cannot clear a cookie and a Route Handler can, so the loop is broken where it can be broken.
`next` is validated as a site-relative path before being used, so the handler cannot be turned into an
open redirect.

**An unknown prefix** — `/de/anything` — is not a locale, so it falls through as an ordinary path and
404s through the normal not-found route.

---

## 4. Switching language

| Surface | Behaviour |
| --- | --- |
| Header selector (`md` and up) | Navigates to the current pathname under the new prefix, preserving the query string |
| Mobile navigation panel | The same, and closes the panel (FR-009) |
| Both | Use next-intl's router so `NEXT_LOCALE` is written client-side on a soft navigation |

The current pathname is preserved because slugs are shared (R7): `/ru/products/paragon-ring` is
always the Russian version of `/products/paragon-ring`, with no lookup and no chance of landing on the
site root (FR-006).

**FR-007 — a page with no equivalent**: cannot arise for content, because a document with no
translation still renders under `fallback: true` (FR-046, FR-048). It can only arise for a locale that
is disabled, which §3 covers.

**FR-011 — nothing is lost**: the cart lives in a cookie keyed by session, not by language; the
customer's session is a separate cookie; neither is touched by a locale change. E2E covers this.

---

## 5. `hreflang` and canonical

Emitted from `generateMetadata` on every route, filtered by the enabled set:

```
<link rel="canonical"  href="https://…/ru/legal/privacy">
<link rel="alternate"  hreflang="en"        href="https://…/legal/privacy">
<link rel="alternate"  hreflang="ru"        href="https://…/ru/legal/privacy">
<link rel="alternate"  hreflang="uk"        href="https://…/uk/legal/privacy">
<link rel="alternate"  hreflang="x-default" href="https://…/legal/privacy">
```

Rules:

- Every page names **itself** canonical, never the English version — three indexable pages, not one
  with two duplicates (FR-016).
- Alternates are **reciprocal**: each of the three names the other two and itself.
- `x-default` is always the English address.
- `alternateLinks: false` in the routing config, because next-intl's automatic `Link` header would
  advertise every *configured* locale including ones the owner has switched off (R12).
- `<html lang>` comes from the same resolved locale (FR-015), replacing the literal `en` at
  `src/app/(frontend)/layout.tsx:65`.

---

## 6. `src/app/sitemap.ts`

- One entry per document **per enabled locale**, each carrying `alternates.languages` (FR-017).
- Reads `language-settings` like every other consumer. Already `force-dynamic`, so nothing about its
  caching changes.
- Iterates the locale list explicitly: it is a Route Handler, and `next/root-params` is not available
  in Route Handlers.
- Stays at `src/app/sitemap.ts`, outside the `[locale]` segment.

---

## 7. Caching

| Concern | Contract |
| --- | --- |
| Prerendering | `generateStaticParams` returns all three locales at the root, multiplying `/products/[slug]`, `/blog/[slug]` and `/legal/[slug]` by three |
| Revalidation | `src/lib/revalidate.ts` invalidates the literal path **in every configured locale** — including disabled ones, so re-enabling a language does not serve pre-toggle content |
| Per-locale isolation | A visitor is never served another language's cached page: the locale is part of the path, so it is part of the cache key (FR-051) |
| The toggle | `revalidateGlobalOnChange` on `language-settings` (FR-031) |
| Dynamic routes | Unchanged. `/`, `/about`, `/blog` stay `force-dynamic` for the reasons `src/lib/catalog/prerender.ts` records; `/cart` stays per-visitor |
