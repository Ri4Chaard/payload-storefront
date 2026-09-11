---

description: "Task list for Three Languages Across the Whole Site"
---

# Tasks: Three Languages Across the Whole Site

**Input**: Design documents from `/specs/010-site-localization/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Included. Not optional here — the constitution's "Development Workflow & Quality Gates"
makes unit, integration, accessibility and budget checks blocking CI gates with no manual override.

**Organization**: Grouped by user story so each can be implemented, tested and demonstrated
independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: Which user story the task serves (US1–US7). Setup, Foundational and Polish carry none
- Every task names the exact file it touches

## Path Conventions

Next.js App Router frontend and Payload CMS in one project. Source under `src/`, tests under
`tests/`, migrations under `migrations/`. All paths kebab-case — `pnpm check:naming` is a blocking
gate and macOS's case-insensitive filesystem will not catch a violation locally.

---

## Seven things to know before starting

1. **It is `proxy.ts`, not `middleware.ts`.** Next 16 deprecated the `middleware` file convention and
   renamed it to `proxy` (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md`).
   next-intl's import path is still `next-intl/middleware`; only the file and exported function names
   follow Next's convention. Writing `src/middleware.ts` will appear to work and is a deprecation
   `AGENTS.md` tells us to heed.
2. **`next/root-params` is how a server utility learns the locale** — new in Next 16.3.0, which this
   repo runs. It does **not** work in Client Components, Server Actions, Route Handlers or
   `unstable_cache`. `src/app/sitemap.ts` is a Route Handler and every `src/lib/*/actions.ts` is a
   Server Action, which is why loaders take an explicit `locale` parameter (research R13). A loader
   that reaches for root params internally works in a page and throws in the sitemap.
3. **`await locale()` is `string | undefined` in this codebase**, not `string`. Two root layouts exist
   — the storefront's `[locale]` one and Payload's — and a parameter absent from one widens the type.
   Narrowing happens in `src/i18n/locale.ts` and nowhere else.
4. **The migration does not carry data unless you make it.** `payload migrate:create` generates DDL
   that creates `<table>_locales` and drops the old columns. Run unedited it empties every published
   page on the site. T042–T045 exist because of this, and the rehearsal is against a production-sized
   restore — an empty development database cannot fail this test.
5. **Do not turn on next-intl's locale detection.** `localeDetection: false` is FR-010, and it still
   writes the `NEXT_LOCALE` cookie (`syncCookie` is gated on `localeCookie`, not on detection). The
   remembered-choice redirect is ours, in `src/proxy.ts`, on unprefixed paths only.
6. **The enabled-locale check runs in the layout, never in the proxy.** Next's own proxy docs say not
   to rely on shared modules there, so no Payload import. The consequence is a redirect loop that
   T057 breaks with a route handler — read `contracts/routing.md` §3 before touching either file.
7. **The language selector does not change.** `src/components/layout/language-selector/` is reused
   unchanged; its props were written for this. If it appears in a diff beyond its stories, something
   has gone wrong.

---

## Phase 1: Setup

**Purpose**: Capture the baseline and stand up the skeleton before anything moves.

- [X] T001 Record pre-change gzipped initial JS for `/`, `/all-jewelry`, `/products/<slug>`, `/legal/privacy` and `/not-a-real-page` against a production server (`pnpm build && pnpm start && pnpm measure:js`), and write the five numbers into `specs/010-site-localization/quickstart.md` §8. **Before any code lands** — this feature adds a client provider to the root layout, so its cost is charged to every route and SC-007 has nothing to compare against afterwards.
- [X] T002 Add `next-intl@4.14.4` to `package.json` dependencies, install, and confirm `pnpm typecheck` still passes. Record in the same quickstart section that `@swc/core` and `@parcel/watcher` arrive transitively as build-time native binaries and reach no browser.
- [X] T003 [P] Create the `src/i18n/` skeleton — `routing.ts`, `locale.ts`, `request.ts`, `navigation.ts`, `messages/en.json`, `messages/ru.json`, `messages/uk.json` — as empty stubs, and confirm `pnpm check:naming` passes on the new paths.
- [X] T004 [P] Restore a production-sized content dump into a scratch database (`aurum_rehearsal`) for the migration rehearsal in T046, per `quickstart.md` Prerequisites.
- [X] T005 Compose `createNextIntlPlugin('./src/i18n/request.ts')` with the existing `withPayload(...)` in `next.config.mjs`, keeping `devBundleServerPackages: false` and the image formats untouched, and confirm `pnpm dev` boots.

**Checkpoint**: Baseline captured, dependency in, nothing behaves differently yet.

> **Two corrections from executing this phase.**
>
> 1. **`src/proxy.ts` already exists.** Spec 004 shipped it as the account-route guard, and `plan.md`
>    listed it as new — wrong. T016 composes with it rather than creating it, and the account guard's
>    `/account/:path*` matcher and its `/sign-in` redirect both have to become locale-aware, or a
>    Russian visitor clicking "account" lands on the English sign-in page. See T016a.
> 2. **T004 used a local seeded database, not a production restore.** 31 products, 15 articles, 4
>    policies — real content, but not production-sized. T052's rehearsal proves the migration's
>    *correctness*; it does not prove its *duration* or its behaviour against production row counts.
>    That rehearsal must be repeated against a real restore before this ships (SC-011).
>
> The baseline reproduced spec 009's five figures to the decimal, measured on port 3100 because port
> 3000 held a pre-existing server — the stale-server trap 009/quickstart.md documents.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The locale segment, the resolution modules and the proxy. Every user story renders
through these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

**Why the route move is here rather than in US1**: moving `(frontend)` under `[locale]` is what makes
`locale` a *root parameter*, and therefore what makes `next/root-params` resolve at all. Every other
phase depends on it, and it is one mechanical diff that is cheaper reviewed once.

