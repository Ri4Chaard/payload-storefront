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
cp .env.example .env                   # then fill in PAYLOAD_SECRET and RESEND_API_KEY
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

### Email

Customer accounts do not work without a mail transport — registration cannot finish if the
verification code never arrives — so `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` are **required** and
the app refuses to start naming whichever is missing.

Locally you can leave `EMAIL_FROM_ADDRESS=onboarding@resend.dev`, which Resend accepts without a
verified domain. It only delivers to the address that owns the API key — enough to run every flow on
your own machine, and **not** enough for a shared environment, where every tester would receive
nobody's codes.

Three optional variables, all documented in `.env.example`:

| Variable | What it does |
| --- | --- |
| `EMAIL_FROM_NAME` | The name beside the address in the inbox. Defaults to `Aurum`. Set it to `Aurum (staging)` on staging so a stray message is obvious. |
| `EMAIL_OVERRIDE_RECIPIENT` | Redirects every message to one address. **Must be unset in production.** Set it on any environment whose database may hold real customer addresses — a restored production dump on staging is the usual way a test run mails real people. |
| `RESEND_AUDIENCE_ID` | The Resend audience that marketing consent is mirrored into. Unset is supported: consent is still recorded and shown, Payload remains the source of truth, and there is simply nowhere to mirror it to. Point each environment at its **own** audience — the override variable above does not protect marketing sends, because those are composed and sent from Resend and never pass through this application. |

`EMAIL_TRANSPORT=log` swaps the transport for one that writes recipients and subjects to the log and
sends nothing. The test runners set it themselves; do not set it anywhere expected to mail anybody.

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
# on the server, in the clone of this repository
docker compose --profile prod exec -T app pnpm seed
# or, for the all-in-one stack:
docker compose -f docker-compose.full.yml exec -T app pnpm seed
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
is Postgres alone, for an app running on the host. The `prod` profile is the deployed environment:
the app, built from the checkout on the machine it runs on. It brings no database — point it at one
that is provisioned separately.

```bash
# on the VPS, in a clone of this repository
cp .env.example .env          # DATABASE_URI, PAYLOAD_SECRET, NEXT_PUBLIC_SERVER_URL,
                              # RESEND_API_KEY, EMAIL_FROM_ADDRESS
docker compose --profile prod up -d --build
```

Or the app together with its own Postgres: `docker compose -f docker-compose.full.yml up -d --build`.

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
  front of. Uploads live in the `aurum_media` volume.
- The nightly cleanup of unverified accounts and spent codes runs **inside this container**, on
  Payload's own job queue — there is no cron service to install. It stops running on a serverless
  host, silently, because a function that only exists during a request cannot hold a timer.

## Three languages

The site is English, Russian and Ukrainian. English lives at the addresses it always did —
`/legal/privacy` — and the other two sit under a prefix: `/ru/legal/privacy`, `/uk/legal/privacy`.
Nothing that was published before moved.

### Where a string lives, and how to decide

There is one rule, and it decides every case:

| If it is… | It lives in | Changed by |
| --- | --- | --- |
| Something an editor writes — a heading, a policy, a product description, a call to action, an SEO description | **Payload**, as a localized field | The owner, in the admin, without a deploy |
| Interface chrome — a validation sentence, a form label, an accessible name, "Load more" | **`src/i18n/messages/*.json`** | A developer, in a commit |

The test is whether somebody would reasonably ask an editor to reword it. "ADD TO CART" would be a
Payload field on a site where marketing rewrites buttons; here it is chrome. "That does not look like
an email address" is chrome anywhere.

### Adding a string

1. Add the key to `src/i18n/messages/en.json`. English is the type source — a key that is not there
   does not compile.
2. Translate it in `ru.json` and `uk.json`. `pnpm test tests/unit/message-keys.test.ts` fails if you
   forget, if a placeholder goes missing, or if a Russian plural lacks its `few`/`many` cases.
3. Read it with `getTranslations('namespace')` in a Server Component, `useTranslations('namespace')`
   in a Client Component.

**If you use a namespace in a Client Component, add it to `CLIENT_NAMESPACES` in
`src/app/(frontend)/[locale]/layout.tsx`.** A namespace missing from that list does not throw — the
button renders `product.addToCart` instead of "ADD TO CART", and nothing else notices.

**A key that exists but is never read is the failure mode to watch for.** Adding the English string
and both translations is the easy half; the half that gets forgotten is calling the translator at
the place that renders it, and nothing about a half-finished conversion looks wrong — the page still
says "Email Address", just in the wrong language. `tests/e2e/interface-language.spec.ts` is the
guard: it reads every value out of `en.json` and fails if any of them renders on a Russian or
Ukrainian page, in the text OR in an `aria-label`, `placeholder`, `alt` or `title`. Run it after
adding strings.

### Translating a page

In the admin, switch the locale control at the top of the document and type. Only fields holding
words are per-language; prices, images, dates and slugs are entered once and shared. Anything left
untranslated falls back to English, so a half-translated site renders whole.

```bash
pnpm seed:translations   # sample Russian and Ukrainian content, so three languages can be seen
```

### Turning a language off

**Settings → Languages** in the admin. Switching Ukrainian off removes it from the switcher, stops
its addresses serving and drops it from the sitemap, within a minute and without a deploy. Nothing
you have written in it is lost, and you can keep translating it while it is off. English has no
switch: it is what everything falls back to.

### Things that will surprise you

- **Slugs are always English**, in every language. A Cyrillic title is transliterated —
  "Каблучка з діамантом" becomes `kabluchka-z-diamantom`.
- **A visitor's language is never guessed.** Browser settings and IP are not read. Everyone starts in
  English; the switcher is the only way to change it, and the choice is remembered for a year.
- **A `required` field that is also localized must be filled in every language** before a document
  can be saved in any of them. That is why the localized fields inside arrays are not required.

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
