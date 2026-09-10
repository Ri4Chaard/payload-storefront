---
description: "Task list for 007-blog-articles"
---

# Tasks: Our Blog — An Article Collection, an Index, and the Article Page

**Input**: Design documents from `/specs/007-blog-articles/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **Included, and not optional here.** The constitution's *Development Workflow & Quality
Gates* makes unit/integration coverage and an automated accessibility scan blocking CI gates, and
*Editorial verification* makes "actually create and preview content in the admin" a merge gate of
its own. Every test task below traces to a success criterion in the spec or a rule in a contract.

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

Phase 2 carries the content model, the data tier **and** two component moves, which is more than a
"foundational" phase usually holds. Two facts about this feature put them there:

1. **The model is one migration.** Two collections, a chapters array and a global land in a single
   `payload migrate:create`. Splitting them across story phases buys nothing but a second and third
   migration against the same tables.
2. **The two promotions block everything that follows.** `LoadMore` and `ListingEmpty` gain their
   second consumer in this feature, and Constitution II makes promotion the required response.
   Doing it first means no story phase ever imports the old path — which is the only way the move
   stays a move rather than becoming a copy.

**One consequence to know up front**: `/blog/<slug>` ships **uncached** at the end of User Story 1.
`generateStaticParams` and the invalidation hook land in User Story 3, because "a publish is visible
without a deploy" is that story's acceptance criterion and is not demonstrable before an editor can
publish. US1 is correct and complete as a reading experience; it is simply rendering on demand every
time. The US1 checkpoint says so rather than pretending otherwise.

---

## Phase 1: Setup

**Purpose**: The directory skeleton, the lint allowance the whole feature depends on, and every test
file created up front so no later task has to invent one.

- [X] T001 Create `src/lib/blog/` and `src/components/blog/`, each with a placeholder module docstring matching the header style of `src/lib/catalog/queries.ts`
- [X] T002 [P] Widen the document-reader allowlist in `eslint-rules/catalog-boundary.mjs` with `/^src\/lib\/blog\//`, extending the existing docblock to say why it is a modelling tier — per [contracts/blog-loader.md](./contracts/blog-loader.md) §1, the rule fires on correct code without this
- [X] T003 [P] Create the empty suites every later task writes into: `tests/unit/blog-mappers.test.ts`, `tests/integration/blog-articles.test.ts`, `tests/e2e/blog.spec.ts`, `tests/e2e/blog-admin.spec.ts`
- [X] T004 [P] Add `/blog` and one article address to `ROUTES` in `tests/warm-routes.ts`, with a comment naming the two specs that open them — a cold compile inside an assertion is the flake this file exists to prevent
- [X] T005 [P] Export the drawn photographs from Figma section `312:7335` into `media/`, one per seeded article plus the article hero. **Blocks T063 (the seed) and nothing else** — every other task works against empty media slots

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The content model, the data tier, and the three component moves that must happen before
any story phase imports anything.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### The two Constitution II promotions and one decoupling

- [X] T006 Move `src/components/commerce/load-more/` to `src/components/ui/load-more/` unchanged (`load-more.tsx`, `index.ts`, `load-more.stories.tsx`), add it to the barrel in `src/components/ui/index.ts`, and update the import in `src/app/(frontend)/(shop)/listing.tsx` — per [research.md](./research.md) R8, the second consumer is the trigger to promote
- [X] T007 Move `src/components/commerce/listing-empty/` to `src/components/ui/empty-state/`, renaming `ListingEmpty` to `EmptyState` and collapsing `clearHref`/`clearLabel` into one optional `action?: { href: string; label: string }`; update `src/app/(frontend)/(shop)/listing.tsx` and the stories, and record in the docstring that the action is optional so a "nothing published yet" state can render with nothing to clear
- [X] T008 [P] Change `PageHeaderBlockProps` in `src/components/blocks/page-header/page-header.tsx` from `Extract<StoryBlock, { type: 'page-header' }>` to a plain `{ eyebrow?: string; heading: string; headingLevel: 1 | 2 | 3 }`, and pass the same three fields from `src/components/blocks/block-renderer.tsx` — per [research.md](./research.md) R15, without this the blog route imports `src/lib/story/types`

