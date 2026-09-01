# Tasks: Shop — Catalog Listing and Product Detail

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/catalog-data.md](./contracts/catalog-data.md)

**Design source**: Figma section `225:1292` ("Магазин") — fourteen frames. Every UI task below cites
the node it implements. Pull it with `get_design_context` **when you start that task**, not before:
the reference code and variable bindings are large, and they go stale against decisions the earlier
tasks have not made yet.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete work)
- **[Story]**: US1a, US1b, US2–US7, mapping to the spec's user stories

## Path Conventions

Payload config and collections under `src/collections/` and `src/fields/`; the data layer under
`src/lib/catalog/`; fixtures under `src/mocks/`; kit under `src/components/ui/`; catalogue
components under `src/components/commerce/`; page bands under `src/components/sections/`; routes
under `src/app/(frontend)/`.

Every new component lands **with its stories in the same change**, and every new story title is added
to `tests/a11y/ui-kit.spec.ts` in the same change — the rule 002 established, and the only thing that
keeps the accessibility sweep honest as the surface grows.

---

## Carried decisions and open items

Read before starting.

| Item                                                                                                      | State                                                                                                          | Affects      |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------ |
| **US1 is split.** US1a is the admin side and lands early; US1b is the mocks→Payload attach and lands late | Agreed. US1's acceptance scenarios as originally written could not pass on mocks                               | T210s, T290s |
| Storefront reads `src/mocks/`, not the Local API, until US1b                                              | **Recorded deviation** from Principle I, narrowed here, bounded by FR-011, measured by SC-010                  | T230, T290   |
| Fixtures are typed as the **generated** collection types                                                  | Enforced by `pnpm typecheck`. `generate:types` must run before any fixture is written                          | T208, T231   |
| Figma asset URLs expire ~7 days after export                                                              | **Export photography in T202**, before anything needs it. 002 was caught by this                               | T202         |
| The seven diamond-shape icons                                                                             | **Done** — normalised to `currentColor`, kebab-cased, pear re-centred to a 26×26 viewBox, registry regenerated | T240         |
| Diamond is a variant type; **size is a product field**                                                    | Decided in research R3. Costs one `cartItemMatcher` and one cart-item field                                    | T206, T207   |
| `orders`, `transactions`, `addresses` are **off**                                                         | Spec 004. Enabling them later is additive — new tables, no rewrite                                             | T209         |
| Mobile PDP gallery is a **swipe carousel with dots** (`410:7635`, `410:7637`), not a thumbnail rail       | Found in the node data; FR-033 corrected to match                                                              | T262         |
| Sort chip reads "Best selling"; the menu has no such option                                               | Menu is authoritative. Spec Open Question 2                                                                    | T275         |
| Seven shapes in the toolbar, three in the drawer                                                          | Rendered from catalogue data, not hardcoded. Spec Open Question 4                                              | T206, T271   |
| Three price formats drawn for one number                                                                  | One formatter, defaulting to `$24,900`. Spec Open Question 3                                                   | T232         |
| Product description names a competitor ("Graff")                                                          | Placeholder. Real copy needed before launch, not before build                                                  | T211         |
| "Paragon" at 1920, "Polygon" at 768/390                                                                   | Same product, two names. Spec Open Question 8                                                                  | —            |
| The handoff modal (`590:13108`, `590:13775`, `590:13875`)                                                 | **Out of scope.** Spec 004. This spec builds the buttons and the seam                                          | T284         |

---

## Phase 1: Schema

The plugin lands, the model is written, the types are generated. Nothing renders yet.

- [x] T200 Install `@payloadcms/plugin-ecommerce@3.88.0` — exact version, not a range. Its peer range
      pins `payload: 3.88.0`; every `@payloadcms/*` package upgrades as a set (research R2)
