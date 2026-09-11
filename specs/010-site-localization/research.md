# Phase 0 Research: Three Languages Across the Whole Site

**Feature**: `010-site-localization` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

Every claim below about Next.js is taken from the docs shipped inside `node_modules/next/dist/docs/`
at version **16.3.3**, and every claim about next-intl is taken from the published **4.14.4**
tarball's own types and source, not from memory. Two of the most load-bearing findings — that
`middleware.ts` is now `proxy.ts`, and that `next/root-params` exists — postdate the training data of
any model writing this file, which is exactly what `AGENTS.md` warns about.

---

## R1 — next-intl, or something else?

**Decision**: Adopt **next-intl 4.14.4** for the interface's own words and for locale-aware routing.
Payload's built-in localization carries the content. The two never overlap.

**Rationale**:

The user proposed next-intl and asked for a better approach if one exists. I went looking for one,
and the honest answer is that next-intl is the right choice — but for a different reason than it
would have been six months ago, and with three of its defaults turned off.

What changed: **Next.js 16.3.0 introduced `next/root-params`**, which makes the current locale
readable from any Server Component or server-side utility without prop drilling
(`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-root-params.md`). That used
to be next-intl's main structural contribution, and it used to cost `setRequestLocale()` in every
page and layout — a famous footgun. next-intl 4.14.4 has already moved: `getRequestConfig`'s
`requestLocale` parameter is marked **`@deprecated Please migrate to next/root-params`** in
`dist/types/server/react-server/getRequestConfig.d.ts`. So the version of next-intl we would adopt
is the one that stopped needing the workaround.

What that leaves next-intl doing, and each of these is real work we would otherwise own:

| What it provides | What we would write instead |
| --- | --- |
| Locale-aware `Link`, `redirect`, `usePathname`, `useRouter` | Prefix-aware wrappers over the kit's `ui/link`, `ui/nav-link`, and 13 direct `next/link` imports |
| ICU plurals — Russian and Ukrainian have three plural categories, English two | A `Intl.PluralRules` helper plus a message-interpolation format of our own |
| A client-side message provider and `useTranslations` | A React context over the dictionary, for the ~25 client components that carry their own copy |
| Typed message keys from the `en` file | A hand-maintained key union |
| Proxy-level prefix resolution for `as-needed` prefixes | A path parser and redirect logic in `proxy.ts` |

**The bundle objection does not apply here, and I checked rather than assumed.** Constitution V's
amendment note says "today's worst route spends 84KB of the 100KB delta", which would have left ~16KB
of headroom. That figure is stale: spec 009's measurement (`009/quickstart.md`, 2026-09-11, taken by
driving a real browser) records the worst route at **202.9 KB against a 192.3 KB framework baseline —
10.6 KB of a 100 KB allowance**. There is ~89 KB of headroom. next-intl's client runtime fits with
room left, and T-tasks re-measure rather than trust this paragraph.

**Alternatives considered**:

- **A bespoke dictionary layer** (`next/root-params` + per-locale modules + `Intl.PluralRules`), which
  is what Next's own i18n guide documents. Genuinely viable and roughly 200 lines of our own code —
  I costed it. Rejected because those 200 lines are a message-format, a navigation wrapper and a
  client provider that we would then maintain, and because the 25 client components in
  `src/components/account/**` and `src/components/commerce/**` that hold their own copy need a client
  provider either way. **This stays the documented fallback**: if the measurement in Phase 9 shows
  next-intl's runtime costs more than the remaining headroom, the message files are already plain
  JSON and the swap is contained.
- **paraglide-next** — compiles messages to tree-shaken functions, so the smallest possible bundle.
  Rejected: the bundle is not the binding constraint here, and its Next 16 story is younger than
  next-intl's.
- **next-international**, **lingui**, **tolgee** — no advantage over next-intl for three languages and
  one team, and smaller ecosystems.
- **Payload-managed UI strings** — that is FR-035, answered by the user: interface strings stay in
  code. Recorded in Complexity Tracking.