### The collections and the global

- [X] T009 [P] Create `src/collections/article-categories.ts` — `title`, `slugField({ from: 'title' })`, `order`; labels, admin group `Content`, `defaultColumns` and default sort per [data-model.md](./data-model.md); access `read: () => true` with `isAdmin` on write, stated explicitly rather than inherited
- [X] T010 Create `src/collections/articles.ts` with `title`, `slug`, `standfirst`, `category` (relationship to `article-categories`, required, `hasMany: false`), `publishedOn`, `hero` via `mediaSlot()`, and the `seoTab()`; tabs layout, `plural: 'Blog'`, `versions: { drafts: true }`, `read: adminOrPublishedStatus`, `isAdmin` on write
- [X] T011 Add the `chapters` array to `src/collections/articles.ts` — `heading`, `tocLabel`, `lede`, `body`, `pullQuote` — with the row label bound to `heading`, and every field's admin description written as [data-model.md](./data-model.md) specifies, including the `lede` description that draws the boundary against bold body text
- [X] T012 Restrict the `chapters.body` lexical feature set to remove headings (paragraphs, bold, italic, links, ordered and unordered lists only), with a comment naming the reason: the outline is a contract, and a heading inside a body is a section the contents rail cannot see
- [X] T013 [P] Create `src/globals/blog-page.ts` — `eyebrow`, `heading`, `emptyTitle`, `emptyDescription`, `seoField()` — with the drawn copy as `defaultValue` on each, `versions: { drafts: true }`, `read: () => true`, `update: isAdmin`, and a docstring recording that a default is content an editor can change rather than a hardcoded string
- [X] T014 Register `Articles`, `ArticleCategories` and `BlogPage` in `src/payload.config.ts`
- [X] T015 Run `pnpm generate:types` and commit `src/payload-types.ts` in the same change as the schema — a pull request with stale generated types fails review
- [X] T016 Generate the migration with `pnpm payload migrate:create`, review the generated SQL for the three new tables plus `_articles_v`, and verify the `down` path drops them cleanly

### The data tier

- [X] T017 Create `src/lib/blog/types.ts` — `ArticleCard`, `BlogCategory`, `BlogIndexView`, `Chapter`, `ArticleView` — derived from `@/payload-types` rather than restated beside it, with `category` optional on both card and article because a category can be deleted out from under a published article
- [X] T018 [P] Create `src/lib/blog/blog-url.ts` — `BLOG_ROOT`, `BLOG_PAGE_SIZE = 7`, `blogHref({ category?, page? })`, `articleHref(slug)` — implementing all six rules in [contracts/blog-url.md](./contracts/blog-url.md), including page one and LATEST both being the absence of a parameter
- [X] T019 Create `src/lib/blog/mappers.ts` with the anchor derivation: heading slugified by the same rules as `src/fields/slug.ts`, deduplicated per article with `-2`, `-3` suffixes in document order
- [X] T020 Add the contents derivation to `src/lib/blog/mappers.ts` — `tocLabel ?? heading`, in order, empty below two chapters
- [X] T021 Add the mosaic emphasis derivation to `src/lib/blog/mappers.ts` — `{ tabletLead: i % 5 === 0, desktopWide: i % 7 === 0 || i % 7 === 6 }` — with the R4 table reproduced in the comment so the numbers are traceable to the drawing
- [X] T022 Add date formatting and lexical serialisation to `src/lib/blog/mappers.ts` — one ISO value plus one display string from `Intl.DateTimeFormat('en-US', { month: 'long', day: '2-digit', year: 'numeric' })`, and `convertLexicalToHTML` for each chapter body, exactly as `src/lib/story/mappers.ts` does for a question's answer
- [X] T023 Create `src/lib/blog/queries.ts` with `getBlogCategories()` and `getArticleSlugs()`, both `cache()`-wrapped, both reading under default access so drafts are invisible without a filter
- [X] T024 Add `getArticle(slug)` to `src/lib/blog/queries.ts` — returns `null` for missing or unpublished, resolves the hero and chapters at a stated `depth`, never throws for a slug that does not exist
- [X] T025 Add `getBlogIndex({ category?, page })` to `src/lib/blog/queries.ts` — inclusive-from-one paging at `BLOG_PAGE_SIZE`, `total` counted after narrowing, `null` only when the database is unreachable (`isDatabaseUnreachable` from `src/lib/catalog/prerender.ts`), and a coherent result for a page beyond the end

