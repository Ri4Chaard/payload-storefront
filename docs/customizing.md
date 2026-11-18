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

| You sell… | Categories | List attributes (filters, details, relations) | Text attributes (details) | Variant type → options |
| --- | --- | --- | --- | --- |
| Clothing | Women, Men, Kids | Colour, Season, Fit | Material, Care | Size → XS…XL |
| Groceries | Fruit, Dairy, Bakery | Diet (Organic, Vegan), Origin | Weight, Allergens | Pack → 500 g / 1 kg |
| Bicycles | Road, Gravel, City | Frame size, Colour, Range | Groupset, Weight | Frame size → 52/54/56 |
| Glasses | Optical, Sun | Shape, Frame colour, Collection | Lens width | Lens → … |

- **Categories** (`Shop → Categories`): each one becomes a route, `/<slug>`, and a tile on the home
  page with its image. Tick **Show in the header** to add a link to it in the header and the mobile
  menu, between "All products" and "About us"; the links follow the categories' **Order**.
- **Attributes** (`Catalogue properties → Attributes`): every property a product can have. Each has
  a **Label** (what customers read, translated), a **Name** (the URL key — `colour` in
  `?colour=black`; lowercase, hyphenated, and not one of `category`, `minPrice`, `maxPrice`,
  `inStock`, `sort`, `page`, `q`), a **Type** and an **Order** (lowest first in the filters and in
  the product details).
  - **List** attributes have a closed set of values, defined under
    `Catalogue properties → Attribute values` (label, URL value, order). Products pick them in the
    **Categorisation** tab's *Attribute values* field. Three switches decide what a list does:
    **Show as a filter** (a checkbox group in the catalogue filters — values within one group are
    OR, groups are AND), **Show in product details** (a "Colour: Black, Green" row), and
    **Relates products** (products sharing a value are suggested under "You may also like"; with
    none, the same category is suggested).
  - **Text** and **number** attributes are typed on each product in the **Details** tab and shown
    in the product details. An option (variant) can override one, e.g. a different weight per pack
    size.
  - A shop with Shape and Frame size and no Collections needs no code: create those attributes,
    their values, and tick the switches. Adding a value makes it a filter option at once; a value
    still used by a product, or an attribute that still has values, cannot be deleted.
- **Variant types and options**: the plugin's option axes. Enable variants on a product, pick the
  variant type, then create one variant per option with its own price, stock and photograph. The
  product page shows the picker automatically; the cart and the order message name the option.
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

## 6. Interface copy — *code (small)*

- Interface strings (buttons, labels, errors, promise cards) are in
  `src/i18n/messages/{en,ru,uk}.json`. Keep the three files' keys identical — `pnpm test` fails
  otherwise.
- The header's category links are not code: tick **Show in the header** on a category in the
  admin (step 3). "All products", "About us" and "Contact us" around them are interface strings
  (`nav.*` messages).
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

- `scripts/seed-catalog.ts` — categories (and which are in the header), attributes and their
  values, variant type and options, products, FAQ, story/home/contact pages, blog.
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
- [ ] Categories, attributes and their values, variant types/options
- [ ] Products with real photographs
- [ ] Home, About, FAQ, Blog, Contact pages; contact settings and messengers
- [ ] Legal pages reviewed by someone qualified
- [ ] Categories you want in the header have **Show in the header** ticked
- [ ] Languages: keep, switch off, or add
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm test:integration`
- [ ] Deploy
