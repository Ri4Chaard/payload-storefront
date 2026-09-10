---
description: "Task list for 006-our-story-faq"
---

# Tasks: Our Story — An Editable About Page and a Shared FAQ

**Input**: Design documents from `/specs/006-our-story-faq/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **Included, and not optional here.** The constitution's *Development Workflow & Quality
Gates* makes unit/integration coverage and an automated accessibility scan blocking CI gates, and
*Editorial verification* makes "actually create and preview content in the admin" a merge gate of its
own. Every test task below traces to a success criterion in the spec or a rule in a contract.

**Organization**: Grouped by user story, in the spec's priority order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel **with the other `[P]` tasks in the same phase** — different files, no
  dependency on incomplete work. Tasks in different phases never run together, so a file touched by
  two phases is not a conflict.
- **[Story]**: `[US1]`–`[US5]`, mapping to the spec's user stories. Setup, Foundational and Polish
  carry no story label.

## Path Conventions

Single repo, Payload CMS + Next.js App Router. Source under `src/`, tests under `tests/`.
Every path is kebab-case — `pnpm check:naming` is a blocking gate.

## A note on where the weight sits

Phase 2 is unusually large for a "foundational" phase, and that is a fact about this feature rather
than a decomposition failure. The content model **is** the blocking prerequisite: the six block
definitions, the collection, the global and the data tier all land in one migration, and splitting
them across story phases would buy nothing but a second and third migration against the same tables.
What the story phases then own is everything a *person* can observe — the renderers, the route, the
video behaviour, the question lifecycle, the metadata — which is what makes each one independently
demonstrable.

**One consequence to know up front**: the FAQ band's renderer lives in User Story 4, not User Story
1. US1 therefore delivers six of the seven drawn bands. That is the honest dependency — the band
cannot render before questions exist — and the US1 checkpoint says so rather than pretending
otherwise.

> **Correction, made during implementation.** That split does not survive contact with the
> dispatcher. `block-renderer.tsx` ends in an exhaustive `switch` with a `never` check, so a block
> variant without a renderer is a **compile error** — which is the property T033 was written to
> have. Leaving `faq` unhandled therefore breaks the build for the whole of Phase 3, and the two
> tasks cannot be in different phases. **T054–T057 moved into Phase 3** and are ticked there; what
> remains in Phase 6 is the FAQ band's *behaviour* — access rules, draft visibility, de-duplication
> and the lifecycle e2e — which genuinely is independent work. The type system caught a
> decomposition error the plan did not.

---

## Phase 1: Setup

**Purpose**: The directory skeleton, the lint allowance the whole feature depends on, and every test
file created up front so no later task has to invent one.

- [X] T001 Create `src/blocks/`, `src/lib/story/`, `src/components/blocks/`, `src/components/ui/media/` and `src/components/ui/rich-text/`, each with a placeholder module docstring matching the header style of `src/lib/catalog/queries.ts`
- [X] T002 [P] Widen `DOCUMENT_TYPE_READERS` in `eslint-rules/catalog-boundary.mjs` with `/^src\/blocks\//` and `/^src\/lib\/story\//`, extending the existing docblock to say why each is a modelling tier — per [research.md](./research.md) R4, the rule fires on correct code without this
- [X] T003 [P] Create the empty suites every later task writes into: `tests/unit/story-mappers.test.ts`, `tests/integration/story-page.test.ts`, `tests/integration/questions-access.test.ts`, `tests/e2e/about.spec.ts`
- [X] T004 [P] Export the seven drawn photographs from Figma section `220:699` into `media/`, named for the band each fills — the external dependency [plan.md](./plan.md) Phase 6 names. **Blocks T062, nothing else**; every other task works with empty media slots

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The whole content model and the data tier that reads it. One migration.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Reusable field configs

- [X] T005 Create `src/fields/cta.ts` exporting `ctaField()` — optional `label` and `href`, both empty meaning no button, per [data-model.md](./data-model.md) §1.2
- [X] T006 Create `src/fields/media-slot.ts` exporting `mediaSlot()` — `kind` radio (`photo`/`video`), conditional `photo`, `video` and `poster` uploads to `media`, and `background`, per [data-model.md](./data-model.md) §1.1. `poster` is `required` when `kind === 'video'` (FR-022); no field anywhere accepts a pasted address (FR-021)