**Checkpoint**: `pnpm typecheck`, `pnpm lint` and `pnpm test` pass. The model exists and can be
edited in the admin; nothing renders yet.

---

## Phase 3: User Story 1 — A visitor reads an article (Priority: P1) 🎯 MVP

**Goal**: A published article is reachable at its own address and reads properly at 390, 768 and
1920, with a contents list that tracks position.

**Independent test**: Publish one article in the admin, open its address directly, and read it at all
three widths without touching the index.

- [X] T026 [P] [US1] Create `src/components/blog/article-header/` — eyebrow, `h1` and standfirst, drawn at every width including desktop (design inconsistency 1: the desktop frame omits the eyebrow that tablet and mobile both draw)
- [X] T027 [P] [US1] Create `src/components/blog/article-body/` rendering each chapter in the fixed order from [contracts/article-content.md](./contracts/article-content.md) §4 — `h2` with `id` and `tabIndex={-1}`, optional lede, `RichText` body, optional pull quote
- [X] T028 [US1] Render the pull quote in `src/components/blog/article-body/` as a `<blockquote>` with the drawn left rule, using tokens for the rule and the indent — not a styled paragraph, so it is announced as a quotation
- [X] T029 [US1] Create `src/components/blog/table-of-contents/table-of-contents.tsx` as a **server** component — the rail at ≥768 and the card at <390, drawn only from two chapters upward, with at most five entries plus a **computed** `+ N more chapters below` that disappears when N is zero (design inconsistency 3)
- [X] T030 [US1] Create `src/components/blog/table-of-contents/toc-current.tsx` as a `'use client'` leaf that does one thing: observe the chapter headings with `IntersectionObserver` and set `aria-current` on the matching link. With scripting off every entry still navigates and nothing is marked current
- [X] T031 [US1] Make the rail stay visible as the article scrolls (design inconsistency 5 — it is not sticky in the draw), and add the `scroll-margin-top` that clears the sticky header plus smooth scrolling confined to `@media (prefers-reduced-motion: no-preference)`
- [X] T032 [US1] Create `src/app/(frontend)/blog/[slug]/page.tsx` — reads `getArticle`, returns a fragment (never a second `<main>`; the frontend layout already provides the landmark), and renders header, hero via the shared `Media` component, contents and body
- [X] T033 [US1] Call `notFound()` from `src/app/(frontend)/blog/[slug]/page.tsx` when `getArticle` returns `null`, so a draft and a nonexistent slug are indistinguishable from outside
- [X] T034 [P] [US1] Unit-test the anchor and contents derivations in `tests/unit/blog-mappers.test.ts` — two chapters headed *Summary* yield `summary` and `summary-2`; `tocLabel` wins over `heading`; one chapter yields an empty contents list; zero chapters render nothing
- [X] T035 [P] [US1] Write the reading path in `tests/e2e/blog.spec.ts` — one `h1`, chapters in order, a contents entry jumps to its chapter and moves focus into it, and the rail marks the chapter on screen
- [X] T036 [P] [US1] Add an article address to `ROUTES` in `tests/a11y/routes.spec.ts` with a comment explaining what is new here: a document whose heading outline is a property of editor-entered content
- [X] T037 [US1] Verify `src/app/(frontend)/blog/[slug]/page.tsx` at 390, 768 and 1920 against frames `312:8140`, `418:8580` and `418:8881` — the contents rail becomes a card on the phone, and nothing scrolls horizontally

**Checkpoint**: An article is readable and shareable. It renders on demand every time —
`generateStaticParams` and invalidation arrive in US3, where a publish is what makes them
demonstrable.

---

## Phase 4: User Story 2 — A visitor browses the blog (Priority: P2)

