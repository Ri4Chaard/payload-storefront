# Implementation Plan: Our Story — An Editable About Page and a Shared FAQ

**Branch**: `006-our-story-faq` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-our-story-faq/spec.md`

## Summary

Build `/about` — the destination three existing links have pointed at since spec 001 — as a page the
owner composes in the admin from reorderable Payload blocks, with every string and every picture
editable, each media slot able to hold a video from the shop's own library instead of a photograph,
and a shared FAQ collection that the page draws from and a later `/faq` page will reuse unchanged.

The technical shape follows from four things the codebase already decided:

1. **Payload 3.88 has config-level shared blocks** (`config.blocks` + `blockReferences`). That is
   FR-050 — blocks defined once, available to any page — with no invention required. Blocks live in
   `src/blocks/`, are registered on the config, and the story global references them by slug.
2. **A lint rule forbids components from importing `@/payload-types`.** `catalog/no-document-types`
   confines generated document types to the modelling tiers and the catalogue data layer. So this
   feature gets its own data tier, `src/lib/story/`, mirroring `src/lib/catalog/`: view models,
   mappers, loader. The rule's allowlist has to be widened for it — that is a task, not an
   afterthought, because the rule fires on correct code otherwise.
3. **Payload gates image processing on mimetype.** `generateFileData.js` resizes only when
   `fileSupportsResize || isImage(mimetype)`, so widening `media.mimeTypes` to accept `video/*`
   costs nothing and needs no second collection. The media library becomes the one place media
   lives, which is exactly what "paste videos from media" asked for.
4. **The production image is built with no database.** `src/lib/catalog/prerender.ts` records the
   chicken-and-egg in full, and the home page — the site's other route with no dynamic segment —
   resolved it with `force-dynamic` rather than baking an empty page that never heals. `/about` has
   the identical shape and takes the identical answer.

The heading-hierarchy rule that reordering introduced (FR-051) is resolved in the **mapper**, not in
the components: the loader marks which block owns the page's `h1` and hands every block its heading
level, so the invariant is unit-testable without rendering anything.

## Technical Context

**Language/Version**: TypeScript 5.9, strict mode. Node ≥ 22.

**Primary Dependencies**: Payload 3.88.0 (`@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`),
Next 16.3.3 (App Router), React 19.2. **No new dependencies.** The video slot is a `<video>` element
and an intersection observer, not a player library — see research R5.

**Storage**: PostgreSQL via `@payloadcms/db-postgres`. One migration: the `questions` collection, the
story-page global and its block tables, plus the widened media mimetype (config-only, no columns).

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

**Scale/Scope**: One page, six block types, one collection, one global, ~7 media slots in the drawn
composition. Marketing traffic, not catalogue traffic.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Verdict |
|---|-----------|------|---------|
| I | Payload is the single source of truth | Page composed from Payload **blocks**; no user-visible string in a component; Local API in server components | **PASS** — this is the point of the feature. Spec iteration 3 removed the fixed-band model that would have failed the blocks clause. Note the drawn copy ships as field `defaultValue`, which is content an editor can change, not a hardcoded string. |
| II | Reuse before creation | Reuse `Header`, `ContactBanner`, `Footer`, `Button`, `Chip`, `Container`, `Accordion`, `Link`, `SectionHeading`; two banners are **one** block and **one** component with variants; the seven media slots are **one** field config and **one** renderer | **PASS**, with one promotion required: `RichText` is currently a private function inside `product-details.tsx` and gains a second consumer here, so it moves to the UI kit rather than being copied. |
| III | Design tokens over magic values | All colour/spacing/type from tokens; every interactive element gets the full state set including `focus-visible` | **PASS** — enforced by `design-tokens/*` ESLint rules and `pnpm check:styles`. |
| IV | Content modelling & schema evolution | Collections/globals/blocks modelled in `data-model.md` before implementation; every field labelled and described; relationships as relationship fields; access stated explicitly on every new collection and global; migration with a tested rollback | **PASS** — see [data-model.md](./data-model.md). Access is stated on `questions` and `story-page`, never inherited by omission. |
| V | Performance, accessibility & SEO budgets | Server components by default; `use client` pushed to leaves; images through the framework pipeline with explicit dimensions; WCAG 2.2 AA; editor-controlled metadata + canonical; caching/revalidation explicit per route | **PASS** — two client leaves only (`Accordion`, already client; the video slot). Caching is explicit: `force-dynamic`, for the reason the home page is (research R6). |
| VI | Commerce correctness & data protection | No money, no inventory, no customer data in this feature | **N/A** — the only access surface is public-read/admin-write on editorial content, stated explicitly. |

**Post-Phase-1 re-check**: PASS, unchanged. The design added no dependency, no service, no data store,
and no bespoke page component. See [research.md](./research.md) R1–R16 for every decision and the
alternative it displaced.

## Project Structure

### Documentation (this feature)

```text
specs/006-our-story-faq/
├── plan.md              # This file
├── research.md          # Phase 0 output — R1–R16
├── data-model.md        # Phase 1 output — collections, global, blocks, field configs
├── quickstart.md        # Phase 1 output — how to verify the feature end to end
├── contracts/           # Phase 1 output
│   ├── story-loader.md  #   what the route may ask for and what comes back
│   ├── blocks.md        #   the block registry and the render contract
│   └── media-slot.md    #   the photograph-or-video contract, both tiers
├── checklists/
│   └── requirements.md  # Spec quality checklist (16/16)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── blocks/                          # NEW — shared Payload block definitions (config.blocks)
│   ├── index.ts                     #   the registry, exported as one array
│   ├── page-header.ts
│   ├── media-plate.ts
│   ├── closer-look.ts
│   ├── banner.ts                    #   ONE block; Standard + Crafted-to-last are two uses
│   ├── process-steps.ts
│   └── faq.ts
├── fields/
│   ├── media-slot.ts                # NEW — the photograph-or-video field group, used 7× as drawn
│   ├── cta.ts                       # NEW — optional label + destination, used by banner and faq
│   └── seo.ts                       # existing — `seoField()` reused by the story global
├── collections/
│   ├── media.ts                     # CHANGED — mimeTypes accept video/*
│   └── questions.ts                 # NEW — admin label "FAQ"
├── globals/
│   └── story-page.ts                # NEW — one record, drafts + versions, blocks body
├── lib/
│   └── story/                       # NEW — the data tier (mirrors src/lib/catalog/)
│       ├── types.ts                 #   view models; the StoryBlock discriminated union
│       ├── mappers.ts               #   documents → view models; heading-level assignment
│       └── queries.ts               #   the loader, request-deduped, DB-unreachable tolerant
├── components/
│   ├── blocks/                      # NEW — one renderer per block, plus the dispatcher
│   │   ├── block-renderer.tsx       #   exhaustive switch over the discriminated union
│   │   ├── page-header/
│   │   ├── media-plate/
│   │   ├── closer-look/
│   │   ├── banner/
│   │   ├── process-steps/
│   │   └── faq-band/
│   └── ui/
│       ├── media/                   # NEW — renders a slot: photograph or video
│       │   ├── media.tsx            #   server component; picks the branch
│       │   └── video-media.tsx      #   'use client' leaf — observer + reduced motion
│       └── rich-text/               # NEW — promoted from product-details.tsx (2nd consumer)
├── app/(frontend)/
│   └── about/page.tsx               # NEW — the route
└── payload.config.ts                # CHANGED — register blocks, questions, story-page, upload limit

eslint-rules/catalog-boundary.mjs    # CHANGED — src/blocks/ and src/lib/story/ may see documents
migrations/                          # NEW migration + tested rollback
tests/
├── unit/story-mappers.test.ts       # NEW — heading ownership, empty bands, block mapping
├── integration/story-page.test.ts   # NEW — access, drafts, question selection
├── a11y/routes.spec.ts              # CHANGED — /about added
└── e2e/about.spec.ts                # NEW — compose, reorder, publish, render
```

**Structure Decision**: The feature adds three sibling directories that mirror conventions already in
the repository rather than inventing a layout. `src/blocks/` sits beside `src/collections/`,
`src/globals/` and `src/fields/` as a fourth modelling tier — it is where Payload block definitions
go, and the config registers them centrally so any future page can reference them by slug.
`src/lib/story/` mirrors `src/lib/catalog/` exactly (types / mappers / queries), because the
`no-document-types` lint rule requires a view-model boundary and the catalogue already demonstrates
what one looks like. `src/components/blocks/` sits beside `src/components/sections/`: a *section* is
a band a route composes in code, a *block* is a band an editor composes in the admin, and keeping
them apart stops the next person from reaching for the wrong one.

## Implementation Phases

Ordered so that each phase leaves the tree green and something demonstrable. `/speckit-tasks` expands
these into numbered work.

| Phase | What lands | Done when |
|-------|-----------|-----------|
| 1. Content model | `media-slot.ts`, `cta.ts`, six blocks, `questions`, `story-page`, media accepts video, config registration, migration + rollback | An admin can compose and save the page in the panel; `pnpm generate:types` is clean and committed |
| 2. Data tier | `src/lib/story/{types,mappers,queries}.ts`, the ESLint allowlist widening, unit tests for heading ownership and empty-band handling | Mappers convert a fixture document to view models; no component can see a document |
| 3. UI kit | `RichText` promoted out of `product-details.tsx`; `Media` + `VideoMedia`; stories for both | `pnpm check:stories` passes; the product page renders identically to before |
| 4. Block renderers | Six components plus the exhaustive dispatcher | Every block renders at three widths in Storybook |
| 5. The route | `/about/page.tsx`, `generateMetadata`, `force-dynamic` | The three dead links resolve; metadata and canonical emitted |
| 6. Defaults & seed | Drawn copy as field defaults; seed step for the drawn photographs | A fresh install renders the seven drawn bands in order |
| 7. Verification | a11y scan, responsive e2e, editorial check in the admin, JS budget measured against a production server | SC-001 – SC-013 evidenced |

**Phase 6 has an external dependency**: the seven drawn photographs must be exported from the Figma
section. Until they are, the page renders with collapsed media slots — correct per FR-024b, but not
the shipped default FR-052 describes.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified.

**No violations.** No exception is requested and none is needed.

This is worth stating explicitly because the spec's second iteration *did* carry one. Modelling the
page as a purpose-built record with fixed bands would have failed Constitution I's "Pages MUST be
assembled from Payload Blocks", and the spec then required this plan to record a time-boxed
exception. Iteration 3 changed the model to reorderable blocks and the deviation disappeared rather
than being justified. The cost is real and is recorded honestly in Phase 1 — this feature builds the
repository's first block infrastructure — but it is groundwork the `/faq` page and the blog were
going to need regardless, and it is not a deviation to track.

The one judgement call that could look like added complexity is the new `src/lib/story/` tier. It is
not optional: `eslint-rules/catalog-boundary.mjs` forbids components from importing
`@/payload-types`, so a view-model boundary is a rule of this codebase, not a preference. The
alternative — widening the rule's allowlist to cover `src/components/` — would delete the boundary
for the whole repository to save one directory.