### The FAQ collection

- [X] T007 Create `src/collections/questions.ts` — `question` (text, required), `answer` (richText, required), `order` (number, sidebar); `labels: { singular: 'Question', plural: 'FAQ' }`; `admin.group: 'Content'`; `versions: { drafts: true }`; access `read: adminOrPublishedStatus`, `create/update/delete: isAdmin`. **No revalidation hook** — see [research.md](./research.md) R6 for why attaching one would evict every product page

### The six block definitions

- [X] T008 [P] Create `src/blocks/page-header.ts` — `eyebrow`, `heading`
- [X] T009 [P] Create `src/blocks/media-plate.ts` — one `mediaSlot()`
- [X] T010 [P] Create `src/blocks/closer-look.ts` — `body`, `chips` array, `figures` array (`word` + `caption`), `mediaSlot()`
- [X] T011 [P] Create `src/blocks/banner.ts` — `eyebrow`, `heading`, `body`, `ctaField()`, `mediaSlot()`, `textSide` select. **One block, two uses** (FR-048); record in its docblock that `textSide` applies above `lg` only, because both narrow frames put text left
- [X] T012 [P] Create `src/blocks/process-steps.ts` — `heading` and a reorderable `steps` array of `mediaSlot()` + `title` + `caption`. **No ordinal field** — the `01`/`02`/`03` is the row's position (FR-012)
- [X] T013 [P] Create `src/blocks/faq.ts` — `heading`, `body`, `ctaField()`, and `questions` as `relationship` → `questions` with `hasMany: true`, whose array order is display order (FR-032)
- [X] T014 Create `src/blocks/index.ts` exporting all six as one `blocks: Block[]` array (depends on T008–T013)

### The global, the config, the migration

- [X] T015 Create `src/globals/story-page.ts` — `body` as `{ type: 'blocks', blockReferences: [...six slugs], blocks: [] }` plus `seoField()`; `admin.group: 'Content'`; `versions: { drafts: true }`; access `read: () => true`, `update: isAdmin`. **`blocks: []` is required alongside `blockReferences`** — see [contracts/blocks.md](./contracts/blocks.md) §1
- [X] T016 Register in `src/payload.config.ts`: `blocks` from `src/blocks/index.ts`, `Questions` in `collections`, `StoryPage` in `globals`
- [X] T017 Generate the migration with `pnpm payload migrate:create`, covering the `questions` table, the `story_page` global table and the block tables, into `migrations/`
- [X] T018 Verify `pnpm payload migrate:down` against a database with seeded content, and confirm the blast radius is `questions`, `story_page` and the block tables only — the catalogue, cart and account pages must still work (quickstart §11)
- [X] T019 Run `pnpm generate:types` and commit `src/payload-types.ts` in the same commit as T017 (Constitution — Technology Stack)

### The data tier

- [X] T020 Create `src/lib/story/types.ts` — `StoryMedia`, `Cta`, the `StoryBlock` discriminated union, `StoryQuestion`, `StoryPage`, per [data-model.md](./data-model.md) §6. Derive from the generated types rather than restating them, as `src/lib/catalog/types.ts` does
- [X] T021 Create `src/lib/story/mappers.ts` — documents → view models for the photograph branch, dropping empty blocks (FR-004) and unknown block types ([contracts/blocks.md](./contracts/blocks.md) §4), and assigning `headingLevel` per [research.md](./research.md) R7. Reuse the `convertLexicalToHTML` shape from `src/lib/catalog/mappers.ts`
- [X] T022 Create `src/lib/story/queries.ts` exporting `getStoryPage()` — `cache()`-wrapped, `overrideAccess: false`, returning `null` on `isDatabaseUnreachable()` with a loud warning, per [contracts/story-loader.md](./contracts/story-loader.md) §§1–5
- [X] T023 Write mapper unit tests in `tests/unit/story-mappers.test.ts`: exactly one top heading level with a page-header, with none, and with two; every other band `h2` and nested headings `h3`; empty blocks dropped; unknown block types dropped

