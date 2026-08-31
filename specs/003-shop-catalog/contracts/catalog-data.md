# Contract: Catalogue Data Layer

**Feature**: `003-shop-catalog` | **Date**: 2026-08-28

The interface between Payload and the screens. It exists so that the mock-content deviation ends in
one file: `queries.ts` is the only module that knows where a document came from, and SC-010 measures
exactly that.

Four modules, three of them pure.

```text
┌─ src/mocks/catalog.ts ─────────────────────────────────────────────────┐
│  Fixtures typed as the GENERATED collection types from payload-types.  │
│  Product[] · Variant[] · Category[] · Collection[] · Size[] · …        │
└────────────────────────────┬───────────────────────────────────────────┘
                             │  today
┌─ src/lib/catalog/queries.ts ▼──────────── THE SWAP POINT ──────────────┐
│  Async. Reads fixtures now; payload.find() / payload.findByID() later. │
│  Its exported signatures do not change when it is rewritten.           │
└────────────────────────────┬───────────────────────────────────────────┘
                             │  generated document types
┌─ src/lib/catalog/mappers.ts ▼──────────────────────────────────────────┐
│  Pure. Payload document → view model. Written once, used by both       │
│  data sources, because both hand it the same generated type.           │
└────────────────────────────┬───────────────────────────────────────────┘
                             │  view models
┌─ route loader ▼────────────────────────────────────────────────────────┐
│  app/(frontend)/**/page.tsx — the ONLY tier allowed to call queries.   │
└────────────────────────────┬───────────────────────────────────────────┘
                             │  props
                      components (props only)
```

Two more pure modules sit beside them: `filters.ts` (URL ⇄ filter state) and `price.ts` (minor units
→ display string).

---

## 1. The mock contract

**Rule**: every fixture array in `src/mocks/catalog.ts` is annotated with the generated collection
type — `Product[]`, `Variant[]`, `Category[]`, and so on — imported from `src/payload-types.ts`.

**Enforcement**: `pnpm typecheck`, which already runs in the gates. Add a required field to a
collection, regenerate, and every fixture missing it fails the build.

**Consequences to expect, not to work around**:

- Fixtures must carry `id`, `createdAt`, `updatedAt` and `_status`. Verbose, and the point.
- Relationship fields generate as unions — `category: string | Category`. Fixtures use the
  **populated** branch, matching what `depth: 1` returns.
- The plugin's `variants` join generates as a paginated shape, not a bare array. Fixtures match it.

**Forbidden**: a hand-written interface that mirrors a collection. Constitution I names this
explicitly. If a fixture will not type, the schema is wrong or the fixture is — never the type.

---

## 2. View models — `src/lib/catalog/types.ts`

What a component is allowed to see. Derived from the generated types so a schema change surfaces
here first, and deliberately narrower: no `_status`, no `inventory` count, no draft metadata.

