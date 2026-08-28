# Quickstart & Validation: Design System Foundation

**Feature**: `001-design-system-foundation` | **Date**: 2026-08-25

How to run this feature and how to prove it satisfies its requirements. Scenarios map to the spec's
acceptance criteria and success criteria; each states what to run and what must be true.

---

## Prerequisites

- Node 22+ and pnpm
- Docker (for local Postgres)
- `.env` populated from `.env.example` — the file lists every required variable (FR-006)
- Fonts are committed to the repo: **Manrope** (OFL, the real body face) and **Playfair Display**
  (placeholder for the display serif until the TT Ramillas licence is purchased). No manual step —
  see research.md R8.

## Setup

```bash
pnpm install
docker compose --profile local up -d   # Postgres
cp .env.example .env             # then fill in values
pnpm payload migrate             # apply schema
pnpm build:tokens                # design/tokens/* → src/styles/tokens.css
pnpm dev
```

Storefront at `http://localhost:3000`, admin at `http://localhost:3000/admin`. Storybook runs
separately with `pnpm storybook` at `http://localhost:6006`.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Storefront + admin |
| `pnpm build:tokens` | Regenerate `src/styles/tokens.css` |
| `pnpm check:tokens` | Fail if the committed token file is stale |
| `pnpm check:contrast` | Validate every permitted pairing against WCAG AA |
| `pnpm lint` | Lint + the no-magic-values rules |
| `pnpm typecheck` | Strict TypeScript |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | Playwright, including keyboard traversal |
| `pnpm storybook` | Component workshop |
| `pnpm check:stories` | Fail if a UI-kit component has no stories file |
| `pnpm test:a11y` | axe-core over stories and routes |
| `pnpm payload generate:types` | Regenerate `payload-types.ts` |

---

## Validation scenarios

### V1 — Project runs and gates work *(Story 1; FR-001–FR-008, SC-005)*

1. On a clean machine, follow **Setup** using only the README. Storefront and `/admin` both load.
   **Under 15 minutes** (SC-005).
2. Remove a required variable from `.env` and start. It fails naming the missing variable, not with
   a stack trace (FR-006).
3. Push a branch with a type error. CI fails and merge is blocked (FR-004).
4. Merge to `main`. The deployment produces a reachable URL (FR-007).
5. Roll a migration back locally and confirm the schema returns to its prior state.

### V2 — Tokens are the single definition site *(Story 2; FR-009–FR-021, SC-001, SC-002)*

1. Change one colour in `design/tokens/colors.json`, run `pnpm build:tokens`. Every usage updates
   across storefront and style guide. **Exactly one source file edited** (SC-001).
2. `pnpm check:tokens` after a source change without regenerating → **fails**. This proves the
   staleness gate, not just its presence.
3. Add `color: #ff0000` to a component. `pnpm lint` **fails** (FR-010, SC-002).
4. Add `font-size: 13px`. `pnpm lint` **fails** (FR-016).
5. Throttle to slow 3G and reload. Text is readable throughout the font load and **no layout shift**
   occurs on swap (FR-014).
6. Resize continuously from 320px to 1920px. Type scales fluidly; no page scrolls horizontally at
   any width (FR-017, FR-020).

### V3 — Palette meets AA *(Story 2; FR-012, SC-003)*

1. `pnpm check:contrast` passes. Every pairing in `contracts/design-tokens.md` is verified — the
   full declared list, not a sampled subset.
2. Confirm `neutral-secondary` is **`#343231`**, the live Figma value — not `#a7a5a3` from the stale
   `colors.json`. On `background/bg` it must measure **11.92:1**. This is the single most consequential
   value in the token set; getting it from the wrong source inverts the whole accessibility analysis.
3. Add a deliberately failing pairing to the contract. The check fails and blocks the merge.
4. The `Foundations/Contrast` story shows the measured ratio beside each permitted pairing (FR-031).
5. Confirm borders use `border-black/10` and `border-white/8` — no border colour token exists.

### V4 — Kit is complete and documented *(Story 3; FR-022–FR-033, SC-004, SC-006)*