- [x] T201 [P] Write the six required access functions in `src/lib/access.ts` — `isAdmin`,
      `adminOrPublishedStatus`, `isDocumentOwner`, `adminOnlyFieldAccess`, `isCustomer`,
      `publicAccess`, each stated explicitly per Constitution IV. `adminOrPublishedStatus` returning
      a `Where` rather than a boolean is what makes FR-009 a query constraint, not a filter
- [x] T202 [P] Export the product photography from the Figma section, before the export URLs expire.
      Five distinct photographs from the product page's gallery (`297:4567`), each of which Figma
      exports at several resolutions — the largest of each was taken, composited over **white**
      rather than flattened to black, resized to a 1600px long edge and encoded as WebP: 574KB for
      the five. Committed to `public/photography/` alongside 002's, **not** left in staging: the seed
      reads from there, so a fresh clone can reproduce the catalogue. Payload derives its own sizes
      from these on upload (FR-044)
- [x] T203 [P] Create shared Payload field configs in `src/fields/` — `slug.ts` (unique, indexed,
      sidebar, derived from a source field on first save, editable after, stable across renames per
      FR-013) and `seo.ts` (title, description, image). Constitution II names repeated field groups
      as the thing that must become a shared config
- [x] T204 [P] Create `src/collections/customers.ts` — minimal auth collection, `name` only, access
      stated explicitly. **No registration flow, no verification codes, no profile screens.** It
      exists because the plugin's `customers.slug` is required and carts build a relationship against
      it (research R5). It is never `admin.user`
- [x] T205 [P] Create `src/collections/categories.ts`, `collections.ts`, `sizes.ts` and
      `attributes.ts` per [data-model.md](./data-model.md) — public read, admin write, every field
      labelled, `order` on each for admin-controlled sequencing
- [x] T206 Write `productsCollectionOverride` — title, slug, description, gallery, details,
      category, collections, sizes, colour, diamondShape, attributes array, availability, seo; and
      re-condition the plugin's `inventory` on `availability === 'stock-tracked'` with
      `adminOnlyFieldAccess` on read. Indexes per data-model.md (depends on T203, T205)
- [x] T207 Write `variantsCollectionOverride` (adds `image`), the `variantTypes`/`variantOptions`
      overrides, `cartsCollectionOverride` (adds `items[].size`) and the `cartItemMatcher` that
      matches on product **and** variant **and** size — without it the same ring in two sizes merges
      into one line (research R3)
- [x] T208 Wire `ecommercePlugin(...)` into `src/payload.config.ts` — products, variants, carts,
      inventory, `USD` only; `orders: false`, `transactions: false`, `addresses: false`, no payment
      adapter. Add the `shop` global (warranty and delivery accordion copy, FR-036). Delete the
      "Payload ships EMPTY in spec 001" docstring and replace it with what is now true
      (depends on T201, T204, T206, T207). **Then run `pnpm generate:importmap`** — the plugin ships
      admin components (`PriceCell`, `PriceInput`, `VariantOptionsSelector`) and the rich-text fields
      pull in Lexical's, none of which resolve without it. No static gate catches this; the admin
      throws at runtime
- [x] T209 Generate the migration with `pnpm payload migrate:create catalog`, commit it, then **run
      `migrate:down` and `migrate` again** and record that you did. Constitution IV requires a tested
      rollback path, not a claimed one (depends on T208)
- [x] T210 Run `pnpm generate:types` and commit `src/payload-types.ts`. **Nothing downstream
      typechecks until this exists** (depends on T209)

**Checkpoint**: the admin has a catalogue. The storefront does not know it yet.

---

## Phase 2: User Story 1a — The Owner Runs the Catalogue (P1) 🎯 MVP

**Goal**: the owner can model, populate and publish the catalogue with no developer and no deploy.

**Independent Test**: create a product with two photographs, a price, a category, one collection, two
sizes and one stone; publish it; add a new descriptive attribute and apply it. All in the admin, with
no deployment in between.

