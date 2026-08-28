# Aurum

An online jewelry store with an integrated content platform, built on Payload CMS.

> This repository currently implements
> [`specs/001-design-system-foundation`](./specs/001-design-system-foundation/spec.md) — the project
> scaffold, brand token system, UI kit, and layout shell. There is no catalog, cart, or checkout
> yet; the storefront renders from mock fixtures. See [`docs/mvp-brief.md`](./docs/mvp-brief.md) for
> the whole picture.

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
pnpm dev
```

- Storefront — http://localhost:3000
- Admin — http://localhost:3000/admin
- Storybook — `pnpm storybook`, http://localhost:6006

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
| `pnpm storybook` | Component workshop |
| `pnpm build:tokens` | Regenerate `src/styles/tokens.css` from the design exports |
| `pnpm check:tokens` | Fail if the committed token file is stale |
| `pnpm check:contrast` | Validate every permitted colour pairing against WCAG 2.2 AA |
| `pnpm check:stories` | Fail if a UI-kit component has no stories file |
| `pnpm lint` | ESLint, including the no-magic-values rules |
| `pnpm typecheck` | Strict TypeScript |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | Playwright, including keyboard traversal |
| `pnpm test:a11y` | axe-core over stories and routes |
| `pnpm generate:types` | Regenerate `src/payload-types.ts` |

## Project structure

```
design/tokens/     Figma exports (never hand-edited) + the semantic mapping
scripts/           Token generation and the CI guard scripts
src/app/(frontend) Storefront routes and the full-Tailwind stylesheet
src/app/(payload)  Payload admin — Tailwind WITHOUT preflight (see below)
src/components/ui  The UI kit. Primitives only; no domain components
src/components/layout  Header, Footer, Nav, SkipLink
src/styles/        Generated tokens.css and font declarations
src/collections/   Payload collections — scaffold only (admins, media)
src/mocks/         Fixtures the storefront renders from
```

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
- `src/app/(payload)/custom.scss` — theme and utilities **only, no preflight**

Do not merge them.