- [X] T006 Write `src/i18n/routing.ts` — `LOCALES`, `DEFAULT_LOCALE`, `LOCALE_LABELS`, `BCP47`, and `defineRouting` with exactly the five options in `contracts/i18n-modules.md` §1 (`localePrefix: 'as-needed'`, `localeDetection: false`, `localeCookie.maxAge` of 12 months, `alternateLinks: false`). Comment each option with the requirement it implements — each one is FR-013, FR-010, FR-008 and FR-027 respectively, not a preference.
- [X] T007 Write `src/i18n/locale.ts` — `currentLocale()` and `asLocale()`, the only place `next/root-params`' `string | undefined` is narrowed, with the two-root-layout reason in a comment.
- [X] T008 Write `src/i18n/request.ts` — `getRequestConfig` reading through `currentLocale()`, with `loadMessages` deep-merging `en` beneath the requested locale so a missing key renders the English sentence (FR-037). Do **not** use the `requestLocale` parameter; next-intl 4.14.4 marks it `@deprecated Please migrate to next/root-params`.
- [X] T009 [P] Write `src/i18n/navigation.ts` — `createNavigation(routing)` re-exporting `Link`, `redirect`, `usePathname`, `useRouter`.
- [X] T010 [P] Unit tests in `tests/unit/i18n-locale.test.ts` for `asLocale` (valid, unknown, `undefined`, wrong case) and for the English merge in `loadMessages` (a key present only in `en` resolves; a key present in neither is a type error).
- [X] T011 Create `src/app/(frontend)/[locale]/` and move `layout.tsx`, `page.tsx`, `not-found.tsx` and `styles.css` into it with `git mv`, fixing the relative import of `./styles.css`.
- [X] T012 [P] `git mv` the six `(account)` routes into `src/app/(frontend)/[locale]/(account)/` — `account`, `create-account`, `forgot-password`, `reset-password` (with `reset-password-screen.tsx`), `sign-in`, `verify-email` (with `verify-email-screen.tsx`).
- [X] T013 [P] `git mv` the `(shop)` group into `src/app/(frontend)/[locale]/(shop)/` — `[category]`, `all-jewelry`, `cart` and the shared `listing.tsx`.
- [X] T014 [P] `git mv` `about`, `blog` (with `[slug]`), `contact`, `faq`, `legal/[slug]` and `products/[slug]` into `src/app/(frontend)/[locale]/`.
- [X] T015 Rewrite `src/app/(frontend)/[locale]/layout.tsx` as the storefront root layout: `<html lang={await locale()}>` replacing the literal `en` (FR-015), `generateStaticParams` returning the three locales, `notFound()` for a segment value that is not a locale, and `NextIntlClientProvider` carrying **only** the `common`, `header`, `nav`, `cart`, `account`, `forms` and `errors` namespaces (research R11). Keep the four existing global reads and the `Promise.all` around them.
- [X] T016 Write `src/proxy.ts` — `createMiddleware(routing)` with the matcher from `contracts/routing.md` §2, excluding `api`, `admin`, `_next`, `_vercel`, `language` and any path containing a dot. Named `proxy`, not `middleware`.
- [X] T016a Make the **existing** account guard in `src/proxy.ts` locale-aware: widen its matcher to `/:locale(ru|uk)?/account/:path*` and build its `/sign-in` redirect under the requesting locale's prefix, so a Russian visitor is not bounced to the English sign-in page. Its `next` parameter stays validated as a same-origin relative path.
- [X] T017 Repair every import path broken by T011–T014 across `src/app/(frontend)/**`, then run `pnpm typecheck` and `pnpm lint` clean.
- [X] T018 [P] E2E smoke in `tests/e2e/locale-routing.spec.ts`: `/`, `/ru` and `/uk` all render the home page; `/legal/privacy` still returns 200 with English content (FR-013); `/de/anything` 404s rather than erroring.
- [X] T019 [P] Confirm `/admin` and `/api/*` are untouched — a Playwright check in `tests/e2e/locale-routing.spec.ts` that `/admin` loads and never gains a locale prefix.
- [X] T020 Run `pnpm check:naming` and `pnpm build` to prove the moved tree compiles and prerenders.

**Checkpoint**: ✅ The site serves the same English content at three address shapes. Nothing is
translated yet, and that is the correct state.

> **Three things the move actually broke**, all found by the build rather than by reading:
>
> - `styles.css` imports `../../styles/tokens.css` relatively, and moving it one level deeper made
>   that path wrong. Turbopack's error names the resolved path, so it is obvious once seen — and
>   invisible to `tsc`, which does not resolve CSS.
> - `.storybook/preview.tsx` imports that same stylesheet by path.
> - `eslint-rules/catalog-boundary.mjs` names `src/app/(frontend)/page.tsx` in its allowance list for
>   mock imports — a deliberately hardcoded path, per its own comment, so that "a wildcard hides how
>   much is left, a path says exactly". Moving the home page made the rule fire on it.
>
> Verified against a production server: `/`, `/ru`, `/uk` all 200 with `<html lang>` matching;
> `/legal/privacy` and eight other pre-existing addresses still 200 unprefixed; `/de/anything` 404s;
> `/admin` is untouched. Prerendered paths tripled as designed — 15 articles became 45, 30 products
> became 90.

---

## Phase 3: User Story 1 - A visitor reads the site in their own language (Priority: P1) 🎯 MVP

**Goal**: The selector that has been decorative since spec 001 changes the language, and the choice
survives navigation, reload and a return visit.

**Independent test**: Switch language from the header and from the mobile panel, navigate three pages
deep, reload, close the tab and return to the bare domain — the language holds throughout and
`<html lang>` matches what is on screen.

