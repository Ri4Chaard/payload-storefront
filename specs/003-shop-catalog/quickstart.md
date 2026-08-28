# Quickstart & Validation: Shop — Catalog Listing and Product Detail

**Feature**: `003-shop-catalog` | **Date**: 2026-08-28

How to run this feature and how to prove it satisfies its requirements. Every scenario names what to
run and what must be true. Details live in [data-model.md](./data-model.md) and
[contracts/catalog-data.md](./contracts/catalog-data.md) rather than being repeated here.

---

## Prerequisites

Everything spec 001's quickstart requires, plus one dependency:

```bash
pnpm add @payloadcms/plugin-ecommerce@3.88.0
```

The version is exact and not a range. The plugin's peer range pins `payload: 3.88.0`, and every
`@payloadcms/*` package in this repository is upgraded as a set — never independently.

## Setup

```bash
pnpm install
docker compose --profile local up -d      # Postgres
pnpm payload migrate:create catalog       # once, when the collections are written
pnpm payload migrate                      # apply
pnpm generate:types                       # src/payload-types.ts — REQUIRED before the mocks typecheck
pnpm generate:importmap                   # admin component registry — REQUIRED or the admin breaks
pnpm seed                                 # development catalogue
pnpm dev
```

**Two generated artifacts, neither optional.**

`generate:types` produces `src/payload-types.ts`. The fixtures in `src/mocks/catalog.ts` are typed
against those collection types, so nothing typechecks until it has run. The order is: write the
collections → migrate → generate types → write the fixtures.

`generate:importmap` produces `src/app/(payload)/admin/importMap.js`, which is how Payload resolves
every admin component that does not live in this repository. **Adding a plugin or a rich-text field
without re-running it breaks the admin at runtime**, with `getFromImportMap: PayloadComponent not
found in importMap`. It is not caught by `typecheck`, `lint` or `build` — only by loading the page.
Re-run it whenever the plugin set, the editor config, or any custom admin component changes.

Storefront at `http://localhost:3000`, admin at `http://localhost:3000/admin`.

## Routes this feature adds

| Route                                             | What                                   |
| ------------------------------------------------- | -------------------------------------- |
| `/all-jewelry`                                    | The unfiltered listing                 |
| `/rings`, `/bracelets`, `/earrings`, `/necklaces` | The same listing, category pre-applied |
| `/products/[slug]`                                | Product detail                         |

The home page has linked to all of these since spec 002; until now they resolved to the branded 404.

## Seeding enough to look at

The migration creates empty tables. In the admin, in this order — each depends on the one above it:

1. **Categories** — four rows: rings, bracelets, earrings, necklaces. Title, slug, subtitle.
2. **Collections** — Deia, Marvel, Molten, Spartan.
3. **Sizes** — a handful, scoped to a category.
4. **Variant type** — one row: name `diamond`, label `Choose Your Diamond:`.
5. **Variant options** — the stone specifications, on that type.
6. **Products** — one with stones (`enableVariants` on) and one without, to exercise both paths.
7. **Variants** — one per stone on the first product, each with its own price and inventory.
8. **Shop global** — the warranty and delivery accordion copy.

The storefront still reads fixtures, so seeding proves the **admin** side (User Story 1). The two
halves are validated separately until the swap.

---

## Validation scenarios

### V1 — The owner runs the catalogue (US1, SC-001)

Create a product in the admin with two photographs, a price, a category, one collection, two sizes
and one stone. Publish.

- ✅ It appears in the admin listing with its price and status.
- ✅ Request its slug anonymously **while it is still a draft** — the branded 404, not the page.
- ✅ Publish, and the same URL renders.
- ✅ Add a new descriptive attribute in `attributes`, apply it to the product with a value — it
  renders in PRODUCT DETAILS with no code change and no deployment.
- ✅ Set `availability: stock-tracked` and `inventory: 0` — the product page shows it unavailable and
  both actions are disabled with the reason in text.
- ✅ Set `availability: made-to-order` — available again regardless of the quantity.

### V2 — The listing renders (US2, SC-002)

```bash
pnpm dev            # then /all-jewelry and /rings at 1920, 1024, 390
pnpm storybook      # ProductGrid, FilterToolbar, ProductCard in isolation
```

- ✅ Four columns at 1920, three at 1024, two at 390, at the drawn gaps and gutters.
- ✅ `/rings` shows the category's own title block and only its products.
- ✅ Each card is one link named for the piece — check with a screen reader's link list, not by eye.
- ✅ An empty category renders the designed empty state, not an empty frame.

