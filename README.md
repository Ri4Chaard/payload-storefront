# Aurum

An online jewelry store with an integrated content platform, built on Payload CMS.

> This repository implements
> [`001-design-system-foundation`](./specs/001-design-system-foundation/spec.md) (tokens, UI kit,
> layout shell), [`002-home-page`](./specs/002-home-page/spec.md), and
> [`003-shop-catalog`](./specs/003-shop-catalog/spec.md) — the listing, the filters and the product
> page, **reading from Payload**. There is no cart and no checkout yet: the two purchase buttons are
> drawn and disabled, and `004` picks them up at the seam in `src/lib/catalog/cart-intent.ts`. See
> [`docs/mvp-brief.md`](./docs/mvp-brief.md) for the whole picture.
>
> `src/mocks/` still exists and is now **fixture data for stories and unit tests only**. An ESLint
> rule stops application code importing it; the home page's hero and about band are the last two
> pieces of copy not modelled in Payload, and they are named in that rule rather than covered by a
> wildcard so that how much is left stays visible.

## Prerequisites

- Node 22+ (see `.nvmrc`)
- pnpm (`corepack enable pnpm`)
- Docker, for local Postgres

## Setup

```bash
pnpm install
docker compose --profile local up -d   # Postgres on 127.0.0.1:5432
cp .env.example .env                   # then fill in PAYLOAD_SECRET
pnpm payload migrate
pnpm build:tokens
pnpm seed                              # a development catalogue — see below
pnpm dev
```

- Storefront — http://localhost:3000
- Admin — http://localhost:3000/admin
- Storybook — `pnpm storybook`, http://localhost:6006

Create the first admin user at `/admin` on the first visit; Payload asks for one when the collection
is empty.

## The storefront

| Route | What it is | Rendering |
| --- | --- | --- |
| `/` | Home. The category band and the featured row read the catalogue | Per request |
| `/all-jewelry` | The whole shop, with filters, sort and LOAD MORE | Per request |
| `/<category>` | One category — `/rings`, `/bracelets`, … | Per request |
| `/products/<slug>` | One piece: gallery, stones, sizes, the details accordions | Cached, and invalidated on publish |
| `/admin` | Payload | Per request |

**The category segment is validated against the catalogue, not against a list in the code.** A
category is a document the owner can create, so `/whatever-they-named-it` works the moment they
publish it, and any unrecognised single segment is the branded 404.

**Everything except the product page renders per request**, because the two listings read
`searchParams` and the home page must not be baked from a database the container build cannot reach.
The product page is the cached one: prerendered per published slug where the build can read the
catalogue, rendered on demand and kept where it cannot, and invalidated by Payload hooks either way
— saving anything the storefront reads marks every product page stale, so a publish is never waiting
on a deployment or an interval. The whole strategy is
[003/research R13](./specs/003-shop-catalog/research.md).

**`next build` does not need a database.** It uses one when there is one, and prerenders the whole
catalogue; without one it prerenders nothing and says so. That is deliberate — the image is built
before `pnpm payload migrate` runs, so on a first deploy the tables do not exist yet.

## Seeding

`pnpm seed` (`scripts/seed-catalog.ts`) writes a development catalogue **through Payload's Local
API**, so every hook, default and access rule a real editor would hit applies to it too. A seed that
wrote SQL would prove nothing about the model.

It is idempotent — everything is looked up by slug or name and updated in place — and the order is
fixed by what references what:

1. **Photographs** (`media`), uploaded first because everything below points at them
2. **Reference data** — `categories`, `collections`, `sizes`, `attributes`
3. **The diamond variant type and its stones** — `variantTypes`, then `variantOptions`
4. **Products**, which reference all of the above
5. **Variants**, after their product: the plugin checks that each stone's variant type is enabled on
   the parent, so a variant created first is rejected
6. **Shop settings**, the global holding the accordion headings and the warranty and delivery copy

**On a deployed environment, run it once, by hand, inside the container.** Nothing seeds
automatically: the deploy workflow builds, starts and migrates, and that is all. That is deliberate
— the seed updates products in place, so running it on every push would overwrite anything the owner
had authored in the admin since the last one.

```bash
# on the VPS, in ~/aurum_frontend
docker compose -f docker-compose.dev.yml exec -T app pnpm seed
```

Not from a laptop against the deployment's database. Payload's local storage writes uploads to
`./media` relative to the working directory, so seeding from outside would put the photographs on
your machine and leave the site with media rows pointing at files that were never uploaded.

It leaves one product as a **draft** on purpose. A draft that is unreachable by URL is a rule worth
exercising rather than merely asserting, and several tests reach for that slug.

Every write passes `context: skipRevalidation`. Seeding is not publishing: it runs in its own
process, where `revalidatePath` has no request scope and throws — and a dev server running alongside
is a different process whose cache it could not have invalidated anyway.

## Deployment

`docker-compose.yml` carries two profiles and starts nothing without one. The `local` profile above
is Postgres alone, for an app running on the host. The `dev` profile is the deployed environment:
the app, built from the checkout on the machine it runs on. It brings no database — point it at one
that is provisioned separately.

