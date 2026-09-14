# Quickstart: proving three languages work

**Feature**: `010-site-localization` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Every scenario below maps to a success criterion. Details of *what* is localized are in
[data-model.md](./data-model.md); details of *how* addresses behave are in
[contracts/routing.md](./contracts/routing.md).

---

## Prerequisites

```bash
pnpm install                 # brings in next-intl@4.14.4
docker compose up -d db      # Postgres
cp .env.example .env         # DATABASE_URI, PAYLOAD_SECRET, NEXT_PUBLIC_SERVER_URL
```

**Before the migration runs anywhere that matters, take a restore of production-sized content.** The
migration moves every localized column into a `_locales` table, and an empty development database
cannot fail that test — which is the entire reason SC-011 exists.

```bash
pg_dump "$PROD_DATABASE_URI" > /tmp/aurum-before.sql
createdb aurum_rehearsal && psql aurum_rehearsal < /tmp/aurum-before.sql
```

---

## 1. The migration carries the content (SC-011, FR-022, FR-049)

```bash
DATABASE_URI=postgres://…/aurum_rehearsal pnpm payload migrate
```

Then, before anything else is believed:

```sql
-- Every row must have made it across as English.
SELECT (SELECT count(*) FROM articles)  AS articles,
       (SELECT count(*) FROM articles_locales WHERE _locale = 'en') AS en_rows;

-- Nothing anywhere may have arrived empty.
SELECT count(*) FROM policies_locales WHERE _locale = 'en' AND (title IS NULL OR body IS NULL);
```

Expected: the two counts in the first query match for every table in data-model.md §10, and the second
returns `0`.

### The production runbook (T111)

```bash
# 1. Back up. The migration drops 157 columns; there is no undo that does not start here.
pg_dump "$DATABASE_URI" > aurum-before-localization.sql

# 2. Run. Three migrations, in order, in one command.
pnpm payload migrate

# 3. Verify, before letting traffic in.
psql "$DATABASE_URI" -c "SELECT (SELECT count(*) FROM policies) = (SELECT count(*) FROM policies_locales WHERE _locale='en') AS policies_ok;"
psql "$DATABASE_URI" -c "SELECT count(*) FROM products_locales WHERE _locale='en' AND title IS NULL;"   -- expect 0

# 4. If anything is wrong:
pnpm payload migrate:down    # reverses ONE migration; run three times to undo all three
```

The three migrations, oldest first: `20260911_135539_localization` (the big one — 48 `_locales`
tables, 157 columns moved), `20260911_141700_language_settings` (one new table),
`20260911_152747_customer_locale` (one nullable column).

**Row counts measured on the rehearsal set**, for comparison against a production run: 31 products,
15 articles, 4 policies, 31 media, 12 article chapters, 6 questions — all carried, zero nulls, in
175 ms. A production-sized set will take longer; the `INSERT … SELECT` statements are proportional to
row count and the `DROP COLUMN`s are not.

### Rehearsed 2026-09-11 (T052)

Against a restored copy holding 31 products, 15 articles, 4 policies, 31 media and 12 article
chapters. **Not a production-sized restore** — that rehearsal is still outstanding and is what SC-011
actually asks for; this one proves the migration is *correct*, not how long it takes.

| Table | Rows before | `_locales` rows at `en` | Rows with a NULL where content was |
| --- | --- | --- | --- |
| `products` | 31 | 31 | 0 |
| `policies` | 4 | 4 | 0 |
| `articles` | 15 | 15 | 0 |
| `media` | 31 | 31 | 0 |
| `articles_chapters` | 12 | 12 | 0 |
| `questions` | 6 | 6 | 0 |

Down and up again both clean: every parent table came back with its content intact, `SELECT title
FROM policies` read "Privacy Policy" again, and zero `_locales` or `_carry_` tables were left behind.