### Tests for User Story 1

- [X] T021 [P] [US1] Unit test in `tests/unit/proxy-locale.test.ts` for the remembered-choice rule: unprefixed path + `NEXT_LOCALE=ru` redirects to `/ru<path><search>`; prefixed path with a conflicting cookie is left alone; `NEXT_LOCALE=en` and an absent cookie both delegate.
- [X] T022 [P] [US1] E2E in `tests/e2e/language-switch.spec.ts` covering US1's six acceptance scenarios, including the private-window check that a Russian-configured browser still lands on English (FR-010) and the return-visit redirect to `/ru` (FR-008).
- [X] T023 [P] [US1] E2E in `tests/e2e/language-switch.spec.ts` that adding an item to the cart and then switching language preserves the cart count and the session (FR-011).

### Implementation for User Story 1

- [X] T024 [US1] Add the remembered-choice rule to `src/proxy.ts`: on an **unprefixed path only**, if `NEXT_LOCALE` names a non-default locale, 307 to the prefixed equivalent; otherwise delegate untouched. Comment why this is ours rather than `localeDetection` — the library's single boolean would also act on `accept-language`, which FR-010 forbids.
- [X] T025 [US1] Delete `DEFAULT_LOCALES` from `src/components/layout/header/header.tsx:74` and the `React.useState` locale at line 108; take the locale list and current value as props, and make `onChange` navigate to the same pathname under the new prefix using `src/i18n/navigation.ts`'s router. Remove the now-obsolete comment predicting this change.
- [X] T026 [US1] Pass the locale list and current locale from `src/app/(frontend)/[locale]/layout.tsx` into `Header`, built from `LOCALE_LABELS`. (The enabled-set filter arrives in US3 — until then all three are listed.)
- [X] T027 [P] [US1] Thread the same props through `src/components/layout/mobile-nav/mobile-nav.tsx` so the panel's switcher works and closes on selection (FR-009). Its existing `locales`/`locale`/`onLocaleChange` props already have the right shape.
- [X] T028 [US1] Repoint `src/components/ui/link/` and `src/components/ui/nav-link/` at next-intl's `Link` so every internal href carries the current prefix.
- [X] T029 [P] [US1] Repoint the 13 direct `next/link` imports at the kit primitive or at `src/i18n/navigation.ts`; leave `src/lib/catalog/listing-url.ts`, `src/lib/blog/blog-url.ts` and `src/lib/policies/policy-url.ts` returning unprefixed paths (`contracts/i18n-modules.md` §8).
- [X] T030 [P] [US1] ~~Update `language-selector.stories.tsx`~~ — **the file does not exist.** The selector has no stories of its own (it is composed from `Menu` and `MenuOption`, which have theirs) and `pnpm check:stories` does not ask for one, since it gates the UI kit and this lives in `layout/`. What the header's new `useLocale()` call *did* require is the Storybook message provider, so **T086 was pulled forward from US4** and `.storybook/preview.tsx` now carries a `NextIntlClientProvider` decorator. **The selector component itself is unchanged, as specified.**
- [X] T031 [US1] Verify `pnpm build` still prerenders the catalogue — the locale must not have introduced a request-time API into the layout.

**Checkpoint**: ✅ US1 is demonstrable end to end, verified against a production server:

| Request | Result |
| --- | --- |
| `/` with no cookie | 200, English (FR-010) |
| `/` with `NEXT_LOCALE=ru` | 307 → `/ru` (FR-008) |
| `/legal/privacy` with `NEXT_LOCALE=ru` | 307 → `/ru/legal/privacy` |
| `/uk/cart` with `NEXT_LOCALE=ru` | 200, left alone — a prefix beats a memory |
| `/` with `Accept-Language: ru-RU` | 200, English — detection stays off |

Seven e2e scenarios and ten more unit assertions pass. The site is still English in all three
languages, which is exactly what makes this phase independently testable.

> **The prefix decisions were lifted out of `src/proxy.ts` into `src/i18n/prefix.ts`.** The proxy
> cannot be imported by a unit test — next-intl's middleware reaches for `next/server`, which only
> resolves inside a Next build — so the rules it applies now live in a pure module beside it. That
> is also where `splitLocale` stopped being duplicated between the account guard and the locale
> rule.
>
> **The header's `usePathname` had to change source, not just the switcher.** Its nav highlighting
> compares `pathname === item.href`; with `next/navigation` that compares `/ru/about` against
> `/about` and quietly stops highlighting anything for two of the three languages. next-intl's
> `usePathname` returns the path without the prefix, which is the whole fix.

---

## Phase 4: User Story 2 - The owner writes the site three times (Priority: P1)

**Goal**: Every word an editor owns exists once per language in Payload, today's content becomes its
English self, and the storefront reads the right language.

**Independent test**: Enter Russian text for one global, one collection document and one block,
publish, and see each on its Russian address while the English versions are unchanged.

### Tests for User Story 2

- [ ] T032 [P] [US2] Integration test in `tests/integration/localized-content.test.ts`: writing a document in `ru` leaves `en` untouched; reading with `locale: 'ru'` returns Russian; reading a field never translated returns the English value under `fallback: true`.
- [X] T033 [P] [US2] Unit test in `tests/unit/slug-transliteration.test.ts` for `src/fields/slug.ts` — `Каблучка з діамантом` → `kabluchka-z-diamantom`, `Кольцо «Парагон»` → `kolco-paragon`, `Paragon Ring` unchanged, output always matches `/^[a-z0-9-]+$/` and never empty.
- [ ] T034 [P] [US2] Integration test in `tests/integration/publish-locale.test.ts` that publishing while editing one locale does not publish another locale's draft (`defaultLocalePublishOption: 'active'`, FR-023).

### Schema for User Story 2

