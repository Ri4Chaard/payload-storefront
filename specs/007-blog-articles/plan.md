# Implementation Plan: Our Blog — An Article Collection, an Index, and the Article Page

**Branch**: `007-blog-articles` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-blog-articles/spec.md`

## Summary

Build `/blog` and `/blog/<slug>` — the last dead link in the site chrome — as an editorial
collection in Payload: articles written in named chapters, one category each, a mosaic index that
narrows by category and grows by one control, and a contents rail generated from the chapters
rather than maintained beside them.

Five things the codebase already decided shape the technical answer, and three of them mean this
feature writes less code than it looks like:

1. **Spec 006 built the vocabulary.** `mediaSlot` gives the hero a photograph-or-video for free,
   `RichText` renders lexical, `slugField` and `seoField` are shared configs, and
   `convertLexicalToHTML` is already in a mapper. The genuinely new components are the card, the
   mosaic, the tab strip and the contents rail — four, not fourteen.
2. **`catalog/no-document-types` forbids components from importing `@/payload-types`.** So this
   feature gets its own data tier, `src/lib/blog/`, mirroring `src/lib/catalog/` and
   `src/lib/story/`: view models, mappers, loader, and one URL writer. Widening the rule's allowlist
   is a task, not an afterthought — the rule fires on correct code otherwise.
3. **Two Constitution II promotions fall out, and both are the rule working as intended.**
   `LoadMore` and `ListingEmpty` were built for the catalogue in spec 003 and gain their second
   consumer here. Constitution II says the second usage is the trigger to promote, not to duplicate,
   so both move into the UI kit — `LoadMore` unchanged, `ListingEmpty` renamed `EmptyState` with its
   `clearHref` relaxed to an optional action. This is the same move 006 made with `RichText`.
4. **The blog is the first part of this site worth caching, and the existing invalidation cannot be
   reused as-is.** `invalidate()` marks every product page stale by walking every product slug, so
   attaching `revalidateOnChange` to `articles` would evict the entire catalogue because somebody
   fixed a typo. Articles get their own narrow hook; `invalidate()` gains an articles pass so that a
   photograph swap still reaches both route families. See [research.md](./research.md) R6.
5. **There is no sitemap.** FR-044 requires published articles to appear in "the site's
   machine-readable list of addresses" and the site does not have one. `src/app/sitemap.ts` is new
   work this spec has to do, and it has to cover the whole public site rather than only the blog —
   a sitemap listing seven articles and nothing else is worse than none.

Two invariants are resolved in the **mapper**, where they are unit-testable without rendering
anything: the anchor each chapter is reachable at (unique within the article even when two headings
read alike, FR-026), and which card is drawn wide at which breakpoint (FR-006 – FR-009). Neither is
a component's decision.

## Technical Context

**Language/Version**: TypeScript 5.9, strict mode. Node ≥ 22.

**Primary Dependencies**: Payload 3.88.0 (`@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`,
`@payloadcms/ui`), Next 16.3.3 (App Router), React 19.2. **No new third-party dependencies.** The
contents rail is an `IntersectionObserver` in one client leaf, not a scroll-spy library — see
research R9.

`@payloadcms/ui` was added during implementation and is recorded in Complexity Tracking below. It is
first-party Payload, already in the lockfile transitively at the identical version, and it reaches
the admin only — never a storefront route, so it is outside the JavaScript budget by construction.

**Storage**: PostgreSQL via `@payloadcms/db-postgres`. One migration: the `articles` collection and
its chapters array (plus draft-version tables), the `article-categories` collection, and the
`blog-page` global.

**Testing**: Vitest (unit + integration against a real database), Playwright (`e2e`, `a11y`,
`stories` projects), Storybook 10 for the UI kit.

**Target Platform**: Server-rendered web, deployed as a container image built without a database.

**Project Type**: Web application — Payload CMS admin and a Next.js App Router storefront in one
Next app (`src/app/(payload)` and `src/app/(frontend)`).

**Performance Goals**: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at p75 mobile. Route JS ≤ 300KB gzipped
total and ≤ 100KB gzipped above the 181KB framework baseline measured on 2026-09-03.

**Constraints**: WCAG 2.2 AA. No hardcoded user-visible copy. No raw colour/spacing/type values.
kebab-case paths (`pnpm check:naming`). UI-kit components require stories (`pnpm check:stories`).
Components may not import `@/payload-types`.

**Scale/Scope**: Two routes plus a sitemap, two collections, one global, four new components, two
promotions, one decoupling. Marketing traffic. Tens of articles, not thousands — the mosaic and the
index queries are sized for that and say so.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Verdict |
|---|-----------|------|---------|
| I | Payload is the single source of truth | Articles, categories and the index's own copy all in Payload; no user-visible string in a component; Local API in server components | **PASS.** The one nuance is deliberate: the index is **not** block-composed the way `/about` is. Its only drawn band above the mosaic is a page header, and the mosaic itself cannot be a block an editor moves. Flat fields on a `blog-page` global, and the `PageHeaderBlock` component reused to draw them — research R2 records the alternative and why it was dropped. |
| II | Reuse before creation | Reuse `Header`, `ContactBanner`, `Footer`, `Container`, `Button`, `Link`, `RichText`, `Media`, `mediaSlot`, `slugField`, `seoField`/`seoTab`; promote `LoadMore` and `ListingEmpty` rather than copy them; one card component with two emphasis flags, not four cards | **PASS**, with two promotions and one decoupling. `PageHeaderBlock`'s props type is currently `Extract<StoryBlock, …>`, which would drag `src/lib/story` into the blog route; it becomes a plain interface and the story renderer passes the same fields. Four genuinely new components, each justified in [research.md](./research.md) R8. |
| III | Design tokens over magic values | All colour/spacing/type from tokens; the mosaic's spans and the card's aspect ratios expressed in the token grid; every interactive element gets the full state set including `focus-visible`; the badge over a photograph gets a scrim so contrast holds on a light image | **PASS** — enforced by `design-tokens/*` ESLint rules, `pnpm check:styles` and `pnpm check:contrast`. |
| IV | Content modelling & schema evolution | Collections and the global modelled in [data-model.md](./data-model.md) before implementation; every field labelled and described; the category is a relationship field, never a stored string; required fields and validation at field level; access stated explicitly on both collections and the global; drafts on `articles`; migration with a tested rollback | **PASS.** Note the one field-naming decision: `articles.category` matches `products.category`, so the same concept keeps the same name across collections. |
| V | Performance, accessibility & SEO budgets | Server components by default; one `use client` leaf; images through the framework pipeline with explicit dimensions and lazy loading below the fold; WCAG 2.2 AA; editor-controlled metadata, canonical URLs, Open Graph and `schema.org/Article` on article pages; caching and revalidation explicit per route | **PASS**, and this is the principle with the most new work: the sitemap did not exist, and the article route is the first cached route family outside the catalogue. Both are designed in research R6 and R7 rather than assumed. |
| VI | Commerce correctness & data protection | No money, no inventory, no customer data | **N/A** — the only access surface is public-read/admin-write on editorial content, stated explicitly on both collections and the global. |

**Post-Phase-1 re-check**: PASS, unchanged. The design added no dependency, no service and no data
store. It added one route family to the site's cache map and one metadata route, both of which are
recorded in the contracts rather than left to be discovered.

## Project Structure

### Documentation (this feature)

```text
specs/007-blog-articles/
├── plan.md                  # This file
├── research.md              # Phase 0 output — R1–R14
├── data-model.md            # Phase 1 output — collections, global, field-by-field
├── quickstart.md            # Phase 1 output — how to verify the feature end to end
├── contracts/
│   ├── blog-loader.md       #   what a route may ask for and what comes back
│   ├── article-content.md   #   chapters, anchors, the contents list, rich text
│   └── blog-url.md          #   the one function that writes a blog address
├── checklists/
│   └── requirements.md      # Spec quality checklist (16/16)
└── tasks.md                 # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── collections/
│   ├── articles.ts                       # NEW — drafts, chapters array, admin group "Content"
│   └── article-categories.ts             # NEW — title, slug, order
├── globals/
│   └── blog-page.ts                      # NEW — the index's own copy and metadata
├── fields/
│   └── media-slot.ts                     # existing — reused for the article hero
├── lib/
│   ├── blog/                             # NEW — the data tier (mirrors src/lib/catalog/)
│   │   ├── types.ts                      #   view models; ArticleCard, ArticleView, Chapter
│   │   ├── mappers.ts                    #   documents → view models; anchors, TOC, emphasis
│   │   ├── queries.ts                    #   loaders, request-deduped, DB-unreachable tolerant
│   │   └── blog-url.ts                   #   the ONE writer of a /blog address
│   └── revalidate.ts                     # CHANGED — articles pass + a narrow article hook
├── components/
│   ├── blog/                             # NEW — single-consumer components
│   │   ├── article-card/                 #   one component, two emphasis flags
│   │   ├── article-mosaic/               #   the grid rhythm, and the empty case
│   │   ├── category-tabs/                #   links, not buttons; aria-current
│   │   ├── article-header/               #   eyebrow, h1, standfirst
│   │   ├── article-body/                 #   chapters, ledes, rich text, pull quotes
│   │   ├── table-of-contents/
│   │   │   ├── table-of-contents.tsx     #   server: the rail and the phone card
│   │   │   └── toc-current.tsx           #   'use client' leaf — observer only
│   │   └── blog.stories.tsx              #   the four new components, as 006 did for blocks
│   ├── blocks/page-header/               # CHANGED — props decoupled from StoryBlock
│   ├── commerce/
│   │   ├── load-more/                    # MOVED → components/ui/load-more
│   │   └── listing-empty/                # MOVED → components/ui/empty-state (EmptyState)
│   └── ui/
│       ├── load-more/                    # PROMOTED — second consumer (Constitution II)
│       └── empty-state/                  # PROMOTED — clearHref relaxed to an optional action
├── app/
│   ├── sitemap.ts                        # NEW — the whole public site, force-dynamic
│   └── (frontend)/blog/
│       ├── page.tsx                      # NEW — the index; force-dynamic
│       └── [slug]/page.tsx               # NEW — an article; generateStaticParams + invalidation
└── payload.config.ts                     # CHANGED — register two collections and one global

eslint-rules/catalog-boundary.mjs         # CHANGED — src/lib/blog/ may see documents
migrations/                               # NEW migration + tested rollback
scripts/seed-catalog.ts                   # CHANGED — categories, the drawn copy, seven articles
tests/
├── unit/blog-mappers.test.ts             # NEW — anchors, dedupe, TOC, emphasis, dates
├── integration/blog-articles.test.ts     # NEW — access, drafts, uniqueness, category deletion
├── e2e/blog.spec.ts                      # NEW — index, narrowing, load more, article, TOC
├── e2e/blog-admin.spec.ts                # NEW — editorial verification (Constitution workflow)
├── a11y/routes.spec.ts                   # CHANGED — /blog, a narrowed /blog, an article
└── warm-routes.ts                        # CHANGED — /blog and /blog/[slug]
```

**Structure Decision**: The existing web-application layout is kept exactly. Payload modelling stays
in `src/collections`, `src/globals` and `src/fields`; the reading tier is a new `src/lib/blog/`
beside `src/lib/catalog/` and `src/lib/story/`, because `catalog/no-document-types` makes that
boundary structural rather than stylistic; single-consumer components live in
`src/components/blog/`, the parallel of `src/components/commerce/`; anything with a second consumer
moves into `src/components/ui/`. No new top-level directory, no new package, no new service.

## Complexity Tracking

> Constitution Check passed with no violations. Two entries are recorded here not as violations but
> as scope this plan takes on deliberately, so a reviewer can challenge them rather than discover
> them in a diff.

| Decision | Why it is in this feature | Simpler alternative rejected because |
|----------|---------------------------|--------------------------------------|
| `src/app/sitemap.ts` covers the **whole public site**, not just the blog | FR-044 needs a machine-readable address list and none exists. Constitution V requires one for indexability | A blog-only sitemap would be a second, competing list the day products need one, and a sitemap that omits the catalogue actively misinforms a crawler |
| `ListingEmpty` is renamed and moved rather than left where it is | Constitution II: the second consumer is the trigger to promote, and its copy and its required `clearHref` are both catalogue-shaped today | Copying it into `src/components/blog/` is the exact duplication Principle II names as the most expensive violation. Leaving it in `commerce/` and importing it from the blog inverts the dependency between two feature folders |
| `@payloadcms/ui` added as a direct dependency (found during T011, not anticipated in this plan) | The chapters array needs a `RowLabel` so a collapsed list reads as headings rather than `Chapter 01 … Chapter 08`, and `useRowLabel` is the only way to read a row's data. The Constitution's *Editorial verification* gate treats an admin nobody can use as a defect | Dropping the custom row label leaves editors dragging numbered rows they must expand one at a time to identify. The package is first-party, already resolved at 3.88.0 in the lockfile, and admin-only — `pnpm add` recorded an existing fact rather than pulling new code, and no storefront route imports it |
