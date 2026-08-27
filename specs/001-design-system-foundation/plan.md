# Implementation Plan: Design System Foundation

**Branch**: `001-design-system-foundation` | **Date**: 2026-08-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-design-system-foundation/spec.md`

## Summary

Stand up an **empty** Payload CMS project and turn the supplied brand exports into an enforced
design system. Payload 3.88 runs inside a single Next.js 16 application with Postgres; Tailwind CSS
v4's `@theme` block is the token definition layer, generated from `colors.json` and
`typography.json` through a semantic mapping module rather than hand-transcribed. On top of the
tokens sits a UI kit of eighteen primitives — no domain components — each built and reviewed in
**Storybook**, then consumed for the first time by a static layout shell. The storefront runs
on **mock fixtures**; no content model is created here. Three CI checks make the constitution's
"tokens, not magic values" rule mechanical rather than aspirational, and each is proven by a
deliberate violation before the spec is accepted.

Research surfaced four things that change the work rather than confirm it: **`colors.json` is stale**
— the live Figma file gives `neutral/secondary` as `#343231`, not the export's `#a7a5a3`, which
inverts the accessibility analysis and removes a constraint an earlier revision had accepted;
Tailwind's preflight breaks the Payload admin panel unless the entry stylesheets are split; the
token export contains an invalid identifier and a spacing "scale" that is two zero-valued Figma
artefacts; and the typography scale is missing body-base, caption, and a fourth heading, with the
mobile scale now evidenced as a two-step drop rather than inferred. Details in
[research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5 (strict mode, `any` requires inline justification)

**Primary Dependencies**: Payload 3.88.0, `@payloadcms/next` 3.88.0, `@payloadcms/db-postgres`
3.88.0, Next.js 16.3.3, React 19, Tailwind CSS 4.3.3. All `@payloadcms/*` packages are
version-locked together and must be upgraded as a set. **No e-commerce plugin** — deferred to spec
002 (research.md R9).

**Storage**: PostgreSQL (Docker locally, managed instance in staging and production). Payload ships
empty; the storefront renders from mock fixtures in `src/mocks/`. Migrations are configured and
proven, not exercised.

**Testing**: Vitest for unit and token tests, **Storybook** as the component workshop with the a11y
addon, Playwright for shell end-to-end and keyboard traversal, `axe-core` over stories and routes,
Lighthouse CI for performance budgets. Storybook stays in `devDependencies` and out of the app
bundle. One meaningful test of each kind ships here so later specs add tests rather than test
infrastructure (FR-005).

**Target Platform**: Modern evergreen browsers, mobile-first. Server-rendered; the shell and style
guide must render usable content with client-side JavaScript disabled (FR-046).

**Project Type**: Web application — a single Next.js app hosting both the storefront and the
Payload admin panel.

**Performance Goals**: Initial JavaScript ≤ 200KB gzipped per route; LCP ≤ 2.5s, INP ≤ 200ms,
CLS ≤ 0.1 at p75 mobile. Enforced in CI by Lighthouse CI and a bundle-size gate (FR-045, SC-008).

**Constraints**: WCAG 2.2 AA across the shell and style guide, verified automatically and blocking
merge. No horizontal page scroll from 320px upward; usable at 200% zoom. Zero raw colour literals,
arbitrary font sizes, or arbitrary spacing outside the generated token file. Single light
appearance — no dark-mode variants.

**Scale/Scope**: 4 user stories, 46 functional requirements, 18 UI primitives, ~33 design tokens
across colour, type, spacing, radii, shadow, and motion. One route (`/`) plus a 404, with Storybook
as a separate build. No domain logic, no collections, no content model.

## Constitution Check

*GATE: evaluated before Phase 0 and re-evaluated after Phase 1 design.*

| Principle | Gate | Pre-Phase 0 | Post-Phase 1 | Notes |
|---|---|---|---|---|
| **I. Payload Is the Single Source of Truth** | No hardcoded user-visible content | ⚠️ **Deviation** | ⚠️ **Deviation** | Navigation and footer links are hardcoded placeholders per FR-038. Justified and time-boxed — see Complexity Tracking. |
| **II. Reuse Before Creation** | No duplicate components; kit is the vocabulary | ✅ Pass | ✅ Pass | This spec *creates* the kit. FR-024 forbids near-duplicate siblings; FR-028 and SC-009 forbid domain components outright. |
| **III. Design Tokens Over Magic Values** | Tokens only; one definition site | ✅ Pass | ✅ Pass | The core deliverable. `@theme` is the single definition site (R3); three CI checks enforce it (R11). |
| **IV. Content Modeling & Schema Evolution** | Explicit access control; migrations with rollback | ✅ Pass | ✅ Pass | No content model is created. Payload ships empty; the migration path is configured and proven so spec 002 inherits working machinery. |
| **V. Performance, Accessibility & SEO Budgets** | CWV budgets, WCAG 2.2 AA, SSR, metadata | ✅ Pass | ✅ Pass | Budgets configured and enforced in CI here rather than asserted later. AA verified automatically, including the palette itself. |
| **VI. Commerce Correctness & Data Protection** | No card data; secrets never committed | ✅ Pass | ✅ Pass | No commerce code exists in this spec at all. Secrets are runtime-injected with a documented example file (FR-006). |

**Gate result: PASS with one documented deviation.** Deferring the e-commerce plugin removed the
Principle IV deviation an earlier revision had to justify — one fewer deviation is a better plan.
The remaining one is recorded below with a migration path, as the Governance section requires.

## Project Structure

### Documentation (this feature)

```text
specs/001-design-system-foundation/
├── plan.md              # This file
├── research.md          # Phase 0 output — 11 decisions, 5 marked as findings
├── data-model.md        # Phase 1 output — token model + inherited collections
├── quickstart.md        # Phase 1 output — setup and validation scenarios
├── contracts/
│   ├── design-tokens.md # Token names, values, provenance, permitted pairings
│   └── ui-kit.md        # Primitive APIs, variants, required states
├── checklists/
│   └── requirements.md  # Spec quality checklist (passing)
└── tasks.md             # Phase 2 — created by /speckit-tasks, NOT by this command
```

### Source Code (repository root)

```text
design/tokens/
├── colors.json               # Figma export — never hand-edited
├── typography.json           # Figma export — never hand-edited
└── mapping.ts                # Semantic roles, renames, a11y variants, derived values

.storybook/                   # Component workshop config — token stylesheet, a11y + viewport addons

scripts/
├── build-tokens.ts           # design/tokens/* → src/styles/tokens.css
├── check-contrast.ts         # Validates permitted pairings, non-zero exit on failure
└── check-stories.ts          # Every src/components/ui/* has a matching *.stories.tsx

src/
├── app/
│   ├── (frontend)/
│   │   ├── layout.tsx        # Layout shell — header, main, footer, skip link
│   │   ├── page.tsx          # Placeholder home
│   │   ├── not-found.tsx     # Branded 404 inside the shell
│   │   └── styles.css        # @import "tailwindcss" — full, with preflight
│   └── (payload)/
│       ├── admin/[[...segments]]/
│       ├── api/
│       └── custom.scss       # Tailwind theme + utilities only — NO preflight
├── components/
│   ├── ui/                   # THE UI KIT — primitives + a *.stories.tsx per component
│   └── layout/               # Header, Footer, Nav, SkipLink — shell only
├── styles/
│   ├── tokens.css            # GENERATED @theme block — committed, never hand-edited
│   └── fonts.css             # @font-face with metric-adjusted fallbacks
├── collections/              # Scaffold only — Users, Media. No domain collections.
├── mocks/                    # Fixtures the storefront renders from, shaped as Payload will return
├── payload.config.ts
└── payload-types.ts          # GENERATED — regenerated in the same commit as schema changes

tests/
├── unit/                     # Token generation, mapping, contrast maths
├── e2e/                      # Shell, keyboard traversal
└── a11y/                     # axe-core over stories and routes
```

**Structure Decision**: Single Next.js application with Payload mounted inside it, using route
groups to separate the storefront `(frontend)` from the admin `(payload)`. This is Payload 3's
native layout and what the constitution's Technology Stack section assumes — one deploy target, one
dependency tree, and the Local API available to server components without a network hop.

The two directories that carry the most weight are `design/tokens/` and `src/components/ui/`.
Keeping the Figma exports byte-identical in `design/tokens/` and putting every repair in
`mapping.ts` means the next export can be dropped in and re-generated instead of being reconciled by
hand. Keeping `src/components/ui/` to primitives only is what makes the Principle II reuse check
meaningful from spec 002 onward — if domain components leak in here, "search the kit before
creating" stops being answerable.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **Hardcoded navigation and footer links** in the layout shell — Principle I requires all user-visible content to come from Payload | The shell must exist before the kit has a consumer, but content-managed navigation requires globals and content modelling that this spec deliberately excludes. Placeholder links let the shell be built and the kit tested without pulling schema design into a foundation spec. | Modelling navigation as a Payload global now was rejected because it drags content modelling into a spec explicitly scoped to have none, and the nav's real shape is not knowable until the catalog and blog exist. **Time-boxed**: FR-038 marks these as placeholders and spec 002 replaces them with a content-managed global as its first shell change. Slots for search, account, and cart are marked in the markup so the replacement is additive. |

## Phase Outputs

- **Phase 0** — [research.md](./research.md): 11 decisions, 5 flagged as findings that change the
  work. All Technical Context unknowns resolved; no `NEEDS CLARIFICATION` remains.
- **Phase 1** — [data-model.md](./data-model.md), [contracts/design-tokens.md](./contracts/design-tokens.md),
  [contracts/ui-kit.md](./contracts/ui-kit.md), [quickstart.md](./quickstart.md).

## Owner Decisions Applied

All four blocking questions from the first revision are resolved. Nothing blocks implementation.

| Question | Decision | Effect on the plan |
|---|---|---|
| Trial font licence | Buy later; any face for now | Playfair Display as an explicit placeholder; Manrope is the real body face. Swap is one `@font-face` block. **Metric-adjust values must be re-tuned when the licensed face lands** (R8). |
| Failing colour pairings | **Leave the palette as-is** | Honoured — and the Figma read made it moot. `colors.json` was stale; the real `neutral/secondary` passes at 11.92:1 (R5). |
| Admin/storefront CSS split | Two entry stylesheets | Confirmed as planned (R4). |
| `border-#ffffff` token | Drop it; use Tailwind's `border-white` | No token defined; `border-white/8`. Figma stores borders as raw colours with opacity applied at the use site, which is exactly this pattern — so `border/default` should likewise be `border-black/10` (R5, R6). |
| E-commerce plugin | Defer; mock frontend first | Plugin removed. Payload ships empty, storefront runs on `src/mocks/`. Removes the Principle IV deviation (R9). |
| Component workshop | **Storybook** | Reverses this plan's earlier choice of a `/style-guide` route. Justified by the one-component-at-a-time workflow (R10). |

### Build order

The owner's sequence, mapped to this plan's stories:

1. **Tokens and variables** → Story 2. Colours, typography, spacing, radii, motion, breakpoints.
2. **UI kit, component by component, each with its stories** → Story 3. Components arrive
   individually; each ships with its `*.stories.tsx` in the same change.
3. **Header, footer, main page** → Story 4 covers header and footer.

⚠ **The main page is not in this spec.** Story 4 delivers a *shell* with a placeholder home; a real
main page needs product and editorial content and belongs to spec 002. It can be built here against
`src/mocks/`, but that is a scope extension to agree on explicitly rather than absorb quietly.

### Still unverified

Six tokens do not appear in the three main-page nodes, so no live value was read for them:
`primary-hover`, `primary-transparent`, `background-subtle`, `border-subtle`, `status-error-*`,
`status-success-*`. Given `colors.json` was demonstrably stale on the one token that could be
compared, **these are provisional** — including the AA analysis of the status colours. Resolution:
re-export from Figma, or point at a node using form and status states.