- [X] T035 [US2] Add the `localization` block to `src/payload.config.ts` — three locales with their own-language labels, `defaultLocale: 'en'`, `fallback: true`, `defaultLocalePublishOption: 'active'` — sourcing the locale list from `src/i18n/routing.ts` so the three languages have one definition. Every value written out, never taken by omission (Constitution IV).
- [X] T036 [P] [US2] Mark `localized: true` in `src/fields/seo.ts` (`title`, `description`, not `image`) and `src/fields/cta.ts` (`label`, not `href`) — the two shared configs that localize metadata and button text everywhere at once.
- [X] T037 [P] [US2] `src/collections/articles.ts` — localize `title`, `standfirst` and the `chapters[]` row fields `heading`, `tocLabel`, `lede`, `body`, `pullQuote`. The array itself stays shared.
- [X] T038 [P] [US2] `src/collections/policies.ts` — localize `title`, `subtitle`, `body`.
- [X] T039 [P] [US2] `src/collections/products.ts` — localize `title`, `description`, `details` and `attributes[].value`. Prices, gallery, sizes, stock, `colour` and `diamondShape` stay shared.
- [X] T040 [P] [US2] `src/collections/categories.ts`, `collections.ts`, `article-categories.ts` — localize the titles, subtitle and description; leave `slug`, `image` and `order` shared.
- [X] T041 [P] [US2] `src/collections/sizes.ts` (`label` only — `value` is the size), `attributes.ts` (`label`, `options[].label` only — `name` and `options[].value` are the filter keys FR-041 matches on), `questions.ts` (`question`, `answer`).
- [X] T042 [P] [US2] `src/collections/media.ts` — localize `alt` (FR-019 names alt text explicitly); the file and its sizes stay single.
- [X] T043 [P] [US2] Globals `src/globals/shop.ts`, `blog-page.ts`, `faq-page.ts` — localize every text and rich-text field listed in `data-model.md` §3.
- [X] T044 [P] [US2] Globals `src/globals/contact-page.ts` and `contact-settings.ts` — localize the 13 contact-page copy fields, and `address`, `openingHours`, `messageTemplate`; leave emails, phone, `mapsUrl` and the messenger rows shared.
- [X] T045 [P] [US2] Global `src/globals/cookie-settings.ts` — localize `bannerBody`, `categories[].name`, `categories[].purpose`. **`categories[].key` must stay shared** — it is the identifier written into spec 009's consent cookie, and translating it would invalidate every stored consent record.
- [X] T046 [P] [US2] Blocks `src/blocks/banner.ts`, `page-header.ts`, `closer-look.ts`, `process-steps.ts`, `faq.ts` — localize their headings, bodies and array row text; leave arrangement, media and relationships shared.
- [X] T047 [US2] Add Cyrillic→Latin transliteration to `src/fields/slug.ts` covering both alphabets including `ї`, `є`, `і`, `ґ`, `ы`, `э`, `ъ`, `щ`, `ж`. The field stays **non-localized** (R7), and derivation stays create-only.
- [X] T048 [US2] Run `pnpm generate:types` and commit `src/payload-types.ts` in the same change (Constitution, Technology Stack).

### Migration for User Story 2

- [X] T049 [US2] Generate the migration with `pnpm payload migrate:create localization` and read the generated `migrations/<timestamp>_localization.ts` and its `.json` snapshot in full before running it anywhere.
- [X] T050 [US2] Hand-edit `migrations/<timestamp>_localization.ts` `up()` to `INSERT … SELECT 'en', id, …` every localized column into its `_locales` table **before** the generated `DROP COLUMN` statements, for every table family in `data-model.md` §10 — including the `_v` version tables.
- [X] T051 [US2] Write the matching `down()` in `migrations/<timestamp>_localization.ts`: copy `_locale = 'en'` rows back into the parent tables, then drop the locales tables. A rollback nobody has run is not a rollback path.
- [X] T052 [US2] Rehearse both directions against the `aurum_rehearsal` restore from T004 — `migrate`, verify row counts and that no `_locales` row arrived NULL, `migrate:down`, verify the original content, `migrate` again. Record the counts in `specs/010-site-localization/quickstart.md` §1.
- [X] T053 [P] [US2] Add `locale` (select `en`/`ru`/`uk`, not localized) to `src/collections/enquiries.ts` in the same migration — it is US6's field but it belongs to this schema change.

### Data layer for User Story 2

- [X] T054 [P] [US2] Thread an explicit `locale` parameter through `src/lib/catalog/queries.ts` into every `payload.find`/`findGlobal` call with `fallbackLocale: DEFAULT_LOCALE`. A parameter, **not** an internal root-params call — `sitemap.ts` is a Route Handler and would throw.
- [X] T055 [P] [US2] The same for `src/lib/blog/queries.ts`.
- [X] T056 [P] [US2] The same for `src/lib/policies/queries.ts`, including `getFooterPolicies` and `getCookieSettings`, which the root layout calls.
- [X] T057 [P] [US2] The same for `src/lib/contact/queries.ts`, `src/lib/questions/`, `src/lib/story/` and `src/lib/messengers/settings.ts`.
- [X] T058 [US2] Pass `await currentLocale()` from every page and layout under `src/app/(frontend)/[locale]/**` and from each `generateMetadata` into those loaders; no component below the page reaches for the locale itself.
- [ ] T059 [US2] Verify in `/admin` that switching editing language shows per-language values for word fields and one shared value for images, prices, dates and slugs — the editorial verification Constitution's workflow section requires before merge.

**Checkpoint**: ✅ Proven end to end against a production server. One Russian title written straight
into `policies_locales`, then:

| Address | `<h1>` |
| --- | --- |
| `/legal/privacy` | `Privacy Policy` |
| `/ru/legal/privacy` | `ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ` |
| `/uk/legal/privacy` | `Privacy Policy` — the fallback, not a blank heading (US7, FR-046) |