> **Two things the rehearsal caught that reading could not.**
>
> 1. **The generated migration carries no data at all** — 48 `CREATE TABLE`, 157 `DROP COLUMN`, zero
>    `INSERT`. Run as generated it empties every translated field on the site. The 48 `INSERT …
>    SELECT 'en', …` statements between the creates and the drops are hand-written, and the counts
>    above are the evidence they work.
> 2. **The first rollback attempt failed outright**: `column "alt" of relation "media" contains null
>    values`. The generated `down` re-adds six columns as `NOT NULL` to tables that already have
>    rows, which Postgres refuses, and it drops the `_locales` tables *before* re-adding the columns
>    — so there is nowhere to put the words and no way to satisfy the constraint. The fix is in the
>    file: English rows are stashed in `_carry_*` tables first, the six columns go back nullable, the
>    words are restored, and `SET NOT NULL` is re-asserted at the end so the rolled-back schema
>    matches what it started as.

**Then roll back and check again** — a rollback nobody has run is not a rollback path:

```bash
pnpm payload migrate:down
psql aurum_rehearsal -c "SELECT count(*) FROM articles WHERE title IS NOT NULL;"
```

Expected: the original row counts, with content intact. Re-run `migrate` afterwards.

---

## 2. A visitor can switch language and stay switched (SC-001, US1)

```bash
pnpm dev
```

| Step | Expected |
| --- | --- |
| Open `/products/<slug>` | English. The header selector reads `EN` |
| Choose `RU` | `/ru/products/<slug>`, Russian, selector reads `RU` |
| Navigate to the blog, then into an article | Still `/ru/…`, still Russian, no second choice needed |
| Reload | Still Russian |
| Close the tab, reopen, go to `/` | Redirected to `/ru` — the remembered choice (FR-008) |
| Open a private window with the browser set to Russian, go to `/` | **English.** Detection is off; nobody is redirected for their browser's language (FR-010) |
| Narrow the window, open the mobile panel, choose `UK` | Ukrainian, and the panel closes (FR-009) |
| View source on any page | `<html lang="uk">`, not `en` (FR-015) |

Add an item to the cart, then switch language: the cart count survives (FR-011).

---

## 3. The owner writes the site three times (SC-002, SC-003, US2)

In `/admin`:

| Step | Expected |
| --- | --- |
| Open a policy, switch the locale control to Russian | Word fields are empty or marked as falling back; images, dates and the slug show the same single value |
| Type a Russian title and body, save, publish | `/ru/legal/privacy` shows it; `/legal/privacy` is untouched |
| Publish while editing Russian with an unfinished Ukrainian draft | The Ukrainian draft does **not** go live — `defaultLocalePublishOption: 'active'` (FR-023) |
| Create a document titled `Каблучка з діамантом` | Saves. The slug derives as `kabluchka-z-diamantom` rather than failing (FR-014) |
| View a product translated only into English, at `/ru/products/<slug>` | A complete page, English description, **no blank region** (FR-046, FR-047, SC-009) |

Time the third row end to end. SC-003 asks for a policy page translated in under ten minutes once the
text exists.

---

## 4. The owner turns a language off (SC-004, US3)

| Step | Expected |
| --- | --- |
| `/admin` → Settings → Languages → uncheck Ukrainian, save | Within a minute: the header selector offers two; `/uk/*` no longer serves; the sitemap drops every `uk` address |
| As a visitor holding `NEXT_LOCALE=uk`, open `/` | Lands on the English page. **No redirect loop** — `/language/reset` clears the cookie once (contracts/routing.md §3) |
| In the admin, open a document and switch to Ukrainian | Still editable. Disabling hides it from visitors, it does not archive it (FR-030) |
| Look for a control to disable English | There is none, and the description says why (FR-029) |
| Re-check Ukrainian | Everything typed while it was off is there, unchanged (FR-028) |

---

## 5. Nothing on screen is left in English (SC-002, US4)

With all three languages fully translated, walk each path in Russian and again in Ukrainian:

- catalogue → filters → product → size → add to cart → cart → handoff
- sign in → create account → verification code → account → addresses → change password
- contact form, including a deliberate validation failure
- blog listing → article
- the cookie banner and its per-category chooser

Every button, label, placeholder, empty state, toast, validation sentence and accessible name is in the
page's language. Then check the parts a screenshot will not show:

```bash
# The cart's spoken name at each plural category — Russian has three where English has two.
# Expected: 1 товар / 2 товара / 5 товаров / 21 товар  (SC-012, FR-036)
```

Prices read `24 900,00 $` in Russian and `$24,900.00` in English — **the same amount, in one currency**
(FR-038). Country names in the address form are in the page's language (FR-040). No hydration warning
appears in the console; if one does, a formatter is defaulting its locale on one side.

---

## 6. Search engines see three sites (SC-005, US5)

```bash
pnpm build && pnpm start
curl -s localhost:3000/ru/legal/privacy | grep -E 'rel="(canonical|alternate)"'
curl -s localhost:3000/sitemap.xml | head -40
```

Expected:

- The Russian page names **itself** canonical — not the English one.
- Three `alternate` links plus `x-default` pointing at the English address, and each alternate names
  the others reciprocally.
- The sitemap lists every document in every **enabled** locale, each with `alternates.languages`.
- With Ukrainian disabled, no `uk` address appears anywhere in either output (FR-027).

---

## 7. Mail and the handoff arrive in the right language (SC-010, US6)

```bash
EMAIL_TRANSPORT=log pnpm dev
```

Register from `/ru/create-account`; the logged mail is Russian. Request a reset from `/uk/forgot-password`;
that mail is Ukrainian. Submit an enquiry from `/ru/contact`; the stored `enquiries.locale` reads `ru`
and the composed messenger message carries it (FR-043).

Then delete a key from `ru.json` under `email` and send again: **the mail still sends**, in English. A
missing translation may never make a verification code undeliverable (FR-045).

---

## 8. The budgets still hold (SC-007, SC-008, Constitution V)

```bash
pnpm build && pnpm start
pnpm measure:js http://localhost:3000 /not-a-real-page / /all-jewelry /products/<slug> /legal/privacy /ru /ru/legal/privacy
```

Compare against the baseline below — **and only with this script**, for the reason
009/quickstart.md records at length.

### Baseline measured 2026-09-11, before any of this feature landed (T001)

Taken against a production server on port 3100 (port 3000 held a pre-existing server; measuring
against a stale one is the trap 009 documents).

| Route | Requests | Measured | Ceiling |
| --- | --- | --- | --- |
| `/not-a-real-page` (framework baseline) | 13 | **192.3 KB** | — |
| `/` | 13 | 197.6 KB | 300 KB total **and** baseline + 100 KB |
| `/all-jewelry` | 14 | **202.9 KB** (worst route) | same |
| `/products/<slug>` | 13 | 197.6 KB | same |
| `/legal/privacy` | 12 | 187.0 KB | same |

Every figure reproduces spec 009's to the decimal, which is a useful check on both measurements. The
worst route sits **10.6 KB above the 192.3 KB framework baseline against a 100 KB allowance** — so
this feature has roughly 89 KB of headroom for next-intl's runtime and the client message payload.

### Measured again 2026-09-11, after Foundational + US1 + US2 + US3 + US5 (T104)

| Route | Before | After | Delta |
| --- | --- | --- | --- |
| `/not-a-real-page` (framework baseline) | 192.3 KB | **207.2 KB** | +14.9 KB |
| `/` | 197.6 KB | 212.7 KB | +15.1 KB |
| `/all-jewelry` (worst route) | 202.9 KB | **217.9 KB** | +15.0 KB |
| `/legal/privacy` | 187.0 KB | 202.0 KB | +15.0 KB |
| `/ru` | — | 212.7 KB | identical to `/` |
| `/ru/legal/privacy` | — | 202.0 KB | identical to `/legal/privacy` |

**Both constitutional clauses pass.** The worst route is 217.9 KB against the 300 KB cap, and
**10.7 KB above the new 207.2 KB framework baseline** against a 100 KB allowance. next-intl's client
runtime costs a flat ~15 KB, and it lands in the baseline because the provider is in the root layout
— so it is charged to every route including the 404, exactly as spec 009's cookie banner was.

