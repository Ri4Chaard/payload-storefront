---

description: "Task list for Design System Foundation"
---

# Tasks: Design System Foundation

**Input**: Design documents from `/specs/001-design-system-foundation/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included. The spec requires them — FR-005 (test harness), FR-044 (a11y in CI), FR-045
(performance budgets), and SC-010 (every gate proven by a deliberate violation).

**Organization**: Grouped by user story. Phases 4→5→6 follow the owner's stated build order:
tokens and variables → UI kit component by component → header, footer, page shell.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete work)
- **[Story]**: US1–US4, mapping to the spec's user stories

## Path Conventions

Single Next.js application with Payload mounted inside it. Storefront under `src/app/(frontend)/`,
admin under `src/app/(payload)/`, UI kit under `src/components/ui/`, tokens under `design/tokens/`.

---

## Carried decisions and open items

Read before starting. These are recorded in the design docs and affect specific tasks.

| Item | State | Affects |
|---|---|---|
| `colors.json` is stale vs Figma | `neutral-secondary` uses the Figma value `#343231`; **status colours keep the `colors.json` values** by owner decision | T031, T042 |
| Four colours never verified | `primary-hover`, `primary-transparent`, `background-subtle`, `border-subtle` — no Figma read | T031 |
| Six untokenised font sizes in the footer | **Resolved** — add `eyebrow` (18) and `heading-sans` (22); snap 15→`body-medium`, 13→`body-small`, 12/11→`caption` | T036, T077 |
| Success on dark is 4.15:1 | **Accepted exception** — kept as designed, allowlisted with a reason | T039, T077 |
| `white/20` unsubscribe note is 1.71:1 | **Accepted exception** — kept as designed, allowlisted with a reason | T039, T077 |
| TT Ramillas is a trial licence | Playfair Display ships as placeholder; metric adjustments must be re-tuned on swap | T034, T035 |

---

## Phase 1: Setup

- [X] T001 Initialize the repository: `package.json` with pnpm, `.nvmrc` pinning Node 22, and a `.gitignore` covering `node_modules/`, `.next/`, `.env*`, `build/`, `storybook-static/`
- [X] T002 Configure TypeScript strict mode in `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess`, and path aliases for `src/`
- [X] T003 [P] Configure ESLint and Prettier as one shared config in `eslint.config.mjs` and `.prettierrc`, runnable via `pnpm lint` and `pnpm format`
- [X] T004 Create the directory structure from plan.md: `design/tokens/`, `scripts/`, `src/app/(frontend)/`, `src/app/(payload)/`, `src/components/ui/`, `src/components/layout/`, `src/styles/`, `src/collections/`, `src/mocks/`, `tests/`
- [X] T005 [P] Add `docker-compose.yml` running Postgres 17 for local development
- [X] T006 [P] Create `.env.example` listing every required variable (`DATABASE_URI`, `PAYLOAD_SECRET`, `NEXT_PUBLIC_SERVER_URL`) with comments
- [X] T007 [P] Create `README.md` skeleton with setup, commands, and project-structure sections to be filled in T028

---

## Phase 2: Foundational

**Blocking — every user story depends on this phase.**

