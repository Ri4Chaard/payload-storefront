---

description: "Task list for Policy Pages and Cookie Consent"
---

# Tasks: Policy Pages and Cookie Consent

**Input**: Design documents from `/specs/009-policy-pages-cookie-consent/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Included. Not optional here — Constitution "Development Workflow & Quality Gates" makes
unit, integration, accessibility, and budget checks blocking CI gates with no manual override.

**Organization**: Grouped by user story so each can be implemented, tested, and demonstrated
independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: Which user story the task serves (US1–US6). Setup, Foundational and Polish carry none
- Every task names the exact file it touches

## Path Conventions

Next.js App Router frontend and Payload CMS in one project. Source under `src/`, tests under
`tests/`, one-off scripts under `scripts/`. All paths kebab-case — `pnpm check:naming` is a blocking
gate and macOS will not catch a violation locally.

---

## Five things to know before starting

1. **Policies live under `/legal/`, and no existing route is touched.** The site's one root-level
   dynamic segment belongs to `(shop)/[category]`, and Next permits exactly one per path position.
   The prefix is what avoids re-routing the catalogue. `src/app/(frontend)/(shop)/**` must not appear
   in any diff for this feature — if it does, something has gone wrong. See
   `contracts/policy-route.md`.
2. **Nothing reads the consent cookie on the server.** `cookies()` is a request-time API; calling it
   in the root layout opts every route on the site into dynamic rendering, which this codebase has
   already refused once for the cart badge. `src/lib/consent/**` must never import `next/headers` —
   T030 adds a lint rule so it cannot.
3. **The banner's copy is hardcoded, deliberately.** FR-025, recorded as a Constitution I exception
   in the plan's Complexity Tracking. FR-025a is the constraint that makes it safe: the fixed copy
   must not enumerate categories or state what the site tracks, because the chooser and the Cookie
   Policy remain editable and would silently contradict it.
4. **No script gating, no provider integration, no analytics.** Cut at the owner's direction. FR-048
   forbids any admin field that accepts a script or a measurement ID. If a task tempts you toward
   one, the task is wrong.
5. **The build has no database.** The production image runs `next build` before migrations, so every
   Payload read added here must tolerate an unreachable database via `isDatabaseUnreachable` —
   spec 005 learned this when a root-layout read broke the container build on `/forgot-password`.

> **Note on phase numbering**: `plan.md` lists an engineering build order. The phases below are
> organised by user story, as this project's task format requires. They cover the same work; where
> they differ, this file governs. In particular the chooser sits in US2, not in a phase of its own —
> spec US2 scenarios 4 and 5 both require it, so US2 is not independently testable without it.

---

## Phase 1: Setup

**Purpose**: Establish the measurement baseline and the file skeleton before anything changes.

- [X] T001 Record the pre-change gzipped initial JS for `/`, `/all-jewelry`, `/products/<slug>` and `/faq` against a production server (`pnpm build && pnpm start`), and write the four numbers into `specs/009-policy-pages-cookie-consent/quickstart.md` §9. **This must happen before any client code lands** — this feature adds a component to the root layout, so it is charged to every route, and SC-011 has nothing to compare against once the change is in.
- [X] T002 [P] Create the empty directory skeleton — `src/lib/policies/`, `src/lib/consent/`, `src/components/ui/cookie-banner/`, `src/components/ui/cookie-preferences/`, `src/app/(frontend)/legal/[slug]/` — and confirm `pnpm check:naming` passes on it.

**Checkpoint**: Baseline captured, nothing behaves differently yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The content model and the data tier every story reads through.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

**Why both schema pieces land together**: `policies` serves US1/US3/US6 and `cookie-settings` serves
US2/US4/US5, so splitting them by story is tempting. They are together because both register in the
same `src/payload.config.ts` (a `[P]` conflict otherwise) and because one migration reviewed once is
better than two migrations reviewed twice.

- [X] T003 Create the `policies` collection in `src/collections/policies.ts` per `data-model.md` §1 — `slugField({ from: 'title' })`, `title`, `subtitle`, `effectiveDate`, `body` (rich text), `footerPlacement`, `footerOrder`, `seoField()`; `versions: { drafts: true }`; access `read: adminOrPublishedStatus`, `create`/`update`/`delete`: `isAdmin`; **no hooks** — the route is `force-dynamic`, so there is nothing cached to invalidate and the shared `invalidate()` would evict the whole catalogue over a typo.
- [X] T004 [P] Configure the `body` field's editor in `src/collections/policies.ts` to use the **default** lexical feature set — explicitly keeping headings. Record in a comment why this deliberately differs from `src/collections/articles.ts`, which strips headings so its contents rail cannot miss a section: policies have no rail and their whole structure is headed sections (research R8).
- [X] T005 [P] Implement the slug-uniqueness `beforeValidate` hook in `src/collections/policy-hooks.ts` — reject a slug held by another policy with a message naming that policy, not the database index the `unique` constraint would report. Note in a comment that the category and reserved-route checks an earlier design needed are unnecessary under the `/legal/` prefix (research R2).
- [X] T006 [P] Create the `cookie-settings` global in `src/globals/cookie-settings.ts` per `data-model.md` §2 — `enabled`, `consentVersion`, `policy` relationship to `policies`, and the `categories` array (`key`, `name`, `purpose`, `necessary`); admin group *Cookies*; `versions: { drafts: true }`; `read: () => true`, `update: isAdmin`. **No copy fields** (FR-025) and **no script or measurement-ID field** (FR-048) — say so in the file's docstring so neither is added later by someone who assumes it was an oversight.
- [X] T007 Add validation to `src/globals/cookie-settings.ts` requiring at least one category and at least one with `necessary: true`, and enforcing `key` as unique lowercase kebab-case within the array — a configuration with no necessary category would have the chooser claim the site's own session cookie is optional.
- [X] T008 Register `Policies` and `CookieSettings` in `src/payload.config.ts` (collections array and globals array), with imports in the existing alphabetical grouping.
- [X] T009 Generate the Payload migration for both tables into `src/migrations/`, run `pnpm generate:types`, and commit the regenerated `src/payload-types.ts` in the same change — a pull request with stale generated types fails review.
- [X] T010 [P] Define the policy view-model types in `src/lib/policies/types.ts` — the shape routes and the footer consume, deliberately not the generated document type.
- [X] T011 [P] Define the consent types in `src/lib/consent/types.ts` per `contracts/consent-record.md` §2 — the record, the three read states (`decided`, `ask`, `ask-with-previous`), and the category shape the banner receives as props.
- [X] T012 Implement `src/lib/policies/mappers.ts` — lexical to HTML via `convertLexicalToHTML` with `disableContainer: true`, returning `undefined` for an empty document so the route can close the layout over it, following `src/lib/blog/mappers.ts`.
- [X] T013 Implement `src/lib/policies/queries.ts` — `getPolicyBySlug`, `getFooterPolicies`, `getPolicySlugs`, `getCookieSettings`; each `cache()`-wrapped for per-request deduplication, each reading through the Local API with default access so a draft is never returned, and **each tolerant of an unreachable database** via `isDatabaseUnreachable` from `src/lib/catalog/prerender.ts`.
- [X] T014 Write `scripts/seed-policies.ts` — idempotent by slug, creating the four rows in `data-model.md` §1.2 and the single `necessary` category row, passing `skipRevalidation` as request context because seeding runs under `payload run` where `revalidatePath` throws. The seeded Cookie Policy body describes the three cookies this site actually sets and states that no analytics or advertising cookies are used; the Figma placeholder copy about Google services **must not** be seeded (FR-016).
- [X] T015 Write the integration test in `tests/integration/policies.test.ts` — a draft policy is unreachable through the API rather than merely hidden; a duplicate slug is rejected with a message naming the holder; `getFooterPolicies` returns only published rows in `footerOrder`; the `cookie-settings` category validation rejects an empty array and an all-optional set.

**Checkpoint**: Schema, data tier and seed exist and are tested. Nothing is visible to a visitor yet.

---

## Phase 3: User Story 1 - A visitor reads what the shop promises (Priority: P1) 🎯 MVP

**Goal**: The four policy pages render at `/legal/*` and every footer link on the site resolves.

**Independent Test**: Click all four footer destinations on a fresh deploy — each renders a titled,
readable page with the site chrome. No banner needed, no admin work beyond the seed.

### Tests for User Story 1

- [X] T016 [P] [US1] Add the four policy addresses to the route accessibility sweep in `tests/a11y/routes.spec.ts` — zero violations at desktop and mobile widths.
- [X] T017 [P] [US1] Write `tests/e2e/policies.spec.ts` — each footer link resolves to the expected `/legal/*` address with the right heading; a published policy with an empty body renders its title and a placeholder rather than a 404 (FR-006); an unpublished policy 404s **and** carries no footer link (FR-015c); the page is one readable column at 390px with no horizontal scroll.

### Implementation for User Story 1

- [X] T018 [US1] Implement `src/app/(frontend)/legal/[slug]/page.tsx` per `contracts/policy-route.md` — `export const dynamic = 'force-dynamic'`, no `generateStaticParams`, resolve by slug or `notFound()`. Compose `PageHeaderBlock` (`headingLevel={1}`, `heading={title}`, `body={subtitle}`), then `RichText` inside a `Container`. **Compose kit parts directly in the route**, as `src/app/(frontend)/faq/page.tsx` does — no policy-page component; a single-consumer wrapper with no logic is what Constitution II argues against. Metadata is a bare title at this stage; US6 completes it.
- [X] T019 [US1] Add the empty-body branch to `src/app/(frontend)/legal/[slug]/page.tsx` — the header, then `EmptyState` with an honest short message. Never `notFound()` for a published policy (FR-006).
- [X] T020 [US1] Extend `FooterProps` in `src/components/layout/footer/footer.tsx` to accept policy links for the legal row and for Customer Care, and **delete `DEFAULT_LEGAL`** along with the hardcoded *Shipping & Returns* entry in `DEFAULT_GROUPS`.
- [X] T021 [US1] Read published policies in `src/app/(frontend)/layout.tsx` via `getFooterPolicies()` — added to the existing `Promise.all` beside `getSocialLinks()` and `getContactDetails()` — and pass them to `<Footer>` split by `footerPlacement`. A Local API read is not a request-time API, so this does not opt routes into dynamic rendering; keep it that way.
- [X] T022 [P] [US1] Update `src/components/layout/footer/footer.stories.tsx` for the new props, including a story with no policies published so the empty legal row is exercised.
- [X] T023 [US1] Run `pnpm payload run scripts/seed-policies.ts` against a local database and verify all four pages render with their seeded content.
- [X] T024 [US1] Verify the catalogue is untouched — `git diff --stat` shows no change under `src/app/(frontend)/(shop)/`, and `/rings`, `/rings?colour=black` and `/not-a-real-page` answer 200, 200, 404 exactly as before.

**Checkpoint**: Every link in the site chrome resolves (SC-001). This is a shippable MVP.

---

## Phase 4: User Story 2 - A visitor decides about cookies, and can change their mind (Priority: P2)

**Goal**: The banner appears, offers the three drawn actions, opens a working chooser, remembers the
decision, and can be reopened from the footer.

**Independent Test**: In a fresh profile, make each of the three choices in turn; confirm the banner
does not return, the decision survives a reload and a new tab, and the footer entry point brings the
chooser back.

### Tests for User Story 2

- [ ] T025 [P] [US2] Write `tests/unit/consent-record.spec.ts` covering `contracts/consent-record.md` §4 in full — absent, undecodable, non-object, wrong-typed, and `a ⊄ o` records all read as *ask*; a lower `v` and a configured key missing from `o` both read as *ask-with-previous*; a key in the record but not configured is ignored without error; `isAllowed` returns `true` for a necessary category under every state.
- [ ] T026 [P] [US2] Write `tests/e2e/consent.spec.ts` — each of the three buttons, persistence across reload and a new tab, the banner still present and unanswered after navigating, the footer re-entry point reopening the chooser with current choices, and a narrower save taking effect immediately.
- [ ] T027 [P] [US2] Add the banner and the chooser to `tests/a11y/ui-kit.spec.ts` — zero violations at all three breakpoints.

### Implementation for User Story 2

- [ ] T028 [US2] Implement `src/lib/consent/record.ts` per `contracts/consent-record.md` §2–§4 — serialise, parse, the read-state decision table, and `isAllowed`. **One implementation of `isAllowed` and no other** — FR-038 requires the decision honoured everywhere, and two copies are two chances to disagree.
- [ ] T029 [US2] Implement `src/lib/consent/cookie.ts` — read and write `aurum-consent` through `document.cookie` with `path=/`, `sameSite=Lax`, `secure` in production, `max-age=15552000`. Every read and write wrapped in `try`/`catch`: a browser blocking cookies must degrade to "not decided", never throw (contract §5).
- [ ] T030 [US2] Add an ESLint `no-restricted-imports` rule scoped to `src/lib/consent/**` banning `next/headers`, with a message pointing at research R3. The architectural decision that keeps the whole site prerenderable should be enforced by the linter, not by memory.
- [ ] T031 [P] [US2] Build `src/components/ui/cookie-banner/cookie-banner.tsx` — client component, `position: fixed` bottom anchor, heading, fixed body copy, and three equal-weight full-width-on-mobile buttons in the drawn order. **The copy is a module constant** (FR-025) and **must not enumerate categories or state what the site tracks** (FR-025a). Announced politely to assistive technology without stealing focus; reachable early in the tab order; no focus trap — the page behind stays usable (FR-023, FR-024).
- [ ] T032 [P] [US2] Write `src/components/ui/cookie-banner/cookie-banner.stories.tsx` — all three breakpoints, plus a reduced-motion story.
- [ ] T033 [US2] Build `src/components/ui/cookie-preferences/cookie-preferences.tsx` — `Modal` at `md` and up, `Drawer` on phones, both already `role="dialog" aria-modal="true"` with focus traps. Each category shows its name and purpose; necessary renders as permanently on **and explained** (FR-029); optional renders as a `Switch`, off by default (FR-030). One explicit save action that says what it will do (FR-031).
- [ ] T034 [P] [US2] Write `src/components/ui/cookie-preferences/cookie-preferences.stories.tsx` — one category only, several categories, and a previously-decided state with choices pre-filled.
- [ ] T035 [US2] Lazily import the chooser into `src/components/ui/cookie-banner/cookie-banner.tsx` so its code is fetched only when *Configure All Cookies* is pressed — the banner is charged to every route and most visitors never open the chooser (research R9, Constitution V).
- [ ] T036 [US2] Export both components from `src/components/ui/index.ts` in the existing alphabetical order.
- [ ] T037 [US2] Read `getCookieSettings()` in `src/app/(frontend)/layout.tsx` (into the same `Promise.all`) and mount the banner, passing `enabled`, `consentVersion`, the categories, and the linked policy's address as props. The banner must render nothing on the server — the server cannot know the decision without `cookies()`.
- [ ] T038 [US2] Handle the banner-disabled and missing-policy cases in `src/components/ui/cookie-banner/cookie-banner.tsx` — `enabled: false` shows no banner and treats nothing optional as consented (FR-026); an unset or unpublished linked policy leaves the banner usable with no dead link (FR-022).
- [ ] T039 [US2] Add the cookie-settings re-entry point to the footer's legal row in `src/components/layout/footer/footer.tsx`, opening the chooser with current choices (FR-032).
- [ ] T040 [US2] Verify no layout shift from `src/components/ui/cookie-banner/cookie-banner.tsx` — the banner overlays rather than displaces and contributes nothing to CLS, measured in DevTools Performance on `/` (FR-021).

**Checkpoint**: US1 and US2 both work independently. The consent mechanism is complete and honest.

---

## Phase 5: User Story 3 - The owner rewrites any policy without a developer (Priority: P3)

**Goal**: Every word of every policy is editable, previewable, publishable and revertible in the admin.

**Independent Test**: Change a sentence in each of the four policies and publish; each live page shows
it on the next view, and an unpublished draft does not.

### Tests for User Story 3

- [ ] T041 [P] [US3] Write `tests/e2e/policies-admin.spec.ts` following `tests/e2e/blog-admin.spec.ts` — edit and save as draft (visitor sees the old text), publish (visitor sees the new text), restore a previous version, and create a fifth policy that appears at its own `/legal/` address and in the footer.

### Implementation for User Story 3

- [ ] T042 [US3] Write the admin labels and descriptions on every field in `src/collections/policies.ts` for the owner rather than for an engineer — in particular, `subtitle` must say it is free text (three pages use it for a date, Shipping & Returns for a sentence) and `slug` must warn that changing it breaks existing links.
- [ ] T043 [US3] Verify in `src/collections/policies.ts` that `effectiveDate` is never written by a hook and never auto-touched on save — FR-008: a typo fix must not move the date a policy claims to be effective from.
- [ ] T044 [US3] Confirm the `body` toolbar configured in `src/collections/policies.ts` offers headings, paragraphs, bullet and numbered lists, bold, italic and links, and that each renders correctly through `RichText` at `/legal/privacy` (FR-003).
- [ ] T045 [US3] Editorial verification of `src/collections/policies.ts` in the Payload admin at `/admin` — actually create a policy from scratch, preview it, and publish it. A content model that renders correctly but is unusable in the admin is a defect regardless of how well it renders.

**Checkpoint**: The owner owns every word on four pages, and can add a fifth.

---

## Phase 6: User Story 4 - The owner controls when the banner asks (Priority: P4)

**Goal**: Advancing the consent version re-asks everyone; the on/off switch works and does not
silently grant consent.

**Independent Test**: Advance the consent version and confirm a visitor who had already decided is
asked again with their previous choices pre-filled. Switch the banner off and confirm it stops
appearing. Neither needs a deploy.

### Tests for User Story 4

- [ ] T046 [P] [US4] Extend `tests/e2e/consent.spec.ts` — a version bump re-asks a decided visitor with previous answers pre-filled; not answering means the old decision does not count for the new version; `enabled: false` shows no banner and grants nothing; turning it back on leaves an existing decision standing rather than re-asking.

### Implementation for User Story 4

- [ ] T047 [US4] Wire `consentVersion` through from the global to the read-state comparison in `src/lib/consent/record.ts`, so a lower stored `v` yields *ask-with-previous* rather than *ask*.
- [ ] T048 [US4] Pre-fill `src/components/ui/cookie-preferences/cookie-preferences.tsx` from the stored `a` when the state is *ask-with-previous*, and start from nothing when it is *ask* — a corrupt record has no trustworthy answers to pre-fill from, a superseded one does (contract §4).
- [ ] T049 [US4] Write the admin descriptions on `enabled` and `consentVersion` in `src/globals/cookie-settings.ts` — spell out that advancing the version re-asks every visitor and should follow a material policy change, not a typo. Add a note to the form that the banner's wording is fixed and where to raise a change to it (US4 scenario 5).

**Checkpoint**: The owner controls when consent is requested, without touching code.

---

## Phase 7: User Story 5 - The chooser and the Cookie Policy tell the same story (Priority: P5)

**Goal**: Categories are editable content, and a new one is never inherited by an old decision.

**Independent Test**: Change a category's name and purpose in the admin; the chooser shows the new
wording immediately, with no deployment.

### Tests for User Story 5

- [ ] T050 [P] [US5] Extend `tests/unit/consent-record.spec.ts` — adding a category to the configured set makes a prior *Agree* read as *ask-with-previous*, and the new key is **not** in the accepted set. This is the FR-027a guard on the owner's "always three buttons" decision, and it is the single most important assertion in this feature.
- [ ] T051 [P] [US5] Extend `tests/e2e/policies-admin.spec.ts` — add an optional category, confirm a decided visitor is re-asked and the new category arrives switched off; remove it and confirm it vanishes from the chooser with stored decisions about it ignored without error.

### Implementation for User Story 5

- [ ] T052 [US5] Render the one-category case in `src/components/ui/cookie-preferences/cookie-preferences.tsx` — the necessary category explained, plus a plain statement that no optional cookies are in use. This is what a visitor sees on day one, not an edge case.
- [ ] T053 [US5] Cross-reference the admin screens in `src/globals/cookie-settings.ts` and `src/collections/policies.ts` — the `cookie-settings` description names the Cookie Policy document as where the policy wording lives, and the Cookie Policy's own admin description points back at the categories (FR-050, research R6).
- [ ] T054 [US5] Audit `src/globals/cookie-settings.ts` and `src/collections/policies.ts` for any field accepting a script, snippet, or measurement ID and confirm there is none (FR-048). If one exists, remove it — the gate is deliberately unbuilt.
- [ ] T055 [US5] Read the Cookie Policy body seeded by `scripts/seed-policies.ts` against the chooser's category list and confirm they describe the same set, with nothing described that is not offered and nothing offered that is not described (SC-012).

**Checkpoint**: What the site says about its cookies and what it asks consent for cannot drift apart.

---

## Phase 8: User Story 6 - The policies are found, shared, and indexed correctly (Priority: P6)

**Goal**: Each policy page carries owner-controlled metadata, a canonical address, social previews,
and a row in the sitemap.

**Independent Test**: Inspect each page for title, description, canonical and social preview, and
confirm all four appear in the site's machine-readable list of addresses.

### Tests for User Story 6

- [ ] T056 [P] [US6] Extend `tests/e2e/policies.spec.ts` — each page emits a title, description, `rel="canonical"` matching the footer's href, and Open Graph tags; an SEO title set in the admin overrides the fallback; an unpublished policy leaves the sitemap.

### Implementation for User Story 6

- [ ] T057 [US6] Complete `generateMetadata` in `src/app/(frontend)/legal/[slug]/page.tsx` per `contracts/policy-route.md` §4 — `seo.title` falling back to `title`, `seo.description` when set, `alternates.canonical` of `/legal/${slug}`, and Open Graph including `seo.image`. Mirror `/faq`'s no-database tolerance: return a bare title rather than throwing.
- [ ] T058 [US6] Add published policy addresses to `src/app/sitemap.ts` — queried via `getPolicySlugs()` inside the existing `try` that already tolerates an unreachable database, placed with the content-derived rows rather than in `STATIC_ROUTES`, since a policy address is not guaranteed to exist.
- [ ] T059 [US6] Confirm no structured data is emitted for policy pages — there is no schema.org type that describes a policy document honestly, unlike `/faq`'s `FAQPage`.

**Checkpoint**: All six stories complete.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T060 Measure gzipped initial JS against a production server for `/`, `/all-jewelry`, `/products/<slug>` and `/legal/privacy`, compare with the T001 baseline, and confirm every route is ≤ 300KB total and ≤ 100KB above the 181KB framework baseline (SC-011, Constitution V).
- [ ] T061 Confirm via the Network panel on `/legal/privacy` that the `src/components/ui/cookie-preferences/` chunk is absent from the initial bundle and arrives only when *Configure All Cookies* is pressed.
- [ ] T062 [P] Verify the privacy claim by measurement, not assertion, following `specs/009-policy-pages-cookie-consent/quickstart.md` §5 — with a fresh profile and each of the three decisions in turn, browse the catalogue, open a product, add to cart, and open a policy page; confirm the only cookies present are the session cookie, `aurum-cart`, `aurum-cart-count` and `aurum-consent`, that local and session storage are empty, and that third-party requests number zero (SC-004, SC-008a).
- [ ] T063 [P] Manual accessibility pass the automated scan cannot cover, following `specs/009-policy-pages-cookie-consent/quickstart.md` §9 — tab order reaches the banner early, the banner does not trap focus while the chooser does and returns focus on close, the banner is announced without stealing focus mid-sentence, and `prefers-reduced-motion` is respected (SC-009).
- [ ] T064 [P] Confirm the banner and `src/lib/consent/cookie.ts` behave with cookies blocked entirely — it reappears on every page, nothing throws, and the visitor is treated as having refused everything optional (contract §5).
- [ ] T065 [P] Run `pnpm lint`, `pnpm typecheck`, `pnpm check:naming`, `pnpm check:tokens`, `pnpm check:styles`, `pnpm check:stories`.
- [ ] T066 [P] Run `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm test:a11y`, `pnpm test:stories`.
- [ ] T067 Verify the migration's rollback against a database holding seeded content, per `data-model.md` §5 — both tables are new, so the down migration drops them and nothing pre-existing is at risk. Confirm that claim rather than trusting it.
- [ ] T068 Walk `specs/009-policy-pages-cookie-consent/quickstart.md` end to end and correct anything that no longer matches the build.
- [ ] T069 Confirm the Complexity Tracking entries in `plan.md` still describe what shipped — the FR-025 hardcoded-copy exception and the three-value `footerPlacement` — and that FR-025a and FR-025b were honoured in the delivered copy.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: no dependencies. T001 must precede any client code.
- **Phase 2 (Foundational)**: depends on Phase 1. **Blocks every user story.**
- **Phase 3 (US1)** – **Phase 8 (US6)**: all depend on Phase 2.
- **Phase 9 (Polish)**: depends on every story that is being shipped.

### Story dependencies

- **US1 (P1)**: independent after Phase 2. The MVP.
- **US2 (P2)**: independent after Phase 2. Touches `layout.tsx` and `footer.tsx`, which US1 also
  touches — sequence them or expect conflicts.
- **US3 (P3)**: independent. Almost entirely admin-side polish on schema that Phase 2 landed.
- **US4 (P4)**: depends on **US2** — the version comparison lives in `record.ts` (T028).
- **US5 (P5)**: depends on **US2** — the chooser (T033) is what it verifies.
- **US6 (P6)**: depends on **US1** — completes `generateMetadata` in the route T018 created.

Genuinely parallel after Phase 2: **US1 and US3**. US2 can run alongside them with the file-conflict
caveat above. US4, US5 and US6 each wait on their predecessor.

### Within a story

Tests first where they can fail meaningfully — T025 in particular should be written against
`contracts/consent-record.md` and failing before T028 exists. Types before mappers, mappers before
queries, queries before routes, components before the layout that mounts them.

### Parallel opportunities

- T004, T005, T006 (three different files, after T003)
- T010, T011 (two pure type modules)
- T016, T017 (two test files)
- T025, T026, T027 (three test files)
- T031/T032 with T033/T034 (banner and chooser are separate components — but T035 joins them)
- T062, T063, T064, T065, T066 (independent verification passes)

---

## Parallel Example: User Story 2 tests

```bash
# All three test files can be written at once, before any implementation exists:
Task: "Unit tests for the consent record in tests/unit/consent-record.spec.ts"
Task: "End-to-end consent journey in tests/e2e/consent.spec.ts"
Task: "Banner and chooser accessibility in tests/a11y/ui-kit.spec.ts"
```

```bash
# Banner and chooser are separate components and can be built in parallel:
Task: "Build the banner in src/components/ui/cookie-banner/cookie-banner.tsx"
Task: "Build the chooser in src/components/ui/cookie-preferences/cookie-preferences.tsx"
```

---

## Implementation Strategy

### MVP (User Story 1)

1. Phase 1 → Phase 2 → Phase 3.
2. **Stop and validate**: every footer link on the site resolves, the catalogue is untouched.
3. Shippable on its own. It closes a hole that has been on every page of this site since spec 001,
   and it does not need the banner to be worth deploying.

### Incremental delivery

1. Setup + Foundational → schema and data tier ready
2. **US1** → the four pages → deploy (MVP)
3. **US3** → the owner owns the words → deploy
4. **US2** → the banner and chooser → deploy
5. **US4**, **US5**, **US6** → re-asking, category consistency, discoverability → deploy

US3 is promoted ahead of US2 in this order on purpose: it is small, it is independent, and it turns
seeded placeholder text into the owner's own words — which is worth more than a banner on a site that
sets no optional cookies.

### Parallel team strategy

After Phase 2: one developer on US1 → US6, another on US2 → US4 → US5, with US3 picked up by whoever
is free. Coordinate on `src/app/(frontend)/layout.tsx` and
`src/components/layout/footer/footer.tsx` — both stories touch both files.

---

## Notes

- `[P]` means a different file with no incomplete dependency.
- `src/app/(frontend)/(shop)/**` must not appear in this feature's diff. If it does, the routing
  decision in `contracts/policy-route.md` has been misread.
- `src/lib/consent/**` must not import `next/headers`. T030 makes that a lint failure rather than a
  code-review catch.
- No admin field may accept a script or a measurement ID (FR-048).
- Commit after each task or logical group. Stop at any checkpoint to validate a story independently.