> **The locale reached further than the loaders.** Threading it surfaced three call sites the plan
> had not named, all of them places where `next/root-params` cannot reach and the contract's rule
> therefore had to hold:
>
> - **`src/lib/cart/*`** — `getCart`, `checkIntent`, `addToCart`, `buyNow` and `beginCheckout` are
>   reached from Server Actions, so each takes the locale as an argument. Without it a Russian
>   visitor's cart line comes back in English.
> - **`src/app/sitemap.ts`** — a Route Handler, so it names `DEFAULT_LOCALE` explicitly. Harmless
>   here because a sitemap lists addresses and a slug is shared across languages.
> - **`product-purchase` and `order-summary`** — client components holding server-action props, so
>   their prop types gained the locale and they read it from `useLocale()`. This is
>   `contracts/i18n-modules.md` §5 in practice rather than in principle.
>
> `getArticleSlugs`, `getPolicySlugs` and `getProductSlugs` deliberately stayed language-free: they
> select `slug`, which is shared across all three (R7), so asking for a language would be noise.

---

## Phase 5: User Story 3 - The owner decides which languages the site offers (Priority: P2)

**Goal**: Ukrainian can be translated for weeks before anyone sees it, and switched on in a minute.

**Independent test**: Toggle a language off; the selector, the addresses and the sitemap drop it while
the content stays intact and editable; toggle it on and everything returns.

### Tests for User Story 3

- [X] T060 [P] [US3] Integration test in `tests/integration/language-settings.test.ts`: the global defaults to all languages on; disabling one changes the enabled set the storefront reads; the English locale has no field to disable (FR-029).
- [X] T061 [P] [US3] E2E in `tests/e2e/language-availability.spec.ts` for US3's five acceptance scenarios — in particular the visitor holding a cookie for a just-disabled language, who must land on real English content and **must not loop**.

### Implementation for User Story 3

- [X] T062 [US3] Create `src/globals/language-settings.ts` per `data-model.md` §5 — one checkbox per non-default locale generated from `LOCALES`, explicit `read`/`update` access, `afterChange: [revalidateGlobalOnChange]`, and an admin description stating that English is always offered and why.
- [X] T063 [US3] Register it in `src/payload.config.ts` `globals` and regenerate types.
- [X] T064 [US3] Add `getEnabledLocales()` to `src/lib/i18n/` (or alongside the other global readers) returning the offered set, defaulting to all three when the global has never been saved.
- [X] T065 [US3] Gate the route in `src/app/(frontend)/[locale]/layout.tsx`: a disabled locale redirects to `/language/reset?next=<pathname>`. Keep the read inside the existing `Promise.all` so it costs no extra round trip.
- [X] T066 [US3] Create the route handler `src/app/(frontend)/language/reset/route.ts` — clear `NEXT_LOCALE`, validate `next` is a site-relative path (never an open redirect), 307 to the default-locale equivalent. Comment the loop it exists to break: the proxy sends `/` to `/uk`, the layout sends `/uk` back, forever, and a Server Component cannot clear a cookie.
- [X] T067 [US3] Confirm `language` is excluded by the `src/proxy.ts` matcher, and add a unit assertion for the matcher pattern in `tests/unit/proxy-locale.test.ts`.
- [X] T068 [US3] Filter the selector's list in `src/app/(frontend)/[locale]/layout.tsx` to the enabled set, replacing T026's unfiltered list.
- [X] T069 [US3] Extend `src/lib/revalidate.ts` to invalidate each literal path **in every configured locale** — including disabled ones, so re-enabling a language does not serve pre-toggle content (research R17). Keep the literal-path form; the pattern form does not touch prerendered pages, as that file records.

**Checkpoint**: ✅ Verified against a production server with Ukrainian switched off:

| Request | Result |
| --- | --- |
| `/uk` | `307 → /language/reset` |
| `/language/reset?next=/legal/privacy` | `307 → /legal/privacy`, `Set-Cookie: NEXT_LOCALE=; Expires=1970` |
| `/` holding `NEXT_LOCALE=uk` | **3 hops**, ends `200` on the English home page |
| The home page's HTML | no longer contains `Українська` |