- [X] T008 Install and configure Next.js 16.3.3 with React 19 and the App Router, using route groups `(frontend)` and `(payload)` in `src/app/`
- [X] T009 Install Payload 3.88.0 with `@payloadcms/next` and `@payloadcms/db-postgres` (all `@payloadcms/*` pinned to the same version) and create `src/payload.config.ts`
- [X] T010 Mount the Payload admin and REST routes under `src/app/(payload)/admin/[[...segments]]/` and `src/app/(payload)/api/`
- [X] T011 [P] Create the `admins` collection in `src/collections/admins.ts` with **explicit** admin-only access control — never the default (Principle IV). Named `admins` rather than `users` so it cannot be confused with the customer collection spec 003 adds
- [X] T012 [P] Create the `media` collection in `src/collections/media.ts` with public read, admin write, and the image sizes the `Image` primitive's responsive `sizes` contract depends on
- [X] T013 Add `pnpm payload generate:types`, commit `src/payload-types.ts`, and add a CI check that fails when the committed file is stale (Principle I)
- [X] T014 Install Tailwind CSS 4.3.3 and PostCSS
- [X] T015 Create the storefront stylesheet `src/app/(frontend)/styles.css` with a full `@import "tailwindcss"` including preflight
- [X] T016 Create the admin stylesheet `src/app/(payload)/custom.scss` importing **only** `tailwindcss/theme.css` and `tailwindcss/utilities.css` — **preflight must be excluded** (research.md R4), and register it via `admin.css` in the Payload config
- [X] T017 **Manually verify `/admin` renders correctly** after Tailwind is wired — no collapsed spacing, no reset borders, no broken form controls. This is the most common Payload + Tailwind failure and no automated check in this repo will catch it (quickstart V6)
- [X] T018 [P] Set up Vitest in `vitest.config.ts` with one meaningful passing test, so later specs add tests rather than test infrastructure (FR-005)
- [X] T019 [P] Set up Playwright in `playwright.config.ts` targeting the local dev server
- [X] T020 [P] Install `axe-core` and wire `pnpm test:a11y`
- [X] T021 Install Storybook 9 with the Vite builder, `.storybook/main.ts`, and `.storybook/preview.ts` importing `src/styles/tokens.css` so components render on brand
- [X] T022 [P] Configure the Storybook a11y addon and a viewport addon using the project breakpoints; keep all Storybook packages in `devDependencies`

---

## Phase 3: User Story 1 — The Project Runs and Deploys (P1)

**Goal**: A developer clones, runs one command, and gets a working storefront and admin. CI blocks
bad merges. `main` deploys to a reachable URL.

**Independent test**: Clone into a clean environment, follow only the README, confirm both surfaces
run; push a deliberately broken commit and confirm CI blocks it; confirm `main` is reachable.

- [X] T023 [US1] Add runtime environment validation in `src/env.ts` that fails startup with a message **naming the missing variable** rather than an obscure error (FR-006)
- [X] T024 [US1] Create the CI workflow `.github/workflows/ci.yml` running typecheck, lint, unit tests, and the generated-types check on every pull request, blocking merge on failure (FR-004)
- [X] T025 [US1] Configure Payload migrations: generate the initial migration, run it, and **verify a rollback returns the schema to its prior state** (quickstart V1.5)
- [ ] T026 [P] [US1] Configure deployment from `main` to the hosting target, producing a reachable URL (FR-007)
- [X] T027 [P] [US1] Add an e2e smoke test in `tests/e2e/smoke.spec.ts` asserting the storefront root and `/admin` both return 200
- [X] T028 [US1] Complete `README.md` with setup, every command from quickstart.md, the project structure, and where tokens and the UI kit live (FR-008)
- [ ] T029 [US1] Verify clone-to-running takes under 15 minutes on a clean machine using only the README (SC-005)

**Checkpoint**: The project runs, deploys, and is gated.

---

## Phase 4: User Story 2 — The Brand Is a Token System (P2)

**Goal**: Changing one token definition propagates everywhere, with no other file edited. No magic
values survive CI.

**Independent test**: Change one colour token and one type-scale value; confirm site-wide propagation
with one file edited; confirm the lint rules reject a raw hex and an arbitrary font size.

