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