**Goal**: `/blog` stops being a 404. The mosaic, the card, the empty state and one control that
adds the next seven.

**Independent test**: With several published articles seeded, open `/blog` and reach any of them in
one click, at all three widths.

- [X] T038 [P] [US2] Create `src/components/blog/article-card/` — one component with `tabletLead` and `desktopWide` flags applying `md:col-span-2` / `xl:col-span-2` and the matching image ratios, **not** four components (FR-051); the whole card is one link, so assistive technology sees one destination and not three
- [X] T039 [US2] Draw the category badge over the photograph, inset 16px from the top-left, with a scrim or token pairing that holds contrast over both a light and a dark image — `pnpm check:contrast` is the gate, and this is the new risk it exists for
- [X] T040 [US2] Render the date as `<time datetime>` using the ISO value from the mapper, with the display string beside it — one format everywhere (FR-011)
- [X] T041 [US2] Create `src/components/blog/article-mosaic/` — a three-column track at xl, two at md, one below, `gap` from the spacing scale, `grid-auto-flow` left at its default and a comment recording why `dense` is refused: the index is chronological and dense reorders it
- [X] T042 [US2] Create `src/app/(frontend)/blog/page.tsx` with `export const dynamic = 'force-dynamic'`, and a docstring recording both reasons — it reads `searchParams`, and a route with no dynamic segment would otherwise be prerendered during a container build that has no database
- [X] T043 [US2] Render the index header in `src/app/(frontend)/blog/page.tsx` by reusing `PageHeaderBlock` with the `blog-page` global's fields at `headingLevel={1}` — the reuse T008 made possible
- [X] T044 [US2] Wire `LoadMore` from `src/components/ui/load-more/` into `src/app/(frontend)/blog/page.tsx` with `noun="articles"`, `shown`/`total` from the view model and `moreHref` from `blogHref`
- [X] T045 [US2] Render the empty index with `EmptyState` using the global's `emptyTitle` and `emptyDescription`, with no load control drawn (FR-012)
- [X] T046 [US2] Confirm every photograph in `src/components/blog/article-card/` below the fold is lazily loaded and carries explicit dimensions through the framework image pipeline (FR-049, Constitution V)
- [X] T047 [P] [US2] Unit-test the emphasis derivation in `tests/unit/blog-mappers.test.ts` — cards 0 and 6 are wide at xl, cards 0 and 5 lead at md, and the date formatter turns `2026-08-08` into `August 08, 2026` while leaving the ISO value untouched
- [X] T048 [P] [US2] Extend `tests/e2e/blog.spec.ts` — the mosaic rhythm at 1920, one click from a card to its article, `?page=2` showing the first fourteen rather than the second seven, and the scroll position surviving the control
- [X] T049 [P] [US2] Add `/blog` to `ROUTES` in `tests/a11y/routes.spec.ts`
- [X] T050 [US2] Verify `src/components/blog/article-mosaic/` at 0, 1, 7, 8 and 40 published articles — no empty rows, no stretched cards, no load control where nothing is left to load (SC-011)

**Checkpoint**: The footer's *Our Blog* link resolves. Every drawn article is reachable in one click.

---

## Phase 5: User Story 3 — An editor writes, arranges and publishes (Priority: P3)

**Goal**: The admin is usable, drafts are unreachable, and a publish is live without a deploy.

**Independent test**: Create an article from nothing, save it unpublished, confirm it is absent from
the index and unreachable at its address, then publish it and confirm both change.