**Dependency weight, stated plainly** (Constitution's Technology Stack section requires it):
`next-intl@4.14.4` pulls `use-intl`, `icu-minify`, `@formatjs/intl-localematcher`, `negotiator`, and —
for its optional SWC message extractor — `@swc/core` and `@parcel/watcher`, both native binaries.
Those two are build-time only and never reach a browser. Its peer range is
`next: ^12 || ^13 || ^14 || ^15 || ^16`, so 16.3.3 is supported.

---

## R2 — Where does the locale live in the URL?

**Decision**: A path prefix on a **root dynamic segment**, `src/app/(frontend)/[locale]/…`, with the
default locale **unprefixed**:

| Language | Home | A policy page |
| --- | --- | --- |
| English | `/` | `/legal/privacy` |
| Russian | `/ru` | `/ru/legal/privacy` |
| Ukrainian | `/uk` | `/uk/legal/privacy` |

next-intl routing option: `localePrefix: 'as-needed'` (verified present in
`dist/types/routing/config.d.ts`).

**Rationale**: FR-012 wants the language determinable from the address alone; FR-013 wants today's
addresses to keep resolving. Prefixing every locale would move every published address on the site;
a cookie-only scheme would give a crawler one address for three languages. `as-needed` is the only
shape that satisfies both, and it is why `/legal/privacy` continues to mean what it means today.

**The cost is a large, boring diff**: every route file under `src/app/(frontend)/` moves one level
down into `[locale]/`. Twelve route directories, no content change. The `(payload)` group is
untouched — `/admin` and `/api` never gain a prefix.

**The root layout moves with them.** `src/app/(frontend)/[locale]/layout.tsx` becomes the root layout
for the storefront, which is what makes `locale` a *root parameter* rather than an ordinary one:
"Root parameters are the dynamic segments that appear before the root layout file". This is exactly
the structure the Next docs show for `app/[lang]/layout.tsx`.

**One consequence to design around**: the app has two root layouts — the storefront's and Payload's.
The docs are explicit that with multiple root layouts, a getter for a parameter that does not exist
in every one of them is typed `string | undefined`. So `await locale()` is `string | undefined` in
this codebase, and every caller goes through one narrowing helper rather than each guessing.

**Alternatives considered**: sub-domains (`ru.aurum.example`) — three deployments' worth of
configuration for no benefit at this size; a `?lang=` query parameter — not indexable as distinct
pages; cookie-only — fails FR-012.

---

## R3 — `proxy.ts`, not `middleware.ts`

**Decision**: The prefix resolution lives in **`src/proxy.ts`**, exporting `proxy`.

**Rationale**: Next.js 16 renamed the convention.
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md` opens with
"The `middleware.js` file convention has been **deprecated** in Next.js 16 and renamed to
`proxy.js`", and `AGENTS.md` says to heed deprecation notices. next-intl's own `createMiddleware`
export is unchanged — the import is still `next-intl/middleware`; only the file and exported function
names follow Next's new convention.

**Matcher**, excluding everything Payload owns and everything with a file extension:

```ts
export const config = {
  matcher: ['/((?!api|admin|_next|_vercel|language|.*\\..*).*)'],
}
```

`api` and `admin` are the Payload route groups; `language` is the cookie-reset handler from R6.

**A constraint the proxy doc states outright**: "Proxy is meant to be invoked separately of your
render code … you should not attempt relying on shared modules or globals." No Payload import, no
database read, no `payload.findGlobal` in this file. That single sentence is what forces the design in
R6.

---

## R4 — Locale detection off, remembered choice on

This is the one place the spec's requirements fight the library's defaults, and the fight is
resolvable in about fifteen lines.

**The requirements**: FR-010 says a first-time visitor is always served English and the browser's
languages are never acted on. FR-008 says an explicit choice survives a return visit.

**What next-intl does**, read from `dist/esm/development/middleware/resolveLocale.js`:

```
Prio 1: route prefix
Prio 2: existing cookie          (only if routing.localeDetection)
Prio 3: accept-language header   (only if routing.localeDetection)
Prio 4: default locale
```

`localeDetection` is a single boolean covering priorities 2 and 3 together — its own doc comment
says "the cookie as well as the `accept-language` header will no longer be used". So `true` violates
FR-010 and `false` appears to violate FR-008.

**It does not, and this is the finding that makes the design work.** Cookie *writing* lives in
`middleware/syncCookie.js`, which is gated on `routing.localeCookie` and **not** on `localeDetection`.
With detection off, next-intl still maintains `NEXT_LOCALE` whenever the visitor navigates to a
prefixed path — it simply stops routing on it. So the library keeps the memory and we decide what to
do with it.

**Decision**:

```ts
// src/i18n/routing.ts
export const routing = defineRouting({
  locales: ['en', 'ru', 'uk'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  localeDetection: false,                                   // FR-010
  localeCookie: { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' },  // FR-008: 12 months
  alternateLinks: false,                                    // see R12
})
```

and in `src/proxy.ts`, a wrapper around `createMiddleware(routing)`: **on an unprefixed path only**,
if `NEXT_LOCALE` names a non-default locale, redirect to the prefixed equivalent. Otherwise delegate
untouched.

A crawler carries no cookie, so `/` stays English for indexing and stays prerendered. A visitor who
chose Russian yesterday and types the bare domain lands on `/ru`. Neither party's page is
personalized — the redirect happens in the proxy, before the cache is consulted.

`syncCookie` skips non-document requests by checking `sec-fetch-dest`, with a source comment
referencing Next.js 16.3's router revalidation behaviour specifically. The library is current with
the framework this repo runs.

---

## R5 — Payload's localization configuration

**Decision**, in `src/payload.config.ts`:

```ts
localization: {
  locales: [
    { code: 'en', label: 'English' },
    { code: 'ru', label: 'Русский' },
    { code: 'uk', label: 'Українська' },
  ],
  defaultLocale: 'en',
  fallback: true,
  defaultLocalePublishOption: 'active',
}
```

Verified against `node_modules/payload/dist/config/types.d.ts` (Payload 3.88.0): `Locale` is
`{ code, label, fallbackLocale?, rtl? }`, and `BaseLocalizationConfig` carries `defaultLocale`,
`fallback` (default `true`), `defaultLocalePublishOption` and `filterAvailableLocales`.

- **`fallback: true`** is FR-046 in one key: a field with no value in the requested locale resolves to
  the default locale's value. It is the default, and Constitution IV forbids taking a default by
  omission, so it is written out.
- **`defaultLocalePublishOption: 'active'`** rather than the shipped `'all'`. With `'all'`, pressing
  Publish while editing Russian publishes every locale's draft — including a half-finished Ukrainian
  one. FR-023 says an unpublished translation must not reach visitors, so the Publish button defaults
  to the locale being edited and "publish all" stays available as the secondary action.
- **Labels in their own language** (FR-003). `label` also accepts a record keyed by admin UI language;
  a plain string is right here because "Русский" reads correctly to an editor working in any of the
  three.
- **`filterAvailableLocales` is deliberately unused.** It filters which locales the *admin* offers,
  per user. FR-030 requires the opposite: a locale hidden from visitors must stay editable. The
  storefront's list and Payload's list are different lists, which is the whole of R6.

---

## R6 — Which locales visitors are offered, and the redirect loop that design must avoid

**Decision**: a new global, `language-settings`, holding one checkbox per non-default locale. Payload
always knows three locales; the storefront asks this global which of them to offer.

```
Languages (globals/language-settings.ts)
├── ruEnabled  checkbox  "Offer Russian to visitors"
└── ukEnabled  checkbox  "Offer Ukrainian to visitors"
```

English has no field at all. FR-029 says disabling the default locale must be refused with an
explanation; a field that does not exist cannot be set, which is a stronger guarantee than a
validation error, and the global's admin description says so in words.

`afterChange: [revalidateGlobalOnChange]` — the existing hook from `src/lib/revalidate.ts` — is what
makes FR-031's "without a deploy" true for prerendered pages.

**Enforcement is in the layout, not the proxy**, because R3's rule forbids a database read in
`proxy.ts`. `src/app/(frontend)/[locale]/layout.tsx` already performs four Local API global reads;
this is a fifth, on the same terms (a global read is not a request-time API, so it does not opt routes
into dynamic rendering). If the requested locale is disabled, the layout redirects to the
default-locale equivalent of the same path.

**And that is where a loop appears.** A visitor holding `NEXT_LOCALE=uk` requests `/`; the proxy
redirects to `/uk`; the layout finds Ukrainian disabled and redirects to `/`; the proxy redirects to
`/uk` again. Forever. A Server Component cannot clear a cookie, and reading `cookies()` in the layout
would make every route dynamic — precisely what `src/components/layout/cart-count` exists to avoid.

**The break**: a Route Handler at `src/app/(frontend)/language/reset/route.ts`. The layout redirects
there with the intended destination; the handler clears `NEXT_LOCALE` and 307s to the default-locale
path. Route Handlers can set cookies, the proxy excludes `/language` from its matcher, and the cookie
is gone by the next request. One extra hop, only in the rare case where a locale was disabled while
someone was reading it — US3's second acceptance scenario, which is otherwise unimplementable.

**Alternatives considered**: encoding a marker in the query string for the proxy to strip (works, but
a magic query parameter is harder to read than a named route); teaching the proxy the enabled set via
an environment variable (fails FR-031 — it would need a deploy); accepting a 404 for a disabled locale
(fails US3 scenario 2, which requires a real page rather than an error).

---

## R7 — Slugs stay English, and the generator learns to transliterate

**Decision**: `src/fields/slug.ts` stays **non-localized** — one address segment per document, shared
across all three prefixes — and gains a Cyrillic→Latin transliteration table.

**Rationale**: the user settled the first half: "slugs always be on english". It is also the choice
that keeps `unique: true` meaningful without scoping uniqueness per locale, keeps every cross-language
link a pure prefix operation (R12 depends on this), and keeps `src/lib/*/queries.ts` finding documents
by one slug regardless of the language being rendered.

The second half is not optional. Today's generator is
`.replace(/[^a-z0-9]+/g, '-')`, so "Каблучка з діамантом" produces the empty string against a field
that is `required` and `unique` — a save error, which FR-014 forbids. Creating a document while the
admin is set to Russian is an ordinary thing for an owner to do. A transliteration pass (`ж→zh`,
`ї→yi`, `щ→shch`, both alphabets) turns that title into `kabluchka-z-diamantom` and makes the failure
impossible rather than documented.

**Alternatives considered**: localized slugs — better for search visibility in Cyrillic markets, but
they need per-locale uniqueness, a per-locale `generateStaticParams`, and a cross-language link that
resolves a sibling slug per page rather than prefixing a path. The user ruled on it; this records why
the ruling is also the cheaper one.

---

## R8 — Which fields become `localized: true`

Enumerated in [data-model.md](./data-model.md). The rule, from FR-019 and FR-020: **words are
localized; everything else is shared.** Images, prices, stock, dates, relationships, ordering, flags
and slugs stay single-valued, so a price is changed once and a photograph is uploaded once.

Two findings worth stating here:

- **Generated types barely move.** Payload's generated interfaces describe a single-locale API
  response, so `title: string` stays `title: string` after `localized: true`. Components consuming
  `payload-types.ts` do not change shape — which is why this feature touches the loaders and not the
  50-odd presentational components.
- **The shared field configs are where the leverage is.** `src/fields/seo.ts`, `src/fields/cta.ts` and
  `src/fields/media-slot.ts` are composed by most collections and all seven blocks. Localizing those
  three files localizes metadata, button labels and alt text everywhere at once — Constitution II's
  "repeated field groups MUST become reusable field configs" paying off.

---

## R9 — The migration is the risky part

**Decision**: `payload migrate:create`, then **hand-edit the generated migration to copy data before
it drops anything**, then rehearse against a production-sized restore, then write `down()`.

**Rationale**: the Postgres adapter stores localized fields in a side table — `localesSuffix` defaults
to `'_locales'`, confirmed in `node_modules/@payloadcms/db-postgres/dist/index.js`. So `articles.title`
becomes `articles_locales.title` with `_locale` and `_parent_id` columns. The generated DDL creates the
new table and drops the old columns; **it does not carry the rows across.** Run unedited, it would
empty every piece of published content on the site — FR-022 and SC-011 exist because of this.

Each table needs an insert between the create and the drop, of the shape:

```sql
INSERT INTO articles_locales (_locale, _parent_id, title, excerpt, …)
SELECT 'en', id, title, excerpt, … FROM articles;
```

Constitution IV requires a tested rollback: `down()` reverses it, moving `_locale = 'en'` rows back
into the parent table before dropping the locales tables. Both directions are rehearsed on a restored
copy, not on an empty development database — an empty database makes a data-loss bug invisible, which
is the trap this paragraph exists to name.

Versions and drafts multiply the work: every collection with `versions` has a `_v` table that gains its
own `_locales` sibling. The rehearsal is what proves the count is right.

---

## R10 — Where the interface's words live

**Decision**: `src/i18n/messages/{en,ru,uk}.json`, namespaced by area — `common`, `header`, `nav`,
`catalog`, `product`, `cart`, `account`, `forms`, `errors`, `contact`, `blog`, `legal`. `en` is the
type source: `Messages = typeof import('./messages/en.json')` in a `global.d.ts` augmentation, so a key
that exists in Russian but not English is a type error rather than a surprise.

**FR-037 — a missing string renders English, never a raw key.** next-intl's default is to render the
key. `src/i18n/request.ts` deep-merges `en` beneath the requested locale when it loads messages, so an
untranslated key renders the English sentence. The merge happens once per request in a Server
Component, and the fallback is then invisible to every call site.

**FR-034 — one file per language.** A translator receives `ru.json` and returns `ru.json`. No code tour.

---

## R11 — Getting words into Client Components

**The shape of the problem, measured**: 58 files carry `'use client'`. 24 of them are UI-kit
primitives, and the kit already takes copy as props with English defaults — `label = 'Load more'`,
`placeholder = 'What are you searching for?'`. Those need no new mechanism at all: the server passes a
translated string where it already passes a string, and the default becomes a development fallback.

The remaining ~25 are feature components that hold their own copy, concentrated in the account forms
(`address-modal` alone has 20 strings) because react-hook-form and zod put validation sentences in the
client.

**Decision**: `NextIntlClientProvider` in the root layout, carrying **only the namespaces client
components actually read** — `common`, `header`, `nav`, `cart`, `account`, `forms`, `errors`. Server
components use `getTranslations` and never touch the provider. Passing the whole message file would
put every legal and blog string into the flight payload of every page for no reader.

`src/lib/auth/form-errors.ts` already has the right seam: server actions return message *keys* and the
screen turns them into sentences through a dictionary it is handed. That file's comment argues there
should be no shared copy module because "these strings are part of the screen". The argument holds for
who owns the words and stops holding at three languages; the dictionary it takes becomes
`t('errors.…')` and the indirection survives unchanged.

---

## R12 — Metadata, `hreflang`, and the sitemap

**Decision**: emit alternates from `generateMetadata` per route, filtered by the **enabled** locale
set, and set `alternateLinks: false` in the routing config.

**Rationale**: next-intl's middleware can emit `Link` alternate headers automatically, and it defaults
to `true` — but it emits them for every *configured* locale, and this site's offered set is a runtime
value the proxy cannot read (R3, R6). Left on, it would advertise Ukrainian to Google on the day the
owner turned Ukrainian off. The metadata layer knows the enabled set because it runs inside the render,
so that is where the truth lives:

```ts
alternates: {
  canonical: hrefFor(locale, path),
  languages: { ...enabledOnly, 'x-default': hrefFor('en', path) },
}
```

`src/app/sitemap.ts` is already `force-dynamic` and already enumerates the whole site, so it reads the
same global and emits one entry per document per enabled locale with `alternates.languages` — FR-017.
It sits at `src/app/sitemap.ts`, outside `(frontend)`, so it is unaffected by the `[locale]` move.

One caveat that follows from R2: a sitemap is a special Route Handler, and **`next/root-params` is not
available in Route Handlers** ("Support for Route Handlers is planned for a future release"). The
sitemap therefore iterates locales explicitly, which is what it wants to do anyway.

---

## R13 — How the locale reaches the data layer

**Decision**: every loader in `src/lib/*/queries.ts` takes an explicit `locale` argument. None of them
reach for `next/root-params` internally.

**Rationale**: it is tempting to hide the locale inside the query layer now that a getter exists — the
Next docs even demonstrate exactly that with a `getTranslations` example. It would break in two places
this codebase actually has: `src/app/sitemap.ts` is a Route Handler, and the server actions in
`src/lib/auth/actions.ts` and `src/lib/contact/actions.ts` are Server Actions. The root-params doc lists
both as unsupported, the second permanently. A loader that works in a page and throws in the sitemap is
worse than a parameter.

So the parameter is threaded, and `await locale()` is called at the top of the render — in the layout,
the page, or `generateMetadata` — and passed down. Local API reads become
`payload.find({ …, locale, fallbackLocale: 'en' })`.

**Server Actions get the locale as part of their input**, not from the environment: a hidden form field
or an argument from the client component that already knows its locale via `useLocale()`. Reading
`NEXT_LOCALE` inside the action would be wrong for a visitor who arrived on `/ru/...` from a link and
never touched the selector — they have no cookie, and their confirmation mail would arrive in English
(FR-042).

---

## R14 — Money, dates, and country names

All three are already most of the way there, which is the Constitution II dividend.

- **Money**: `src/lib/catalog/price.ts` already takes a `locale` argument and defaults to `'en-US'`,
  with a comment explaining that an explicit default is what stops the server and the client
  disagreeing. It needs an app-locale → BCP 47 map (`en→en-US`, `ru→ru-RU`, `uk→uk-UA`) and the locale
  threaded to its callers. `CATALOG_CURRENCY` does not move: Constitution VI and FR-038 keep one
  currency in integer minor units.
- **Dates**: `Intl.DateTimeFormat` with the same mapped locale.
- **Countries**: `src/lib/countries.ts` already stores ISO codes and resolves names through
  `Intl.DisplayNames`, cached per locale, with `countryName(code, locale = 'en')` already in its
  signature. FR-040 is satisfied by passing the locale. The file's own comment predicted this: "it is
  already translated into every language the site might add".
- **Plurals**: next-intl's ICU `plural` handles `one/few/many/other` for Russian and Ukrainian. The
  cart's spoken name — `Cart, 2 items` at `header.tsx` — is the first and most visible consumer.

---

## R15 — What happens to the language selector

`src/components/layout/language-selector/language-selector.tsx` **does not change**. Its props are
already `{ locales: Locale[]; value: string; onChange }`, and the header's own comment predicted the
ending: "When i18n lands this becomes controlled by the router; the shape of the prop does not change."

What changes is three lines of context around it:

- `DEFAULT_LOCALES` at `header.tsx:74` — the hardcoded `EN`/`RU` pair — is deleted. The list comes from
  the layout, built from the enabled set (R6).
- `React.useState` becomes the current locale from the route.
- `onChange` becomes a navigation to the same pathname under the new prefix, using next-intl's router
  so the cookie is synced client-side.

The `Locale` interface it exports (`code`, `label`) is the shape the layout supplies, with `code`
upper-cased for display (`EN`) and the route value lower-case (`en`).

---

## R16 — Mail and the messenger handoff

Transactional mail is sent from Payload's own auth operations (`verify`, `forgotPassword`) through the
Resend adapter, plus this codebase's own `src/lib/auth/verification-email.ts`,
`src/lib/auth/reset-email.ts` and `src/lib/email/enquiry.ts`.

**Decision**: subject and body text move into the message files under an `email` namespace, resolved
with `getTranslations({ locale, namespace: 'email' })` — the one place an explicit `locale` is passed
to next-intl rather than inferred, which is exactly what its API documents the option for. The locale
arrives as an argument (R13). FR-045 — a missing translation must never stop a verification code —
falls out of R10's English merge: there is always a sentence.

The messenger handoff (`src/lib/messengers/`) composes a WhatsApp/Telegram message; it gains the
enquiry's locale so the shop can answer in it (FR-043).

---

## R17 — Caching and revalidation per locale

`src/lib/revalidate.ts` invalidates **literal paths**, deliberately — its comment records that the
`/products/[slug]` pattern form does not touch pages produced by `generateStaticParams`, measured
rather than assumed. Three prefixes multiply that list by three: publishing a product now invalidates
`/products/x`, `/ru/products/x` and `/uk/products/x`.

The locale list used for invalidation is the **configured** set, not the enabled set. A disabled
locale's pages must still be invalidated, or re-enabling a language would serve content from before it
was switched off.

`generateStaticParams` gains the locale dimension: every prerendered route family — `/products/[slug]`,
`/blog/[slug]`, `/legal/[slug]` — multiplies by three. Build time grows proportionally; the catalogue
is small enough that this is a note, not a risk.

---

## R18 — Testing and the gates

| Layer | What it proves | Where |
| --- | --- | --- |
| Unit (`vitest`) | Locale narrowing incl. the `string \| undefined` from two root layouts; transliterated slugs; the enabled-set filter; BCP 47 mapping; plural output at 1/2/5/21 | `src/**/*.test.ts` |
| Integration | Payload reads per locale, `fallback: true` behaviour, the migration's data carry | `vitest.integration.config.ts` |
| E2E (`playwright`) | Switch language and stay switched; return-visit redirect; disabled locale reaches real content; no English left on a translated page | `tests/e2e/` |
| A11y | `lang` attribute correct per locale; axe clean on changed pages in all three | `pnpm test:a11y` |
| Budget | `pnpm measure:js` against a production server, compared with 009's 192.3 KB baseline | Phase 9 |
| Naming | `pnpm check:naming` — every new path kebab-case | CI |

Storybook needs a `NextIntlClientProvider` decorator in `.storybook/preview` for the client components
that read messages directly; kit primitives keep taking props and keep their existing stories.

---

## Resolved unknowns

| Unknown | Resolution |
| --- | --- |
| Library or hand-rolled? | next-intl 4.14.4 (R1); bespoke layer documented as the fallback |
| `middleware.ts`? | No — `proxy.ts`, renamed in Next 16 (R3) |
| How does a server utility learn the locale? | `next/root-params`, new in 16.3.0 — but not in Route Handlers or Server Actions, so loaders take a parameter (R2, R13) |
| Can detection be off and memory on? | Yes — `localeDetection: false` still writes the cookie; the proxy acts on it (R4) |
| Where does the enabled-locale gate run? | The layout, never the proxy; the loop is broken by a reset Route Handler (R6) |
| Localized slugs? | No — English, transliterated from Cyrillic titles (R7) |
| Does the migration carry data? | No. Hand-edited inserts, rehearsed both ways on a production-sized restore (R9) |
| Who emits `hreflang`? | `generateMetadata`, filtered by the enabled set; `alternateLinks: false` (R12) |
| Does the language selector change? | No. Its props were built for this (R15) |