**Checkpoint**: An admin can compose and save the page in the panel; `pnpm lint`, `pnpm typecheck`
and `pnpm test` are green. Nothing renders on the storefront yet.

---

## Phase 3: User Story 1 — A visitor reads the shop's story (Priority: P1) 🎯 MVP

**Goal**: `/about` exists and renders the composed page, closing three dead links that have been live
in production since spec 001.

**Independent Test**: Publish the page with the drawn content and visit `/about` at 1920, 768 and
390. Six of the seven bands render in the composed order, the page has exactly one `h1`, and every
drawn string appears. (The FAQ band arrives with US4 — see the note at the top of this file.)

### UI kit

- [X] T024 [US1] Promote `RichText` and its `PROSE` class list out of `src/components/commerce/product-details/product-details.tsx` into `src/components/ui/rich-text/rich-text.tsx` + `index.ts`, and import it back into `product-details.tsx` — Constitution II, second consumer triggers promotion ([research.md](./research.md) R9)
- [X] T025 [P] [US1] Write `src/components/ui/rich-text/rich-text.stories.tsx` — paragraphs, a link, a list, and empty — `pnpm check:stories` is a gate
- [X] T026 [US1] Create `src/components/ui/media/media.tsx` — server component, photograph branch only, `next/image` with explicit `width`/`height` and responsive `sizes`, reserving its box before load (FR-024b). The video branch lands in US3
- [X] T027 [P] [US1] Write `src/components/ui/media/media.stories.tsx` covering the photograph branch at the drawn aspect ratios

### Block renderers

- [X] T028 [P] [US1] Create `src/components/blocks/page-header/` — eyebrow + heading, rendering at the `headingLevel` it is given, never one it chooses
- [X] T029 [P] [US1] Create `src/components/blocks/media-plate/` — the full-bleed plate, 530/400/240 as drawn
- [X] T030 [P] [US1] Create `src/components/blocks/closer-look/` — paragraph, chip row that **wraps** rather than clips, three figures, side media; reuses `Chip` and `Container`
- [X] T031 [P] [US1] Create `src/components/blocks/banner/` — one component with variants for `textSide`, eyebrow presence and CTA presence; drawn heights are minima, not fixed (spec Edge Cases); reuses `Button`
- [X] T032 [P] [US1] Create `src/components/blocks/process-steps/` — heading plus steps, three across at desktop and tablet, stacked at mobile; the ordinal comes from position
- [X] T033 [US1] Create `src/components/blocks/block-renderer.tsx` — exhaustive `switch` over `block.type` with a `never` check in the default branch, so a union member without a renderer is a compile error ([contracts/blocks.md](./contracts/blocks.md) §3). Depends on T028–T032
- [X] T034 [P] [US1] Write stories for the five renderers under `src/components/blocks/*/`, each at the three drawn widths

### The route

- [X] T035 [US1] Create `src/app/(frontend)/about/page.tsx` — reads `getStoryPage()`, renders `<BlockRenderer>`, `export const dynamic = 'force-dynamic'` with a docblock citing [research.md](./research.md) R6 and the home page's precedent. A `null` page renders chrome and nothing between, never `notFound()` ([contracts/story-loader.md](./contracts/story-loader.md) §6)

### Tests

- [X] T036 [P] [US1] Add `/about` to `tests/a11y/routes.spec.ts` — zero axe violations at Level AA at all three widths
- [X] T037 [P] [US1] Add `/about` to `tests/e2e/responsive.spec.ts` — no horizontal scrolling at 1920, 768 or 390
- [X] T038 [US1] Write the render half of `tests/e2e/about.spec.ts`: the header, footer and home-page links all resolve to `/about`; the page emits exactly one `<h1>`; keyboard tab order reaches every link and button with a visible focus ring

**Checkpoint**: SC-001 met — the three dead links are alive. The page renders six bands; the FAQ band
is absent because no questions exist yet, which is FR-034's required behaviour, not a gap.

---

## Phase 4: User Story 2 — The owner writes and composes the page (Priority: P2)

**Goal**: Every string editable, and the page's bands arranged by the owner rather than fixed by the
design.

