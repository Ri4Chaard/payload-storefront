# Aurum — store template

A production-grade, **domain-neutral e-commerce template**: a multilingual storefront and content
platform on **Next.js 16 (App Router)**, **Payload CMS 3** and **PostgreSQL**. Every product,
category, page and image ships as a placeholder, so the same codebase becomes a clothing shop, a
grocery, a bicycle shop or a jewelry store by editing data in the admin — not by rewriting code.

> "Aurum" is just the template's placeholder name — set `NEXT_PUBLIC_SITE_NAME` and it is gone.

## Features

- **Catalogue** — categories (one route each, header links chosen in the admin), owner-defined
  attributes and values (any of them a filter, a product-details row or a "related" link),
  product options (variants with their own price, stock and photo), made-to-order vs stock-tracked
  availability, filters + sort + LOAD MORE with shareable URLs that work without JavaScript.
- **Product page** — gallery and lightbox, option picker, quantity limits from stock, details /
  warranty / delivery accordions, "you may also like", schema.org `Product`/`Offer`.
- **Cart and checkout** — server-side cart for guests and customers (merged on sign-in) and a
  **messenger hand-off**: the order goes to the seller via WhatsApp, Telegram or Instagram with every
  line and total pre-written.
- **Accounts** — email verification codes, sign-in, password reset/change, profile, addresses,
  marketing consent (mirrored to a Resend audience), scheduled purge of unverified accounts.
- **Content** — blog with topics and chaptered articles, block-composed About page, FAQ, contact
  page with an enquiry form, legal pages, cookie consent with categories.
- **Three languages** — English, Russian, Ukrainian; interface strings in JSON, content localized in
  Payload, per-language on/off switch in the admin, hreflang and per-locale sitemap.
- **Design system** — generated design tokens, a Storybook UI kit, contrast checks, no magic values
  (enforced by ESLint and CI scripts).
- **Quality** — strict TypeScript, unit + integration (real Postgres) + Playwright e2e,
  accessibility (axe) and story suites, JS budgets.
- **Ops** — Dockerfile and compose files, migrations on container start, health check.
- **AI-ready** — [Spec Kit](./docs/spec-kit.md) for spec-driven development with **Claude Code**
  and **Codex**, a [constitution](./.specify/memory/constitution.md) and `AGENTS.md`.

## Quick start

Requirements: Node 22+ (`.nvmrc`), pnpm (`corepack enable pnpm`), Docker.

```bash
pnpm install
docker compose --profile local up -d   # Postgres on 127.0.0.1:5432
cp .env.example .env                   # set PAYLOAD_SECRET (openssl rand -base64 32)
pnpm payload migrate                   # create the schema
pnpm seed && pnpm seed:policies && pnpm seed:translations   # placeholder shop in 3 languages
pnpm dev
```

- Storefront: <http://localhost:3000> (`/ru`, `/uk` for the other languages)
- Admin: <http://localhost:3000/admin> — the first visit asks you to create an administrator