- [X] T051 [US3] Add `revalidateArticleOnChange` and `revalidateArticleOnDelete` to `src/lib/revalidate.ts`, marking only `/blog/<slug>` plus the address a renamed article has just left, with a docstring recording why the shared `revalidateOnChange` is **not** reused: `invalidate()` walks every product slug, so an article typo would evict the entire catalogue
- [X] T052 [US3] Extend `invalidate()` in `src/lib/revalidate.ts` with an articles pass, so a photograph re-uploaded in `media` reaches both cached route families, and update the file's opening docblock — it currently enumerates which routes are absent and why, and that list is now wrong
- [X] T053 [US3] Attach the two hooks to `src/collections/articles.ts` as `afterChange` and `afterDelete`
- [X] T054 [US3] Add `generateStaticParams` to `src/app/(frontend)/blog/[slug]/page.tsx` wrapped in `prerenderable('article pages', getArticleSlugs)`, leaving `dynamicParams` at its default so an article published after the build still renders on demand
- [X] T055 [US3] Review every admin description and label in `src/collections/articles.ts`, `src/collections/article-categories.ts` and `src/globals/blog-page.ts` against what an editor actually needs to decide — Constitution IV's rule that a field no editor can interpret will be filled incorrectly — and fix the ones that only make sense to whoever wrote the schema
- [X] T056 [P] [US3] Integration-test access and drafts in `tests/integration/blog-articles.test.ts` — an unpublished article is absent from `find()` **and** from a direct `findByID` under default access, which is the API path a route check cannot cover
- [X] T057 [P] [US3] Integration-test the field-level guarantees in `tests/integration/blog-articles.test.ts` — a duplicate slug is refused; a missing title, standfirst, category or publication date is refused with the field named; the slug derives on create and does not move on rename
- [X] T058 [P] [US3] Integration-test category deletion in `tests/integration/blog-articles.test.ts` — delete a referenced category, re-read the article, assert it is still published and that the mapper yields no badge (FR-041, research R14)
- [X] T059 [US3] Write `tests/e2e/blog-admin.spec.ts` covering the editorial lifecycle: create, save as draft, confirm absent and 404, add and reorder chapters, publish, confirm live, change a string and confirm the change reaches a **cached** article page — the check that proves T051 is wired
- [X] T060 [US3] Extend `scripts/seed-catalog.ts` with the four article categories, the `blog-page` copy and seven articles using the photographs from T005, passing `skipRevalidation` as context the way every other seed write does
- [X] T061 [US3] Verify the whole of [quickstart.md](./quickstart.md) §4 by hand in `/admin` — Constitution *Editorial verification* makes this a merge gate, not a nicety

**Checkpoint**: An editor owns the blog end to end. Article pages are cached and invalidate on
publish.

---

## Phase 6: User Story 4 — A visitor narrows to one subject (Priority: P4)

**Goal**: The tab strip, and a narrowing that lives in the address.

**Independent test**: With articles in at least two categories, choose each tab and confirm the
mosaic and the address both change, and that reloading the address reproduces the view.

- [X] T062 [P] [US4] Create `src/components/blog/category-tabs/` as a `<nav>` of links with `aria-current="page"` on the current tab — **not** a `tablist`, per [research.md](./research.md) R5, because these navigate and ARIA's tab pattern promises keyboard semantics a set of links does not have
- [X] T063 [US4] In `src/components/blog/category-tabs/`, draw the 2px underline beneath the current tab at **every** breakpoint, against the desktop frame which distinguishes it by colour alone (design inconsistency 4 — colour alone fails WCAG 1.4.1)
- [X] T064 [US4] Make the strip in `src/components/blog/category-tabs/` scroll horizontally within itself at narrow widths, reachable by keyboard, while the page itself never scrolls sideways
- [X] T065 [US4] Parse `category` and `page` from `searchParams` in `src/app/(frontend)/blog/page.tsx`, calling `notFound()` for a category slug that does not exist and falling back to page 1 for a malformed `page` — the split [contracts/blog-url.md](./contracts/blog-url.md) §3.5 draws between the route and the URL writer
- [X] T066 [US4] Confirm the narrowing survives *load more* — `blogHref` carries both parameters in the fixed order, so two callers asking for one view produce identical strings (FR-017)
- [X] T067 [US4] Render the empty **category** case with `EmptyState` plus an action pointing at `/blog`, distinct from the empty **blog** case which has nothing to clear — the reason T007 made the action optional
- [X] T068 [P] [US4] Extend `tests/e2e/blog.spec.ts` — each tab narrows the grid and the address, a reload reproduces it, an unknown category 404s, and an empty category renders the message with its way out
- [X] T069 [P] [US4] Add a narrowed `/blog?category=…` address to `ROUTES` in `tests/a11y/routes.spec.ts`