### Measured again after US4 (T104)

| Route | Baseline (T001) | Now | Delta |
| --- | --- | --- | --- |
| `/not-a-real-page` (framework baseline) | 192.3 KB | **207.4 KB** | +15.1 KB |
| `/` | 197.6 KB | 212.7 KB | +15.1 KB |
| `/all-jewelry` (worst route) | 202.9 KB | **217.8 KB** | +14.9 KB |
| `/legal/privacy` | 187.0 KB | 202.3 KB | +15.3 KB |
| `/ru` | — | 212.7 KB | identical to `/` |
| `/ru/all-jewelry` | — | 217.8 KB | identical to `/all-jewelry` |

Unchanged by US4 to within a rounding error, **even though the client provider grew from seven
namespaces to nine**. Messages travel in the flight payload, not the bundle, so adding a namespace
costs HTML rather than JavaScript. The worst route sits 10.4 KB above the framework baseline against
a 100 KB allowance.

**A Russian route measures the same as its English twin, to the decimal.** That is the check that
says message data is travelling in the flight payload rather than the JavaScript bundle. A widening
gap between `/x` and `/ru/x` in a later measurement means a message file has been imported into a
Client Component, or the provider is carrying namespaces no client reads.

`next-intl@4.14.4` pulls `@swc/core` and `@parcel/watcher` transitively. Both are native binaries
backing its optional message extractor; both are build-time only and reach no browser.

A Russian route should measure within a kilobyte or two of its English twin; a large gap means message
data is landing in the bundle rather than the flight payload, or the client provider is carrying
namespaces no client component reads.

```bash
pnpm test:a11y     # axe on changed pages, in all three languages
pnpm check:naming  # every new path kebab-case — CI enforces it, macOS will not
pnpm test && pnpm test:integration && pnpm test:e2e
```

---

## 9. Old addresses still resolve (SC-006, FR-013)

```bash
for p in / /all-jewelry /about /blog /contact /faq /legal/privacy /legal/terms /legal/cookies /legal/shipping /cart /sign-in; do
  printf '%s -> %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "localhost:3000$p")"
done
```

Expected: `200` for every one of them, serving English. Not a redirect to the site root, not a `/en/`
prefix, not a 404. This is the check that says the `as-needed` prefix decision was implemented as
specified.

---

## 10. The suite, run against a production server on 2026-09-14 (T105–T109)

Everything below ran against `pnpm build && PORT=3000 pnpm start` with the project database.

| Check | Result |
| --- | --- |
| `pnpm typecheck` | clean |
| `pnpm lint` | clean |
| `pnpm check:naming` | 762 paths, all kebab-case |
| `pnpm check:stories` | 40 components, all with stories |
| `pnpm test` | 329 passed (28 files) |
| `pnpm test:integration` | 295 passed (30 files) |
| `pnpm test:e2e --project=e2e` | 370 passed, 8 failed — **all eight inherited**, see below |
| `pnpm test:a11y` | 168 passed, 5 failed — **all five inherited** |
| `pnpm test:stories` | 107 passed, 3 failed — **all three inherited** |
| `pnpm payload generate:types` | no diff — `payload-types.ts` is current |
| `pnpm measure:js` | worst route 218.1 KB against a 207.8 KB baseline — 10.3 KB of a 100 KB allowance |

`/ru/all-jewelry` measures **218.1 KB, identical to `/all-jewelry`**, which is the check that says
message data travels in the flight payload rather than the JavaScript bundle.

**`PORT` is not free, and getting it wrong costs a day.** `NEXT_PUBLIC_SERVER_URL` is
`http://localhost:3000`, and Payload derives its CSRF allowlist from it. Payload's cookie token
extraction (`node_modules/payload/dist/auth/extractJWT.js`) rejects a cookie whenever the request
carries an `Origin` the allowlist does not contain — and a Server Action POST always carries one,
while a page GET does not. Run the suite against a server on any other port and every action that
needs a session silently sees an anonymous visitor: the profile saves nothing, `saveAddress` writes a
row with `customer_id IS NULL`, and the page renders as though nothing happened. No error is logged
anywhere. Use port 3000.