1. Storybook renders every primitive from `contracts/ui-kit.md` in each variant and every applicable
   state — default, hover, focus-visible, active, disabled, loading (FR-030, SC-004).
2. Tab through each component's stories. Every interactive primitive is reachable, in a sensible
   order, with a **visible focus indicator** (FR-043, SC-006).
3. Add a component to `src/components/ui/` without a stories file. `pnpm check:stories` **fails**
   (FR-032).
4. Confirm Storybook's dependencies are absent from the production bundle (bundle-size gate).
4. Review `src/components/ui/` for domain concepts. **Zero** (FR-028, SC-009).
5. Confirm no two components differ only by appearance — variants are props (FR-024).

### V5 — Shell is consistent and accessible *(Story 4; FR-034–FR-046, SC-007)*

1. Every page shows the same header and footer with correct container gutters (FR-034).
2. Components proven in Storybook compose correctly in the real shell — the check Storybook cannot
   perform, and the reason Story 4 follows Story 3.
3. At 375px, open the navigation. It is usable, dismissible with `Escape`, and traps focus
   correctly (FR-036).
4. Press `Tab` from the top of any page. First stop is **skip-to-content**, and activating it moves
   focus to `<main>` (FR-039).
5. Visit a nonexistent URL. A branded 404 renders inside the shell with a route home (FR-041).
6. Disable JavaScript. The shell still renders usable content (FR-046).
7. Set browser zoom to **200%** and separately set a 320px viewport. Both remain usable with no
   horizontal page scroll (SC-007).
8. `pnpm test:a11y` reports **zero violations** across stories, shell, and 404 (FR-044).

### V6 — Admin panel survives Tailwind *(FR-003, research.md R4)*

1. Open `/admin` after Tailwind is wired. Payload's chrome renders correctly — **no collapsed
   spacing, no reset borders, no broken form controls**. This is the most common Payload + Tailwind
   failure and will not be caught by any automated check in this repo.
2. Confirm the admin stylesheet imports Tailwind's theme and utilities but **not** preflight.
3. Confirm the admin sidebar shows **only** `users` and `media`. Any other collection means content
   modelling leaked into this spec (research.md R9).

### V7 — Every gate is proven, not assumed *(SC-010)*

Deliberately introduce each violation, confirm CI blocks the merge, then revert. A gate that has
never failed is unproven, and this is the only spec where breaking things on purpose is free.

| Violation | Expected |
|---|---|
| Raw hex in a component | `pnpm lint` fails |
| Contrast-failing pairing added to the contract | `pnpm check:contrast` fails |
| `aria-label` removed from the mobile nav toggle | `pnpm test:a11y` fails |
| A large unused dependency imported into a route | Bundle-size gate fails |
| Stale `tokens.css` committed | `pnpm check:tokens` fails |
| UI-kit component with no stories file | `pnpm check:stories` fails |
| Stale `payload-types.ts` committed | Type-generation check fails |

### V8 — Budgets hold on the deployed shell *(SC-008)*

1. Lighthouse CI against the deployed storefront: initial JS **≤ 200KB gzipped** per route, LCP
   **≤ 2.5s** at p75 mobile.
2. Confirm the budget gate blocks a merge when exceeded (covered by V7).

---

## Definition of done

- [ ] V1–V8 pass
- [ ] Storybook is never served from the production domain and its dependencies stay out of the app
      bundle (FR-033)
- [ ] README documents setup, every command, project structure, and where tokens and the kit live
      (FR-008)
- [ ] `contracts/design-tokens.md` matches the generated output exactly
- [ ] Every derived token carries a `reason` naming the requirement that forced it
- [ ] No supplied colour value was altered anywhere in the pipeline
- [ ] Token values were read from **Figma**, not `colors.json`; the six unverified tokens
      (`primary-hover`, `primary-transparent`, `background-subtle`, `border-subtle`, `status-*`)
      have been re-read before any component depends on them
- [ ] `src/mocks/` is imported only by route-level loaders, never by a component
- [ ] **Carried forward**: re-tune the font metric adjustments when the licensed TT Ramillas files
      arrive, or the swap reintroduces layout shift (research.md R8)
