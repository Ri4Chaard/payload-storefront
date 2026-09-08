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

**Scale/Scope**: One new route (`/cart`), one new global, ~10 new components, 4 client trees,
42 functional requirements. No new collection.

## Constitution Check

*GATE: passed before Phase 0, re-checked after Phase 1 design. Result: **PASS**, no violations, no
Complexity Tracking entries.*

| Principle | Gate | Verdict |
| --- | --- | --- |
| **I. Payload is the single source of truth** | No user-visible copy hardcoded; messenger destinations editable without a deploy | **Pass.** FR-033–FR-042 land the `contact-settings` global; R11 additionally deletes `SOCIAL_LINKS` so the footer's WhatsApp icon and the handoff modal cannot disagree. Functional UI strings (button labels, the removal confirmation) stay in components — the precedent `AccountSettings` sets and documents. |
| **II. Reuse before creation (NON-NEGOTIABLE)** | Search the kit first; extend rather than copy | **Pass.** `CartItem`, `QuantityStepper`, `IconButton`, `Checkbox`, `Button`, `Link`, `Modal`, `useOverlay`, `SectionHeading` and `Container` are all reused unchanged. `Modal` gains a size and a heading alignment prop rather than a sibling (R13). The one new kit primitive, `MessengerRow`, has three consumers on day one. |
| **III. Design tokens over magic values** | No raw hex, no arbitrary spacing, full state sets | **Pass.** New components use existing tokens; `pnpm check:tokens` and `check:styles` gate it. Every new interactive element ships default/hover/focus-visible/active/disabled/loading. |
| **IV. Content modelling & schema evolution** | Model before implementing; labels and descriptions; explicit access; tested migration + rollback | **Pass.** [data-model.md](./data-model.md) models the global before any code. Every field carries a label and an admin description (FR-041); access is stated explicitly, never by omission. One migration, generated and committed, with a rollback verified against seeded content. |
| **V. Performance, accessibility & SEO budgets** | Server components default; budgets; WCAG 2.2 AA | **Pass, and it is the tightest gate.** R1 keeps the cart page server-rendered; R8 keeps the header's count from making every route dynamic and losing the prerendered catalogue; R15 sizes the four client trees against a ~16KB margin and a task measures it against a production server. `/cart` is `noindex` — a per-visitor page has nothing to index. |
| **VI. Commerce correctness & data protection** | Server-side amounts; integer minor units; no cross-customer reads | **Pass.** R5 computes every displayed amount server-side from published data and never renders the client's number; `formatPrice` already refuses non-integer minor units. R2 keeps the cart bearer secret out of JavaScript's reach — a strict improvement on the `localStorage` the plugin would have used. No payment instrument exists to protect. Idempotency is re-scoped by R14, since FR-029 removed the record it would otherwise have guarded. |

**Two notes rather than violations:**

- **R11 touches three files outside this feature's screens** (`contact-banner`, `footer`,
  `mobile-nav`). This is Principle I and II *requiring* the change, not scope creep: shipping the
  global without it means the owner sets a real WhatsApp number and the footer keeps pointing at a
  placeholder. All three components already take `social` as a prop, so it is a wiring change.
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

| Phase | Delivers | Spec |
| --- | --- | --- |
| **0. Spike** | Confirm a partial `req` carrying `context.cartSecret` satisfies `hasCartSecretAccess` (R3). One integration test. Blocks everything else. | — |
| **1. Cart plumbing** | Cookie, session resolution, actions, loader, totals. No UI. | FR-001–007, 012–014 |
| **2. Add to cart** | `ProductPurchase` buttons live, size mapping, header count. | US1, FR-016 |
| **3. The cart page** | Route, rows, summary, remove confirmation, empty state, responsive. | US2, FR-008–018 |
| **4. Seller settings** | The global, normalisation, link building, migration, admin verification. | US5, FR-033–042 |
| **5. Handoff** | Modal, message composition incl. the customer block, CHECKOUT and BUY NOW wiring, fallback. | US3, US4, FR-019–028, FR-043–046 |
| **6. Chrome + budgets** | `SOCIAL_LINKS` removal (R11), bundle measurement, a11y scan, e2e. | R11, SC-008, SC-009 |

Phase 4 precedes phase 5 deliberately: the modal cannot be built against destinations that do not
exist yet without hardcoding the placeholders it is meant to remove.

## Complexity Tracking

No entries. The Constitution Check passes on every principle, no new dependency is introduced, and
no exception is requested.