**Independent Test**: Change one string in every band, reorder two bands, add a second banner and
remove it again, publish, reload `/about`, and see every change. Then confirm no string on the
rendered page is absent from the admin form.

- [X] T039 [US2] Add the `defaultValue` to the story global's `body` field in `src/globals/story-page.ts` — the seven drawn bands in the drawn order with their drawn copy, media slots empty (FR-052, [research.md](./research.md) R11)
- [X] T040 [P] [US2] Audit every field in `src/blocks/*.ts`, `src/collections/questions.ts` and `src/globals/story-page.ts` for an editor-facing label and, where the purpose is not self-evident, an admin description — Constitution IV, "fields no editor can interpret will be filled incorrectly"
- [X] T041 [P] [US2] Write the composition half of `tests/e2e/about.spec.ts`: reorder two bands and see the new order; add a second banner block and see it render where placed; remove it and see the bands close up; add an unfilled band and see it absent (FR-004)
- [X] T042 [P] [US2] Extend `tests/e2e/about.spec.ts` with the heading invariant under reordering: a banner dragged above the page header, the page header deleted, and two page headers — each must still yield exactly one `<h1>` (FR-051, SC-012)
- [X] T043 [P] [US2] Write `tests/integration/story-page.test.ts`: a draft save leaves the live page unchanged; publishing shows it; a previous version is restorable (FR-015)
- [X] T044 [US2] Verify in the Payload admin by hand — compose, reorder, preview and publish — and record the walk. Constitution's *Editorial verification* makes this a merge gate: "a block that renders correctly but is unusable in the admin is a defect"

**Checkpoint**: SC-002, SC-003, SC-011 and SC-012 met. The owner controls the page without a
deployment.

---

## Phase 5: User Story 3 — A video where a photograph was drawn (Priority: P3)

**Goal**: Any media slot can hold a video from the shop's own library, in the same frame, with no
layout shift, no third-party player, and no bytes spent on a band the visitor never reaches.

**Independent Test**: Switch each media slot to a video in turn, publish, and confirm the band
renders it in the frame the photograph occupied at all three widths — then confirm the file is not
fetched until the band scrolls into view, and never under reduced motion.

- [X] T045 [US3] Widen `mimeTypes` in `src/collections/media.ts` to `['image/*', 'video/*']`, recording in the docblock that Payload gates resizing on mimetype (`generateFileData.js`), so a video stores no `sizes` — [research.md](./research.md) R3. Config only, no migration
- [X] T046 [US3] Add `upload.limits.fileSize` to `src/payload.config.ts` with the accepted-format set stated, so an oversized or unplayable upload is refused at upload time (FR-021b)
- [X] T047 [US3] Extend `src/lib/story/mappers.ts` with the video branch — `src`/`width`/`height` come from the **poster**, `videoSrc` from the video, and a slot with no still is dropped ([contracts/media-slot.md](./contracts/media-slot.md) §2). This is the one place that branches on mimetype
- [X] T048 [US3] Create `src/components/ui/media/video-media.tsx` — `'use client'`, the only client code this feature adds. Withholds `src` until the slot intersects the viewport **and** `matchMedia('(prefers-reduced-motion: reduce)')` does not match; renders `muted`, `loop`, `playsInline`, no `controls` when `background` ([contracts/media-slot.md](./contracts/media-slot.md) §3)
- [X] T049 [US3] Add the video branch to `src/components/ui/media/media.tsx`, mounting `VideoMedia` only for a video slot so a photograph slot ships no client code
- [X] T050 [P] [US3] Extend `src/components/ui/media/media.stories.tsx` with the video branch, including the poster-only state
- [X] T051 [P] [US3] Extend `tests/integration/story-page.test.ts`: a slot with `kind: 'video'` and no poster cannot be published, and the error names the slot (FR-022, FR-027)
- [X] T052 [P] [US3] Extend `tests/e2e/about.spec.ts`: the video file is not requested until its band is scrolled into view (FR-024a); under an emulated `prefers-reduced-motion: reduce` it is never requested and the poster shows (FR-024)
- [X] T053 [P] [US3] Verify in the admin that a media slot exposes no field into which an external address could be pasted (FR-021), and that a video already uploaded can be selected into a second slot without re-uploading (FR-021a)