- [x] T211 [US1a] Seed the reference data — four categories, four collections, the size values, the
      single `diamond` variant type labelled `Choose Your Diamond:`, and its stone options. Done as
      `scripts/seed-catalog.ts` (`pnpm seed`) rather than by hand in the admin: it goes through the
      Local API so every hook, default and access rule a real editor would hit applies, and it is
      idempotent, so it can be re-run after the photography lands at T292
- [x] T212 [US1a] Seed four products covering every path FR-008 and FR-021 name: one with stones
      **and** sizes, one with neither, one stock-tracked at zero, one stock-tracked with stock. Four
      stones on the first, one of them deliberately taken so FR-040 has something to refuse
- [x] T213 [US1a] Verify the behaviours that are configuration rather than code. Ten checks in
      `scripts/verify-catalog.ts`, run with access enforced and no user — exactly an anonymous
      storefront request. All pass. Re-run it at T295, which is the same acceptance against the real
      read path
- [x] T214 [P] [US1a] Add admin descriptions to every field an editor could misread — Constitution
      IV requires it, and `availability` and `gallery` are the two that would be filled in wrongly
      without one ("the FIRST photograph is what the listing shows")

**Checkpoint**: US1a is complete and demonstrable on its own. The storefront half is US1b.

---

## Phase 3: Foundational — the data layer, the assets, the primitives

**⚠️ Blocks every UI story below.**

- [x] T230 Write `src/lib/catalog/types.ts` — the view models from
      [contracts/catalog-data.md](./contracts/catalog-data.md) §2. Narrower than the generated
      document types on purpose: no `_status`, no `inventory` count, no draft metadata
- [x] T231 Write `src/mocks/catalog.ts` — fixtures annotated with the **generated** `Product[]`,
      `Variant[]`, `Category[]`, `Collection[]`, `Size[]`, `Attribute[]`. Enough products to exercise
      three pages of a 1920 grid, both option paths, an unavailable stone and a stock-tracked zero
      (depends on T210)
- [x] T232 [P] Write `src/lib/catalog/price.ts` and its unit tests — integer minor units in, display
      string out, `Intl.NumberFormat`-based, locale-aware. Never called from a component
- [x] T233 [P] Write `src/lib/catalog/filters.ts` and its unit tests — `parseFilters` and
      `toSearchParams` per contract §4. **Round-tripping is the first test.** Prices travel as minor
      units; absent means default; unknown values are dropped and reported
- [x] T234 Write `src/lib/catalog/mappers.ts` and its unit tests — generated document → view model.
      Two behaviours carry the most risk and get the most tests: narrowing the `string | Category`
      relationship unions, and computing `available` from availability mode, inventory and variant
      inventory. A component must never see an inventory number (depends on T230, T231)
- [x] T235 Write `src/lib/catalog/queries.ts` — the six functions in contract §3, mock-backed, all
      `async` even where the body is synchronous. Filtering, sorting and paging happen **inside**
      `getListing`; a route that fetches everything and filters in JavaScript becomes a rewrite at
      T290, not a swap (depends on T233, T234)
- [x] T236 [P] Add two ESLint rules in `eslint-rules/` — no import of `src/mocks/` outside
      `queries.ts`; no import of `payload-types` document types outside `src/lib/catalog/`. These are
      what make SC-010 enforceable rather than aspirational
- [x] T240 [P] Extract the modal behaviour built for `MobileNav` in 002 into one shared primitive —
      focus trap, scroll lock, Escape, focus restoration, reduced motion. `Drawer` and `Lightbox`
      both consume it. Building them separately is the near-duplication Principle II forbids
      (research R7). The shape icons for the toolbar are already in `src/assets/icons`
- [x] T241 [P] Build `src/components/ui/range-slider/` with stories — two overlaid native
      `<input type="range">`, pointer-events managed so the nearer handle wins, min never above max.
      No dependency (research R7). Node `225:1369` for the drawn track and handles
- [x] T242 Build `src/components/ui/drawer/` with stories — left-anchored panel, scrim, sticky
      footer, scrollable body. Node `532:12507` (depends on T240)
