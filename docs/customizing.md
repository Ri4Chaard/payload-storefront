# Building your shop from the template

Everything in the template is a placeholder: "Product 1", "Category 1", "Option A", grey "Your image
here" photographs, lorem-style copy in three languages. This guide goes from a fresh clone to a shop
of your own. Most steps need no code at all — they are admin work.

Work through it top to bottom; each step says whether it is **admin** (no deploy), **config** (one
file or variable) or **code**.

---

## 1. Name and identity — *config*

| What | Where |
| --- | --- |
| Shop name (wordmark, footer, page titles, admin title, email subjects, structured data) | `NEXT_PUBLIC_SITE_NAME` in `.env` (default `Aurum`, read by `src/lib/site.ts`). Rebuild after changing — it is inlined into the client bundle. |
| Sender name in emails | `EMAIL_FROM_NAME` (defaults to the shop name) |
| App icon / favicon | `src/app/icon.svg` and `src/app/apple-icon.png` (180×180) |
| Wordmark look | `src/components/layout/logo/logo.tsx` — text in the display face by default; swap in an `<svg>` if you have a logo |
| Home page title / description | `meta.homeTitle` and `meta.homeDescription` in `src/i18n/messages/{en,ru,uk}.json` (`{siteName}` is filled in for you) |

## 2. Colours and typefaces — *config*

Design tokens are generated, never hand-written:

```
design/tokens/colors.json  ─┐
design/tokens/typography.json ├─► design/tokens/mapping.ts ─► pnpm build:tokens ─► src/styles/tokens.css
```

1. Edit the colour values in `design/tokens/colors.json` (`primary-default`, `primary-hover`,
   `background-base` for the dark footer and top bar, `background-bg` for the page, …).
   `neutral-secondary` is set in `design/tokens/mapping.ts` because body text needs AA contrast.
2. Run `pnpm build:tokens`, then `pnpm check:contrast`. Every permitted foreground/background
   pairing is checked against WCAG 2.2 AA; fix the colour or record a reasoned exception in
   `acceptedExceptions` in `mapping.ts`.
3. Typefaces live in `src/styles/fonts.ts` (`next/font`). Swap the two loaders — any Google font, or
   `next/font/local` with your own files — and keep the `--font-display-face` / `--font-body-face`
   variable names. Pick faces that cover every alphabet you serve (the template needs Cyrillic).
4. Storybook backgrounds in `.storybook/preview.tsx` mirror three of the colours; update them too.

No component names a colour or a font family directly, so nothing else changes.

## 3. Catalogue structure — *admin*

Model what you sell with data. Open `/admin`:

| You sell… | Categories | Collections | Attributes (product details) | Variant type → options | Colours |
| --- | --- | --- | --- | --- | --- |
| Clothing | Women, Men, Kids | Summer, Basics | Material, Care, Fit | Size → XS…XL | the palette you stock |
| Groceries | Fruit, Dairy, Bakery | Organic, Local | Origin, Weight, Allergens | Pack → 500 g / 1 kg | usually unused |
| Bicycles | Road, Gravel, City | Bestsellers | Frame, Groupset, Weight | Frame size → 52/54/56 | frame colours |
| Jewelry | Rings, Earrings | Bridal | Metal, Stone, Certificate | Stone → … | metals |

- **Categories** (`Shop → Categories`): each one becomes a route, `/<slug>`, and a tile on the home
  page with its image. The header navigation lists them (see step 6).
- **Collections**: cross-cutting groups, used by the collection filter and "complete the
  collection" on the product page.
- **Attributes**: define a name once ("Material"), then add `attribute → value` rows to each
  product. An option can override a product's attribute (e.g. a different weight per pack size).
- **Variant types and options**: the plugin's option axes. Enable variants on a product, pick the
  variant type, then create one variant per option with its own price, stock and photograph. The
  product page shows the picker automatically; the cart and the order message name the option.
- **Colours**: an owner-managed list; the colour filter reads it. Delete them all and the filter
  group simply has nothing to show.
- **Availability** per product: *made to order* (always orderable, no stock) or *stock tracked*
  (orderable while quantity > 0; the in-stock filter uses it).

Currency is USD (`src/payload.config.ts`, `src/lib/catalog/price.ts`). Amounts are integer minor
units everywhere; changing the currency is a config change in those two files.

## 4. Content — *admin* (or seed, see step 8)