**Checkpoint**: Every drawn control on the index works, with and without scripting.

---

## Phase 7: User Story 5 — The blog is found and shared correctly (Priority: P5)

**Goal**: Editor-controlled metadata, canonical addresses, structured data, and the site's first
sitemap.

**Independent test**: Inspect the metadata emitted for the index and for an article, with and
without editor overrides filled in.

- [X] T070 [US5] Add `generateMetadata` to `src/app/(frontend)/blog/[slug]/page.tsx` — the editor's overrides where present, the article's own title, standfirst and hero where not, plus `alternates.canonical` and Open Graph, following the shape `src/app/(frontend)/about/page.tsx` established
- [X] T071 [US5] Add `generateMetadata` to `src/app/(frontend)/blog/page.tsx` from the `blog-page` global, with `alternates.canonical` fixed to the **unnarrowed, unpaged** `/blog` so paged and narrowed views do not compete with it in an index
- [X] T072 [US5] Emit `schema.org/Article` JSON-LD from `src/app/(frontend)/blog/[slug]/page.tsx` — headline, description, image, `datePublished`, `dateModified`, `mainEntityOfPage`, publisher — using the inline `<script type="application/ld+json">` pattern from `src/app/(frontend)/products/[slug]/page.tsx`
- [X] T073 [US5] Emit `BreadcrumbList` JSON-LD for Home → Our Blog → the article, and record in the route's docstring that **no breadcrumb is drawn** in any of the three article frames — the open point in [research.md](./research.md) R13, shipped as data only and flagged for the designer rather than resolved by adding an undrawn element
- [X] T074 [US5] Create `src/app/sitemap.ts` returning `MetadataRoute.Sitemap` for the home page, the listings, product pages, `/about`, `/blog` and every published article, with absolute URLs built from `NEXT_PUBLIC_SERVER_URL`
- [X] T075 [US5] Set `export const dynamic = 'force-dynamic'` in `src/app/sitemap.ts` with a docstring citing the Next 16 file convention — a sitemap route is **cached by default**, so a container build with no database would bake an empty one and serve it forever
- [X] T076 [P] [US5] Unit-test the metadata fallbacks in `tests/unit/blog-mappers.test.ts` — an article with no overrides yields its own title, standfirst and hero; an article with overrides yields those instead
- [X] T077 [P] [US5] Extend `tests/e2e/blog.spec.ts` — `/sitemap.xml` lists the index and every published article with absolute URLs, and lists no drafts (SC-009, FR-044)

**Checkpoint**: Every route in the feature is indexable and shares correctly.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T078 [P] Write `src/components/blog/blog.stories.tsx` covering the card in both emphasis states, the mosaic at three counts, the tab strip and the contents rail — the same treatment `blocks.stories.tsx` gave spec 006's renderers
- [X] T079 [P] Confirm the promoted `LoadMore` and `EmptyState` stories moved with them and that `pnpm check:stories` passes
- [X] T080 Run the full static gate set — `pnpm typecheck`, `pnpm lint`, `pnpm check:naming`, `pnpm check:tokens`, `pnpm check:styles`, `pnpm check:contrast`
- [X] T081 Run `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm test:a11y` and `pnpm test:stories` clean
- [X] T082 Measure the JavaScript budget against `pnpm build && pnpm start` — gzipped, before load, on `/blog` and on an article — and record both figures in the pull request. The only client code this feature adds is the contents-rail observer, so a large number means something became a client component by accident
- [X] T083 Verify the no-scripting path by hand on `/blog` and `/blog/<slug>`: every tab navigates, *load more* adds articles, every contents entry jumps. Only the "you are reading this chapter" marker disappears
- [X] T084 Verify the reduced-motion path by hand on `/blog/<slug>`: a contents entry in `src/components/blog/table-of-contents/` jumps instantly rather than gliding
- [X] T085 Verify the migration's `down` against a copy of the database **with content in it**, not an empty one — Constitution *Migrations* requires a tested rollback verified against a production-sized content set
- [X] T086 Walk [quickstart.md](./quickstart.md) end to end on a clean checkout, and correct it wherever the instructions no longer match what was built

