# Overview

A store template: a multilingual storefront and content platform on **Next.js (App Router)** and
**Payload CMS 3**, backed by **PostgreSQL**. The core sells *products* and never knows what they are
— everything that differs between a clothing shop, a grocery and a bicycle shop is data an editor
manages in the admin, not code. See [`customizing.md`](./customizing.md) for turning it into a
specific shop.

## What a visitor gets

| Area | What is there |
| --- | --- |
| Home | Hero, category band, featured products, about band, promises strip — all editable |
| Catalogue | `/all-products` and one route per category (`/<category-slug>`): filters (category, collection, colour, price range, in stock), sort, LOAD MORE, shareable filter URLs that work without JavaScript |
| Product page | Gallery with lightbox, option picker (each option with its own price, stock and photo), quantity, attributes, details/warranty/delivery accordions, "complete the collection", schema.org `Product` |
| Cart & checkout | Server-side cart (guest and signed-in, merged on sign-in), **messenger hand-off**: the order is sent to the seller over WhatsApp, Telegram or Instagram with every line and total pre-written. No payment provider is wired in. |
| Accounts | Registration with emailed verification codes, sign-in, password reset/change, profile, addresses, marketing consent (mirrored to Resend audiences), automatic purge of unverified accounts |
| Content | Blog with topics and long-form chapter articles, About/Story page composed from blocks, FAQ, Contact page with an enquiry form, legal pages, cookie consent with categories |
| Languages | English, Russian, Ukrainian — interface strings in JSON, content localized in Payload, per-language on/off switch in the admin |
| Quality | WCAG 2.2 AA (axe-checked), design tokens with contrast checks, JS budgets, sitemap, canonical/hreflang, structured data |

## Architecture

```
Browser ──► Next.js App Router  src/app/(frontend)/[locale]/…   server components by default
               │
               ├─ src/lib/catalog/queries.ts   the ONLY module that knows where catalogue data comes from
               ├─ src/lib/cart, auth, blog, story, contact, consent …   one module per domain
               │
               └─ Payload Local API ──► PostgreSQL (drizzle adapter)
                                     └► ./media (uploads)   Resend (email)
Admin ───► Payload admin  src/app/(payload)/admin
```

- **Payload is the single source of truth** for content (Constitution I). Components receive view
  models as props; they never query.
- **View models are narrower than documents** (`src/lib/catalog/types.ts`): no `_status`, so nothing
  downstream can render a draft; no `inventory`, so "available" is computed once and travels as a
  boolean.
- **Money** is integer minor units with an explicit currency everywhere (`src/lib/catalog/price.ts`).
- **Caching**: listings and home render per request; product pages are prerendered when the build
  can reach a database and invalidated by Payload hooks on publish (`src/lib/revalidate.ts`).
- **Jobs**: Payload's job queue runs inside the app process (cart expiry, account purge) — no cron.

## Domain model

### Collections (`src/collections/`)

| Collection | Purpose |
| --- | --- |
| `products` | Title, description, gallery, details (rich text), attributes, category, collections, colours, availability (`made-to-order` / `stock-tracked`), price, SEO. Extends the Payload e-commerce plugin's product. |
| `variants` | One purchasable option of a product (plugin collection): own price, inventory, photograph and attribute overrides |
| `variantTypes` / `variantOptions` | The option axes (plugin): e.g. "Size" with S/M/L, "Flavour" with … |
| `categories` | Top-level shelves; each gets its own route |
| `collections` | Cross-cutting groupings ("Summer", "Bestsellers"); drive "complete the collection" |
| `colours` | Owner-managed colour vocabulary used by the colour filter |
| `attributes` | Owner-defined name/value properties shown in product details (Material, Weight, Origin…) |
| `media` | Uploads with localized alt text |
| `articles`, `article-categories` | Blog |
| `questions` | FAQ entries, reused by the FAQ page and story blocks |
| `policies` | Legal pages under `/legal/<slug>` |
| `customers`, `addresses`, `verification-codes` | Accounts |
| `carts` | Server-side carts (plugin) |
| `enquiries` | Contact form submissions |
| `admins` | Admin users |

### Globals (`src/globals/`)

`home-page`, `story-page` (block-composed About page), `blog-page`, `faq-page`, `contact-page`,
`contact-settings` (messengers, phone, email, address, order message template), `shop` (accordion
titles, warranty/delivery copy, listing subtitle), `account-settings`, `cookie-settings`,
`language-settings`.

### Blocks (`src/blocks/`)

`page-header`, `media-plate`, `closer-look`, `banner`, `process-steps`, `faq` — composed in the
admin to build the About page.

**Adding a block type** takes six steps, in order. A block that stops after step 4 renders but
cannot be composed; one that stops after step 5 compiles but crashes the dispatcher.

1. Define it in `src/blocks/<name>.ts` — kebab-case slug, labelled for what an editor sees, every
   field with a label and, where its purpose is not obvious, an admin description.
2. Add it to `src/blocks/index.ts`.
3. Add its slug to the story page global's `blockReferences`.
4. Add its variant to the `StoryBlock` union in `src/lib/story/types.ts`.
5. Add its case to `src/lib/story/mappers.ts`, including what "empty" means for it (an empty block
   is dropped).
6. Add its case to `src/components/blocks/block-renderer.tsx` and its component directory.

Then `pnpm generate:types` and a migration, because a new block is new tables.

## Repository layout

```
.specify/          Spec Kit: constitution, templates, scripts
.claude/skills/    Spec Kit commands for Claude Code
.agents/skills/    Spec Kit commands for Codex
design/tokens/     Token sources (colors.json, typography.json) + semantic mapping
docs/              This documentation
migrations/        Payload migrations (one initial migration for a fresh database)
public/            Static files and placeholder photography
scripts/           Seeds, token/icon generators, CI guard scripts
src/app/(frontend) Storefront routes
src/app/(payload)  Payload admin (Tailwind without preflight)
src/blocks/        Payload blocks
src/collections/   Payload collections
src/components/    ui (kit primitives), commerce, sections, layout, blocks, blog, account, contact, admin
src/globals/       Payload globals
src/i18n/          Locales, routing, message files
src/lib/           Data layer and domain logic, one folder per domain
src/styles/        Generated tokens.css and font loaders
tests/             unit, integration (real Postgres), e2e, a11y, stories (Playwright)
```

## Quality gates

| Gate | Command |
| --- | --- |
| Types, lint | `pnpm typecheck`, `pnpm lint` |
| Unit / integration | `pnpm test`, `pnpm test:integration` (needs Postgres) |
| E2E, accessibility, stories | `pnpm test:e2e`, `pnpm test:a11y`, `pnpm test:stories` |
| Tokens, contrast, naming, styles, stories | `pnpm check:tokens`, `check:contrast`, `check:naming`, `check:styles`, `check:stories` |
| JS budget | `pnpm measure:js` against a production server |

The rules these gates enforce are in the [constitution](../.specify/memory/constitution.md).
