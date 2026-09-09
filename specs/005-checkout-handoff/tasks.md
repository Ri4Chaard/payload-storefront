---
description: "Task list for 005-checkout-handoff"
---

# Tasks: Checkout — Cart, Buy Now and Messenger Handoff

**Input**: Design documents from `/specs/005-checkout-handoff/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: **Included, and not optional here.** The constitution's *Development Workflow & Quality
Gates* makes business-logic coverage a blocking CI gate — "pricing, cart, discounts, inventory MUST
be covered by tests" — and each contract carries an explicit *Test obligations* table. Every test
task below traces to one of those rows.

**Organization**: Grouped by user story. Phase numbers are the same numbers
[plan.md](./plan.md#phasing) uses — one scheme across both files.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel **with the other `[P]` tasks in the same phase** — different files, no
  dependency on incomplete work. Tasks in different phases never run together, so a file touched by
  two phases is not a conflict.
- **[Story]**: `[US1]`–`[US5]`, mapping to the spec's user stories.

**One test file, one task per phase.** Tests for a given file are gathered into a single task rather
than split across three, so that `[P]` never appears twice against the same path.

## Path Conventions

Single repo, Payload CMS + Next.js App Router. Source under `src/`, tests under `tests/`.
Every path is kebab-case — `pnpm check:naming` is a blocking gate.

---

## Phase 1: Setup

**Purpose**: Directory skeleton, the seed shapes later phases assume, and every test file created up
front so no later task has to invent one.

- [X] T001 Create `src/lib/cart/` and `src/lib/messengers/` with a placeholder module docstring in each, matching the header style of `src/lib/catalog/queries.ts`
- [X] T002 [P] Extend `scripts/seed-catalog.ts` so the seeded catalogue guarantees a piece with both a stone and a size, one with neither, one sold out, and one with a **Cyrillic** title — the four shapes the test tiers below need
- [X] T003 [P] Create the empty suites every later task writes into: `tests/unit/cart-totals.test.ts`, `tests/unit/messenger-normalise.test.ts`, `tests/unit/messenger-links.test.ts`, `tests/unit/messenger-message.test.ts`, `tests/integration/cart-access.test.ts`, `tests/integration/cart-operations.test.ts`, `tests/integration/cart-loader.test.ts`, `tests/integration/cart-merge.test.ts`, `tests/integration/cart-handoff.test.ts`, `tests/integration/contact-settings.test.ts`, `tests/integration/cart-retention.test.ts`, `tests/e2e/cart.spec.ts`

---

## Phase 2: Cart plumbing (Blocking Prerequisites)

**Purpose**: Everything the storefront needs to read and write a cart. No UI.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. Research
[R1](./research.md) rules out the plugin's React provider, so this layer is the *only* way to reach
the `carts` table.

### The blocking spike

- [X] T004 Spike in `tests/integration/cart-access.test.ts`: assert that a Payload Local API read passing only `req: { context: { cartSecret } }` and `overrideAccess: false` returns a guest cart, per research R3. **If this fails, stop** — adopt the documented `payload.find({ overrideAccess: true, where: { and: [{ id }, { secret }] } })` fallback and record the change in research.md before continuing

### Implementation

- [X] T005 [P] Define `CartView`, `CartLineView` and `CartIssue` in `src/lib/cart/types.ts` per [data-model.md §2](./data-model.md), keeping `unitMinor` the only raw amount and documenting why
- [X] T006 [P] Implement the httpOnly `aurum-cart` cookie (id + secret) and the readable `aurum-cart-count` cookie in `src/lib/cart/cookie.ts`, with `sameSite: 'lax'` and the reason recorded — `strict` drops the cookie on the return from WhatsApp — and the note that both are strictly functional and therefore not gated behind cookie consent (FR-050)
- [X] T007 Implement `CartOwner` resolution in `src/lib/cart/session.ts` (customer session wins over cookie; builds the `req` each Payload call needs) per [cart-actions.md §2](./contracts/cart-actions.md) — depends on T006
- [X] T008 Implement `getCart()` and `getCartCount()` in `src/lib/cart/loader.ts`: read, re-read products from the published catalogue, classify issues, compute totals from integers, format once — depends on T005, T007
- [X] T009 Implement `addToCart`, `setLineQuantity` and `removeLine` in `src/lib/cart/actions.ts` as `'use server'`, each re-deriving ownership and passing our `cartItemMatcher` explicitly (FR-001) — depends on T007
- [X] T010 Add `refresh()` from `next/cache` to every mutating action in `src/lib/cart/actions.ts`, with the comment recording why `revalidatePath` is wrong for per-visitor state (research R7) — depends on T009
- [X] T011 Replace the empty `submit` body in `src/lib/catalog/cart-intent.ts` with a call into `src/lib/cart/actions.ts`, keeping both exported signatures byte-identical so nothing above the seam changes — depends on T009

### Tests

- [X] T012 [P] Unit tests in `tests/unit/cart-totals.test.ts`: subtotal summed from integers and formatted once; an unavailable line excluded; an empty cart returns `empty: true` and no summary; `formatPrice` throwing on a fractional minor unit (FR-012, FR-013, FR-015, SC-006)
- [X] T013 [P] Integration tests in `tests/integration/cart-operations.test.ts`: same product with a different size makes two lines; identical options sum into one; quantity clamped server-side against current stock; the loader never returns `cart.subtotal` — a negative that stays true only if something asserts it (FR-004, FR-009, research R5)
- [X] T014 [P] Integration tests in `tests/integration/cart-access.test.ts`: customer A cannot read or mutate customer B's cart; a guest cookie naming someone else's cart is refused; a signed-in customer's cart is reachable from a second session with no cookie, proving it follows the account rather than the device; no action returns a raw database message (FR-006, FR-007, SC-010)

**Checkpoint**: A cart can be created, read, mutated and revalidated from the server. Nothing is visible yet.

---

## Phase 3: User Story 1 — Put a chosen piece in the cart (Priority: P1) 🎯 MVP

**Goal**: ADD TO CART works from the product page, carrying the chosen stone and size, and the header counts and links.

**Independent Test**: Add a piece with both options chosen, reload, confirm the header count survives; add the same piece in a different size and confirm two lines exist rather than a quantity of two.

### Tests

- [X] T015 [P] [US1] Unit test in `tests/unit/catalog-cart-intent.test.ts` extending the existing suite: a size chosen by *value* maps to the right numeric `sizeId` (research R16)
- [X] T016 [P] [US1] Integration tests in `tests/integration/cart-merge.test.ts`: merging a guest cart keeps both sizes of one ring, sums only true matches, drops nothing from either side, and deletes the guest cart afterwards (FR-005)
- [X] T017 [P] [US1] Integration tests in `tests/integration/cart-operations.test.ts`: adding an unpublished or sold-out product, or one with an unmade required choice, is refused with the field named (FR-002, FR-003)

### Implementation

- [X] T018 [US1] Implement `mergeGuestCart` in `src/lib/cart/merge.ts` using `cartItemMatcher` from `src/collections/carts.ts`, deleting the guest cart and clearing both cookies in that order — the plugin's own merge collapses sizes (research R4)
- [X] T019 [US1] Call `mergeGuestCart` from the sign-in action in `src/lib/auth/actions.ts`, logging and swallowing failure so a merge can never block a sign-in — depends on T018
- [X] T020 [US1] Map the chosen size's `value` back to its `SizeOption.id` in `src/components/commerce/product-purchase/product-purchase.tsx`, with a comment naming the trap: the stone select uses ids, the size select uses values (research R16)
- [X] T021 [US1] Enable ADD TO CART in `src/components/commerce/product-purchase/product-purchase.tsx` — wire it to `addToCart`, add pending and success states, and remove the "deliberately and temporarily disabled" note from the module docstring — depends on T011, T020
- [X] T022 [US1] Render the refusal message beside the action in `src/components/commerce/product-purchase/product-purchase.tsx`, naming the unmade or unavailable choice in words rather than colour, via `role="status"` — depends on T021
- [X] T023 [P] [US1] Build the client cart-count provider in `src/components/layout/cart-count/`, seeded from the readable cookie and updated from each action's returned `itemCount` (research R8)
- [X] T024 [US1] Give the cart `IconButton` in `src/components/layout/header/header.tsx` `href="/cart"` — `IconButton` already supports `href`, and the button currently has none, so the header counts the cart but cannot reach it (FR-016)
- [X] T025 [US1] Mount the provider in `src/app/(frontend)/layout.tsx` and feed `cartCount` to the existing `Header` prop — **without** calling `cookies()` in the layout, which would make every route dynamic and cost the prerendered catalogue — depends on T023
- [X] T026 [P] [US1] Update `src/components/commerce/product-purchase/product-purchase.stories.tsx` with live-action stories: pending, refused-for-missing-size, refused-for-sold-out

**Checkpoint**: US1 is independently demonstrable — a visitor can fill a cart, watch the badge, and click through to a page that does not exist yet.

---

## Phase 4: User Story 2 — Review and adjust the cart (Priority: P2)

**Goal**: `/cart` renders the drawn page at three widths, with working quantity, removal-with-confirmation, totals, staleness and an empty state.

**Independent Test**: With three lines, change a quantity and watch the summary follow; press the bin, cancel, confirm nothing is removed; press again, confirm, and watch the line and its contribution disappear.

### Tests

- [X] T027 [P] [US2] Integration tests in `tests/integration/cart-loader.test.ts` for the four issue kinds in [cart-loader.md §4](./contracts/cart-loader.md) — unpublished, unavailable, price-changed, quantity-reduced — each still rendering its line and each excluded from the total as specified; plus a deleted product yielding a named line with `href: null` rather than throwing (FR-014)

### Implementation

- [X] T028 [P] [US2] Add the 500px panel size and a centred-heading option to `src/components/ui/modal/modal.tsx` as props, extending rather than copying (research R13, Principle II)
- [X] T029 [P] [US2] Build `src/components/commerce/cart-lines/` — the card wrapping the existing `CartItem` rows as a `<ul>`, with the chosen stone and size shown on each line (FR-008)
- [X] T030 [US2] Add the REMOVE ITEM confirmation to `src/components/commerce/cart-lines/`, using `Modal` with the centred heading, dismissible by close mark, backdrop and Escape, removing nothing until confirmed (FR-010) — depends on T028
- [X] T031 [P] [US2] Build `src/components/commerce/order-summary/` — item count, shipping, subtotal, the CHECKOUT button and the unticked terms agreement linking to both policies (FR-011, FR-018)
- [X] T032 [US2] Refuse CHECKOUT until the agreement is ticked in `src/components/commerce/order-summary/`, naming the agreement as the reason (FR-018) — depends on T031
- [X] T033 [P] [US2] Build `src/components/commerce/cart-empty/` following the existing `listing-empty` pattern, with a route back into the catalogue and no summary card (FR-015)
- [X] T034 [US2] Build the route `src/app/(frontend)/(shop)/cart/page.tsx` — server component, `noindex`, composing the three components above from `getCart()` — depends on T008, T029, T031, T033
- [X] T035 [US2] Surface issue lines in `src/app/(frontend)/(shop)/cart/page.tsx` with the reason in **text**, and block CHECKOUT until they are acknowledged (FR-014) — depends on T034
- [X] T036 [US2] Wire the quantity stepper and bin in `src/components/commerce/cart-lines/` to `setLineQuantity` and `removeLine`, with per-row pending states (FR-009) — depends on T009, T030
- [X] T037 [US2] Add the note to `src/lib/revalidate.ts` recording `/cart` as a fourth deliberately-uncached route, beside the three already documented there (research R12)
- [X] T038 [P] [US2] Stories in `src/components/commerce/{cart-lines,order-summary,cart-empty}/*.stories.tsx` covering filled, single-line, stale-line and empty states
- [X] T039 [US2] Verify `src/app/(frontend)/(shop)/cart/page.tsx` against nodes `255:3635`, `425:11164` and `425:11269` at 1920, 768 and 390 — no horizontal scroll at any width (FR-017) — depends on T034

**Checkpoint**: US1 and US2 both work independently. A customer can assemble and correct a selection.

---

## Phase 5: User Story 5 — Seller destinations in the admin (Priority: P5, sequenced early)

> **Why P5 runs before P3 and P4.** The handoff modal cannot be built against destinations that do
> not exist without hardcoding the very placeholders this story removes. The plan numbers this the
> same way — its Phase 5 is this phase — and it is a dependency, not a re-prioritisation.

**Goal**: The owner sets the shop's real WhatsApp number and Telegram username in the admin, writing them as they would say them, and cannot save a row that leads nowhere.

**Independent Test**: Change a handle in the admin and confirm the storefront follows within the session with no deployment; enable a row with an empty destination and confirm the save is refused with the field named.

### Tests

- [X] T040 [P] [US5] Unit tests in `tests/unit/messenger-normalise.test.ts`: `+1 (555) 010 20-30` → `15550102030`; leading zeros and international prefixes stripped; `@aurum`, a bare username and a `t.me` URL all normalise identically (FR-035, FR-036, SC-007)
- [X] T041 [P] [US5] Unit tests in `tests/unit/messenger-links.test.ts`: built links match the verified `wa.me`, `t.me` and `ig.me` formats exactly, and Instagram reports `carriesMessage: false` (FR-022, research R10)
- [X] T042 [P] [US5] Integration tests in `tests/integration/contact-settings.test.ts`: an enabled row with an empty or malformed destination cannot be saved; a *disabled* row with a broken one can; changing `handle` leaves `destination` untouched and the reverse; a template without `{{items}}` is refused; a customer session cannot update the global (FR-034, FR-037, FR-039, FR-040, FR-041, SC-012)

### Implementation

- [X] T043 [P] [US5] Implement `normaliseDestination` in `src/lib/messengers/normalise.ts` per [messenger-handoff.md §1](./contracts/messenger-handoff.md), with refusal messages that name the field and show the shape rather than a regex
- [X] T044 [P] [US5] Implement `buildLink` and the `MessengerLink` type in `src/lib/messengers/links.ts`, citing the Telegram and WhatsApp sources in the module docstring
- [X] T045 [US5] Model the `contact-settings` global in `src/globals/contact-settings.ts` per [data-model.md §1.1](./data-model.md) — array of messenger rows plus the message template, every field with a label and an admin description, `read` public and `update` `isAdmin` stated explicitly (FR-023, FR-033, FR-034) — depends on T043
- [X] T046 [US5] Attach `revalidateGlobalOnChange` to the global's `afterChange` in `src/globals/contact-settings.ts` so a saved change reaches cached pages without a deployment (FR-042) — depends on T045
- [X] T047 [US5] Register the global in `src/payload.config.ts` beside `Shop` and `AccountSettings` — depends on T045
- [X] T048 [US5] Generate and commit the migration for `contact-settings`, then regenerate `src/payload-types.ts` in the same commit — depends on T047
- [X] T049 [US5] Verify the rollback of the new migration in `migrations/` against a seeded, production-sized content set and record the result — depends on T048
- [X] T050 [US5] Implement the cached server-only reader (`getMessengers`, `getMessageTemplate`) in `src/lib/messengers/settings.ts`, returning enabled rows in array order — depends on T047
- [X] T051 [US5] Editorial verification of `src/globals/contact-settings.ts`: create and reorder rows in the Payload admin, confirm the drag handles work and every description reads sensibly to someone who did not write it (FR-038, FR-041) — depends on T048

**Checkpoint**: The shop's real messenger accounts are configurable, validated, and readable by the storefront.

---

## Phase 6: User Story 3 — Hand the cart to the seller (Priority: P3)

**Goal**: CHECKOUT opens the modal, and choosing a messenger opens that conversation with the selection written out — plus the customer's name and delivery address where they have saved them.

**Independent Test**: Submit a three-line cart and confirm the composed message names every piece, stone, size and quantity. Then submit the same cart signed out, and signed in with a saved name and address, and confirm the only difference is the customer block.

### Tests

- [X] T052 [P] [US3] Unit tests in `tests/unit/messenger-message.test.ts` — the whole message suite in one task, since one file: every line, stone, size and quantity present across products with both options, one and neither (SC-002); the customer block for name-only, address-only, both and neither, with an anonymous message equal to a profile-less customer's and `{{customer}}` collapsing without leaving a blank line (FR-045, SC-013); the budget checked on the **encoded link** rather than on `message.length`; a 20-line Cyrillic cart truncating at a line boundary and saying how many pieces are unlisted while the same cart in Latin does not (FR-028, FR-028a, SC-015); one message composed per checkout however many times it is pressed (FR-026, SC-004)
- [X] T053 [P] [US3] Integration tests in `tests/integration/cart-handoff.test.ts`: composing for an anonymous visitor never redirects (FR-046); the **default** address is chosen when several are saved (FR-044); the message address carries the postcode `formatAddress` drops (research R18)

### Implementation

- [X] T054 [P] [US3] Add `formatPostalAddress` to `src/lib/addresses/types.ts` — the seller's form of an address, **postcode included** — beside the existing `formatAddress`, which deliberately drops it for the profile row and is left untouched (research R18)
- [X] T055 [US3] Implement `getMessageCustomer()` in `src/lib/cart/message-customer.ts`, resolving the session with `getCustomer()` — **never** `requireCustomer` / `requireCustomerUser`, which redirect and would put an accidental sign-in gate in the middle of checkout — and returning the saved name and the `isDefault` address, each independently nullable (FR-043, FR-044, FR-046) — depends on T054
- [X] T056 [US3] Implement `composeMessage(cart, template, customer)` in `src/lib/messengers/message.ts` per [messenger-handoff.md §3](./contracts/messenger-handoff.md): substitute `{{items}}`, `{{total}}` and `{{customer}}`, collapse `{{customer}}` and its blank line when absent, degrade per field rather than per auth state, enforce the 2,000-character budget **on the encoded link**, and exclude lines the loader flagged unavailable — depends on T055
- [X] T057 [US3] Implement `beginCheckout` in `src/lib/cart/actions.ts` per [cart-actions.md §3](./contracts/cart-actions.md) — re-validate, resolve the optional customer, compose once, build a link per enabled messenger, write nothing, clear nothing — depends on T009, T050, T055, T056
- [X] T058 [P] [US3] Build the `src/components/ui/messenger-row/` primitive — circular platform mark, name over handle, chevron — with its full state set
- [X] T059 [US3] Build `src/components/commerce/handoff-modal/` from nodes `590:13108`, `590:13775` and `590:13875`, using `Modal` at the 500px size with the centred heading (FR-021) — depends on T028, T058
- [X] T060 [US3] Mark the rows that cannot carry a message in `src/components/commerce/handoff-modal/` and put the message on the clipboard for those, so nobody arrives at an empty Instagram chat believing their selection travelled (FR-021) — depends on T059
- [X] T061 [US3] Add the copy affordance with `CONTACT.email` and `CONTACT.phone` to `src/components/commerce/handoff-modal/` — shown **always**, alongside whatever messenger rows are offered, never conditionally: a page cannot detect whether a messenger will open, so a fallback that waits for failure never reaches the customer who needed it (FR-024, SC-017) — depends on T059
- [X] T062 [US3] State plainly in `src/components/commerce/handoff-modal/` that this is a request, that no payment is taken on the site, and that the seller confirms availability, price and delivery — and say nothing implying anything was received or is awaiting a reply (FR-025, FR-030) — depends on T059
- [X] T063 [US3] Wire CHECKOUT in `src/components/commerce/order-summary/` to `beginCheckout`, disabling the trigger while the modal is open so a double-click cannot compose twice (FR-019, FR-026) — depends on T032, T057, T059
- [X] T064 [US3] Confirm via `src/app/(frontend)/(shop)/cart/page.tsx` that the cart is byte-identical after opening the modal, choosing a messenger and returning (FR-027) — depends on T063
- [X] T065 [P] [US3] Stories in `src/components/commerce/handoff-modal/handoff-modal.stories.tsx`: three messengers, one messenger, none configured, and the Instagram clipboard variant — each showing the copy affordance

**Checkpoint**: A cart can reach the seller. US1–US3 and US5 all work.

---

## Phase 7: User Story 4 — Buy one piece immediately (Priority: P4)

**Goal**: BUY NOW opens the same modal for one piece and leaves the cart untouched.

**Independent Test**: With three unrelated lines already in the cart, use BUY NOW on a fourth product; confirm the message names only that piece and the cart still holds exactly the original three.

### Tests

- [X] T066 [P] [US4] Integration test in `tests/integration/cart-operations.test.ts`: `buyNow` leaves an existing cart byte-identical — same lines, same quantities, same row ids (FR-020, SC-005)
- [X] T067 [P] [US4] Unit test in `tests/unit/messenger-message.test.ts`: a BUY NOW message describes exactly one piece with its chosen options

### Implementation

- [X] T068 [US4] Implement `buyNow` in `src/lib/cart/actions.ts` as a path that never reads or writes the cart — FR-020 as a property of the code path, not a check inside one — depends on T057
- [X] T069 [US4] Enable BUY NOW in `src/components/commerce/product-purchase/product-purchase.tsx`, sharing US1's validation and refusal messages and opening the handoff modal — depends on T021, T059, T068
- [X] T070 [US4] Update the module docstring in `src/components/commerce/product-purchase/product-purchase.tsx`: both actions are live, and record why `addToCart` and `buyNow` kept separate signatures — the divergence spec 003 predicted has now happened — depends on T069

**Checkpoint**: All five user stories are independently functional.

---

## Phase 8: Chrome, retention and budgets

**Purpose**: The cross-cutting work — one source of truth for the shop's accounts, a stated life for
the cart, and the gates that fail quietly if nobody looks.

### One set of accounts (FR-052)

- [X] T071 [P] Delete `SOCIAL_LINKS` from `src/lib/contact.ts` and update its module docstring — the global is now the source of truth (research R11)
- [X] T072 Pass the messengers from `getMessengers()` into `ContactBanner`, `Footer` and `MobileNav` from `src/app/(frontend)/layout.tsx` via their existing `social` props — depends on T050, T071
- [X] T073 Change one messenger account in the `contact-settings` global (`src/globals/contact-settings.ts`) via the admin and verify it changes in the handoff modal, the contact strip, the footer **and** the mobile navigation — the "owner sets the real number, footer still says `wa.me/`" defect this section exists to prevent (FR-052, SC-016) — depends on T072

### Retention and erasure (FR-047 – FR-051)

- [X] T074 [P] Define the two retention periods as configuration in `src/lib/cart/retention.ts` — 30 days for a guest cart, 12 months for a customer's — recording that a retention period living only in a source file is one nobody outside the repository can read or change (FR-047, FR-048, FR-051)
- [X] T075 Implement `expireCartsTask` in `src/jobs/expire-carts.ts` and register it on the existing `nightly` queue in `src/payload.config.ts` beside `purgeAccountsTask` — a second task on one scheduler, not a second scheduler — depends on T074
- [X] T076 Delete a customer's carts in the same operation that deletes the customer, in `src/collections/customer-hooks.ts`, extending the path spec 004 already built, so an erasure request leaves no cart naming what they wanted (FR-049)
- [X] T077 [P] Integration tests in `tests/integration/cart-retention.test.ts`: a guest cart past 30 days and a customer cart past 12 months are both gone; carts inside their windows survive; deleting a customer removes their carts (SC-014) — the clock is controlled by back-dating `updatedAt`, never by waiting

### The recorded absences (FR-029, FR-030)

- [X] T078 [P] Integration test in `tests/integration/cart-handoff.test.ts`: `orders` and `transactions` remain disabled and a completed handoff writes no row anywhere — the negative FR-029 asserts, which stays true only while something checks it

### Verification and gates

- [X] T079 [P] E2E in `tests/e2e/cart.spec.ts`: the full flow — add, adjust, remove with confirmation, checkout, choose a messenger — at 390, 768 and 1920, signed out throughout and never once shown a sign-in prompt (FR-031, SC-011), asserting the copy affordance is present even with three messengers configured (SC-017)
- [X] T080 E2E in `tests/e2e/cart.spec.ts`: signing in **while the handoff modal is open** neither discards it nor loses the cart (FR-032); and reordering messengers in the admin reorders the modal (FR-038) — same file as T079, so not `[P]` with it
- [X] T081 [P] A11y scan in `tests/a11y/routes.spec.ts` extended to `/cart` and both dialogs (SC-008)
- [X] T082 Complete the entire flow by keyboard alone and with a screen reader; confirm both modals trap focus, close on Escape, and return focus to what opened them (FR-017, SC-008) — depends on T079
- [X] T083 Time a first-time visitor from the product page to an open messenger and confirm it is under 60 seconds, choices included (SC-001) — depends on T079
- [X] T084 Measure `/cart` initial JS against a **production server** (`pnpm build && pnpm start`, devtools Network, gzipped transfer before load) and record it against the 300KB total and 100KB-above-baseline budgets — the margin is ~16KB (SC-009) — depends on T034
- [X] T085 [P] Add the story-test entries for every new component to `tests/stories/ui-kit.spec.ts`
- [X] T086 Run `pnpm lint && pnpm typecheck && pnpm check:naming && pnpm check:tokens && pnpm check:styles && pnpm check:stories` and fix anything they report
- [X] T087 Run every scenario in [quickstart.md](./quickstart.md) end to end, including the "What you should *not* find" list — no order record, no reference, no sign-in prompt, no cart cleared by the site, no payment
- [X] T088 Update `docs/mvp-brief.md` to record that `004-requests-and-handoff` shipped as `005-checkout-handoff`, with **the brief's own** FR-041, FR-042, FR-045 to FR-052 deferred, and why — noting those numbers are the brief's, not this spec's, which reuses the same range for different requirements

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)** — no dependencies.
- **Phase 2 (Cart plumbing)** — depends on Setup. **Blocks every user story.** T004 blocks the rest of the phase.
- **Phase 3 (US1)** — depends on Phase 2.
- **Phase 4 (US2)** — depends on Phase 2. Independent of US1 in code, though a cart is easier to demonstrate once US1 can fill one.
- **Phase 5 (US5)** — depends on Phase 2 only. **Blocks US3 and US4.**
- **Phase 6 (US3)** — depends on Phase 2, Phase 4 (the CHECKOUT button) and Phase 5 (the destinations).
- **Phase 7 (US4)** — depends on Phase 6 (the modal) and Phase 3 (the product-page wiring).
- **Phase 8** — depends on the stories being delivered. T071–T073 additionally depend on Phase 5.

### Story dependency graph

```
Phase 2 (cart plumbing)
   ├── US1  add to cart ─────────────┐
   ├── US2  cart page ───────────┐   │
   └── US5  seller settings ─────┤   │
                                 ↓   │
                             US3 handoff
                                 ↓   │
                             US4 buy now ←┘
```

### Within each story

Tests are written first and must fail before the implementation lands. Pure modules before the
services that call them; services before components; components before routes.

### Parallel opportunities

- **Phase 1**: T002 and T003 together.
- **Phase 2**: T005 and T006 after T004; then T012, T013 and T014 together — three files, three tasks.
- **Phase 3**: T015, T016, T017 together; T023 alongside the `product-purchase` work, which it does not touch.
- **Phase 4**: T028, T029, T031, T033 are four different directories — all four together.
- **Phase 5**: T040, T041, T042 together; then T043 and T044 together.
- **Phase 6**: T052 and T053 together; T054 and T058 together.
- **Phase 8**: T071, T074, T077, T078, T079, T080, T081, T085 together.
- **Across stories**: with two developers, US2 and US5 can run side by side the moment Phase 2 closes — they share no files.

---

## Parallel Example: Phase 5 (US5)

```bash
# Tests first, three different files:
Task: "Unit tests for destination normalisation in tests/unit/messenger-normalise.test.ts"
Task: "Unit tests for link building in tests/unit/messenger-links.test.ts"
Task: "Integration tests for the global's validation in tests/integration/contact-settings.test.ts"

# Then the two pure modules, also different files:
Task: "Implement normaliseDestination in src/lib/messengers/normalise.ts"
Task: "Implement buildLink in src/lib/messengers/links.ts"
```

---

## Implementation Strategy

### MVP

**Phases 1 + 2 + 3.** A visitor can put a chosen piece, with its stone and its size, into a cart that
survives a reload and a sign-in, and the header both counts it and links to it. There is nowhere to
view it yet, which is why US2 follows immediately — but the hard half (research R1–R5) is done and
demonstrable at this point.

### Incremental delivery

1. **Phase 2** → the cart plumbing exists; nothing is visible. *Not shippable.*
2. **+ US1** → pieces go into a cart, the badge counts them. Shippable, if odd.
3. **+ US2** → the cart page. Shippable and genuinely useful — a customer can assemble a selection and screenshot it.
4. **+ US5** → the owner's real accounts are configured. Invisible to customers.
5. **+ US3** → the feature does what it is for. **This is the first release worth announcing.**
6. **+ US4** → the shortcut.
7. **+ Phase 8** → the footer stops contradicting the admin, the cart gets a stated life, and the budgets are measured.

### Notes

- Checkout changes need **two** approving reviews under the constitution, and reviewers must
  explicitly check the duplication and hardcoded-content gates — and read the plan's *Complexity
  Tracking*, which records two deviations: **no kill switch** (the owner's decision, time-boxed to
  the arrival of a payment provider) and **no checkout logging or monitoring** (open).
- Commit the regenerated `src/payload-types.ts` in the same commit as the schema change (T048) — a
  stale generated type fails review.
- T004 is a genuine stop-the-line gate. Everything downstream assumes its answer.
- Do not add a dependency. The plan passes the Constitution Check partly *because* it adds none, and
  the route budget has ~16KB of headroom.
