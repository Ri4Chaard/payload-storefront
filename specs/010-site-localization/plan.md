# Implementation Plan: Three Languages Across the Whole Site

**Branch**: `010-site-localization` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-site-localization/spec.md`

---

## Summary

Make the whole site exist in English, Russian and Ukrainian, and make the language selector that has
been drawn in the header since spec 001 actually do something.

Two bodies of words, two mechanisms, no overlap:

- **Content** — roughly a hundred fields across thirteen collections, eight globals and seven blocks —
  becomes localized in Payload. `localization: { locales, defaultLocale: 'en', fallback: true }`, a
  `localized: true` flag on every field that holds words, and one hand-edited migration that carries
  today's rows into the new `_locales` tables as English.
- **Interface strings** — several hundred, across ~25 client components and every server-rendered
  screen — move into `src/i18n/messages/{en,ru,uk}.json` and render through **next-intl 4.14.4**.

The locale is a **root dynamic segment**: every route under `src/app/(frontend)/` moves into
`[locale]/`, English stays unprefixed so today's addresses keep resolving, and `/ru/…` and `/uk/…`
join them. `src/proxy.ts` — Next 16's rename of `middleware.ts` — resolves the prefix and, on an
unprefixed path only, honours a remembered choice. Detection is off: nobody is redirected because of
their browser's language.

A new `language-settings` global decides which languages visitors are *offered*, independently of the
three Payload always knows — so Ukrainian can be translated in the admin for weeks before anyone sees
it.

The three decisions the user made in clarification hold throughout: no automatic detection (FR-010),
the admin toggles visibility rather than defining the language list (FR-032), and interface strings
stay in the codebase (FR-035).

**Research is in [research.md](./research.md)**, and its first entry answers the question the user
asked directly: next-intl is the right library, for a reason that only became true in Next.js 16.3.

---

## Technical Context

**Language/Version**: TypeScript 5.9 strict, React 19.2, Node 22

**Framework**: Next.js **16.3.3** App Router. Two findings from its bundled docs drive this plan and
postdate most training data — `middleware.ts` is deprecated in favour of **`proxy.ts`**, and
**`next/root-params`** (new in 16.3.0) exposes a root dynamic segment to any Server Component without
prop drilling. Both verified in `node_modules/next/dist/docs/`.

**Primary Dependencies**: Payload **3.88.0** (`@payloadcms/db-postgres`, `@payloadcms/plugin-ecommerce`,
`@payloadcms/richtext-lexical`), Tailwind 4.3, zod 4.5, react-hook-form 7.87. **One new dependency:
`next-intl@4.14.4`** — peer range includes `next ^16`, justified in Complexity Tracking.

**Storage**: PostgreSQL through Payload. Localized fields move to `<table>_locales` siblings
(`localesSuffix` defaults to `'_locales'`). Migrations generated, hand-edited to carry data, committed,
never auto-pushed.

**Testing**: vitest (unit + integration), Playwright (e2e, a11y via `@axe-core/playwright`), Storybook
10 with `check:stories`, `pnpm measure:js` against a production server.

**Target Platform**: Long-running Node container (not serverless — the jobs scheduler depends on it).

**Project Type**: Web application — Payload CMS with a Next.js App Router storefront.

**Performance Goals**: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at p75 mobile. Unchanged by this feature;
re-measured because a new client runtime lands in the root layout.

**Constraints**: ≤ 300KB gzipped initial JS per route **and** ≤ 100KB above the framework baseline.
Spec 009 measured the worst route at **202.9 KB against a 192.3 KB baseline — 10.6 KB of a 100 KB
allowance**, so there is roughly 89 KB of headroom for next-intl's runtime and the message payload.
That is a measurement to repeat, not a licence.

**Scale/Scope**: 3 locales × 12 route families; ~100 Payload fields localized; ~300 interface strings;
58 client components, of which ~25 hold their own copy; 195 component and route files moved or touched;
one migration against live content.

---

## Constitution Check

*GATE: evaluated before Phase 0, re-evaluated after Phase 1 design. Both passes recorded.*

| Principle | Verdict | How |
| --- | --- | --- |
| **I. Payload is the single source of truth** | Pass, with one recorded deviation | Every editorial word becomes a localized Payload field, including alt text, metadata and CTA labels. Interface strings stay in code by the user's FR-035 ruling — logged in Complexity Tracking with the boundary written down |
| **II. Reuse before creation** | Pass | `LanguageSelector` is reused **unchanged** — its props were designed for this. `price.ts` already takes a locale; `countries.ts` already resolves names through `Intl.DisplayNames` with a locale argument; `revalidate.ts`, `slugField`, `seo.ts`, `cta.ts` and `form-errors.ts`'s message-key indirection are all extended rather than duplicated. No new UI component |
| **III. Design tokens over magic values** | Pass | No new visual design. The one risk is text length — Russian runs ~15% longer — so fixed-width affordances are checked at all three languages rather than assumed |
| **IV. Content modeling & schema evolution** | Pass | Field-by-field model in [data-model.md](./data-model.md); migration with a tested rollback rehearsed on a production-sized restore; explicit access control on the new global; drafts and versions preserved, with `defaultLocalePublishOption: 'active'` so publishing one language cannot publish another's draft |
| **V. Performance, accessibility & SEO budgets** | Pass, gated on measurement | Server components stay the default — `use client` count does not rise. `hreflang`, reciprocal canonicals, `x-default`, per-locale sitemap, correct `<html lang>`. JS re-measured against the 192.3 KB baseline; a11y suite runs in all three languages |
| **VI. Commerce correctness & data protection** | Pass | One currency, integer minor units, unchanged. Access control is locale-independent by construction — the locale never enters an access rule. The locale cookie holds a preference, no identifier, and is strictly necessary, so it sits outside spec 009's consent categories |

**Post-design re-evaluation**: unchanged. The design added one global, one route handler, one proxy
file and one dependency; none of them moved a gate. The two judgement calls — interface strings in code
(Principle I) and a new dependency (Principle II) — are both in Complexity Tracking, and FR-035 requires
the first to be recorded there by name.

---

## Project Structure

### Documentation (this feature)

```text
specs/010-site-localization/
├── plan.md              # This file
├── research.md          # Phase 0 — R1..R18, every decision with its source
├── data-model.md        # Phase 1 — which fields localize, and the migration
├── quickstart.md        # Phase 1 — how to prove it works
├── contracts/
│   ├── routing.md       # Addresses, proxy behaviour, hreflang, caching
│   └── i18n-modules.md  # The src/i18n/ surface and where a locale may be read
├── checklists/
│   └── requirements.md  # Spec quality gate — all 17 items pass
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── proxy.ts                        # NEW. Next 16's rename of middleware.ts
├── i18n/                           # NEW — the whole language mechanism
│   ├── routing.ts                  #   LOCALES, DEFAULT_LOCALE, labels, BCP 47, next-intl routing
│   ├── locale.ts                   #   currentLocale() / asLocale() — the only narrowing
│   ├── request.ts                  #   getRequestConfig, English-merged message loading
│   ├── navigation.ts               #   next-intl Link / router / redirect wrappers
│   └── messages/
│       ├── en.json                 #   the type source
│       ├── ru.json
│       └── uk.json
│
├── app/
│   ├── sitemap.ts                  # One entry per document per ENABLED locale
│   └── (frontend)/
│       ├── language/reset/route.ts # NEW. Clears a stale locale cookie — breaks the redirect loop
│       └── [locale]/               # NEW segment; everything below MOVES into it
│           ├── layout.tsx          #   root layout: <html lang>, provider, enabled-locale gate
│           ├── page.tsx
│           ├── (account)/…         #   six routes, moved
│           ├── (shop)/…            #   [category], all-jewelry, cart, moved
│           ├── about, blog, contact, faq, legal, products …
│           └── (each gains generateStaticParams over the three locales)
│
├── payload.config.ts               # localization block; language-settings registered
├── globals/
│   └── language-settings.ts        # NEW. Which languages visitors are offered
├── collections/*.ts                # localized: true on every field that holds words
├── blocks/*.ts                     # same
├── fields/
│   ├── seo.ts, cta.ts              # localized — the leverage points
│   └── slug.ts                     # transliteration, so a Cyrillic title is saveable
│
├── components/
│   ├── layout/header/header.tsx    # DEFAULT_LOCALES deleted; locale comes from the route
│   ├── layout/mobile-nav/…         # same switcher, same effect
│   ├── layout/language-selector/   # UNCHANGED
│   └── ui/link, ui/nav-link        # locale-aware Link
│
└── lib/
    ├── */queries.ts                # every loader takes an explicit locale
    ├── auth/actions.ts             # actions take locale as input, not from the environment
    ├── contact/actions.ts          # same; enquiries record their locale
    ├── email/*.ts                  # subjects and bodies from the `email` namespace
    ├── messengers/*.ts             # handoff carries the enquiry's language
    └── revalidate.ts               # invalidates each path in every configured locale

migrations/
└── <timestamp>_localization.ts     # hand-edited: carries rows before dropping columns
```

**Structure Decision**: the existing single-project layout is kept. The only structural change is the
`[locale]` root segment inside `(frontend)`, which is what makes `locale` a *root parameter* and
therefore readable from any server utility. `(payload)` is untouched: `/admin` and `/api` never gain a
prefix.

---

## Phasing

Each phase is independently demonstrable, in the spec's priority order.

| # | Phase | Delivers | Spec |
| --- | --- | --- | --- |
| 1 | **Routing skeleton** | `[locale]` segment, `proxy.ts`, routing config, `<html lang>`, `generateStaticParams`, kit links carry the prefix. Three languages of the same English words | US1 |
| 2 | **Payload localization** | `localization` config, `localized: true` across the model, regenerated types, the migration and its rehearsed rollback | US2 |
| 3 | **Loaders** | Every query takes a locale; fallback proven; a half-translated document renders whole | US2, US7 |
| 4 | **Interface strings** | Message files, `getTranslations` on the server, provider + `useTranslations` in the ~25 client components, plurals | US4 |
| 5 | **Availability** | `language-settings`, the selector's live list, the reset route, revalidation on toggle | US3 |
| 6 | **Discoverability** | `hreflang`, reciprocal canonicals, `x-default`, per-locale sitemap, translated metadata | US5 |
| 7 | **Mail & handoff** | Locale on actions, `email` namespace, enquiry locale, messenger template | US6 |
| 8 | **Formatting** | Money, dates, country names per locale, with hydration parity | US4 |
| 9 | **Verification** | Migration rehearsal on a restore, `measure:js`, a11y in three languages, e2e, `check:naming` | all |

Phase 1 is the only hard prerequisite. Phases 2–3 and 4 can proceed in parallel; 5 needs 1 and 3; 6
needs 5 (it filters on the enabled set); 9 needs everything.

---

## Complexity Tracking

| Violation | Why needed | Simpler alternative rejected because |
| --- | --- | --- |
| **Interface strings live in the codebase, not Payload** — a judgement call on Constitution I, which says user-visible copy must come from Payload | FR-035, decided by the user. Constitution I's "non-content UI affordances" exemption is read as covering validation sentences, field labels and accessible names. The boundary is written into FR-035: anything an editor would reasonably want to reword — a call to action, a band heading, an empty-state sentence — stays in Payload | Modelling several hundred strings as admin fields would add globals no editor could navigate and a read on every route, for words nobody has ever asked to change. It is a feature in its own right, not a clause in this one |
| **A new dependency: `next-intl@4.14.4`** | Locale-aware navigation for `as-needed` prefixes, ICU plurals for the three-form rules of Russian and Ukrainian, a client message provider for the ~25 components that hold their own copy, and typed message keys | A bespoke layer over `next/root-params` is genuinely viable and was costed at ~200 lines (research R1). Rejected because those lines are a message format, a navigation wrapper and a provider we would then own. It remains the documented fallback if the Phase 9 measurement goes badly — the message files are plain JSON either way |
| **`@swc/core` and `@parcel/watcher` arrive transitively** (native binaries) | They back next-intl's optional message extractor | Build-time only; neither reaches a browser. Noted because the constitution requires every dependency's bundle impact to be stated rather than assumed |
| **Every route file moves into `[locale]/`** — a large, mechanical diff | It is what makes `locale` a root parameter, and therefore what makes `next/root-params` work at all | Prefixing every locale including English would move every published address (fails FR-013). A cookie-only scheme gives a crawler one address for three languages (fails FR-012) |
| **Every loader signature in `src/lib/*/queries.ts` gains a `locale`** | `sitemap.ts` is a Route Handler and the server actions are Server Actions; root params reach neither | Hiding the locale inside the query layer reads better and breaks in exactly those two places — a loader that works in a page and throws in the sitemap (research R13) |
| **A `/language/reset` route handler exists only to clear a cookie** | Without it, a visitor holding a cookie for a just-disabled language loops between the proxy and the layout forever. A Server Component cannot clear a cookie; a Route Handler can | Reading `cookies()` in the layout would opt every route into dynamic rendering — the exact cost `src/components/layout/cart-count` was built to avoid. A magic query parameter works and reads worse |