| Page | Where in the admin |
| --- | --- |
| Home (hero, category band, featured row, about band) | Globals → Home page |
| About / story | Globals → Story page — compose it from blocks (header, photo plate, closer look, banner, process steps, FAQ) |
| FAQ | Collections → Questions, then Globals → FAQ page |
| Blog | Articles and Article categories, Globals → Blog page |
| Contact page and enquiry form copy | Globals → Contact page |
| Phone, email, address, opening hours, messengers, order message template | Globals → Contact settings |
| Product page accordions (warranty, delivery), listing subtitle | Globals → Shop |
| Legal pages | Collections → Policies (`/legal/<slug>`), linked from the footer when published |
| Cookie categories and banner | Globals → Cookie settings |

Switch the locale selector at the top of any document to write the Russian and Ukrainian versions.
Untranslated fields fall back to English.

**Photographs**: upload real images to replace the placeholders. The placeholder files in
`public/photography/` keep the original aspect ratios, which is a good guide for what each slot
expects (e.g. hero 1699×926, product 1274×1600 or 1:1, story banners 1920×530).

## 5. Checkout and contact — *admin*

The template has no payment provider: the cart is sent to you through a messenger. In **Contact
settings** add your WhatsApp number (any format — it is normalised), Telegram username and/or
Instagram handle, and edit the order message template (`{{items}}`, `{{total}}` are filled in).

Want online payment instead? That is a feature to build on the cart (`src/lib/cart/`) — follow
Constitution VI (server-side totals, idempotent webhooks, no card data on your servers), ideally
through Spec Kit (step 9).

## 6. Interface copy and navigation — *code (small)*

- Interface strings (buttons, labels, errors, promise cards) are in
  `src/i18n/messages/{en,ru,uk}.json`. Keep the three files' keys identical — `pnpm test` fails
  otherwise.
- The header's category links are a short list in `src/components/layout/header/header.tsx`
  (`category-1` … `category-4` with labels from `nav.*` messages). Point them at your category slugs
  and rename the message keys/labels. Category pages themselves are data-driven — any published
  category slug works.
- The four promise cards under every page (shipping, warranty, support, payments) are
  `src/lib/shop-promises.ts` (icons) + `product.*` messages (words).

## 7. Languages — *config / code*

- Turn Russian or Ukrainian off without a deploy: **Settings → Languages** in the admin.
- Remove a language entirely, or add one:
  1. `src/i18n/routing.ts` — `LOCALES` and `LOCALE_LABELS`.
  2. `src/i18n/messages/<code>.json` — copy `en.json` and translate (delete the file when removing).
  3. `scripts/seed-translations-data.ts` — the seed's translations are typed per locale.
  4. `pnpm generate:types` and `pnpm payload migrate:create <name>`: Payload's localization and the
     per-language switch in *Language settings* are generated from `LOCALES`, so the schema changes.
  5. Pluralisation rules for the new language are checked by `tests/unit/message-keys.test.ts`.

## 8. Seed data — *code*

`pnpm seed`, `pnpm seed:policies` and `pnpm seed:translations` write the placeholder shop through
Payload's Local API, idempotently (looked up by slug, updated in place). To ship your own starter
content — for a client demo or a staging environment — edit:

- `scripts/seed-catalog.ts` — categories, collections, colours, attributes, variant type and
  options, products, FAQ, story/home/contact pages, blog.
- `scripts/seed-translations-data.ts` — the Russian and Ukrainian versions, keyed by slug or by the
  exact English string.
- `scripts/seed-policies.ts` — legal pages (placeholders that are **not legal advice**).

Never run the seed against a database where an owner has started writing: it overwrites matching
documents.

## 9. New features — *code, with Spec Kit*

Anything the template does not do yet (online payments, reviews, search, wishlists, a new filter)
goes through the spec-driven workflow in [`spec-kit.md`](./spec-kit.md), with Claude Code or
Codex. Keep the core neutral (Constitution VII): name new concepts for what they do, not for the
first product that needed them.

## 10. Deploy

See [`deployment.md`](./deployment.md). In short: set `.env`, then
`docker compose -f docker-compose.full.yml up -d --build` (app + Postgres) or
`docker compose --profile prod up -d --build` (app only, your own Postgres). Migrations run on
container start; seed once by hand if you want the starter content.

## Checklist

- [ ] `NEXT_PUBLIC_SITE_NAME`, icon, wordmark
- [ ] Palette and typefaces, `pnpm build:tokens && pnpm check:contrast`
- [ ] Categories, collections, attributes, variant types/options, colours
- [ ] Products with real photographs
- [ ] Home, About, FAQ, Blog, Contact pages; contact settings and messengers
- [ ] Legal pages reviewed by someone qualified
- [ ] Header navigation points at your categories
- [ ] Languages: keep, switch off, or add
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm test:integration`
- [ ] Deploy