- [X] T030 [P] [US2] Move `colors.json` and `typography.json` from the repository root into `design/tokens/`, unchanged, with a header comment stating they are Figma exports and must never be hand-edited
- [X] T031 [US2] Create `design/tokens/mapping.ts` with the semantic mapping from `contracts/design-tokens.md`: passthroughs, the `h3-medium`→`body-medium` style remaps, and derived values. Every non-supplied entry carries a `reason` naming the requirement. Use `#343231` for `neutral-secondary` (the Figma value, not the export's `#a7a5a3`); keep the `colors.json` status colours; mark `primary-hover`, `primary-transparent`, `background-subtle`, and `border-subtle` as unverified
- [X] T032 [US2] Write `scripts/build-tokens.ts` generating `src/styles/tokens.css` as a Tailwind v4 `@theme` block, with a generated-file header warning against hand-editing. Wire `pnpm build:tokens`
- [X] T033 [US2] Add `pnpm check:tokens` in `scripts/check-tokens.ts` — regenerate and fail on any diff against the committed `src/styles/tokens.css`
- [X] T034 [P] [US2] Self-host the fonts in `src/assets/fonts/`: Manrope (OFL, the real body face) and Playfair Display (**explicit placeholder** for TT Ramillas until the licence is purchased)
- [X] T035 [US2] Create `src/styles/fonts.css` with `@font-face` declarations using `font-display: swap` plus `size-adjust` and `ascent-override` metric matching so the swap causes no layout shift, and preload the two above-the-fold faces. Add a comment that **the metric values are tuned to Playfair Display and must be re-tuned when TT Ramillas lands** (FR-014, research.md R8)
- [X] T036 [US2] Define the type scale in `mapping.ts` — `display`, `heading-1`…`heading-4`, `body-base`, `body-medium`, `body-strong`, `body-small`, `label`, `caption` — using `clamp()` between the mobile and desktop values evidenced in research.md R7. **Plus the two approved additions**: `eyebrow` (Manrope 18/1.3/700, uppercase) and `heading-sans` (Manrope 22/1.25/700). The other footer sizes snap to the scale: 15→`body-medium`, 13→`body-small`, 12 and 11→`caption`
- [X] T037 [P] [US2] Define spacing (Tailwind's 4px scale plus `brand-18` and `button`), breakpoints, radii, border widths, shadows, and motion durations and easings in `mapping.ts`
- [X] T038 [P] [US2] Add a global `prefers-reduced-motion: reduce` rule in `src/app/(frontend)/styles.css` suppressing all motion (FR-021)
- [X] T039 [US2] Write `scripts/check-contrast.ts` validating every permitted pairing in `contracts/design-tokens.md` against its declared minimum, exiting non-zero on failure. Support an explicit exceptions allowlist where each entry carries a written reason, seeded with the two accepted exceptions from the contract — so the gate still blocks *new* undeclared failures. Wire `pnpm check:contrast` into CI (FR-012)
- [X] T040 [P] [US2] Add a custom lint rule rejecting raw colour literals anywhere in `src/**` outside `tokens.css` (FR-010)
- [X] T041 [P] [US2] Add custom lint rules rejecting arbitrary font sizes and arbitrary spacing values in `src/**` (FR-016, FR-018)
- [X] T042 [P] [US2] Write unit tests in `tests/unit/tokens.test.ts` covering the mapping's validation rules from data-model.md: identifier format, `reason` present on every non-supplied token, and `surfaces` lists containing only surfaces the token actually passes against
- [X] T043 [P] [US2] Build the Storybook `Foundations` stories in `src/stories/foundations/` — palette, type scale, spacing, radii, shadows, breakpoints — each labelled with its token name and provenance (FR-029)
- [X] T044 [P] [US2] Build the `Foundations/Contrast` story rendering the permitted-pairings table with computed ratios beside each pair (FR-031)
- [X] T045 [US2] Verify SC-001: change one colour token, regenerate, confirm every usage updates with exactly one source file edited

**Checkpoint**: Tokens are the single definition site, and CI enforces it.

---

## Phase 5: User Story 3 — The UI Kit Is Documented and Complete (P3)

**Goal**: Every primitive exists once, with variants as props, each with stories covering every
state. Nothing domain-shaped.

**Independent test**: Open Storybook, confirm every primitive renders in every variant and state;
keyboard-traverse each story confirming visible focus; confirm zero domain components.

**Note**: The owner is supplying components one at a time. Each task below ships the component
**and** its `*.stories.tsx` in the same change — never one without the other.

- [X] T046 [US3] Create the shared form-field wrapper in `src/components/ui/field/field.tsx` implementing the common contract — required `label`, `description`, `error`, `required`, `disabled`, wired via `aria-describedby` and `aria-invalid`, with error text in `neutral-primary` and red confined to icon and border (contracts/ui-kit.md)
- [X] T047 [P] [US3] `Button` in `src/components/ui/button/` — variants primary/secondary/outline/inverse/inverse-outline (revised against Figma node 10:169 — no ghost or destructive is drawn), sizes sm/md/lg, `loading` with `aria-busy`, `fullWidth`, icon slots, plus stories for every variant and state
- [X] T048 [P] [US3] `Link` in `src/components/ui/link/` — variants inline/standalone/muted/inverse (node 312:8748 adds the dark-surface link with a rule that grows on hover), external handling with `rel` and a visually-hidden "opens in new tab", underlined by default when inline
- [X] T049 [P] [US3] `TextInput` in `src/components/ui/textinput/` composing `Field`
- [ ] T050 [P] [US3] `Textarea` in `src/components/ui/textarea/` with `autoResize`, composing `Field`
- [ ] T051 [P] [US3] `Select` in `src/components/ui/select/` — native `<select>`, composing `Field`
- [X] T052 [P] [US3] `Checkbox` in `src/components/ui/checkbox/` with `shape` square/round — the round shape is the design's "Multiselectable" (node 10:198), a prop rather than a second component. `indeterminate` deferred: the design draws two states and no indeterminate visual exists
- [X] T052a [P] [US3] `Switch` in `src/components/ui/switch/` — `role="switch"` on a real checkbox, 46x26 track with a 28x22 knob (Figma node 10:202), plus stories for both states, disabled, and hidden-label
- [ ] T053 [P] [US3] `Radio` and `RadioGroup` in `src/components/ui/radio/` using `fieldset` and `legend`
- [ ] T054 [P] [US3] `Heading` in `src/components/ui/heading/` with `level` and `styleAs` decoupled so semantics and appearance are independent (FR-042)
- [ ] T055 [P] [US3] `Text` in `src/components/ui/text/` — `color` typed to accept only roles that pass contrast on the given surface, so an inaccessible combination fails to compile
- [ ] T056 [P] [US3] `Image` in `src/components/ui/image/` — **required** `alt` with no optional escape, required dimensions or `fill` plus `sizes`, `aspectRatio` to reserve space. The only way images enter the app (FR-027)
- [X] T057 [P] [US3] `Icon` in `src/components/ui/icon/` — name union generated from `src/assets/icons` by `pnpm build:icons`, `currentColor` inheritance, `aria-hidden` without `label`
- [X] T057a [P] [US3] `IconButton` in `src/components/ui/icon-button/` — variants filled/outline/bare/social (nodes 144:908, 144:1045, 258:3981, 312:9301), **required** `label`, and the two-glyph slide hover
- [X] T057b [P] [US3] `Chip` in `src/components/ui/chip/` — selectable pill (node 255:2983) with `aria-pressed`; deliberately not `Badge`, which is non-interactive
- [X] T057c [P] [US3] `NavLink` in `src/components/ui/nav-link/` — node 135:204, transparent resting border so the hover rule cannot shift its siblings, `current` distinct from hover
- [X] T057d [P] [US3] `MenuOption` in `src/components/ui/menu-option/` — node 301:5920, collapsed rules, no `role="option"` without a `listbox` to put it in
- [X] T057e [P] [US3] `ScrollArea` in `src/components/ui/scroll-area/` — node 301:5934, native scrollbar restyled rather than reimplemented; the two carets are dropped and the trade recorded
- [X] T057f [P] [US3] `Button` gains `hoverEffect` slide/reveal from the "Ховер эффекты" board (node 196:941) — motion on existing variants, not new variants
- [ ] T058 [P] [US3] `Container` in `src/components/ui/container/` — sizes narrow/default/wide/full, the only place page width is decided
- [ ] T059 [P] [US3] `Stack` in `src/components/ui/stack/` — token-only gaps
- [ ] T060 [P] [US3] `Grid` in `src/components/ui/grid/` — responsive column config requiring a base value
- [ ] T061 [P] [US3] `Divider` in `src/components/ui/divider/`
- [ ] T062 [P] [US3] `Badge` in `src/components/ui/badge/` — non-interactive
- [ ] T063 [P] [US3] `Spinner` in `src/components/ui/spinner/` — `role="status"`, degrades to static under reduced motion
- [ ] T064 [P] [US3] `Skeleton` in `src/components/ui/skeleton/` — `aria-hidden`, pulse suppressed under reduced motion
- [ ] T065 [P] [US3] `InlineMessage` in `src/components/ui/inlinemessage/` — `*-transparent` wash background, status colour on icon and border, text in `neutral-primary`, `role="alert"` / `role="status"`
- [X] T066 [US3] Add `src/components/ui/index.ts` re-exporting every primitive as the kit's single entry point
- [X] T067 [US3] Write `scripts/check-stories.ts` failing when any component in `src/components/ui/` lacks a matching `*.stories.tsx`; wire `pnpm check:stories` into CI (FR-032)
- [X] T067a [US3] Write `scripts/check-naming.ts` failing on any path that is not kebab-case; wire `pnpm check:naming` into CI. Enforced rather than reviewed because macOS resolves `./Button` against `button.tsx` and only Linux CI catches it (Constitution 2.1.0, Naming)
- [X] T068 [P] [US3] Add `tests/a11y/stories.spec.ts` running axe-core across every story, blocking merge on any violation (FR-044)
- [ ] T069 [P] [US3] Add `tests/e2e/keyboard.spec.ts` traversing each interactive primitive's stories, asserting reachability and a visible focus indicator (FR-043, SC-006)
- [ ] T070 [US3] Review the kit for domain concepts — products, diamonds, sizes, carts, requests, posts. **Must be zero** (FR-028, SC-009)

**Checkpoint**: The kit is complete, documented, and accessible in isolation.

---

## Phase 6: User Story 4 — Every Page Sits in a Consistent Shell (P4)

**Goal**: One shell around every page, usable on a phone, keyboard-first, with a branded 404.

**Independent test**: Render the home page and a 404 in the shell; confirm consistent header and
footer, working mobile navigation, skip link, and no horizontal scroll at 320px or 200% zoom.

**Note**: The shell is the kit's first consumer inside the app — the composition test Storybook
cannot perform. Awkwardness here means the kit is wrong; fix the kit, not the shell.

- [~] T071 [US4] Build the page shell in `src/app/(frontend)/layout.tsx` — header, `<main>`, footer, semantic landmarks, correct heading hierarchy (FR-034, FR-042)
- [ ] T072 [P] [US4] Build `SkipLink` in `src/components/layout/SkipLink/` as the first focusable element, moving focus to `<main>` (FR-039)
- [X] T072a [P] [US3] `Breadcrumbs` in `src/components/ui/breadcrumbs/` — an ordered list in a labelled `nav` with `aria-current` and hidden separators, not the seven equal paragraphs the design draws
- [X] T072b [P] [US3] `Menu` in `src/components/ui/menu/` — WAI-ARIA menu button behaviour (Escape returns focus, arrows wrap, Tab closes, no focus trap), sets `role="menuitem"` on its children
- [X] T072c [P] [US4] `Logo` and `LanguageSelector` in `src/components/layout/` — wordmark uppercased in CSS rather than typed in capitals; language switcher composed from `Menu` and `MenuOption`
- [X] T073 [US4] Build `Header` in `src/components/layout/header/` — the five Figma variants at node 327:7956 collapsed into three responsive breakpoints, with placeholder navigation, breadcrumb bar, cart count and language switcher. Variant3's mobile header is superseded by the page reference at node 440:13435 (FR-035, FR-038)
- [X] T074 [US4] Build the mobile navigation in `src/components/layout/mobile-nav/` using an accessible disclosure pattern — the open panel is NOT designed and is deliberately plain until a drawer exists — dismissible with `Escape`, correct focus management, operable by keyboard and screen reader (FR-036)
- [ ] T075 [P] [US4] Build `Footer` in `src/components/layout/Footer/` with placeholder link groups and a legal area (FR-037)
- [ ] T076 [P] [US4] Add default metadata, favicon, and app icons in `src/app/(frontend)/layout.tsx`, with per-page title and description overrides available to later specs (FR-040)
- [ ] T077 [US4] Build the footer newsletter block using the **approved decisions**: type sizes snap to the scale with `eyebrow` and `heading-sans` added (T036); success text keeps `#2a8121` on the dark surface and the `white/20` unsubscribe note keeps its opacity — both are **accepted accessibility exceptions** recorded in `contracts/design-tokens.md` and allowlisted in `scripts/check-contrast.ts`, not silent violations
- [ ] T078 [P] [US4] Build the branded 404 in `src/app/(frontend)/not-found.tsx` inside the shell with a route home (FR-041)
- [ ] T079 [P] [US4] Build the placeholder home page in `src/app/(frontend)/page.tsx` composed entirely from kit primitives
- [ ] T080 [P] [US4] Add `tests/e2e/shell.spec.ts` covering skip link, mobile navigation open/dismiss, 404, and no horizontal scroll from 320px upward
- [ ] T081 [US4] Verify the shell renders usable content with JavaScript disabled (FR-046)
- [ ] T082 [US4] Verify usability at 200% browser zoom and at a 320px viewport with no horizontal page scroll (SC-007)

**Checkpoint**: A navigable, branded, accessible site frame.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T083 [P] Configure Lighthouse CI in `lighthouserc.js` enforcing LCP ≤ 2.5s and INP ≤ 200ms at p75 mobile, blocking merge when exceeded (FR-045)
- [ ] T084 [P] Add a bundle-size gate enforcing ≤ 200KB gzipped initial JavaScript per route, and assert Storybook's dependencies are absent from the production bundle (SC-008)
- [ ] T085 Confirm Storybook is never served from the production domain (FR-033)
- [ ] T086 **Prove each gate by deliberately breaking it, confirming CI blocks the merge, then reverting** (SC-010, quickstart V7): raw hex in a component; a contrast-failing pairing; a removed `aria-label`; an over-budget bundle; a stale `tokens.css`; a stale `payload-types.ts`; a UI-kit component with no stories file. A gate that has never failed is unproven, and this is the only spec where breaking things on purpose is free
- [ ] T087 [P] Confirm the admin sidebar shows **only** `admins` and `media` — any other collection means content modelling leaked into this spec (research.md R9)
- [ ] T088 [P] Establish `src/mocks/` with the rule that only route-level loaders import from it, never components, so spec 002's data-source swap is one file per route (data-model.md)
- [ ] T089 Run the full quickstart V1–V8 validation and record results
- [ ] T090 Verify `contracts/design-tokens.md` matches the generated `tokens.css` exactly, and that every derived token carries a `reason` naming the requirement that forced it

---

## Dependencies

```
Phase 1 Setup
    ↓
Phase 2 Foundational  ←── blocks everything
    ↓
Phase 3 US1 (P1)  ── project runs, deploys, gated
    ↓
Phase 4 US2 (P2)  ── tokens          [owner's step 1]
    ↓
Phase 5 US3 (P3)  ── UI kit          [owner's step 2]  depends on tokens
    ↓
Phase 6 US4 (P4)  ── shell           [owner's step 3]  depends on the kit
    ↓
Phase 7 Polish
```

Story dependencies are genuine, not conventional: the kit cannot be styled before tokens exist, and
the shell is assembled from the kit. T017 (admin renders correctly) gates all later work — a broken
admin discovered in Phase 6 is expensive.

## Parallel Opportunities

| Phase | Parallel tasks | Notes |
|---|---|---|
| 1 | T003, T005, T006, T007 | Independent config files |
| 2 | T011, T012 / T018, T019, T020, T022 | Collections; test harnesses |
| 3 | T026, T027 | Deploy config and smoke test |
| 4 | T037, T038, T040, T041, T042, T043, T044 | Lint rules, tests, and stories are independent once T031–T032 land |
| 5 | **T047–T065** | **19 components, all independent** — the widest parallel window in the spec, and the phase matching the one-at-a-time workflow |
| 6 | T072, T075, T076, T078, T079, T080 | Independent shell pieces once T071 lands |
| 7 | T083, T084, T087, T088 | Independent checks |

## Implementation Strategy

**MVP**: Phases 1–3 alone give a running, deployable, gated project — useful on its own even if work
stopped there.

**Owner's build order** maps to Phases 4 → 5 → 6. Phase 5 is where components arrive individually;
each lands with its stories in the same change, and `pnpm check:stories` makes that mechanical rather
than remembered.

**Sequence the risk early.** T016 and T017 (the Tailwind/Payload preflight split) sit in Phase 2 on
purpose: it is the single most likely integration failure in the stack, has no automated guard, and
is cheapest to discover before any component exists.

**T077 is a checkpoint, not a task to code through.** Three design questions must be answered before
the footer is final. Implementing around them would bake in a WCAG failure the CI gate then blocks.

## Task Count

| Phase | Tasks |
|---|---|
| 1 — Setup | 7 (T001–T007) |
| 2 — Foundational | 15 (T008–T022) |
| 3 — US1 Project runs and deploys | 7 (T023–T029) |
| 4 — US2 Token system | 16 (T030–T045) |
| 5 — US3 UI kit | 25 (T046–T070) |
| 6 — US4 Layout shell | 12 (T071–T082) |
| 7 — Polish | 8 (T083–T090) |
| **Total** | **90** |