Email: registration sends verification codes through [Resend](https://resend.com). Locally, either
put a real `RESEND_API_KEY` in `.env` (with `EMAIL_FROM_ADDRESS=onboarding@resend.dev`), or run
`EMAIL_TRANSPORT=log pnpm dev` to print emails to the console instead of sending them.

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URI` | yes | Postgres connection string |
| `PAYLOAD_SECRET` | yes | Payload encryption secret |
| `NEXT_PUBLIC_SERVER_URL` | yes | Public origin (canonical URLs, CSRF). Build-time. |
| `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` | yes | Transactional email |
| `NEXT_PUBLIC_SITE_NAME` | no | Shop name everywhere it is printed. Build-time. Default `Aurum`. |
| `EMAIL_FROM_NAME` | no | Sender name; defaults to the shop name |
| `EMAIL_OVERRIDE_RECIPIENT` | no | Redirect every email to one address (staging) |
| `EMAIL_TRANSPORT=log` | no | Log emails instead of sending (tests, local) |
| `RESEND_AUDIENCE_ID` | no | Resend audience that marketing consent is mirrored into |

Details and comments: [`.env.example`](./.env.example).

## Make it your shop

The full walkthrough is **[docs/customizing.md](./docs/customizing.md)**. In short:

1. **Name, icon, wordmark** — `NEXT_PUBLIC_SITE_NAME`, `src/app/icon.svg`, `src/components/layout/logo/`.
2. **Palette and fonts** — `design/tokens/*.json` → `pnpm build:tokens && pnpm check:contrast`;
   typefaces in `src/styles/fonts.ts`.
3. **Catalogue model, in the admin** — categories, attributes and their values (colour, shape,
   frame size…), variant types/options. A clothing shop gets *Size → S/M/L*; a grocery
   *Pack → 500 g / 1 kg*; nothing in code.
4. **Content, in the admin** — products and photos, home/about/FAQ/blog/contact pages, legal pages,
   messengers for checkout — in every language you keep.
5. **Header navigation** — point the category links at your slugs.
6. **Deploy** — [docs/deployment.md](./docs/deployment.md).

## Documentation

| Document | What it covers |
| --- | --- |
| [docs/overview.md](./docs/overview.md) | Architecture, domain model (collections, globals, blocks), repository layout, quality gates |
| [docs/customizing.md](./docs/customizing.md) | Turning the template into a specific shop, step by step |
| [docs/deployment.md](./docs/deployment.md) | Docker, environment, reverse proxy, backups, troubleshooting |
| [docs/spec-kit.md](./docs/spec-kit.md) | Spec-driven development with Claude Code and Codex |
| [.specify/memory/constitution.md](./.specify/memory/constitution.md) | The rules every change is checked against |
| [AGENTS.md](./AGENTS.md) | Day-to-day guidance for coding agents (Codex; Claude Code via `CLAUDE.md`) |

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Storefront and admin |
| `pnpm build` / `pnpm start` | Production build / server |
| `pnpm seed`, `seed:policies`, `seed:translations` | Placeholder catalogue, legal pages, ru/uk content |
| `pnpm payload migrate` / `payload migrate:create <name>` | Apply / create database migrations |
| `pnpm generate:types` | Regenerate `src/payload-types.ts` after a schema change |
| `pnpm storybook` | Component workshop on :6006 |
| `pnpm build:tokens`, `build:icons` | Regenerate tokens CSS / icon registry |
| `pnpm typecheck`, `lint`, `format` | Static checks |
| `pnpm test`, `test:integration` | Unit tests / data layer against real Postgres |
| `pnpm test:e2e`, `test:a11y`, `test:stories` | Playwright: journeys, axe, every story |
| `pnpm check:tokens`, `check:contrast`, `check:naming`, `check:styles`, `check:stories` | CI guards |
| `pnpm measure:js` | JS budget against a running production server |

**Running Playwright:** the suites reuse a server already on `PLAYWRIGHT_BASE_URL` (default :3000).
Account journeys send email, so run the server with `EMAIL_TRANSPORT=log`, and for a production
build set `NEXT_PUBLIC_SERVER_URL` to the URL you test against (Payload's CSRF check compares them):

```bash
NEXT_PUBLIC_SERVER_URL=http://localhost:3100 pnpm build
EMAIL_TRANSPORT=log PORT=3100 pnpm start &
PLAYWRIGHT_BASE_URL=http://localhost:3100 EMAIL_TRANSPORT=log pnpm test:e2e
```

## How it is put together

- **Routes**: `/`, `/all-products`, `/<category>`, `/products/<slug>`, `/blog`, `/blog/<slug>`,
  `/about`, `/faq`, `/contact`, `/legal/<slug>`, `/cart`, account pages, `/admin`. English lives at
  the root; Russian and Ukrainian under `/ru` and `/uk`.
- **Rendering**: listings and home render per request; product pages are prerendered when the build
  can reach a database and invalidated by Payload hooks on publish. `next build` does not need a
  database.
- **Data access**: `src/lib/catalog/queries.ts` is the only module that knows where catalogue data
  comes from; components receive narrow view models (`src/lib/catalog/types.ts`) — no drafts, no raw
  stock counts.
- **Seeding** goes through Payload's Local API, idempotently, so every hook and access rule applies.
  Run it once by hand on a new environment (`docker compose … exec -T app pnpm seed`); it overwrites
  matching documents, so never on a live shop.

### Where a string lives

| If it is… | It lives in | Changed by |
| --- | --- | --- |
| Something an editor writes — a heading, a product description, a policy, an SEO description | **Payload**, as a localized field | The owner, in the admin, without a deploy |
| Interface chrome — a form label, a validation message, an accessible name, "Load more" | **`src/i18n/messages/{en,ru,uk}.json`** | A developer, in a commit |

Adding a message: add the key to `en.json` (the type source), translate it in `ru.json` and
`uk.json` (`tests/unit/message-keys.test.ts` checks keys, placeholders and plural forms), read it
with `getTranslations` / `useTranslations`. A namespace used in a Client Component must be listed in
`CLIENT_NAMESPACES` in `src/app/(frontend)/[locale]/layout.tsx`.
`tests/e2e/interface-language.spec.ts` fails if any English string renders on a ru/uk page.

Slugs are always Latin — a Cyrillic title is transliterated ("Зимова куртка" → `zimova-kurtka`). A
visitor's language is never guessed; the switcher decides and is remembered for a year.

### Design tokens

```
design/tokens/{colors,typography}.json  →  design/tokens/mapping.ts  →  src/styles/tokens.css
          (sources)                          (semantic roles)            (@theme, generated)
```

Never hand-edit `tokens.css` — `pnpm check:tokens` fails on any drift. The UI kit in
`src/components/ui/` is the shared vocabulary: search it before creating a component, and ship every
component with its `*.stories.tsx`.

Tailwind's preflight breaks Payload's admin, so the two entry stylesheets differ on purpose:
`src/app/(frontend)/[locale]/styles.css` (full Tailwind) and `src/app/(payload)/custom.css` (theme and
utilities only). Do not merge them.

## Deployment

```bash
cp .env.example .env    # fill in the required variables
docker compose -f docker-compose.full.yml up -d --build   # app + its own Postgres
# or: docker compose --profile prod up -d --build         # app only, your own database
```

Migrations run when the container starts; a failed migration stops it. Uploads live in a Docker
volume — back it up together with the database. Full runbook: [docs/deployment.md](./docs/deployment.md).