- [x] T243 Build `src/components/ui/lightbox/` with stories — full-screen photograph, previous/next,
      close. Node `308:6392` (depends on T240). **Built twice**: first on `useOverlay`, then rebuilt
      on `photoswipe@5.4.4` when zoom entered the brief (FR-034a). It no longer depends on T240;
      `Drawer` and `MobileNav` still do. See [research.md](./research.md) R11

**Checkpoint**: data flows and the three missing primitives exist. UI can start.

---

## Phase 4: User Story 2 — A Visitor Browses a Listing (P2)

**Goal**: `/all-jewelry` and the four category listings render the drawn grid at three widths.

**Independent Test**: load `/all-jewelry` and `/rings` at 1920, 1024 and 390; confirm four, three and
two columns; confirm each card is exactly one link named for the piece; confirm an empty category
says so.

**Note**: the toolbar is not part of this story. It arrives complete in US4 and gains sort in US5.

- [x] T250 [P] [US2] Build `src/components/sections/listing-header/` with stories — title and
      subtitle. Nodes `222:709` (1920) · `412:7735` (1024) · `412:7870` (390)
- [x] T251 [US2] Build `src/components/commerce/product-grid/` with stories — four/three/two columns
      at the drawn gaps and gutters, consuming `ProductCard` unchanged (FR-017). Nodes `222:982`
      (1920) · `412:7764` + `525:12186` (1024) · `412:7881` + `525:12212` (390)
- [x] T252 [US2] Build the empty state — nothing is drawn for it (spec Open Question 6). Title block,
      chips, a sentence, and a control that clears the filters (FR-019)
- [x] T253 [US2] Build the route `src/app/(frontend)/(shop)/[category]/page.tsx` — validates the
      segment against `getCategories()`, 404s on an unknown one, calls `getListing` once. Node
      `222:706`
- [x] T254 [P] [US2] Build `src/app/(frontend)/all-jewelry/page.tsx` — the same listing with no
      category applied. Node `355:7139`
- [x] T255 [US2] Add paging beyond the first set of results, with position in the URL (FR-018).
      Nothing is drawn. Built first as **numbered pages at the owner's direction**, then replaced
      with **LOAD MORE and a `Showing 24 of 29 pieces` count** — also at the owner's direction, and
      the default Open Question 1 had stated. `?page=N` survives and changes meaning: it counts how
      many sets are shown rather than which one is. The control is a real `<a href>`, so the back
      button, a shared link and a crawler all still work — which was the argument for numbering.
      New `src/components/commerce/load-more/`; `src/components/ui/pagination/` is now unused
- [x] T256 [P] [US2] Emit per-route metadata — title, description, canonical URL — and schema.org
      `BreadcrumbList` (FR-014, Constitution V)
- [x] T257 [US2] Route-level Playwright spec `tests/e2e/listing.spec.ts` — column counts at three
      widths, one link per card, category filtering, the empty state

**Checkpoint**: the shop is browsable. The home page's links resolve for the first time.

---

## Phase 5: User Story 3 — A Visitor Studies One Piece (P3)

**Goal**: the product page, its gallery, its accordions and its related row.

**Independent Test**: open a product at three widths; page the gallery with the rail, the keyboard
and full screen; open every accordion; confirm the name is the only `h1`.

- [X] T260 [P] [US3] Build `src/components/commerce/product-gallery/` with stories — desktop rail
      beside the photograph with its own up/down paging. Nodes `297:4567` (rail `297:4568`, main
      `297:4574`)
- [X] T261 [US3] Tablet gallery — rail **beneath** the photograph, five 68px thumbnails. Node
      `410:7300` (thumbnails `410:7302`)
- [X] T262 [US3] Mobile gallery — **swipe carousel with dot indicators, no rail.** Nodes `410:7635`
      (dots `410:7637`). The dots are controls, not decoration, and the carousel must be
      keyboard-operable (FR-033, corrected)