> **Three things this phase got wrong first, all worth keeping.**
>
> 1. **Registering a global is not migrating it.** The build failed on four prerendered pages with
>    `Failed query: select … from "language_settings"` — and correctly did not swallow it, because
>    `isDatabaseUnreachable` tests for an unreachable *database*, not a missing *table*. A second
>    migration, `20260911_141700_language_settings`, creates it.
> 2. **The first loop test was an artifact of the tool.** `curl -b "NEXT_LOCALE=uk"` re-sends that
>    literal cookie on every hop and ignores `Set-Cookie`, so the reset route looked like it did
>    nothing — ten hops and still going. With a cookie jar, which is what a browser actually is, it
>    settles in three. The lesson is about the test, not the code, but the code would have looked
>    broken to the next person to try it that way.
> 3. **The e2e suite had to be made serial.** All three tests switch the same global, and Playwright
>    parallelises a file across workers by default, so they raced each other's writes. `test.describe
>    .configure({ mode: 'serial' })`, with a note saying why.
>
> Also learned the hard way: `PLAYWRIGHT_BASE_URL`, not `BASE_URL`, is what `playwright.config.ts`
> reads — the earlier runs were silently hitting whatever was on port 3000.

---

## Phase 6: User Story 4 - The interface speaks the visitor's language too (Priority: P2)

**Goal**: No English button on a Russian page, correct plurals, correctly formatted money, dates and
country names.

**Independent test**: Walk the catalogue→cart and sign-in→account paths in each language; no English
string appears on screen or in an accessible name.

### Tests for User Story 4

- [X] T070 [P] [US4] Unit test in `tests/unit/message-keys.test.ts` that `ru.json` and `uk.json` have no key absent from `en.json`, and that every ICU `plural` in the three files parses.
- [X] T071 [P] [US4] Unit test in `tests/unit/plural.test.ts` for the cart's spoken name at counts 1, 2, 5 and 21 in Russian and Ukrainian — three plural categories where English has two (SC-012).
- [X] T072 [P] [US4] Unit test in `tests/unit/format-locale.test.ts` that `formatPrice` renders the same amount and currency in all three locales with locale-appropriate grouping, and that the mapped BCP 47 tag is used on both server and client paths.
- [X] T073 [P] [US4] E2E in `tests/e2e/interface-language.spec.ts` walking both paths in `ru` and `uk` and asserting no English string in visible text or accessible names.

### Implementation for User Story 4

- [X] T074 [US4] Populate `src/i18n/messages/en.json` with every interface string currently hardcoded in `src/components/**` and `src/app/(frontend)/**`, namespaced per `data-model.md` §7. Strings an editor would reasonably reword — calls to action, band headings, empty-state prose — go to Payload instead (FR-035's boundary).
- [X] T075 [US4] Declare `Messages = typeof import('./messages/en.json')` in a `global.d.ts` augmentation so a key missing from English is a compile error.
- [X] T076 [P] [US4] Translate `src/i18n/messages/ru.json`.
- [X] T077 [P] [US4] Translate `src/i18n/messages/uk.json`.
- [X] T078 [US4] Replace hardcoded strings in server components and routes with `await getTranslations(namespace)`, passing text into UI-kit primitives through the props they already take. The kit's English defaults (`label = 'Load more'`) stay as development fallbacks.
- [X] T079 [P] [US4] Convert the account client components — `address-modal`, `create-account-form`, `sign-in-form`, `new-password-form`, `change-password-modal`, `verify-email-form`, `reset-code-step`, `forgot-password-form`, `name-row`, `address-list` — to `useTranslations`, keeping `src/lib/auth/form-errors.ts`'s message-key indirection and feeding it `t('errors.…')`.
- [X] T080 [P] [US4] The same for the commerce client components under `src/components/commerce/` — `product-purchase`, `product-options`, `order-summary`, `handoff-modal`, `filter-toolbar`, `filter-drawer`, `cart-lines`, `product-gallery`.
- [X] T081 [P] [US4] The same for `src/components/contact/contact-form/`, `src/components/layout/footer/newsletter-form.tsx` and the two account screens under `src/app/(frontend)/[locale]/(account)/`.
- [X] T082 [US4] Translate the `colour` and `diamondShape` select option labels through the message files rather than per product, and make `src/lib/catalog/filters.ts` render them from there while still matching on the shared machine values (FR-041).
- [X] T083 [P] [US4] Thread the locale into `src/lib/catalog/price.ts` callers using the `BCP47` map, replacing its `en-US` default at the call site. Keep `CATALOG_CURRENCY` and the integer minor units untouched (FR-038, Constitution VI).
- [X] T084 [P] [US4] Format article and policy dates with `Intl.DateTimeFormat(BCP47[locale])` wherever a date reaches a page (FR-039).
- [X] T085 [P] [US4] Pass the locale to `countryName()` in the address forms and the country chooser — `src/lib/countries.ts` already resolves through `Intl.DisplayNames` and already takes the argument (FR-040).
- [X] T086 [US4] Add a `NextIntlClientProvider` decorator to `.storybook/preview` so client components that read messages render in Storybook, and confirm `pnpm check:stories` and `pnpm test:stories` pass.

**Checkpoint**: ✅ Complete. Verified against a production server in the server-rendered HTML.

Proven against a production server, in the initial HTML rather than after hydration:

| Surface | `/` | `/ru` | `/uk` |
| --- | --- | --- | --- |
| Cart's accessible name | `Cart, empty` | `Корзина пуста` | `Кошик порожній` |
| Primary nav landmark | `Primary` | `Основная навигация` | `Основна навігація` |

Plurals are correct at every category, including the wrap-around a singular/plural pair always gets
wrong: `Корзина, 1 товар` / `2 товара` / `5 товаров` / `21 товар`.

**163 keys across 14 namespaces**, in all three languages, extracted from what the components
actually said rather than guessed at. 24 components converted. A product page now reads
`В КОРЗИНУ` / `Купить сейчас` / `Выбрать размер` in Russian and `ДО КОШИКА` / `Купити зараз` /
`Обрати розмір` in Ukrainian, and the header navigation, footer, filters and empty states follow.

Money, dates and country names are locale-aware: `formatPriceFor` maps the app's locale codes onto
BCP 47 tags, the blog's date formatter is built per language instead of being fixed at `en-US`, and
`countryName` finally receives the argument it has accepted since spec 004.

An e2e sweep asserts eight English chrome phrases are absent from five pages in both languages, with
a control asserting they ARE present at the unprefixed address — without that control the suite
would pass just as happily if the chrome had gone missing rather than been translated.

> **Four things this phase taught.**
>
> 1. **`use-intl` is a transitive dependency and does not resolve from the repo root.**
>    `createTranslator` is imported from `next-intl`, which re-exports it — and depending on the
>    re-export keeps the test honest about which package the app itself uses.
> 2. **The type augmentation bites in tests.** Once `AppConfig['Messages']` is declared, a translator
>    built from a loosely-typed object narrows every key to `never` and `t('cart')` stops compiling.
>    That is the augmentation working; the fix is to type the fixture as `typeof en`. `next build`
>    runs the typecheck, so this failed the build rather than just the editor.
> 3. **A namespace missing from the client provider fails silently.** next-intl renders the key path
>    itself — a button reading `product.addToCart` — rather than throwing, so it survives the build,
>    the typecheck and the lint and is caught only by looking at the page. The provider's list is now
>    derived from what `useTranslations` is actually called with in a Client Component, with the grep
>    that produces it written into the comment.
> 4. **A hook cannot run in a default parameter.** Half a dozen components carried
>    `label = 'Load more'` in their signatures; each became `labelProp` with the fallback resolved in
>    the body, so a caller's own words still win and the default is translated rather than English.

---

## Phase 7: User Story 5 - Search engines index three sites, not one (Priority: P3)

**Goal**: Three indexable versions of every page, each naming itself canonical and its siblings as
alternates.

**Independent test**: Fetch one product, one article and one policy in each language and confirm the
declarations are present, reciprocal and consistent with the enabled set.

### Tests for User Story 5

- [X] T087 [P] [US5] E2E in `tests/e2e/metadata-alternates.spec.ts`: each page names itself canonical, lists three alternates plus `x-default` pointing at the English address, and the alternates name each other reciprocally.
- [X] T088 [P] [US5] Integration test in `tests/integration/sitemap-locales.test.ts` that the sitemap holds one entry per document per **enabled** locale and drops a disabled one entirely (FR-017, FR-027).

### Implementation for User Story 5

- [X] T089 [US5] Add an `absoluteHref(locale, path)` helper and emit `alternates: { canonical, languages }` from `generateMetadata` on every route, filtered by the enabled set (`contracts/routing.md` §5).
- [ ] T090 [US5] Translate the metadata defaults in `src/app/(frontend)/[locale]/layout.tsx` — the title template and description move into the message files or `seo.ts`, whichever the string belongs to under FR-035's boundary.
- [X] T091 [US5] Rewrite `src/app/sitemap.ts` to iterate `LOCALES` explicitly — it is a Route Handler and `next/root-params` does not reach it — filtered by the enabled set, with `alternates.languages` per entry. It stays at `src/app/sitemap.ts`, outside the `[locale]` segment.
- [X] T092 [US5] Confirm `alternateLinks: false` is set in `src/i18n/routing.ts` and add a comment pointing at the reason: next-intl's automatic `Link` header advertises every *configured* locale, including one the owner has switched off.

**Checkpoint**: ✅ Verified against a production server. `/ru/legal/privacy` emits:

```
<link rel="canonical"  href="…/ru/legal/privacy">
<link rel="alternate"  hrefLang="en"        href="…/legal/privacy">
<link rel="alternate"  hrefLang="ru"        href="…/ru/legal/privacy">
<link rel="alternate"  hrefLang="uk"        href="…/uk/legal/privacy">
<link rel="alternate"  hrefLang="x-default" href="…/legal/privacy">
```

Each of the three names **itself** canonical — pointing all three at the English address is the easy
mistake, it looks correct to a human tester, and it asks Google to drop two of the three pages.

The sitemap went from 59 URLs to 177, each carrying `xhtml:link` alternates. Switching Ukrainian off
drops it to 118 with zero `/uk` addresses; switching it back on restores them.

**T090 is outstanding** — the layout's own metadata defaults (`title.template`, the site description)
are still English literals, so a Russian page's *fallback* title is English when a document has no
SEO title of its own.

---

## Phase 8: User Story 6 - Mail and messenger handoffs arrive in the right language (Priority: P3)

**Goal**: What the site sends matches the language the visitor was reading.

**Independent test**: Register, request a reset and submit an enquiry in each language; confirm the
sent mail and the composed messenger text match, and that a missing translation never blocks a send.

### Tests for User Story 6

- [ ] T093 [P] [US6] Integration test in `tests/integration/email-locale.test.ts` using the `EMAIL_TRANSPORT=log` adapter: a Russian registration produces a Russian subject and body; deleting a key from `ru.json` still sends, in English (FR-045).
- [ ] T094 [P] [US6] Integration test in `tests/integration/enquiry-locale.test.ts` that an enquiry submitted in `uk` stores `locale: 'uk'` and that the composed messenger message carries it (FR-043).

### Implementation for User Story 6

- [ ] T095 [US6] Add `locale` to the inputs of the server actions in `src/lib/auth/actions.ts` and `src/lib/contact/actions.ts`, validated by their zod schemas against `LOCALES`. **Not read from `NEXT_LOCALE`** — a visitor who arrived on `/ru/contact` from a link has no cookie, and their mail would go out in English.
- [ ] T096 [P] [US6] Send the locale from `src/components/contact/contact-form/` and the `src/components/account/**` forms using `useLocale()`, as a hidden field or an argument.
- [ ] T097 [P] [US6] Move subjects and bodies of `src/lib/auth/verification-email.ts`, `src/lib/auth/reset-email.ts` and `src/lib/email/enquiry.ts` into the `email` namespace, resolved with `getTranslations({ locale, namespace: 'email' })` — the one place a locale is passed to next-intl explicitly.
- [ ] T098 [P] [US6] Store the submitted locale on the enquiry in `src/lib/contact/actions.ts` (the field landed in T053) and pass it to `src/lib/messengers/` so the handoff uses the localized `messageTemplate`.
- [ ] T099 [US6] Record the customer's locale on marketing list membership so campaigns can be segmented by language (FR-044), without touching the transactional/marketing split `src/payload.config.ts` documents.

**Checkpoint**: Nothing the site sends is in the wrong language.

---

## Phase 9: User Story 7 - A missing translation degrades instead of breaking (Priority: P3)

**Goal**: The normal state of a three-language site — half-translated — renders as a complete page.

**Independent test**: With a document translated in one language only, request it in the other two and
confirm the page renders whole.

### Tests for User Story 7

- [ ] T100 [P] [US7] Integration test in `tests/integration/fallback.test.ts`: a product with no Russian description renders the English one; a document with no translation at all is reachable in every enabled locale rather than 404 (FR-046, FR-048).
- [ ] T101 [P] [US7] E2E in `tests/e2e/fallback.spec.ts` asserting no empty heading, empty block or collapsed section on a half-translated product, article and policy page (FR-047, SC-009).

### Implementation for User Story 7

- [ ] T102 [US7] Audit every page under `src/app/(frontend)/[locale]/**` and the blocks in `src/components/blocks/` for layout that collapses on an empty field and make the fallback path render the default language's value rather than nothing — `fallback: true` covers the data, not a component that conditionally renders on truthiness.
- [ ] T103 [US7] Verify in `/admin` whether Payload presents an untranslated field as empty or as fallback text; if it presents fallback text as if entered, add the field descriptions or indicator needed to distinguish them (FR-024), and record what the admin actually does in `quickstart.md` §3.

**Checkpoint**: The site is usable at any translation completeness, which is how it will ship.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T104 Re-measure gzipped initial JS against a production server for the T001 routes plus `/ru` and `/ru/legal/privacy`, compare against the T001 baseline and spec 009's 192.3 KB framework figure, and confirm every route is ≤ 300KB total and ≤ 100KB above the baseline (SC-007, Constitution V). A Russian route more than a kilobyte or two above its English twin means message data is in the bundle rather than the flight payload.
- [ ] T105 [P] Run `pnpm test:a11y` on the changed pages in all three languages, including the `lang` attribute assertion and the Cyrillic focus-order check (SC-008, FR-054).
- [ ] T106 [P] Check the fixed-width affordances — header navigation, buttons, chips, filter labels — at all three languages. Russian runs roughly 15% longer than English and this site draws several elements to fixed widths.
- [ ] T107 [P] Verify every address the site served before this feature still returns 200 with English content, per `quickstart.md` §9 (SC-006, FR-013).
- [ ] T108 [P] Run the full suite — `pnpm typecheck`, `pnpm lint`, `pnpm check:naming`, `pnpm check:stories`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`.
- [ ] T109 [P] Confirm `src/payload-types.ts` is current and committed with the schema change, and that no hand-written interface mirrors a localized collection.
- [ ] T110 [P] Seed Russian and Ukrainian sample content for at least one product, article and policy so a reviewer can see all three languages without writing translations first — extend `scripts/seed-catalog.ts` and `scripts/seed-policies.ts`, passing `skipRevalidation` as those scripts already do.
- [ ] T111 [P] Record the production migration runbook in `specs/010-site-localization/quickstart.md` §1 — backup, run, verify, and the exact rollback command, with the rehearsal's measured row counts.
- [ ] T112 Update `README.md` with how to add a string, how to translate a page, and the one rule that decides where a string lives (Payload for editorial copy, `src/i18n/messages/` for interface chrome).

---

## Dependencies & Execution Order

### Phase dependencies

```
Setup (T001–T005)
   └── Foundational (T006–T020)      ← blocks everything; the route move is here
          ├── US1 (T021–T031)        P1 — MVP
          ├── US2 (T032–T059)        P1 — can start once T006–T017 land
          │      └── US3 (T060–T069) P2 — needs the enabled set to gate a real read
          │      └── US7 (T100–T103) P3 — needs content to be missing from
          ├── US4 (T070–T086)        P2 — independent of US2; only needs Foundational
          ├── US5 (T087–T092)        P3 — needs US3's enabled set to filter on
          └── US6 (T093–T099)        P3 — needs US4's message files for the `email` namespace
                 └── Polish (T104–T112)
```

### Story dependencies

- **US1** depends only on Foundational. It is the MVP and is demonstrable with untranslated content.
- **US2** depends only on Foundational. Its migration (T049–T052) is the one irreversible step in the
  feature and should be reviewed on its own.
- **US3** depends on US2 — the gate reads a global, and the global needs the localization config to
  have landed.
- **US4** depends only on Foundational. It can run fully in parallel with US2 and US3; they touch
  different files.
- **US5** depends on US3, because `hreflang` and the sitemap filter on the enabled set.
- **US6** depends on US4 for the `email` namespace and on US2 for `enquiries.locale` (T053).
- **US7** depends on US2; it is mostly verification, because `fallback: true` does the work.

### Parallel opportunities

- **T012–T014** — the three route-move tasks touch disjoint directories.
- **T036–T046** — eleven schema tasks, one file each, all `[P]`. The largest parallel block in the
  feature. They must all land before T048's type generation and T049's migration.
- **T054–T057** — four loader files, disjoint.
- **T076–T077** — the two translation files.
- **T079–T081** — three groups of client components, disjoint directories.
- **T083–T085** — money, dates and countries are three separate seams.
- **T104–T111** — the polish checks are independent of one another.

### Within a story

Tests first where they describe behaviour that does not exist yet (T021–T023, T032–T034, T060–T061),
then schema, then data layer, then the screens. The migration tasks T049–T052 are strictly sequential
and strictly ordered — generate, edit, reverse, rehearse.

---

## Implementation Strategy

**MVP = Foundational + US1.** Twenty-six tasks. The site serves three address shapes, the selector
works, the choice persists, and every existing address still resolves. Nothing is translated, and
that is a complete, demonstrable increment — it is the half of the feature that cannot be tested by
reading a database.

**First shippable release = MVP + US2 + US4.** Content and interface both translated. US3 can be
deferred by shipping with all three languages on, which is a decision the owner can reverse later
without a deploy once US3 lands.

**Highest risk, earliest attention**: T049–T052. Everything else in this feature is reversible by a
redeploy; a migration that drops columns before copying them is not. Rehearse it against the restore
from T004 before it is reviewed, not after.
