# Implementation Plan: Shop — Catalog Listing and Product Detail

**Branch**: `003-shop-catalog` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-shop-catalog/spec.md`

## Summary

Land `@payloadcms/plugin-ecommerce@3.88.0`, model the whole catalogue, and build the two route
families the shop needs — a filterable listing and a product detail page. The storefront keeps
rendering from `src/mocks/` for now, but the fixtures are **typed against the generated Payload
collection types**, so the mock shape cannot drift from the schema it is standing in for.

This is the spec that spec 001 deferred the plugin decision to (001/research.md R9) and the spec
002 named as the end of its mock-content deviation. Both debts are settled here, in that order:
schema first, screens second, data source last.

Four findings from reading the plugin's source change the work rather than confirm it.

**The plugin's `products` collection is nearly empty.** It contributes `inventory`, `enableVariants`,
`variantTypes`, a `variants` join, and one price field per configured currency. There is no title, no
slug, no images, no description. Every content field on a product is ours to design and add through
`productsCollectionOverride`. The plugin is commerce plumbing — prices in minor units, variant
resolution, inventory, cart operations — not a content model. That makes the decision cheap: we are
not adopting someone else's product shape, we are borrowing their money and inventory handling.

**Eight collections, not six.** 001's carried-forward note said six. With variants enabled the
plugin generates `products`, `variants`, `variantTypes`, `variantOptions`, `carts`, `orders`,
`transactions` and `addresses`. It also has no single `collectionsOverrides` key — each collection
takes its own `*CollectionOverride` function. Both notes are corrected in
[research.md](./research.md) R1.

**Diamond is a variant; size is not.** Modelling both selectors as variant types is the
plugin-native reading and it is wrong here: five stones by fifteen ring sizes is seventy-five
variant rows the owner maintains by hand, for a product where size never moves the price. Diamond
becomes the single variant type — it carries price, inventory and its own photograph, exactly as the
brief requires — and size becomes a product field, which also makes the drawer's SIZE filter a plain
column query instead of a join through the variant matrix. The cost is one `cartItemMatcher` and one
cart-item field, both documented extension points. See [research.md](./research.md) R3.

**Drafts, trash and public-read-only-when-published ship by default.** The plugin's products and
variants already declare `versions.drafts.autosave`, `trash: true`, and
`read: access.adminOrPublishedStatus`. Spec FR-009 — drafts unreachable by URL, previewable by the
owner — is satisfied by configuration rather than by code.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode, `any` requires inline justification)

**Primary Dependencies**: Payload 3.88.0, Next.js 16.3.3, React 19, Tailwind CSS 4.3.3 — all
unchanged. **Two new runtime dependencies.** `@payloadcms/plugin-ecommerce@3.88.0`, whose peer range
pins `payload: 3.88.0` exactly, matching what is installed — justified against Principle II in
[research.md](./research.md) R2. And `photoswipe@5.4.4` for the full-screen viewer, added after zoom
entered the brief and reversing R7's original judgment — justified, measured and costed in R11. The
range slider and the drawer remain kit-and-native, with no dependency.

**Storage**: PostgreSQL via `@payloadcms/db-postgres`. This feature creates the catalogue tables. One
generated, committed migration with a tested `down`, per Constitution IV.

**Testing**: Stories for every new kit component, swept by `tests/a11y/ui-kit.spec.ts`; geometry and
behaviour in `tests/stories/ui-kit.spec.ts`; unit tests under Vitest for the mappers, the filter
encoder/decoder and the price formatter — all pure functions and the highest-value tests in the
feature; route-level Playwright specs for the listing and the product page covering heading order,
no-JS filtering, 320px, 200% zoom and the drawer's focus behaviour.

**Target Platform**: Modern evergreen browsers, mobile-first. Server-rendered. Client components are
the drawer, the sort menu, the gallery, the option selectors and the quantity stepper.

**Project Type**: Web application — Next.js app with Payload mounted inside it.

**Performance Goals**: The product page's main photograph is that route's LCP element and is loaded
with priority. Every route stays under 200KB gzipped initial JavaScript. Listing photographs below
the fold are lazy.

**Constraints**: WCAG 2.2 AA at 1920, 1024 and 390, including the open drawer and the open
full-screen viewer. No horizontal page scroll at 320px or 200% zoom. Tokens only. Reduced motion
suppresses every transition. Filter state is URL-encoded and server-renderable, so the listing works
with JavaScript disabled.

**Scale/Scope**: 7 user stories, 45 functional requirements. 5 plugin collections enabled, 3
collections of our own, 1 minimal auth collection, 1 migration. 2 route families. 3 new kit
primitives, ~9 new feature components, 1 catalogue data layer.

## Constitution Check

_GATE: evaluated before Phase 0 and re-evaluated after Phase 1 design._

| Principle                                       | Gate                                                                             | Pre                        | Post                       | Notes                                                                                                                                                                                                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Payload Is the Single Source of Truth**    | No hardcoded user-visible content; generated types are canonical; Local API      | ⚠️ **Deviation, narrowed** | ⚠️ **Deviation, narrowed** | The collections, the fields and the generated types all land here; only the _read path_ is still mocked. Fixtures are typed as the generated `Product`/`Variant`/`Category`, so drift is a type error. See Complexity Tracking.                            |
| **II. Reuse Before Creation**                   | No duplicate components; new dependency justified                                | ✅ Pass                    | ✅ Pass                    | One new dependency, justified in R2 against a hand-rolled catalogue. Kit components consumed as built (SC-009). Three genuinely new primitives, each entering the kit rather than a page folder.                                                           |
| **III. Design Tokens Over Magic Values**        | Tokens only; full state set                                                      | ✅ Pass                    | ✅ Pass                    | No new tokens expected. The slider's track and handles are existing palette and radius tokens.                                                                                                                                                             |
| **IV. Content Modeling & Schema Evolution**     | Modelled before implementation; explicit access; labels; migration with rollback | ✅ Pass                    | ✅ Pass                    | This is the spec that does the modelling. [data-model.md](./data-model.md) is the record; every collection states its access explicitly; one migration with a tested `down`.                                                                               |
| **V. Performance, Accessibility & SEO Budgets** | CWV, WCAG 2.2 AA, SSR, canonical + structured data                               | ✅ Pass                    | ✅ Pass                    | FR-014, FR-043, FR-044. Product and listing routes emit canonical URLs and schema.org `Product`/`Offer`/`BreadcrumbList`.                                                                                                                                  |
| **VI. Commerce Correctness & Data Protection**  | Minor units; server-side pricing; no card data                                   | ✅ Pass                    | ✅ Pass                    | The plugin stores amounts as integer minor units per currency. No payment adapter is configured — the site takes no money. Displayed prices are never trusted as inputs; FR-041's seam passes identifiers, and the resolved price is read from the record. |

**Gate result: PASS with one documented deviation**, which this spec narrows rather than incurs.

## Project Structure

### Documentation (this feature)

```text
specs/003-shop-catalog/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0 — the plugin evaluation and the six decisions
├── data-model.md        # Phase 1 — every collection and every field
├── quickstart.md        # Phase 1 — how to run it and how to prove it
├── contracts/
│   └── catalog-data.md  # Phase 1 — the loader/view-model contract and the FR-041 seam
└── tasks.md             # Phase 2 — /speckit-tasks, not created here
```

### Source Code (repository root)

```text
migrations/
└── 2026XXXX_catalog.ts                  # NEW — generated, committed, with a tested down