**And `EMAIL_TRANSPORT=log` is not optional either — this one spends real money.**
`playwright.config.ts` sets it on the server **it** starts, and nowhere else. Point the suite at your
own `pnpm start` with `PLAYWRIGHT_BASE_URL` and that flag is absent, so every registration, every
password reset and every resend in the account specs goes through the real Resend adapter and spends
real quota. Roughly twenty sends per full run. `EMAIL_OVERRIDE_RECIPIENT` keeps them all going to one
address rather than to invented customers, which contains the damage but not the cost. Start an
external server as `EMAIL_TRANSPORT=log PORT=3000 pnpm start`.

### The sixteen failures this feature did not cause

Twelve of them are one inherited defect: **the cookie banner is 900px tall at a 390x700 viewport**,
so it covers the screen and intercepts every click at mobile width.
`src/components/ui/cookie-banner/` is untouched by spec 010, and its copy is byte-identical before
and after the migration — 831 characters across 13 text nodes in both the pre-migration dump and
`cookie_settings_locales`. It accounts for seven e2e failures (the home menu, the listing drawer,
three product-gallery tests and `/account` at 390 and 320) and all five a11y failures. Which tests it
catches varies between runs, because it depends on which mobile-width click happens while the banner
is on screen. **Capping the banner's height below `md` and letting it scroll would return all
twelve** — it is the single highest-value fix in the repository right now, and it belongs to spec
009.

The other four:

- `product.spec.ts` — "the two actions are present and disabled" expects ADD TO CART to be disabled.
  The cart shipped in spec 005 and the button works; spec 010 only swapped its literal string for
  `t('addToCart')` and did not touch the `disabled` logic.
- `ui-kit.spec.ts` — three or four stories 404 on `/media/sample.mp4`, which is not in `public/`.
  The story predates this feature (`c2ce64e`).
- `ui-kit.spec.ts` — a hero whose height deliberately stopped matching the drawn 754px (`1cf6a31`)
  and a feature card whose width deliberately stopped matching 250px (`752ac3a`). Both tests assert
  numbers their components were later changed, on purpose, to stop honouring.

### What this verification actually found

**Three defects of our own, and one of them was large.**

1. **US4 was about half-wired.** 94 of the 165 message keys were never read by anything. The header,
   the catalogue toolbar and the product actions had been converted; the entire account area, the
   cart, the filter drawer, the footer, the shop promises, the cookie preferences and every page
   title had not. `/ru/sign-in` rendered "Email Address", "Password" and "Log in" in English.

   The reason it was not caught is worth more than the fix: `interface-language.spec.ts` tested a
   **hand-written list of eight phrases**, and it passed because those eight were exactly the ones
   already translated. It now derives its forbidden list from `en.json` itself and checks both the
   rendered text and the accessible names (`aria-label`, `placeholder`, `alt`, `title`) — the second
   half is where "Open menu", "Account", "Primary" and "Close filters" were hiding, none of which
   appear in `innerText` at all. 28 checks across 13 pages in two languages, and a key added
   tomorrow is covered the moment it exists.

2. **`articles.chapters.heading` and `.body` were `required` AND `localized`.** An array row is
   shared across all three locales, so an editor opening an article to put its headline into Russian
   was refused by four chapters they had never touched, and could not save at all. Same shape as the
   four fields already relaxed in `closer-look.ts` and `process-steps.ts`; `required` is dropped on
   both. No migration — those columns are already nullable.

3. **Twenty Storybook stories rendered nothing.** Since this feature the header, the mobile menu,
   the product card, the pagination and the filter toolbar all reach `@/i18n/navigation`, whose
   `useRouter` is `next/navigation`'s underneath and throws unless Storybook has mounted its App
   Router mock. `nextjs: { appDirectory: true }` in `.storybook/preview.tsx` fixes all twenty.

**And two of our own tests were lying**, both in the same way — they compared strings that change
with language:

- `ui-kit.spec.ts`'s language-menu keyboard test pressed ArrowDown twice expecting to wrap from RU
  back to EN. There are three languages now.