**Checkpoint**: SC-004 and SC-004a met.

---

## Phase 6: User Story 4 — Questions managed once, for every place they appear (Priority: P4)

**Goal**: The FAQ band renders, and its questions live in their own admin tab so the later `/faq` page
reads them with nothing to migrate.

**Independent Test**: Create, reorder, unpublish and delete questions in the FAQ tab and see each
change on `/about`. Then unpublish the story page and confirm the questions still exist — they are
not owned by it.

- [X] T054 [US4] Extend `src/lib/story/mappers.ts` to resolve the FAQ block's question selection — de-duplicate by id keeping first position (FR-032), serialise `answer` to `answerHtml`, and drop the block when no question survives (FR-034)
- [X] T055 [US4] Create `src/components/blocks/faq-band/` — heading, intro, optional CTA, and the question list rendered with the existing `Accordion` at `headingLevel={3}` and its default `single: false` so opening one does not close another (FR-035). Answers render through the promoted `RichText`
- [X] T056 [US4] Add the `faq` case to `src/components/blocks/block-renderer.tsx` (depends on T055)
- [X] T057 [P] [US4] Write `src/components/blocks/faq-band/faq-band.stories.tsx` — several questions, one open, a long answer, and a single question
- [X] T058 [P] [US4] Write `tests/integration/questions-access.test.ts`: an unpublished question is unreachable to an anonymous read (`overrideAccess: false`); a question cannot be saved with an empty question or empty answer (FR-030); admins can write and non-admins cannot (FR-036)
- [X] T059 [P] [US4] Extend `tests/e2e/about.spec.ts`: reordering the selection reorders the band; the same question selected twice appears once; unpublishing one removes it with no edit to the story page; unpublishing all removes the whole band; an answer's link and list render

**Checkpoint**: SC-009 met, and the seventh drawn band is in place. `/faq` remains a dead link — out
of scope, by decision.

---

## Phase 7: User Story 5 — The page is found and shared correctly (Priority: P5)

**Goal**: Editor-controlled metadata and a canonical URL.

**Independent Test**: Set a meta title, description and social image in the admin, publish, and
inspect the served page and a link preview.

- [X] T060 [US5] Add `generateMetadata` to `src/app/(frontend)/about/page.tsx` — emits the editor's title, description, canonical URL and social image, falling back to the page's own headline, first paragraph and first photograph when unset (FR-039, FR-040). It calls `getStoryPage()` a second time and pays nothing, because the loader is `cache()`-wrapped
- [X] T061 [P] [US5] Extend `tests/e2e/about.spec.ts`: metadata is emitted from the admin values, the fallbacks apply when they are empty, and a canonical URL is present

**Checkpoint**: All five user stories independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T062 Add a seed step to `scripts/seed-catalog.ts` that uploads the T004 photographs into `media` and attaches them to the default composition's seven slots, so a fresh install renders the drawn page (FR-052). **Depends on T004**
- [X] T063 Measure `/about` against a **production server** (`pnpm build && pnpm start`), gzipped as served: total route JS ≤ 300KB and ≤ 100KB above the 181KB baseline measured 2026-09-03. Record both numbers here — Constitution V, and a build log will not do (quickstart §8). **Measured 2026-09-10: `/about` is 186.4KB total and 5.0KB above baseline — both budgets met with room. The baseline re-measured at 181.4KB, matching the constitution's recorded 181KB, which is what validates the method.**
- [ ] T064 [P] Run Lighthouse mobile on `/about` with every slot filled and at least one a video: LCP ≤ 2.5s, CLS ≤ 0.1 (SC-006)
- [X] T065 [P] Verify the three empty states render coherently — every band filled, one band only, and no blocks at all (SC-010, FR-053)
- [X] T066 Run every gate: `pnpm lint`, `typecheck`, `check:naming`, `check:styles`, `check:tokens`, `check:stories`, `test`, `test:integration`, `test:e2e`, `test:a11y`
- [X] T067 Walk [quickstart.md](./quickstart.md) end to end and correct anything it gets wrong

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (1)**: no dependencies. T002 unblocks every later lint run
- **Foundational (2)**: depends on Setup. **Blocks all five stories**
- **US1 (3)**: depends on Foundational. The MVP
- **US2 (4)**: depends on Foundational. Its e2e tasks extend files US1 creates, so run it after US1
- **US3 (5)**: depends on Foundational + T026 (the photograph branch it extends)
- **US4 (6)**: depends on Foundational + T024 (`RichText`) and T033 (the dispatcher)
- **US5 (7)**: depends on T035 (the route)
- **Polish (8)**: depends on all desired stories, plus T004 for T062

