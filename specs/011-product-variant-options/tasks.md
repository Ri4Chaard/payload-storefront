---

description: "Task list for Product Variant Options"
---

# Tasks: Product Variant Options

**Input**: Design documents from `/specs/011-product-variant-options/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: included. Not because the spec asked in those words, but because this repository's gate
set is `lint · typecheck · check:naming · check:stories · check:tokens · check:styles ·
check:contrast · test · test:integration · test:e2e · test:a11y · test:stories`, and a task list that
produced code those gates had never seen would be a task list that ends in a surprise.

**Organization**: by user story, in spec priority order. US1 is the MVP and is a live defect.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files, no dependency on incomplete work — can run in parallel
- **[Story]**: US1–US4, mapping to the spec's user stories

## Path Conventions

Payload config, collections and hooks under `src/payload.config.ts` and `src/collections/`. The
catalogue tier under `src/lib/catalog/`, the cart under `src/lib/cart/`. Feature components under
`src/components/commerce/`. Every path kebab-case — `pnpm check:naming` is a blocking gate.

---

## Carried decisions

Read before starting. Two of these correct documents written earlier in this feature.

| Item | State | Affects |
| --- | --- | --- |
| **Three migrations, not one** | **Corrects plan.md.** One big migration would drop `products.sizes` in the foundational phase and break `typecheck` until US4 landed — in Payload the config change *is* the schema change, so a story's code and its columns are inseparable. Split additive/destructive along story lines instead: each is reversible on its own and each story stays shippable | T009, T031, T043 |
| **`variants.availability` is for the admin form only** | The storefront reads the parent it already has. A stale mirror can misdraw a form; it can never sell what should not be sold (R5) | T006, T014 |
| **Colour keeps `black`/`clear`/`green`/`multicolor` as its `value`** | FR-020 is a promise about strings. Every bookmarked and indexed link rests on it | T009, T031, T041 |
| **The colour filter's logic does not change** | It moves from the parser's closed set to its open set, where `category` already lives. Same key, same chips, same predicate (R2) | T033, T034 |
| `shape` stays a closed set | `parseClosedSet`, `SHAPES`, `SHAPE_KEYS` all survive. Only `COLOURS`/`COLOUR_KEYS` go | T033 |
| **`cartItemMatcher` changes meaning** | Two lines differing only by size collapse on the next merge. Correct once size is gone — and why FR-029 promises *usable*, not *unchanged* | T046 |
| `check:stories` covers `src/components/ui` only | Commerce components need no story file. Add one where it helps, not to satisfy a gate | T026 |
| The `listing.spec.ts` price-slider test is a known cold-start flake | This feature touches the filter pipeline it exercises. Run e2e warm before calling a failure a defect | T001, T055 |

---

## Phase 1: Setup

**Purpose**: know what green looks like before changing anything, and capture the defect US1 fixes.

- [X] T001 Run the full gate set on a warm dev server and record the result in the PR description, including whether `tests/e2e/listing.spec.ts` price-slider passes — so a later failure there is attributable rather than alarming
- [X] T002 [P] Capture the US1 defect as it exists today, following [quickstart §1 step 1](./quickstart.md#1-made-to-order-stops-asking-for-stock-us1-p1): a Made-to-order piece with two stones and no quantities, whose stones both read unavailable on the product page. This is the before-state SC-002 is measured against

**Checkpoint**: baseline known, defect demonstrated.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: no user story work begins until this phase is complete.

**Purpose**: everything additive — the new collection and the new variant columns. Nothing is
removed here, so the tree stays green and the storefront is unchanged.

### Schema

- [X] T003 [P] Create `src/collections/colours.ts` — localized required `label`, unique indexed `value`, sidebar `order`; `read: () => true` with `isAdmin` writes; `revalidateOnChange`/`revalidateOnDelete`. Model it on `src/collections/categories.ts`, not on `sizes.ts` (research R1)
- [X] T004 Register `Colours` in the `collections` array in `src/payload.config.ts`
- [X] T005 [P] Add the `attributes` array to `src/collections/variants.ts` — copy the definition from `src/collections/products.ts` verbatim, **including the comment explaining why `value` is localized but not `required`**, which is a spec-010 trap that will otherwise be walked into again
- [X] T006 [P] Add a read-only `availability` select to `src/collections/variants.ts`, mirroring the product's options. Its admin description must say it is written by a hook and exists so the quantity field can hide itself

### Hooks

- [X] T007 Create `src/collections/product-hooks.ts` with `cascadeAvailability` (a `products` `afterChange` writing `availability` to every variant of the piece, only when the value actually changed) and `stampAvailability` (a `variants` `beforeChange` reading the parent so a stone created against an already-made-to-order piece is right immediately)
- [X] T008 Wire `cascadeAvailability` into `productsCollectionOverride.hooks.afterChange` in `src/collections/products.ts` and `stampAvailability` into `variantsCollectionOverride.hooks.beforeChange` in `src/collections/variants.ts`, appending to the plugin's own arrays rather than replacing them

### Migration

- [X] T009 Generate migration **M1 (additive)** covering T003–T006: create `colours` and seed the four rows as `black`, `clear`, `green`, `multicolor` with their existing values; add `variants.attributes`; add `variants.availability` and backfill it from each parent product. Run `pnpm generate:types` and commit the migration, its `.json` snapshot and `src/payload-types.ts` together
- [X] T010 Rehearse M1's `down` on a scratch database per [quickstart §5](./quickstart.md#5-the-rollback-rehearsal). M1 is purely additive so its rollback should be clean — confirm it, and confirm the dev database is untouched afterwards

**Checkpoint**: new columns exist, nothing is removed, the storefront behaves exactly as before.

---

## Phase 3: User Story 1 — Made to order stops asking for stock (Priority: P1) 🎯 MVP

**Goal**: marking a piece made to order carries to its stones — no quantity is asked for, and every
published stone is orderable.

**Independent Test**: mark a piece made to order, add two stones without touching any quantity,
confirm both can be selected and added to a cart.

### Tests for User Story 1

- [X] T011 [P] [US1] Integration test in `tests/integration/made-to-order.test.ts` — the cascade fires on a product's availability change; a stone created against a made-to-order piece is stamped on creation; a quantity already stored survives a switch to made to order and takes effect again on the way back (FR-004)
- [X] T012 [P] [US1] Unit test in `tests/unit/catalog-availability.test.ts` asserting the four-row availability table in [data-model.md](./data-model.md#availability-in-one-place), including `maxQuantity` being `undefined` for a made-to-order stone (FR-003)

### Implementation for User Story 1

- [X] T013 [US1] In `src/collections/variants.ts`, make the plugin's `inventory` field conditional on `availability === 'stock-tracked'` (FR-001). Follow the `adjustInventory` pattern already in `src/collections/products.ts` — narrow on `type === 'number' && name === 'inventory'` before spreading, because `Field` is a union of sixty-odd shapes
- [X] T014 [US1] In `src/lib/catalog/mappers.ts`, give `isVariantAvailable` the piece's availability and return `true` for any published stone of a made-to-order piece. **Rewrite the docblock at line 128** — it currently states the opposite rule as a deliberate decision, and leaving it would make the fix read as a bug
- [X] T015 [US1] In `src/lib/catalog/mappers.ts`, drop the `maxQuantity` ceiling for made-to-order stones (FR-003), and make a made-to-order piece whose every stone is unpublished map to unavailable rather than to an empty selector (FR-008)
- [X] T016 [US1] Carry the availability label through to the stone selector so a made-to-order stone reads as made to order rather than as carrying a count (FR-007) — the `meta` slot on the options in `src/components/commerce/product-options/product-options.tsx`, using the existing `product.madeToOrder` message key
- [X] T017 [P] [US1] E2E in `tests/e2e/made-to-order.spec.ts` — a made-to-order piece with two zero-quantity stones is fully orderable; a stock-tracked piece at zero is not; unpublishing one stone removes it while the other still sells

**Checkpoint**: US1 is independently shippable. The defect captured in T002 is fixed and demonstrable.

---

## Phase 4: User Story 2 — Properties differ per stone (Priority: P2)

**Goal**: a stone carries its own carat weight and certificate, and the details show the selected
stone's values.

**Independent Test**: put different carat weights on two stones of one ring and confirm the details
change as a customer switches between them.

### Tests for User Story 2

- [X] T018 [P] [US2] Unit test in `tests/unit/catalog-attribute-merge.test.ts` for the merge rule in [contracts/product-view.md](./contracts/product-view.md#merging-attributes-fr-010-fr-011-fr-016): a stone value replaces the piece's for the same attribute, an unmatched stone value is appended, ordering follows the attribute's own `order` rather than where the value came from, and an orphaned value is dropped (FR-015)

### Implementation for User Story 2

- [X] T019 [US2] In `src/lib/catalog/mappers.ts`, map each variant's `attributes` onto `DiamondOption.attributes`, reusing the product's existing attribute mapper so an orphaned row is dropped the same way in both
- [X] T020 [US2] Add a `mergeAttributes(piece, stone)` helper in `src/lib/catalog/mappers.ts` implementing the five steps of the contract — by attribute, never by index, because two rows for one attribute is the outcome to avoid
- [X] T021 [US2] Create the selected-stone context in `src/components/commerce/selected-variant/` — a client provider carrying the selected stone id **and nothing else**, so it does not become the page's state container by accident (research R8)
- [X] T022 [US2] Publish the selection from `src/components/commerce/product-purchase/product-purchase.tsx`, which already owns it for the price
- [X] T023 [US2] Add a thin client wrapper beside `src/components/commerce/product-details/product-details.tsx` that reads the context and passes the merged list down. `ProductDetails` itself keeps its props, its stories and its server-rendered rich text
- [X] T024 [US2] Wrap `ProductPurchase` and `ProductDetails` in the provider in `src/app/(frontend)/[locale]/products/[slug]/page.tsx`, leaving the drawn order of the column unchanged
- [X] T025 [US2] Confirm the wrapper added in T023 passes only the merged attribute list — that the piece's `details` rich text and the `description` rendered by `src/components/commerce/product-purchase/product-purchase.tsx` do **not** change with the selection (FR-009a). The decision taken on 2026-09-23, and the easiest thing to widen by accident while wiring T023
- [X] T026 [P] [US2] E2E in `tests/e2e/variant-attributes.spec.ts` — the initial state shows the piece's values, selecting a stone replaces one and appends another without a reload, and switching back restores the piece's own

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 — The owner defines the colours (Priority: P3)

**Goal**: colours become an owner-managed vocabulary, with the filter behaving exactly as it does
today.

**Independent Test**: add a colour in the admin, apply it to a piece, and confirm it filters on the
live site with no deployment.

### Tests for User Story 3

- [X] T027 [P] [US3] Unit test in `tests/unit/catalog-filters.test.ts` (extend the existing file) — `colour` is parsed as an open set, unknown values are no longer dropped by the parser, round-tripping through `toSearchParams` is unchanged, and `shape` is still a closed set
- [X] T028 [P] [US3] Integration test in `tests/integration/colours.test.ts` — an unknown colour is reported through `getListing`'s `ignored` and does not narrow the grid; a colour applied to no piece is absent from the facets (FR-022); deleting a colour still in use is refused (FR-023)

### Implementation for User Story 3

- [X] T029 [US3] Change `colour` in `src/collections/products.ts` from `select hasMany` to `relationship hasMany` to `colours`, keeping `index: true` and the admin description
- [X] T030 [US3] Add the deletion guard to `src/collections/colours.ts` — a `beforeDelete` that refuses while any product still carries the colour, naming the count (FR-023)
- [X] T031 [US3] Generate migration **M2** — move each product's colour values onto relationship rows, then drop `products_colour` and `enum_products_colour`. **Its `down` narrows**: recreating a four-value enum cannot represent a colour the owner has since added, so it must count the offending rows and `RAISE EXCEPTION` naming them rather than discarding, in the shape `migrations/20260901_160441_customer_accounts.ts` established. Run `pnpm generate:types`
- [X] T032 [US3] Rehearse M2's `down` on a scratch database with a fifth colour applied to a piece — it MUST refuse. Then remove that colour and confirm it runs clean ([quickstart §5](./quickstart.md#5-the-rollback-rehearsal))
- [X] T033 [US3] In `src/lib/catalog/filters.ts`, parse `colour` with `unique(valuesFor(input, 'colour'))` instead of `parseClosedSet`, and delete `COLOURS` and `COLOUR_KEYS`. Leave `SHAPES`, `SHAPE_KEYS` and `parseClosedSet` alone
- [X] T034 [US3] In `src/lib/catalog/queries.ts`, add `colours` to `Reference` and its parallel fetch, add a `colourLabel` resolver beside `categoryTitle`, add the `colour` branch to `unknownValues` and to the `applied` narrowing, match on the row's `value` in `matches()` the way `slugsOf` already does for collections, and take the chip label from the row instead of `titleCase`
- [X] T035 [US3] In `src/lib/catalog/queries.ts`, build `facets.colours` from the collection in `order`, offering only colours at least one visible piece carries (FR-022)
- [X] T036 [US3] In `src/lib/catalog/types.ts`, widen `ColourValue` now that it is no longer derived from an enum, and update `ProductView`/`ListingResult` accordingly
- [X] T037 [P] [US3] Delete the `colour.*` keys from `src/i18n/messages/en.json`, `uk.json` and `ru.json` — the label is the row's, in one place rather than four (research R3, Constitution I)
- [X] T038 [US3] Update `src/components/commerce/filter-drawer/filter-drawer.tsx` to take its colour labels from the facets rather than from the message catalogue
- [X] T039 [P] [US3] Update `scripts/seed-catalog.ts` and `scripts/verify-catalog.ts` to create and assert colours as rows
- [X] T040 [P] [US3] E2E in `tests/e2e/colours.spec.ts` — **including the regression that matters**: a link saved before this change, `/rings?colour=black&colour=green`, returns exactly the pieces it did before (FR-020, SC-006); and a renamed label leaves `?colour=<value>` working (FR-019)

**Checkpoint**: US1–US3 all work. Colour is the owner's, and every existing link still resolves.

---

## Phase 6: User Story 4 — Sizes leave the shop (Priority: P4)

**Goal**: size is gone from the admin, the storefront, the filters and the cart.

**Independent Test**: a piece that previously required a size choice adds to the cart in one action,
and nothing anywhere mentions size.

### Tests for User Story 4

- [X] T041 [P] [US4] Update `tests/unit/catalog-filters.test.ts`, `tests/unit/catalog-cart-intent.test.ts`, `tests/unit/cart-totals.test.ts` and `tests/unit/messenger-message.test.ts` to drop size, and add an assertion that a URL carrying `?size=` loads and applies its remaining filters (FR-028)
- [X] T042 [P] [US4] Update `tests/integration/cart-operations.test.ts` for the matcher change — two lines that differed only by size are now one line (FR-029)

### Implementation for User Story 4

- [X] T043 [US4] Delete `src/collections/sizes.ts`, remove `Sizes` from `src/payload.config.ts`, and remove the `sizes` relationship from `src/collections/products.ts`
- [X] T044 [US4] Remove the `size` field from `src/collections/carts.ts` and drop it from `cartItemMatcher` — two lines are now the same line when the product and the stone match
- [X] T045 [US4] Generate migration **M3** — drop `carts.items.size`, `products_sizes` and `sizes`. Rehearse its `down` with a product and a cart line that carried a size ([quickstart §5](./quickstart.md#5-the-rollback-rehearsal)). Run `pnpm generate:types`
- [X] T046 [US4] Remove `size` from `src/lib/catalog/filters.ts` — `FilterState`, `DEFAULT_FILTERS`, `KEY_ORDER`, `MultiFilterKey` and the parse branch
- [X] T047 [US4] Remove size from `src/lib/catalog/queries.ts` — the `matches` branch, `sizeLabel`, `Reference.sizes` and its fetch, the facet, the chip and the `unknownValues` branch
- [X] T048 [US4] Remove `SizeOption` and `ProductView.sizes` from `src/lib/catalog/types.ts` and their mapping in `src/lib/catalog/mappers.ts`
- [X] T049 [US4] Remove size from the cart tier — `src/lib/cart/actions.ts`, `merge.ts`, `operations.ts`, `totals.ts`, `types.ts` and `src/lib/catalog/cart-intent.ts`
- [X] T050 [US4] Remove the size selector and its required-choice refusal from `src/components/commerce/product-purchase/product-purchase.tsx` and `src/components/commerce/product-options/product-options.tsx`, so a piece adds to the cart in one action (FR-025, SC-007)
- [X] T051 [US4] Remove the SIZE group from `src/components/commerce/filter-drawer/filter-drawer.tsx` and any size chip handling in `src/components/commerce/filter-toolbar/filter-toolbar.tsx`
- [X] T052 [US4] Remove size from the cart and handoff surfaces — `src/components/commerce/cart-item/`, `cart-lines/` and `handoff-modal/`, including the composed seller message
- [X] T053 [P] [US4] Delete `catalog.size`, `product.chooseSize`, `product.selectSize` and `product.sizeLabel` from all three files in `src/i18n/messages/`
- [X] T054 [P] [US4] Remove sizes from `scripts/seed-catalog.ts`, `scripts/verify-catalog.ts` and `scripts/seed-translations-data.ts`
- [X] T055 [P] [US4] Update `tests/e2e/product.spec.ts` and `tests/e2e/listing.spec.ts` for the missing selector and filter group, and confirm a piece adds to the cart in one action

**Checkpoint**: all four stories complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T056 [P] `pnpm test:a11y` — **168 pass, zero violations on anything this feature touches**, including the details swapping in place with a stone selected. Two fixes were needed: the sweep still picked a size before adding to the cart, and the `Commerce/ProductOptions` story I renamed rendered NOTHING (the component returns `null` with no stones), which the sweep waits on until it times out — that story is deleted, with the reason written where it stood. **Five failures remain and none is ours**: at 390px the cookie consent banner (`fixed inset-x-0 bottom-0`) covers the bottom of the viewport and intercepts clicks. It breaks `/account`, the menu and the lightbox — none of which this spec touches — so it is spec 009's banner against spec 004's page, pre-existing and out of scope here
- [X] T057 [P] Responsive pass at 1024, 768, 390 and 320 — **35 pass, no horizontal overflow anywhere**. The two failures are `/account` at 390 and 320, blocked by the same cookie banner as T056 and for the same reason; every route this spec owns is clean at every width
- [X] T058 [P] JS budget, measured against a production server (Next 16 + Turbopack prints no per-route JS). Baseline **207.8KB**; worst route **214.3KB**, i.e. **+6.5KB** of application code. Both clauses of Constitution V pass with room — 300KB total and 100KB above baseline. **US2's client provider costs nothing measurable**: the product page reads the same as `/` and `/cart`
- [X] T059 [P] Size-copy sweep. Message files: clean. Four stale strings found and fixed — the listing card's CTA still read **"Select size"** (now `viewPiece`, translated in all three languages), the seeded product prose promised that "Size, carat weight and stone quantities vary", and two stories carried size chips. **Two deliberate leftovers**: `ui/select` and `ui/menu` stories use ring sizes as sample data for domain-agnostic primitives. SC-008 scopes to the admin and the storefront, Storybook is neither, and renaming them would churn components this spec does not own along with their a11y and story assertions
- [X] T060 Editorial verification, automated in `tests/e2e/admin-catalogue.spec.ts`: **Colours** in the navigation and **Sizes** gone; no size field on a product; **no quantity field on a made-to-order stone and one on a stock-tracked stone**; and a colour created THROUGH THE PANEL filtering the live site with no deployment. The quantity assertion is the only check anywhere of the denormalised mirror — every other test reads the parent instead, by design, so without this the column has nothing watching it
- [X] T061 Gate set and rollback rehearsals.
      **Green**: `lint`, `typecheck`, `check:naming`, `check:stories`, `check:tokens`, `check:styles`,
      `check:contrast`, `test` (340), `test:integration` (306).
      **All three rollbacks rehearsed on scratch databases**, dev untouched: M1 additive (clean after
      the `IF EXISTS` fix its rehearsal forced), M2 refusing with a count and a HINT while a fifth
      colour is in use and running clean once it is cleared, M3 restoring `sizes`, `carts_items.size_id`
      and `products_rels.sizes_id`.
      **`test:e2e` 344 pass, `test:a11y` 168 pass, `test:stories` 107 pass — and the suites are not
      clean on this branch.** Every failure was chased down; none is this feature's:
      - **Reproducible, pre-existing**: `/account` at 390 and 320 (`responsive.spec.ts`) and five a11y
        sweeps at mobile width. The cookie consent banner is `fixed inset-x-0 bottom-0`, covers the
        bottom of a narrow viewport and intercepts clicks. Spec 009's banner against spec 004's page —
        neither touched here. Also `public/media/sample.mp4` is absent from this checkout, which 404s
        four video stories and leaves the hero 840px tall where its story expects 754.
      - **Flaky under parallel load, every one passing alone**: 17 failures at default workers fell to
        5 at two workers and to the two `/account` ones at one worker. Gallery paging, card hover
        opacity, select clicks, the sort menu, the price slider, text-length. The repo already
        documents this for the price slider; this run shows it is broader.
      **Three stale assertions were mine to fix** and were: the stories spec still looked for the
      card's old `Select size` CTA, the a11y sweep still picked a size before adding to a cart, and
      the `Commerce/ProductOptions` story I renamed rendered nothing at all

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — **blocks every user story**
- **US1 (Phase 3)**: needs T006 (`variants.availability`) and T007–T008 (the hooks)
- **US2 (Phase 4)**: needs T005 (`variants.attributes`). Independent of US1's logic
- **US3 (Phase 5)**: needs T003–T004 (the `colours` collection). Independent of US1 and US2
- **US4 (Phase 6)**: independent of all three. Placed last because it is the widest diff and the
  lowest risk, so nothing above waits on it
- **Polish (Phase 7)**: after the stories that are being shipped

### Why three migrations

M1 is additive and unblocks everything. M2 and M3 are destructive and belong to the stories that make
their columns unnecessary. Splitting them this way is what keeps each story shippable on its own: in
Payload the config change *is* the schema change, so dropping `products.sizes` in Phase 2 would break
`typecheck` until Phase 6 landed. Each migration carries its own rehearsed rollback, which is
Constitution IV satisfied three times rather than once.

### Within each user story

- Tests before implementation where they can fail meaningfully
- Schema before the code that reads it
- Server tier before the components that consume it
- Story complete and checkpointed before the next priority

### Parallel Opportunities

- T003, T005, T006 — three different files in Phase 2
- T011 and T012 — the two US1 tests
- T027 and T028 — the two US3 tests
- T037, T039, T040 — i18n, seeds and e2e in US3 touch nothing each other touches
- T041, T042, T053, T054, T055 — the US4 test and content sweeps
- T056–T059 — the whole polish sweep except T060 and T061
- With more than one person: after Phase 2, US1, US2, US3 and US4 can all proceed at once

---

## Parallel Example: Phase 2

```bash
# Three collection files, no shared lines:
Task: "Create src/collections/colours.ts"
Task: "Add the attributes array to src/collections/variants.ts"
Task: "Add the read-only availability select to src/collections/variants.ts"
```

## Parallel Example: User Story 1

```bash
# Both tests can be written before any implementation:
Task: "Integration test in tests/integration/made-to-order.test.ts"
Task: "Unit test in tests/unit/catalog-availability.test.ts"
```

---

## Implementation Strategy

### MVP — User Story 1 only

1. Phase 1: Setup — capture the defect first (T002), so the fix is a visible change
2. Phase 2: Foundational — additive schema, M1
3. Phase 3: US1
4. **STOP and VALIDATE**: [quickstart §1](./quickstart.md#1-made-to-order-stops-asking-for-stock-us1-p1)
5. Ship. A made-to-order piece is orderable, which is the only part of this feature currently
   costing sales

### Incremental delivery

1. Setup + Foundational → schema in place, storefront unchanged
2. + US1 → **MVP**, a defect fixed
3. + US2 → stones describe themselves accurately
4. + US3 → the owner owns the colours
5. + US4 → the form and the product page get shorter

Each step is a release. Nothing above depends on anything below it.

---

## Notes

- `[P]` means different files with no dependency on incomplete work
- Commit after each task or logical group; commit a migration with its `.json` snapshot and
  `src/payload-types.ts` in the same change
- The three rollback rehearsals are not optional. M2's is the one that can bite: its `down` narrows
  an enum, which is the failure spec 004 met at the same point in its life
- Run e2e on a warm server. A cold `next dev` compiling a route on first hit exhausts a test budget
  and reports as a product failure
