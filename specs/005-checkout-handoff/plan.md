# Implementation Plan: Checkout — Cart, Buy Now and Messenger Handoff

**Branch**: `005-checkout-handoff` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-checkout-handoff/spec.md`

## Summary

Give the storefront a cart it can actually reach, a page to review it on, and a modal that hands the
selection to the seller on WhatsApp, Telegram or Instagram with the message already written. No
payment, and — per FR-029 — no server-side record of the handoff.

The technical approach in one line: **drive the already-migrated `carts` table from our own Server
Actions rather than from the plugin's React provider**, because the provider's `addItem` cannot
carry a chosen size, keeps the guest cart's bearer secret in `localStorage`, and would turn a
server-rendered page into a client tree ([research R1](./research.md)). Everything else follows from
that — an httpOnly cookie for the guest credential (R2), a loader that computes its own totals from
published catalogue data (R5), our own sign-in merge because the plugin's collapses two sizes into
one line (R4), and `refresh()` rather than `revalidatePath` to settle a per-visitor mutation (R7).

The only schema change is one new global for the seller's messenger destinations (R9). The cart
table, its `size` column and its foreign key were landed by spec 003 and are already migrated.

## Technical Context

**Language/Version**: TypeScript 5.9, strict. Node ≥ 22. React 19.2.

**Primary Dependencies**: Next.js 16.3.3 (App Router; Proxy, not Middleware), Payload 3.88.0,
`@payloadcms/plugin-ecommerce` 3.88.0, `@payloadcms/db-postgres`, Tailwind 4.3, `zod` 4.5,
`react-hook-form` 7.87. **No new dependency is added by this feature** — see Constitution Check.

**Storage**: PostgreSQL through Payload. `carts` + `carts_items` (with `size_id`) already exist and
are migrated; one new global table for `contact-settings`.

**Testing**: `vitest` unit (`tests/unit`, no database), `vitest` integration (`tests/integration`,
real Postgres, single worker), Playwright e2e + `@axe-core/playwright` a11y + Storybook story tests.

**Target Platform**: Server-rendered web, deployed as a long-running container (`docker-compose.yml`).

**Project Type**: Web application — Payload CMS with a Next.js App Router storefront in one repo.

**Performance Goals**: Core Web Vitals within LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at p75 mobile on
the cart route.

**Constraints**: ≤ 300KB gzipped initial JS per route **and** ≤ 100KB above the 181KB framework
baseline. The worst existing route already spends 84KB of that 100KB, so the working margin is
~16KB (R15). WCAG 2.2 AA. All money as integer minor units with an explicit currency.

**Scale/Scope**: One new route (`/cart`), one new global, one new nightly job, **six new components**
— `cart-lines`, `order-summary`, `cart-empty`, `handoff-modal`, `cart-count`, and the `messenger-row`
kit primitive — plus one extension to the existing `Modal`. Four client trees (R15).
53 functional requirements, 17 success criteria. No new collection.

## Constitution Check

*GATE: passed before research, re-checked after the Phase 1 design, and re-checked again after the
2026-09-08 refinement. Result: **PASS on all six principles**, with **two recorded deviations from
the Development Workflow section** — no kill switch and no checkout observability. Both are in
[Complexity Tracking](#complexity-tracking); neither is a principle violation, and neither may be
approved without a reviewer reading that section.*

| Principle | Gate | Verdict |
| --- | --- | --- |
| **I. Payload is the single source of truth** | No user-visible copy hardcoded; messenger destinations editable without a deploy | **Pass.** FR-033–FR-042 land the `contact-settings` global; R11 additionally deletes `SOCIAL_LINKS` so the footer's WhatsApp icon and the handoff modal cannot disagree. Functional UI strings (button labels, the removal confirmation) stay in components — the precedent `AccountSettings` sets and documents. |
| **II. Reuse before creation (NON-NEGOTIABLE)** | Search the kit first; extend rather than copy | **Pass.** `CartItem`, `QuantityStepper`, `IconButton`, `Checkbox`, `Button`, `Link`, `Modal`, `useOverlay`, `SectionHeading` and `Container` are all reused unchanged. `Modal` gains a size and a heading alignment prop rather than a sibling (R13). The one new kit primitive, `MessengerRow`, has three consumers on day one. |
| **III. Design tokens over magic values** | No raw hex, no arbitrary spacing, full state sets | **Pass.** New components use existing tokens; `pnpm check:tokens` and `check:styles` gate it. Every new interactive element ships default/hover/focus-visible/active/disabled/loading. |
| **IV. Content modelling & schema evolution** | Model before implementing; labels and descriptions; explicit access; tested migration + rollback | **Pass.** [data-model.md](./data-model.md) models the global before any code. Every field carries a label and an admin description (FR-041); access is stated explicitly, never by omission. One migration, generated and committed, with a rollback verified against seeded content. |
| **V. Performance, accessibility & SEO budgets** | Server components default; budgets; WCAG 2.2 AA | **Pass, and it is the tightest gate.** R1 keeps the cart page server-rendered; R8 keeps the header's count from making every route dynamic and losing the prerendered catalogue; R15 sizes the four client trees against a ~16KB margin and a task measures it against a production server. `/cart` is `noindex` — a per-visitor page has nothing to index. |
| **VI. Commerce correctness & data protection** | Server-side amounts; integer minor units; no cross-customer reads; retention and erasure | **Pass.** R5 computes every displayed amount server-side from published data and never renders the client's number; `formatPrice` already refuses non-integer minor units. R2 keeps the cart bearer secret out of JavaScript's reach — a strict improvement on the `localStorage` the plugin would have used. FR-047 – FR-051 give the cart a stated life and a working erasure path, and record why its two cookies are exempt from consent gating. Three clauses of this principle do not trigger, and are named rather than skipped: **idempotency** is re-scoped by R14 because FR-029 removed the record it would have guarded; **inventory reserved before payment capture** has no capture to precede; and **append-only order state with an audit trail** has no order. All three return the day a payment provider does. No payment instrument exists to protect. |

**Three notes rather than violations:**

- **R11 touches three files outside this feature's screens** (`contact-banner`, `footer`,
  `mobile-nav`). This is Principle I and II *requiring* the change, not scope creep: shipping the
  global without it means the owner sets a real WhatsApp number and the footer keeps pointing at a
  placeholder. All three components already take `social` as a prop, so it is a wiring change.
  **FR-052 now states this as a requirement**, so the tasks that do it are traceable to the spec
  rather than to a research note.
- **CI gate 3 — "checkout end-to-end suite passes against the payment provider sandbox" — does not
  apply.** There is no payment provider and no sandbox to run against. The gate is recorded as
  inapplicable here so a reviewer sees a decision rather than a skipped step; the checkout e2e suite
  itself still runs (T084, T085), against the messenger handoff instead of a payment.
- **Checkout changes require two approving reviews** under *Development Workflow*. This feature is
  checkout. Reviewers must check the duplication and hardcoding gates explicitly.

## Project Structure

### Documentation (this feature)

```text
specs/005-checkout-handoff/
├── plan.md              # This file
├── research.md          # Phase 0 — 17 decisions taken against the installed code
├── data-model.md        # Phase 1 — the global, and the shapes the cart travels in
├── quickstart.md        # Phase 1 — how to prove it works
├── contracts/           # Phase 1 — module contracts
│   ├── cart-actions.md          # Server Actions: the mutation surface
│   ├── cart-loader.md           # Read side: what the cart page is handed
│   └── messenger-handoff.md     # Destinations, normalisation, link and message building
├── checklists/
│   └── requirements.md  # From /speckit-specify — all items pass
└── tasks.md             # Phase 2 — NOT created by /speckit-plan
```

### Source Code (repository root)

```text
src/
├── app/(frontend)/
│   ├── layout.tsx                      # CHANGED — social links from the global (R11), cart-count provider (R8)
│   └── (shop)/cart/
│       └── page.tsx                    # NEW — the cart route, dynamic, noindex
├── collections/
│   └── carts.ts                        # unchanged — already carries `size` and the matcher
├── jobs/
│   └── expire-carts.ts                 # NEW — nightly retention sweep, on the existing queue (FR-047, FR-048)
├── globals/
│   └── contact-settings.ts             # NEW — messenger destinations + message template (R9)
├── lib/
│   ├── cart/
│   │   ├── cookie.ts                   # NEW — the httpOnly id+secret cookie (R2)
│   │   ├── session.ts                  # NEW — resolve "whose cart is this", customer or guest (R3)
│   │   ├── actions.ts                  # NEW — 'use server': add, setQuantity, remove, checkout
│   │   ├── loader.ts                   # NEW — read + revalidate + compute totals (R5, R6)
│   │   ├── merge.ts                    # NEW — guest → account at sign-in, our matcher (R4)
│   │   ├── message-customer.ts         # NEW — optional name + default address, never redirects (R18)
│   │   ├── retention.ts                # NEW — the two retention periods, as configuration (FR-051)
│   │   └── types.ts                    # NEW — CartView, CartLineView, CartIssue
│   ├── catalog/
│   │   └── cart-intent.ts              # CHANGED — the empty `submit` body calls lib/cart (R1)
│   ├── messengers/
│   │   ├── normalise.ts                # NEW — phone/username → stored identifier (R10)
│   │   ├── links.ts                    # NEW — identifier + text → platform URL (R10)
│   │   └── message.ts                  # NEW — CartView + template → message text
│   ├── auth/actions.ts                 # CHANGED — sign-in calls the merge (R4)
│   └── contact.ts                      # CHANGED — SOCIAL_LINKS deleted (R11)
├── components/
│   ├── commerce/
│   │   ├── cart-item/                  # unchanged — built in 003, first consumer now
│   │   ├── cart-lines/                 # NEW — the rows card + remove confirmation
│   │   ├── order-summary/              # NEW — counts, shipping, subtotal, agreement, CHECKOUT
│   │   ├── cart-empty/                 # NEW — the undrawn empty state (FR-015)
│   │   ├── handoff-modal/              # NEW — the three messenger rows (FR-021)
│   │   └── product-purchase/           # CHANGED — buttons live; size value → id (R16)
│   ├── layout/
│   │   ├── cart-count/                 # NEW — client provider seeding Header's badge (R8)
│   │   ├── header|footer|contact-banner|mobile-nav/   # CHANGED — social from the global (R11)
│   └── ui/
│       ├── modal/                      # CHANGED — 500px size + centred heading (R13)
│       └── messenger-row/              # NEW — mark, name, handle, chevron
└── payload.config.ts                   # CHANGED — register the new global