### V3 — Filtering (US4, SC-003, SC-004)

```bash
pnpm test           # filters.ts round-trip and combination rules
pnpm test:e2e
```

- ✅ Apply one value from each drawer group, press APPLY: the grid, the chips and the URL agree.
- ✅ Copy that URL into a fresh browser context — same products, same chips, drawer pre-ticked.
- ✅ Remove one chip: only that filter is dropped.
- ✅ CLEAR returns to the route's own category.
- ✅ Tick values and dismiss the drawer without APPLY: nothing changed.
- ✅ Move the price slider in the toolbar: applies immediately, no APPLY.
- ✅ Hand-edit the URL to a collection slug that does not exist: the listing renders and says it
  ignored it.
- ✅ **With JavaScript disabled**, submit the drawer: the server renders the filtered listing at the
  same URL the interactive path produces.
- ✅ At 390 the drawer covers the viewport, the page behind does not scroll, Tab stays inside,
  Escape closes it and focus returns to the trigger. The trigger reads `FILTERS (n)`.

### V4 — Sorting (US5)

- ✅ Each of the four options reorders the grid, writes the URL and survives a reload.
- ✅ Keyboard: the trigger opens the menu, arrows move, Enter chooses, Escape closes unchanged and
  focus returns to the trigger.
- ✅ Sorting and filtering hold together.

### V5 — The product page (US3, SC-006)

- ✅ Thumbnail rail beside the photograph at 1920 and 1024; stacked at 390.
- ✅ Selecting a thumbnail changes the main photograph; the rail pages with its own controls.
- ✅ The photograph opens full screen, pages, closes on Escape, and returns focus to where it was
  opened from.
- ✅ A product with one photograph offers no rail and no paging — no dead controls.
- ✅ A product with an empty description closes over the gap.
- ✅ The product name is the page's only `h1`; heading levels descend without skipping.
- ✅ _Complete the Collection_ renders four cards, or is absent — never an empty band.

### V6 — Options and actions (US6)

```bash
pnpm test           # the validation in front of the seam
```

- ✅ Selecting a different stone changes the displayed price.
- ✅ ADD TO CART and BUY NOW are refused until every required choice is made, and the message names
  the unmade one — announced, not only coloured.
- ✅ A product with no stones and no sizes shows no selectors and both actions immediately.
- ✅ A stone with zero inventory is shown unavailable and cannot be chosen.
- ✅ The quantity stepper stops at 1, and at any stock-tracked ceiling.
- ✅ With every choice made, the seam receives `{ productId, variantId, sizeId, quantity }` — and
  **no price**. Assert on the payload; this is the Constitution VI rule, not a style preference.

### V7 — However a visitor arrives (US7, SC-005, SC-007, SC-008)

```bash
pnpm test:a11y      # listing, open drawer, product page, open lightbox — at 1920/1024/390
pnpm test:e2e
pnpm build          # route JavaScript against the 200KB budget
```

- ✅ axe reports zero violations in all four states at all three widths.
- ✅ No horizontal scroll at 320px or 200% zoom on any route.
- ✅ Reduced motion: the drawer and the gallery move without transition.
- ✅ With JavaScript disabled, the listing and the product page are fully readable and filtering
  still works; only the full-screen viewer is unavailable.
- ✅ Product page LCP within 2.5s on a throttled mid-range mobile profile.

### V8 — The mocks cannot drift (SC-010, contract §1)

The one that protects the swap:

```bash
# add a required field to a collection, then:
pnpm generate:types && pnpm typecheck   # MUST fail until every fixture carries it
```

- ✅ Failing is the pass condition. If it typechecks, the fixtures are not typed against the
  generated types and the contract is not holding.
- ✅ `pnpm lint` fails on an import of `src/mocks/` from anywhere but `queries.ts`.
- ✅ Rewriting `queries.ts` to call the Local API touches no other file — walk the imports and
  confirm, since this is what SC-010 asserts and nothing else measures it.

### V9 — The migration rolls back (Constitution IV)

```bash
pnpm payload migrate            # up
pnpm payload migrate:down       # down — must complete cleanly
pnpm payload migrate            # up again
```

- ✅ `down` runs without error and leaves `admins` and `media` untouched.
- ✅ Running it is part of the merge, not a claim made in the pull request description.

---

## Gates that must stay green

`pnpm check:naming`, `check:stories`, `check:styles`, `check:tokens`, `check:contrast`, `lint`,
`typecheck`, `test`, `test:stories`, `test:a11y`, `test:e2e`, `build` — the full set from spec 001,
none of them relaxed (SC-012).