- [X] T263 [US3] Wire the gallery into `Lightbox` — open, page, Escape, focus restoration
      (FR-034, depends on T243)
- [X] T264 [US3] Build the information column — eyebrow from the category, name as the only `h1`,
      price, description that closes over its own absence. Nodes `242:2479` / `301:5025` (1920) ·
      `410:7308` / `410:7309` (1024) · `410:7641` / `410:7642` (390)
- [X] T265 [P] [US3] Build the three accordions on the existing `Accordion` — PRODUCT DETAILS from
      the product, warranty and delivery from the `shop` global (FR-036). Nodes `242:2478` (1920) ·
      `410:7377` (1024) · `410:7709` (390)
- [X] T266 [US3] Build `src/app/(frontend)/products/[slug]/page.tsx` — `getProduct` returns `null`
      for a missing slug **and** for a draft requested anonymously, both rendering the branded 404.
      Node `231:1901`
- [X] T267 [P] [US3] Add _Complete the Collection_, reusing `JewelryCarousel` unchanged, absent
      rather than empty when there is nothing to show (FR-037). Node `242:2585` (grid `231:1963`)
- [X] T268 [P] [US3] Emit product metadata and schema.org `Product` + `Offer` (Constitution V)
- [X] T269 [US3] Route-level Playwright spec `tests/e2e/product.spec.ts` — heading order, gallery
      paging at three widths, lightbox focus restoration, single-photograph product offers no dead
      controls, empty description closes the gap

**Checkpoint**: a visitor can browse to a piece and read everything about it.

---

## Phase 6: User Story 4 — A Visitor Narrows the Listing (P4)

**Goal**: the toolbar, the drawer, the chips, and a filtered listing that lives in its URL.

**Independent Test**: apply one value from each drawer group; confirm grid, chips and URL agree;
reload the URL in a fresh session; remove a chip; press CLEAR; repeat at 390; then do it all with
JavaScript disabled.

- [x] T270 [US4] Build `src/components/commerce/filter-drawer/` with stories on `Drawer` — the seven
      drawn groups in the drawn order, scrolling beneath a fixed CLEAR/APPLY footer. The drawer edits
      a **draft**; APPLY commits, CLEAR empties, dismissal discards (FR-022). Nodes `532:12507`,
      buttons `231:2322`, in context `225:1431` (depends on T242)
- [x] T271 [US4] Build `src/components/commerce/filter-toolbar/` with stories — FILTERS, the shape
      row from catalogue data, the price slider with its two boxes, IN-STOCK ONLY. These commit
      **immediately**, with no APPLY (FR-023). Nodes `355:7627` / `225:1437` (1920) · `412:7738`
      (1024) · `412:7873` with triggers `412:7874` and `412:7876` (390) (depends on T241)
- [x] T272 [P] [US4] Build `src/components/commerce/active-filters/` with stories on the existing
      `Chip` — one removable chip per applied filter, wrapping rather than overflowing the gutter.
      Nodes `I355:7627;355:7602` · `225:1482`
- [x] T273 [US4] Wire filter state through the route — `parseFilters` on the server, `toSearchParams`
      on every commit, route-level category seeded from the segment rather than the query string, and
      removing the category chip navigating to `/all-jewelry` (contract §4)
- [x] T274 [US4] Make the drawer a `<form method="GET">` whose control names are the query keys, so
      the no-JavaScript path is the same path with less scripting (FR-029). APPLY is the submit
      button; CLEAR is a link to the bare route
- [x] T275 [P] [US4] Below `md`: the trigger carries the applied count (`FILTERS (2)`, node
      `412:7875`); the drawer covers the viewport, traps focus, locks the page behind and restores
      focus on close (FR-027, FR-028)
- [x] T276 [US4] Report ignored filter values — an unknown collection slug in a shared URL must be
      dropped **and** said out loud (FR-030)