| Type              | Used by                                            | Carries                                                                                                                                                    |
| ----------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProductSummary`  | `ProductCard`, the grid, _Complete the Collection_ | `id`, `slug`, `title`, `href`, `price` (**formatted string**), `images[]`, `available` (boolean)                                                           |
| `ProductDetail`   | the product route                                  | everything in `ProductSummary`, plus `categoryName`, `description`, `gallery[]`, `detailsHtml`, `diamondOptions[]`, `sizes[]`, `attributes[]`, `fromPrice` |
| `DiamondOption`   | the "Choose Your Diamond:" selector                | `id`, `label`, `price` (formatted), `priceMinor` (integer), `available`, `image?`                                                                          |
| `SizeOption`      | the "Size:" selector and the drawer                | `id`, `label`, `value`                                                                                                                                     |
| `CategorySummary` | listing header, navigation, the drawer             | `slug`, `title`, `subtitle`, `href`                                                                                                                        |
| `FilterState`     | toolbar, drawer, chips, `queries.ts`               | see §4                                                                                                                                                     |
| `ListingResult`   | the listing route                                  | `products: ProductSummary[]`, `total`, `page`, `hasMore`, `appliedChips[]`, `ignored[]`                                                                    |
| `FilterFacets`    | the drawer                                         | the option lists for every group, read from the catalogue                                                                                                  |

**`price` is a formatted string, never a number.** 002/FR-004 settled this and `ProductCard`'s
existing props already require it. `priceMinor` exists only on `DiamondOption`, because the selector
must compare stones — and it is an integer.

**`available` is a boolean, computed once.** The rule — made-to-order is always available;
stock-tracked is available above zero; a variant is available above its own zero — lives in
`mappers.ts` and nowhere else. A component must never see an `inventory` number and decide for
itself.

---

## 3. Queries — `src/lib/catalog/queries.ts`

The swap point. These signatures are the contract; the bodies are not.

| Function                           | Returns                          | Notes                                                                                    |
| ---------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------- |
| `getListing(filters: FilterState)` | `Promise<ListingResult>`         | The whole listing: filtering, sorting, paging. One call per listing page load            |
| `PAGE_SIZE`                        | `12`                             | Three complete rows of a four-across 1920 grid, and it divides by the narrower layouts  |
| `getProduct(slug: string)`         | `Promise<ProductDetail \| null>` | `null` is the branded 404 — for a missing slug **and** for a draft requested anonymously |
| `getCategories()`                  | `Promise<CategorySummary[]>`     | Navigation, the drawer, the listing header                                               |
| `getFilterFacets(category?)`       | `Promise<FilterFacets>`          | The drawer's option lists, from the catalogue rather than hardcoded                      |
| `getRelated(productId, limit)`     | `Promise<ProductSummary[]>`      | _Complete the Collection_. Empty array means the band does not render (FR-037)           |
| `getShopContent()`                 | `Promise<ShopContent>`           | The `shop` global — warranty and delivery accordion copy                                 |

**Rules that survive the rewrite**

1. Every function is `async` today, even where the mock body is synchronous. A signature that
   changes shape at swap time is not a seam.
2. Filtering, sorting and paging happen **inside** `getListing`. A route that fetches everything and
   filters in JavaScript does not become a Payload query later; it becomes a rewrite.
3. Drafts are excluded by the access rule, not by a filter in this module. The mock body simulates
   it by excluding `_status !== 'published'`.
4. Nothing outside this module imports from `src/mocks/`. This is the rule 001/T088 set and 002
   carried; it is what makes the swap one file.
5. Nothing outside this module imports `payload-types` document types. Components see view models.

---

## 4. Filter state and its URL — `src/lib/catalog/filters.ts`

Pure, and symmetrical: `parseFilters(searchParams) → { filters, dropped }` and
`toSearchParams(FilterState) → URLSearchParams`. Round-tripping is the first unit test.

`parseFilters` returns the dropped values alongside the state rather than only the state, because
FR-030 requires the listing to say what it ignored — a function that silently discarded them could
not support it. It accepts both `URLSearchParams` and the `Record<string, string | string[]>` a
route receives, so one function serves the server render and the drawer.

| Key                     | Cardinality | Value                                                    | Group                                   |
| ----------------------- | ----------- | -------------------------------------------------------- | --------------------------------------- |
| `category`              | many        | category slug                                            | CATEGORY                                |
| `collection`            | many        | collection slug                                          | COLLECTION                              |
| `size`                  | many        | size value                                               | SIZE                                    |
| `colour`                | many        | `black` \| `clear` \| `green` \| `multicolor`            | COLOR                                   |
| `shape`                 | many        | diamond shape value                                      | DIAMOND SHAPE + the toolbar's shape row |
| `minPrice` / `maxPrice` | one each    | **integer minor units**                                  | PRICE                                   |
| `inStock`               | one         | `1` when on, absent when off                             | IN-STOCK ONLY                           |
| `sort`                  | one         | `recommended` \| `price-asc` \| `price-desc` \| `newest` | SORT BY                                 |
| `page`                  | one         | integer ≥ 1, absent for page 1                           | paging                                  |

**Combination**: values within one key are OR; separate keys are AND (FR-024).

**Prices travel as minor units** so nothing ever parses a formatted string. `$7,300` is
`maxPrice=730000`.

**Absent means default.** `page=1`, `sort=recommended` and `inStock=0` are never written. One
listing has one URL, which is what makes it cacheable.

**Unknown values are dropped, and the drop is reported.** `ListingResult.appliedChips` reflects what
was actually applied; the listing tells the visitor what it ignored (FR-030).

**Route-level category.** `/rings` is `getListing` with `category: ['rings']` seeded from the route
segment, not from the query string. Removing the category chip navigates to `/all-jewelry`. The two
entry points produce one listing surface.

### The no-JavaScript path

The drawer is a `<form method="GET">` whose control `name`s are the keys above. Submitting it
produces the same URL the interactive path produces, so FR-029 is the same code path with less
scripting rather than a second implementation. `APPLY` is the submit button; `CLEAR` is a link to
the bare route.

---

## 5. Price — `src/lib/catalog/price.ts`

`formatPrice(minorUnits: number, currency = 'USD', locale?): string`

Pure, `Intl.NumberFormat`-based, the single place a number becomes a price. Never called from a
component — always at the route boundary, so `ProductCard` keeps receiving a string.

Default output `$24,900` — the card format, drawn most often, pending spec Open Question 3.

---

## 6. The FR-041 seam

Where ADD TO CART and BUY NOW go. **This spec builds the calling side and this signature; spec 004
builds the body.**

`src/lib/catalog/cart-intent.ts`

```text
addToCart(intent: CartIntent): Promise<CartIntentResult>
buyNow(intent: CartIntent):    Promise<CartIntentResult>

CartIntent  = { productId, variantId?, sizeId?, quantity }
CartIntentResult = { ok: true } | { ok: false; reason: 'unavailable' | 'missing-option' | 'error' }
```

**What the intent carries is identifiers, and nothing else.** No price, no title, no formatted
string. Constitution VI forbids trusting a client-supplied amount, so the seam passes what the
server can resolve for itself. This is not defensive style; it is the rule that stops a displayed
price from becoming a charged one.

Until 004, the body is a documented no-op that resolves `{ ok: true }`. The validation in front of
it — every required option chosen, the product available, the chosen stone still available — is
real, built here, and unit-tested here, because it is what FR-038 and FR-040 specify.

---

## 7. What the gates check

| Gate             | Checks                                                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` | Fixtures still satisfy the generated collection types (§1)                                                                                                                                              |
| `pnpm lint`      | No import of `src/mocks/` outside `queries.ts`; no import of `payload-types` document types outside the data layer. Both are ESLint rules in `eslint-rules/catalog-boundary.mjs`. Two allowances are recorded there: `src/app/**` may still read mocks, which is spec 002's licence for the home page, and the Payload-side tiers may read document types, because modelling content is what they do |
| `pnpm test`      | `filters.ts` round-trips; `price.ts` formats; `mappers.ts` narrows relationship unions and computes `available` correctly                                                                               |
| `pnpm test:e2e`  | A filtered URL renders the same listing in a fresh context; the drawer submits without JavaScript                                                                                                       |