src/
├── payload.config.ts                    # ecommercePlugin(...) lands here
├── collections/
│   ├── admins.ts                        # unchanged
│   ├── media.ts                         # unchanged
│   ├── customers.ts                     # NEW — minimal auth collection; flows belong to a later spec
│   ├── categories.ts                    # NEW — rings, bracelets, earrings, necklaces
│   ├── collections.ts                   # NEW — Deia, Marvel, Molten, Spartan
│   └── attributes.ts                    # NEW — owner-defined descriptive attributes
├── fields/                              # NEW TIER — shared Payload field configs (Principle II)
│   ├── slug.ts
│   └── seo.ts
├── lib/catalog/
│   ├── types.ts                         # view models derived from payload-types
│   ├── mappers.ts                       # Payload document → view model (pure)
│   ├── filters.ts                       # URL query ⇄ filter state (pure, both directions)
│   ├── price.ts                         # minor units → display string (pure)
│   └── queries.ts                       # THE SWAP POINT — mocks today, Local API tomorrow
├── mocks/
│   └── catalog.ts                       # fixtures typed as the GENERATED collection types
├── app/(frontend)/
│   ├── not-found.tsx                    # NEW — 001/FR-041, first reached by an unknown category
│   ├── (shop)/
│   │   ├── listing.tsx                  # the renderer both listings share
│   │   ├── [category]/page.tsx          # rings | bracelets | earrings | necklaces
│   │   └── all-jewelry/page.tsx         # inside the group, so US4's toolbar layout reaches both
│   └── products/[slug]/page.tsx
└── components/
    ├── ui/
    │   ├── range-slider/                # NEW primitive
    │   ├── drawer/                      # NEW primitive
    │   └── lightbox/                    # NEW primitive
    ├── commerce/
    │   ├── product-card/                # consumed unchanged
    │   ├── product-grid/                # NEW
    │   ├── filter-toolbar/              # NEW
    │   ├── filter-drawer/               # NEW
    │   ├── active-filters/              # NEW
    │   ├── sort-menu/                   # NEW
    │   ├── product-gallery/             # NEW
    │   └── product-options/             # NEW
    └── sections/
        ├── listing-header/              # NEW
        └── jewelry-carousel/            # consumed unchanged, for Complete the Collection