- [x] T277 [US4] Extend `tests/e2e/listing.spec.ts` — URL round-trip in a fresh context, chip
      removal, CLEAR, dismissal-without-APPLY, immediate toolbar commits, no-JS form submission, and
      the 390 drawer's focus behaviour

**Checkpoint**: the catalogue is navigable at any size.

---

## Phase 7: User Story 5 — A Visitor Orders the Listing (P5)

**Goal**: sort, in the toolbar and in the URL.

**Independent Test**: choose each option in turn; confirm order, chip and URL agree and survive a
reload; drive the menu entirely from the keyboard.

- [x] T280 [US5] Wire the sort menu on the existing `Menu` and `MenuOption` — the four drawn options,
      the current one marked, focus returned to the trigger on close. Node `225:1854`; trigger
      `225:1475` (1920), `412:7750` (1024), `412:7876` (390)
- [x] T281 [P] [US5] Add the ordering to `getListing` and to the chip row, and confirm sorting and
      filtering hold together (FR-031)

**Checkpoint**: US2, US4 and US5 together are the complete listing.

---

## Phase 8: User Story 6 — A Visitor Chooses a Diamond and a Size (P6)

**Goal**: the two selectors, the price that follows the stone, and the validated seam.

**Independent Test**: change the stone and watch the price; try both actions with a choice unmade and
confirm the refusal names it; open a product with neither option type and confirm no selectors.

- [X] T282 [US6] Build `src/components/commerce/product-options/` with stories — the two selects on
      the existing `Field`, each showing its stone's price, unavailable stones shown and
      unselectable (FR-040). Nodes `301:5008` / open state `301:5845` (1920) · `410:7314` (1024) ·
      `410:7647` (390)
- [X] T283 [US6] Wire the price to the selected stone (FR-039), and the actions row — quantity
      stepper stopping at 1 and at any stock-tracked ceiling, ADD TO CART, BUY NOW. Nodes `231:2468` + `242:2480` (1920) · `410:7351` (1024) · `410:7684`–`410:7703` (390)
> **T282–T283 landed with both actions DISABLED** (owner, 2026-08-31). The controls above them
> work — choosing a stone changes the price — but ADD TO CART and BUY NOW hand to the FR-041 seam,
> and until T284 builds it a live button would either do nothing or lie about what it did. T285's
> validation is the same story: there is nothing yet to refuse ON BEHALF OF. A route test asserts
> both are disabled, so enabling them is a deliberate change with a failing test to notice.
>
> The quantity stepper stops at 1 and has no ceiling: `ProductDetail` deliberately carries no
> inventory count, so there is no stock-tracked maximum to enforce until the seam arrives.

- [X] T284 [US6] Write `src/lib/catalog/cart-intent.ts` — the FR-041 seam. `CartIntent` carries
      **identifiers only, never a price**; the body is a documented no-op resolving `{ ok: true }`
      until spec 004. The validation in front of it is real and unit-tested here (contract §6)
- [ ] T285 [US6] Refuse both actions until every required choice is made, naming the unmade one in a
      message a screen reader announces, and disable both on an unavailable product with the reason
      in text, not in colour (FR-038, FR-040). **Carried to 004 (owner, 2026-08-31.)** The refusal
      is the enabled-button-with-error pattern, and it needs a success path to be honest: with the
      seam a documented no-op, a press that passes validation would do nothing visible, which reads
      as a broken button. The buttons therefore stay disabled and say nothing rather than claiming
      to work. **The rule itself is already built and tested** — `validateIntent` returns the
      unmet FIELD, and T286 covers every branch of it; what is deferred is only its surfacing.
      The second half of the task IS done: an unavailable product disables both actions and gives
      the reason in text (`product-purchase.tsx`)
- [X] T286 [P] [US6] Unit-test the seam's payload shape — assert **no price field is present**. This
      is the Constitution VI rule, not a style preference, and an assertion is the only thing that
      keeps it true