---

## Dependencies & Execution Order

### Phase dependencies

```
Phase 1 (Setup)
   └─> Phase 2 (Foundational) ─────── blocks everything
          ├─> Phase 3  US1  P1   🎯 MVP
          │      └─> Phase 5  US3  P3   (needs an article route to cache and invalidate)
          ├─> Phase 4  US2  P2         (needs the data tier; independent of US1)
          │      └─> Phase 6  US4  P4   (needs the index to narrow)
          └─> Phase 7  US5  P5         (needs both routes to describe)
                 └─> Phase 8 (Polish)
```

### Story independence, honestly stated

- **US1 and US2 are genuinely independent** once Phase 2 lands. They share the data tier and no
  component; either can be built first, and either alone is demonstrable.
- **US3 depends on US1**, not on US2. Its caching tasks act on the article route, and its editorial
  e2e needs an article page to observe a publish on.
- **US4 depends on US2.** There is nothing to narrow before the mosaic exists.
- **US5 depends on both routes existing**, which is why it is last rather than because it is
  optional — Constitution V makes it a requirement.
- **T005 (the photographs) blocks only T060 (the seed).** Every other task works against empty media
  slots, so a delay in exporting assets never blocks code.

### Parallel opportunities

- Phase 1: T002 – T005 all in parallel after T001.
- Phase 2: T008 in parallel with T006/T007; T009 and T013 in parallel; T018 in parallel with the
  mapper chain T019 – T022.
- Phase 3: T026 and T027 in parallel; the three test tasks T034 – T036 in parallel.
- Phase 4: T038 in parallel with T042; T047 – T049 in parallel.
- Phase 5: T056 – T058 in parallel once T053 lands.
- Phase 8: T078 and T079 in parallel.

**T006 and T007 are deliberately not parallel with each other**: both edit
`src/app/(frontend)/(shop)/listing.tsx`.

---

## Parallel Example: Phase 2 collections

```
T009  src/collections/article-categories.ts   ─┐
T013  src/globals/blog-page.ts                ─┴─ different files, no shared imports
```

`T010` – `T012` are sequential: all three edit `src/collections/articles.ts`.

## Parallel Example: Phase 3 components

```
T026  src/components/blog/article-header/      ─┐
T027  src/components/blog/article-body/        ─┴─ different directories
```

`T028` follows `T027` (same directory), and `T029` – `T031` follow the contents-list contract in
order.

---

## Implementation Strategy

### MVP: Phases 1 → 2 → 3

An article at its own address, readable at three widths, with a working contents list. Uncached, and
not yet linked from anywhere — but shareable, indexable and complete as a reading experience.

### Incremental delivery

1. **Phases 1–3** — the article page. Demonstrable to the requester as "here is a piece of writing".
2. **Phase 4** — `/blog`. The footer link resolves; the feature becomes discoverable.
3. **Phase 5** — the editor owns it. This is the point at which the developer stops being in the
   loop, and it is the milestone Constitution I actually cares about.
4. **Phase 6** — narrowing. The first phase that could be cut without the feature reading as broken.
5. **Phase 7** — findability. Required by Constitution V, invisible until the first share.
6. **Phase 8** — the gates.

### Parallel team strategy

After Phase 2, one person can take US1 → US3 (the article and its lifecycle) while another takes
US2 → US4 (the index and its controls). They meet at Phase 7, which needs both routes. The two
tracks share `src/lib/blog/` and touch no component in common.

---

## Notes

- **The two promotions are the riskiest tasks in the feature**, not the most complex ones. T006 and
  T007 move files another spec's route imports; run `pnpm typecheck` immediately after each rather
  than at the end of the phase.
- **`pnpm generate:types` is not optional after T014.** Everything in the data tier is derived from
  `payload-types.ts`, so Phase 2's second half does not typecheck until it has been run.
- **Nothing in this feature touches money, inventory or customer data.** Constitution VI is N/A, and
  no task below needs the two-reviewer rule.