```

**Structure Decision**: the three-tier component layout established in 002 is kept and extended.
`ui/` stays contract-bound and domain-free — which is why the slider, the drawer and the lightbox go
there and the filter toolbar does not. `commerce/` gains the catalogue components, because they know
what a product is. `sections/` gains the listing header. Two directories are new: `src/fields/` for
shared Payload field configs, which Constitution II names explicitly ("repeated field groups MUST
become reusable field configs"), and `src/lib/catalog/` for the data layer, whose whole purpose is
that `queries.ts` is the only file spec 004 has to touch to move from mocks to Payload.

## Complexity Tracking

| Violation                                                              | Why Needed                                                                                                                                                                                                                                                                                                                                    | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Principle I — the storefront reads `src/mocks/`, not the Local API** | Carried from 002 and narrowed here at the owner's direction: build the schema and the screens together, connect them last. The collections, the fields, the access rules, the migration and the generated types are all real; only `queries.ts` is mocked, and the fixtures are typed as the generated collection types so they cannot drift. | Wiring the Local API in this spec would mean seeding real content before any screen exists to judge the model against — the inversion 001/R9 rejected. The deviation is bounded by FR-011 and measured by SC-010, and it ends in one file.                                            |
| **`photoswipe` — a second new runtime dependency**                     | Zoom entered the brief after R7 judged this. Pinch, bounded pan, momentum, double-tap and a magnifying wheel are the class of geometry that is subtly wrong on one device for a year. 6.9KB gzipped with the route, 16.4KB more only on first open. Full reversal recorded in [research.md](./research.md) R11 | Keeping the hand-rolled viewer and adding pinch alone was the alternative, and pinch without bounded pan and momentum is the half that feels broken. `react-photoswipe-gallery` would have dictated the product gallery's markup |
| **`@payloadcms/plugin-ecommerce` — a new runtime dependency**          | Principle II requires justification. It supplies integer-minor-unit pricing, the variant resolution the "Choose Your Diamond" selector needs, inventory, drafts-and-trash defaults, and the cart operations spec 004 will need — none of which the kit can express.                                                                           | Hand-rolling the catalogue was the alternative. It means writing and testing money handling and variant resolution ourselves, against Principle VI, to avoid a dependency published and version-locked by the CMS we already run. Full comparison in [research.md](./research.md) R2. |