**Checkpoint**: the shop is complete up to the point where spec 004 takes over.

---

## Phase 9: User Story 1b — Published Content Reaches the Storefront (P1, late)

**Goal**: end the deviation. The storefront reads Payload.

**Independent Test**: publish a product in the admin; it appears on the listing. Unpublish it; it
disappears, including from its own URL. No mock involved.

- [X] T290 [US1b] Rewrite `src/lib/catalog/queries.ts` against the Local API — `payload.find` and
      `payload.findByID`, same exported signatures, drafts excluded by the access rule rather than by
      a filter here. **This task touches one file**; if it touches a second, SC-010 has failed and
      the seam is wrong (depends on T235 and every UI story)
- [X] T291 [US1b] Verify SC-010 by walking the imports — no component and no route changed. Record
      the result; nothing else measures this
- [X] T292 [US1b] Upload the T202 photography as Payload media with real alternative text, and attach
      it to the seeded products (FR-044)
- [X] T292a [US1b] Move the three accordion TITLES into the `shop` global — `detailsTitle`,
      `warrantyTitle`, `deliveryTitle`, defaulting to the drawn strings — and surface them through
      `ShopContent`. `ProductDetails` already takes them as props with those defaults, so this is a
      schema field, a migration and one call site. **Owner-requested (2026-08-31):** "3 YEAR
      WARRANTY + FREE RETURNS" is a factual claim about how the shop operates, and Constitution I
      does not let a claim like that need a deployment to change. `shop.ts` originally modelled the
      bodies only, on the reasoning that the headings never move; the owner has said they do
- [X] T293 [US1b] Tighten the T236 ESLint rule — `src/mocks/` is now forbidden in app code entirely,
      tests and stories excepted. The fixtures stay: still typed against the generated types, still
      a drift alarm
> **T291 result, recorded because nothing else measures it.** The swap touched **one file**:
> `src/lib/catalog/queries.ts`, +142/−60. `git diff --name-only -- src/components src/app` was
> empty. SC-010 holds.
>
> Two things landed alongside it that the task did not predict, both reported rather than hidden:
>
> - **`mappers.ts` gained four lines.** Payload writes an ABSOLUTE media url where the fixtures
>   wrote a relative one, and `next/image` treats an absolute src as REMOTE — every product page
>   was a 500 until our own origin was stripped. That is a mapping difference, which is what
>   `mappers.ts` is for, and it is still not a component or a route.
> - **The seed grew from 5 pieces to 29 plus a draft**, ported from the fixtures. The acceptance
>   written against those fixtures — that the listing pages at twelve, that a price filter has
>   something on both sides, that IN-STOCK ONLY has both a stocked piece and an empty one — only
>   means anything if the database describes the same shop.
>
> `tests/unit/catalog-queries.test.ts` moved to `tests/integration/` and runs against Postgres via
> `pnpm test:integration`. Sixteen of its seventeen assertions ran unchanged, which is a better
> proof of the seam than anything they assert individually; the seventeenth named a category that
> happened to hold the fixtures' sold-out piece and now asks the whole catalogue.