```bash
# on the VPS, in a clone of this repository
cp .env.example .env          # DATABASE_URI, PAYLOAD_SECRET, NEXT_PUBLIC_SERVER_URL
docker compose --profile dev up -d --build
```

The container applies the committed migrations before `next start`, so a failed migration stops the
deploy rather than booting against the wrong schema. To ship a new commit: `git pull` and repeat the
`up -d --build`. The full runbook — environment, reverse proxy, backups, troubleshooting — is
[`docs/deployment.md`](./docs/deployment.md).

Three things to know:

- `NEXT_PUBLIC_SERVER_URL` is inlined into the client bundle by `next build`. Changing it needs a
  rebuild, not a restart.
- A database running elsewhere on the same host is reachable as `host.docker.internal` — the
  compose file maps it to the host gateway.
- The app publishes `${APP_PORT:-3000}` for a reverse proxy (nginx, Caddy) to terminate TLS in
  front of. Uploads live in the `aurum-media` volume.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Storefront and admin |
| `pnpm seed` | Write a development catalogue through the Local API |
| `pnpm storybook` | Component workshop |
| `pnpm build:tokens` | Regenerate `src/styles/tokens.css` from the design exports |
| `pnpm build:icons` | Regenerate the icon registry from the SVG set |
| `pnpm check:tokens` | Fail if the committed token file is stale |
| `pnpm check:contrast` | Validate every permitted colour pairing against WCAG 2.2 AA |
| `pnpm check:stories` | Fail if a UI-kit component has no stories file |
| `pnpm check:naming` | Fail on any path that is not kebab-case |
| `pnpm check:styles` | Fail on a raw colour or an arbitrary size in a stylesheet |
| `pnpm lint` | ESLint, including the no-magic-values rules |
| `pnpm typecheck` | Strict TypeScript |
| `pnpm test` | Unit tests |
| `pnpm test:integration` | The data layer against a real Postgres, including the US1 acceptance |
| `pnpm test:e2e` | Playwright, including keyboard traversal |
| `pnpm test:a11y` | axe-core over stories and routes |
| `pnpm test:stories` | Every story renders, with no console errors |
| `pnpm generate:types` | Regenerate `src/payload-types.ts` |

The Playwright suites reuse a dev server on port 3000 if one is already running, **including one
belonging to a different project**, so `tests/warm-routes.ts` refuses to run against a server that
is not this application and tells you how to move:

```bash
PORT=3100 PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e
```

## Project structure

```
design/tokens/     Figma exports (never hand-edited) + the semantic mapping
scripts/           Token generation and the CI guard scripts
src/app/(frontend) Storefront routes and the full-Tailwind stylesheet
src/app/(payload)  Payload admin — Tailwind WITHOUT preflight (see below)
src/components/ui  The UI kit. Primitives only; no domain components
src/components/commerce  Catalogue components — the grid, the drawer, the gallery
src/components/sections  Home-page bands, reused on the product page
src/components/layout  Header, Footer, Nav, SkipLink
src/styles/        Generated tokens.css and font declarations
src/collections/   Payload collections
src/globals/       Payload globals — shop-wide copy
src/lib/catalog/   The data layer: queries, mappers, filters, view models
src/mocks/         Fixtures for stories and tests. NOT read by application code
tests/             unit, integration (real Postgres), e2e, a11y, stories
```

### Where the storefront gets its data

`src/lib/catalog/queries.ts` is **the only module that knows where a document came from**. Every
route and every component takes what it renders as props, which is what let the whole storefront
move from fixtures to Payload in 003 Phase 9 by rewriting one file — no component and no route
changed. The view models in `src/lib/catalog/types.ts` are deliberately narrower than the documents
behind them: no `_status`, so nothing downstream can render a draft, and no `inventory`, so
"available" is decided once and travels as a boolean.

Reads are deduplicated per request with React `cache()`, not cached across requests; anything
longer-lived is the route cache's business, and that has an invalidation story (see above).

## Design tokens

Tokens are **generated**, not hand-written. The pipeline has one writer per stage:

```
design/tokens/*.json   →   design/tokens/mapping.ts   →   src/styles/tokens.css
   (Figma export)            (semantic roles, gaps)         (@theme — generated)
```

Change a value in the export or the mapping, run `pnpm build:tokens`, and it propagates everywhere.
**Never hand-edit `src/styles/tokens.css`** — CI regenerates it and fails on any diff.

The full token list, provenance for every value, and the permitted colour pairings live in
[`contracts/design-tokens.md`](./specs/001-design-system-foundation/contracts/design-tokens.md).

## The UI kit

`src/components/ui/` is the shared vocabulary. Before creating a component, search it — a pull
request introducing a duplicate is rejected (Constitution II). Variants are props on one component,
never near-identical siblings. Every component ships with its `*.stories.tsx` in the same change;
`pnpm check:stories` enforces it.

## A note on Tailwind and the admin panel

Tailwind's preflight is a global reset that visibly breaks Payload's admin UI. The two entry
stylesheets are therefore deliberately different:

- `src/app/(frontend)/styles.css` — full Tailwind, preflight included
- `src/app/(payload)/custom.css` — theme and utilities **only, no preflight**

Do not merge them.