migrations/                             # NEW — one migration for contact-settings
tests/
├── unit/                               # normalisation, link building, message, totals
├── integration/                        # cart operations, access, merge
├── e2e/                                # the flow, both modals, responsive
└── a11y/                               # cart route + modals
```

**Structure Decision**: the existing single-repo layout is kept exactly. Cart logic goes in
`src/lib/cart/` beside `src/lib/catalog/` and `src/lib/auth/`, matching how specs 003 and 004 each
took a directory; messenger link building goes in `src/lib/messengers/` because it is pure and
testable without a database and must not be reachable only through the cart. Components follow the
established split — `commerce/` for cart-specific composition, `ui/` for the two genuinely shared
primitives. Every path is kebab-case; `pnpm check:naming` enforces it.

## Phasing

Ordered so each phase is independently demonstrable, matching the spec's user-story priorities.

**These numbers are the same numbers `tasks.md` uses.** An earlier draft of this table ran 0–6 while
the task list ran 1–8, which meant "phase 4" named two different things depending on which file you
were holding. One scheme, and the spike is shown where it actually lives — as the gate at the top of
Phase 2 rather than as a phase of its own.

| Phase | Delivers | Spec | Tasks |
| --- | --- | --- | --- |
| **1. Setup** | Directory skeleton, seed shapes, empty suites. | — | T001–T003 |
| **2. Cart plumbing** | **Opens with the blocking spike** (R3). Then cookie, session resolution, actions, loader, totals. No UI. | FR-001–007, 012–014 | T004–T015 |
| **3. Add to cart** | `ProductPurchase` buttons live, size mapping, guest-cart merge, header count. | US1, FR-005, FR-016 | T016–T026 |
| **4. The cart page** | Route, rows, summary, remove confirmation, empty state, responsive. | US2, FR-008–018 | T027–T041 |
| **5. Seller settings** | The global, normalisation, link building, migration, admin verification. | US5, FR-033–042 | T042–T053 |
| **6. Handoff** | Modal, message composition incl. the customer block, CHECKOUT wiring, the copy affordance. | US3, FR-019–028a, FR-043–046 | T054–T070 |
| **7. Buy now** | The single-piece path that never touches the cart. | US4, FR-019, FR-020 | T071–T075 |
| **8. Chrome, retention + budgets** | `SOCIAL_LINKS` removal, cart retention and erasure, bundle measurement, a11y scan, e2e. | FR-047–052, SC-008, SC-009, SC-014, SC-016, SC-017 | T076–T092 |

Phase 5 precedes phase 6 deliberately: the modal cannot be built against destinations that do not
exist yet without hardcoding the placeholders it is meant to remove. That is a dependency, not a
re-prioritisation of US5 above US3.

## Complexity Tracking

Two recorded exceptions. Neither is a simplification for its own sake; both are deviations from a
constitution clause, recorded here because *Governance* requires deviations to be documented rather
than argued away.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| **No kill switch** — *Releases*: "Behaviour-changing commerce features ship behind a flag with a documented kill switch." | Owner's decision, taken with the gap stated. The failure this clause guards against is mostly already covered from a different direction: the most likely thing to need switching off is a wrong messenger destination, and FR-023 lets the owner correct or disable that in the admin in seconds, with no deploy. The site takes no money, so a fault cannot cost a customer anything irreversible. | A flag was proposed and declined. What remains uncovered is a defect in the cart or the handoff itself, which would need a revert rather than a toggle — accepted deliberately. **Time-boxed**: revisit before any payment provider is added, at which point the clause's original reasoning applies in full. |
| **No checkout logging or monitoring** — *Observability*: structured logging with a correlation ID is "mandatory", and checkout conversion and error rate "MUST be monitored and alerted on." | Not addressed in this revision. Recorded as an open gap rather than closed silently. | No alternative was evaluated. This is the one item in the analysis that remains genuinely unhandled; it should be closed before the feature is announced, since a handoff that silently fails for a subset of devices is exactly the failure that only telemetry finds. |

Everything else passes: no new dependency, no new service, no new data store beyond the single
global the feature is specified to need.