- [x] T294 [US1b] Set the caching and revalidation strategy per route, with publishing invalidating
      the affected pages. Constitution V calls stale content after publish a defect — recorded in
      [research.md R13](research.md#r13-what-is-cached-and-what-invalidates-it)
- [ ] T295 [US1b] Re-run the full US1 acceptance from the spec end to end — the scenarios that could
      not pass on mocks are the point of this phase

**Checkpoint**: Principle I holds. The deviation opened in 002 is closed.

---

## Phase 10: User Story 7 — The Shop Works However a Visitor Arrives (P7)

- [ ] T296 [P] [US7] Accessibility sweep at 1920, 1024 and 390 over four states — the listing, the
      open drawer, the product page and the open lightbox — with the complete rule set (SC-005)
- [ ] T297 [P] [US7] No-JavaScript pass: the listing renders and filters; the product page is fully
      readable; only the lightbox is unavailable (FR-029, SC-004)
- [ ] T298 [P] [US7] 320px and 200% zoom on every route — no horizontal page scroll (SC-007)
- [ ] T299 [P] [US7] Reduced motion — no transition on the drawer, the gallery or the lightbox
- [ ] T300 [US7] Performance: product-page LCP within 2.5s on a throttled mid-range mobile profile;
      each route's initial JavaScript under 200KB gzipped; listing photographs below the fold lazy
      (SC-008)
- [ ] T301 [US7] Record every kit change in
      [001/contracts/ui-kit.md](../001-design-system-foundation/contracts/ui-kit.md) with stories
      (FR-042). More than three changes means a band was built wrong (SC-009)
- [ ] T302 [US7] Run the whole gate set — `check:naming`, `check:stories`, `check:styles`,
      `check:tokens`, `check:contrast`, `lint`, `typecheck`, `test`, `test:stories`, `test:a11y`,
      `test:e2e`, `build` (SC-012)
- [ ] T303 [P] [US7] Update `README.md` and `docs/` with the catalogue routes, the seeding order and
      the swap that happened in Phase 9

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Schema)** → blocks everything. T210 in particular: no fixture typechecks before it
- **Phase 2 (US1a)** → depends on Phase 1 only. Demonstrable on its own, and the MVP
- **Phase 3 (Foundational)** → depends on T210; blocks every UI story
- **Phases 4–8 (US2–US6)** → depend on Phase 3
- **Phase 9 (US1b)** → depends on Phases 4–8. The screens are what prove the model before it is
  connected; attaching earlier means seeding content before anything can judge it
- **Phase 10 (US7)** → depends on everything

### Story dependencies

- **US2** independent once Phase 3 lands
- **US3** independent once Phase 3 lands — can run beside US2
- **US4** needs US2's route to filter
- **US5** needs US4's toolbar to sit in
- **US6** needs US3's product page to sit in
- **US1b** needs all of them

### Parallel opportunities

- T201–T205 are five different files with no shared dependency
- T232, T233 and T236 are pure modules and can go three ways at once
- T240–T243: T241 is independent; T242 and T243 both wait on T240, then run in parallel
- **US2 and US3 are the big parallel win** — different routes, different components, one shared data
  layer already built. Two people can take a phase each
- Within US3, T260/T265/T267/T268 touch different files

---

## Parallel example: Phase 1

```bash
Task: "Access functions in src/lib/access.ts"                    # T201
Task: "Export product photography before the URLs expire"        # T202
Task: "Shared field configs in src/fields/"                      # T203
Task: "src/collections/customers.ts"                             # T204
Task: "categories / collections / sizes / attributes"            # T205
```

## Parallel example: after Phase 3

```bash
Task: "US2 — listing header, grid, routes, paging"               # T250–T257
Task: "US3 — gallery, information column, accordions, route"     # T260–T269
```

---

## Implementation Strategy

### MVP — Phases 1 and 2

The owner has a working, self-managed catalogue in the admin. That is a real deliverable and it
proves the central promise of the project. **Stop and validate here** before any UI is built: the
model is cheapest to change now, and every screen after this point assumes it.

### Then the smallest publishable shop

Phase 3 + US2 gives a browsable listing and turns the home page's dead links live for the first time
since 002. US3 makes each piece readable. Those three phases are a shop worth showing someone.

### Then behaviour, then the attach

US4 and US5 make the catalogue navigable; US6 makes a piece orderable up to the point 004 takes
over. **US1b is deliberately last** — it is one file, and it is the only file that is one file
because everything above it was built behind the seam.

### Notes

- Commit after each task or logical group
- `[P]` means different files and no dependency on incomplete work
- Pull the Figma node when you start the task that cites it, not before
- Every new component ships with its stories and its entry in `tests/a11y/ui-kit.spec.ts` in the
  same change