- `text-length.spec.ts` keyed its clipped-control set on each control's TEXT. An element that clips
  in both languages therefore appeared under two different names, so the Russian one looked new. It
  passed only while the label was still untranslated — the very bug being fixed. It now keys on a
  DOM path, and skips `sr-only` controls, whose one-pixel box makes every one of them "clipped".

### The second sweep, after the chrome was wired

Running the derived check for the first time turned up two more classes it could not see, both now
closed:

- **Case.** `CookieSettingsButton` rendered "Cookie Settings" while `common.cookieSettings` held
  "Cookie settings", and one capital letter was enough to walk past it. The comparison folds case
  now — several labels are sentence case in the message file and drawn in capitals by CSS, so case
  was never signal here.
- **Kit defaults nobody passes.** `Select` and `SearchField` carried English placeholder defaults
  (`'Select'`, `'What are you searching for?'`) as default parameters, which cannot call a hook.
  Both resolve in the body now, the prop still overriding. The first attempt wrote
  `placeholderProp ?? useTranslations('forms')('select')`, which short-circuits — a conditional hook
  call that changes hook order the moment a caller passes a placeholder. The translator is read
  unconditionally.

Seven keys are excluded by name in `interface-language.spec.ts`, each because its English value is
word-for-word a title an editor owns on this site: `common.cookiePolicy`, `blog.ourBlog`,
`nav.ourBlog`, `nav.ourStory`, `nav.contact`, `legal.contactUs` and `forms.select`. `/about` alone
accounts for four of them — it is almost entirely editorial, and its page title, one band heading and
its closing call to action are "Our Story", "Select" and "Contact us".

`pnpm seed:translations` now also translates the **cookie policy's title**, because the footer links
to that document by its title and an untranslated one leaves a Latin "Cookie Policy" in a Russian
footer — the one place on this site where a fallback is conspicuous rather than merely honest.

### T059, the editorial check — done 2026-09-14

Verified by hand in `/admin` against the running site: switching a document's editing language shows
per-language values for the word fields and one shared value for images, prices, dates and slugs.
This is the check the Constitution's workflow section requires before merge, and it is the one thing
in this spec no automated test can stand in for — the schema can be right in every assertion and
still be wrong about which fields an editor expects to differ.

### Seeding all three languages (T110, second pass)

`pnpm seed:translations` grew from a four-document demonstration into the full pass. Run it after
`pnpm seed` and `pnpm seed:policies`; it writes 99 documents per language — 4 categories, 4
collections, 4 article categories, 3 attributes, 31 products, 7 articles, 31 photographs, the 6 FAQ
answers, 4 policy headings and the shop, blog, FAQ and contact globals.

The words live in `scripts/seed-translations-data.ts` with no code in it, so a translator can be
handed one file. The apply loop is `scripts/seed-translations.ts`: find by slug, write the locale,
report what was missing rather than creating it — a translation with nothing to attach to means the
English seed did not run, and quietly creating half a document would hide that.

**Three things stay English on purpose**, and a reviewer should expect to see them that way: article
chapter bodies, policy bodies and the Story page's blocks. They are the long-form editorial a real
site spends months translating, and a seed that hid that state would misrepresent what the site looks
like the week after this ships. The policy bodies are the sharpest case — a placeholder paragraph
saying "not translated yet" was written first and then removed, because on a legal page it REPLACES
the text a visitor came to read with a note about its absence. Falling back to the authoritative
English leaves them able to read the terms, and `fallback.spec.ts` was right to fail on the
placeholder.

One real finding came out of seeding it: with Russian titles, **`ProductCard`'s title truncates at
`xl`** where the English one fits. That is `xl:truncate` — the design's own decision that one line is
enough at that width, with the ellipsis as the affordance — so `text-length.spec.ts` now skips
elements whose `text-overflow` is `ellipsis` and tests only for text cut off flush with nothing to
say it is missing. Worth knowing before launch: the Russian and Ukrainian catalogue shows more
ellipses than the English one.