### Story independence, honestly stated

The five stories are independently *testable*, and three of them are independently *deliverable*:

- **US3, US4 and US5 do not depend on each other at all** and can be built in parallel by different
  people once US1 has landed.
- **US2 is verification-heavy** — most of its weight is proving that what Foundational modelled is
  usable — so it shares files with US1's tests rather than being isolated from them.
- **US4 owns a band US1's independent test would otherwise expect.** Called out at the top of this
  file so nobody treats the missing FAQ band in US1 as a bug.

### Parallel opportunities

- **Phase 1**: T002, T003, T004 together
- **Phase 2**: the six block definitions T008–T013 together, and T007 alongside them
- **Phase 3**: the five renderers T028–T032 together; then stories T025, T027, T034; then tests T036,
  T037
- **Phase 4**: T040–T043 together
- **Phase 5**: T050–T053 together after T049
- **Phase 6**: T057–T059 together after T056
- **Phase 8**: T064 and T065 together

---

## Parallel Example: Phase 2 block definitions

```bash
# Six independent files, one per block, no shared state:
Task: "Create src/blocks/page-header.ts"
Task: "Create src/blocks/media-plate.ts"
Task: "Create src/blocks/closer-look.ts"
Task: "Create src/blocks/banner.ts"
Task: "Create src/blocks/process-steps.ts"
Task: "Create src/blocks/faq.ts"
# Then T014 collects them into the registry — not parallel with the above.
```

## Parallel Example: Phase 3 renderers

```bash
Task: "Create src/components/blocks/page-header/"
Task: "Create src/components/blocks/media-plate/"
Task: "Create src/components/blocks/closer-look/"
Task: "Create src/components/blocks/banner/"
Task: "Create src/components/blocks/process-steps/"
# Then T033 wires the dispatcher — depends on all five.
```

---

## Implementation Strategy

### MVP: Phases 1 → 2 → 3

Setup, the content model, and the route. That is 38 tasks and it delivers the thing the feature is
for: `/about` resolves, renders the composed page, and three links that have been dead in production
since spec 001 are alive. Stop here and validate before going further.

### Incremental delivery

1. **Phases 1–2** → an admin can compose the page; nothing public yet
2. **+ Phase 3** → the page is live and readable (**MVP** — SC-001)
3. **+ Phase 4** → the owner controls it without a deployment (SC-002, SC-003, SC-011)
4. **+ Phase 5** → video slots (SC-004)
5. **+ Phase 6** → the FAQ band and the shared question model (SC-009)
6. **+ Phase 7** → metadata and canonical
7. **+ Phase 8** → budgets measured, defaults seeded, gates green

Each step adds value without breaking the one before it.

### Parallel team strategy

One person takes Phases 1–2 alone — it is one migration and splitting it across people invites a
conflict in `payload.config.ts` and the generated types. After US1 lands, US3, US4 and US5 fan out to
three people cleanly.

---

## Notes

- `[P]` means different files and no dependency on incomplete work, **within the same phase**
- Commit after each task or logical group; the migration (T017) and the generated types (T019) belong
  in the **same** commit
- Every new UI-kit component needs stories — `pnpm check:stories` is a gate, not a convention
- No new dependency is added anywhere in this list. If a task seems to want one, re-read
  [research.md](./research.md) R5 first
- Do not introduce `use cache` / `cacheLife` / `cacheTag`; this project is on Next 16's previous
  caching model ([contracts/story-loader.md](./contracts/story-loader.md) §4)
