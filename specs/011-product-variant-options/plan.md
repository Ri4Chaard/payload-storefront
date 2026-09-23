# Implementation Plan: Product Variant Options

**Branch**: `011-product-variant-options` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-product-variant-options/spec.md`

## Summary

Four changes to how a piece is described and made available: made-to-order carries down to its
stones, stones can carry their own descriptive properties, colours become owner-editable, and sizes
are removed.

The technical shape is set by two findings. **A variant cannot see its parent** — `admin.condition`
is synchronous and receives only the document being edited — so the piece's availability is mirrored
onto its stones by a hook, purely so the quantity field can hide itself. And **colour's filter logic
does not change at all**: it moves from the parser's closed set to its open set, joining the lane
`category` and `collection` have always occupied, which is one line in `parseFilters` and a branch in
`getListing`.

Three migrations cover it, split additive from destructive so each story stays shippable on its own.
The one that moves colour has a `down` that narrows — so it refuses rather than discards.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), React 19, Node 22

**Primary Dependencies**: Payload CMS 3.88, `@payloadcms/plugin-ecommerce`, Next.js 16.3 (App
Router, Turbopack), Tailwind 4.3, `next-intl`

**Storage**: PostgreSQL via `@payloadcms/db-postgres`. Three generated, committed migrations, each
with a tested `down` (Constitution IV)

**Testing**: Vitest (unit + integration against Postgres), Playwright (e2e, a11y, stories)

**Target Platform**: Server-rendered web, deployed as a long-running container

**Project Type**: Web application — Next.js with Payload mounted inside it

**Performance Goals**: no new per-request query on the listing. `colours` joins the existing
`Reference` fetch, which is already one round trip per request deduplicated by React `cache` — and
`sizes` leaves it, so the count is unchanged

**Constraints**: LCP ≤ 2.5s; initial JS within Constitution V's 300KB/route and 100KB-above-baseline
budget; WCAG 2.2 AA; three locales (en/uk/ru) with fallback

**Scale/Scope**: ~30 products, ~5 stones each. 4 user stories, 30 functional requirements, 2
collections changed, 1 added, 1 removed

## Constitution Check

*GATE: checked before Phase 0, re-checked after Phase 1.*

| Principle | Verdict | Note |
| --- | --- | --- |
| **I. Payload Is the Single Source of Truth** | **Advanced** | US3 is this principle applied: a vocabulary fixed in code becomes the owner's. R3 deletes the `colour.*` message keys so a label lives in one place rather than four. |
| **II. Reuse Before Creation** | **Pass** | `colours` copies the `categories` shape; `variants.attributes` copies the product's array definition verbatim; FR-006 uses the draft state variants already have rather than a new field. Nothing new enters the UI kit. |
| **III. Design Tokens Over Magic Values** | **Pass** | No new visual surface. Removing the size selector deletes markup rather than adding it. |
| **IV. Content Modeling & Schema Evolution** | **Pass, with the risk named** | Three migrations, generated and committed, split so each story ships alone. M2's `down` narrows an enum and M3's removes populated fields, so both refuse rather than discard — rehearsed on a scratch database per quickstart §5. Access is explicit on `colours`. |
| **V. Performance, Accessibility & SEO** | **Pass** | No new request on the listing; `colours` takes the slot `sizes` vacates in `Reference`. Removing the size selector removes a required interaction. One new client component (R8), carrying a single id. |
| **VI. Commerce Correctness & Data Protection** | **Pass** | US1 is a correctness fix: a piece the owner believes is on sale becomes orderable. No customer data is touched — sizes exist on the vocabulary, on pieces and on live carts only. |

**Re-check after Phase 1**: no violations introduced. The one thing worth watching is the
denormalised `variants.availability` (R5), which is a deliberate duplicate of the parent's value.
Recorded in Complexity Tracking below, with the constraint that keeps it honest: **the storefront
never reads it.**

## Project Structure

### Documentation (this feature)

```text
specs/011-product-variant-options/
├── plan.md              # This file
├── spec.md              # /speckit-specify output
├── research.md          # Phase 0 — nine decisions
├── data-model.md        # Phase 1 — collections and the migrations
├── quickstart.md        # Phase 1 — how to prove it by hand
├── contracts/
│   ├── listing-url.md   # what a bookmarked link does after this
│   └── product-view.md  # what the product page is handed
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks output — 61 tasks
```

### Source Code (repository root)

```text
src/
├── collections/
│   ├── colours.ts              # NEW — the owner-managed vocabulary
│   ├── products.ts             # colour → relationship; sizes removed
│   ├── variants.ts             # attributes array; availability mirror; inventory condition
│   ├── carts.ts                # size field and its role in cartItemMatcher
│   ├── product-hooks.ts        # NEW — cascadeAvailability, stampAvailability
│   └── sizes.ts                # DELETED
├── lib/
│   ├── catalog/
│   │   ├── filters.ts          # colour → open set; COLOURS/COLOUR_KEYS gone; size gone
│   │   ├── queries.ts          # Reference gains colours, loses sizes; facets; chips; unknownValues
│   │   ├── mappers.ts          # availability rule; per-stone attributes; SizeOption gone
│   │   ├── types.ts            # ColourValue; ProductView.sizes; DiamondOption.attributes
│   │   └── cart-intent.ts      # size out of the intent
│   └── cart/                   # actions, merge, operations, totals, types — size out
├── components/commerce/
│   ├── product-details/        # unchanged component; new client wrapper beside it
│   ├── product-purchase/       # publishes the selection; size selector gone
│   ├── product-options/        # size selector gone
│   ├── filter-drawer/          # SIZE group gone
│   ├── cart-item/ cart-lines/  # size on the line gone
│   └── handoff-modal/          # size out of the message
├── i18n/messages/{en,uk,ru}.json   # colour.* and the four size keys deleted
└── app/(frontend)/[locale]/products/[slug]/page.tsx   # wraps the two in the provider

migrations/                     # M1 additive, M2 colour, M3 sizes — each with its .json snapshot
scripts/                        # seed-catalog, verify-catalog, seed-translations-data
tests/                          # unit, integration, e2e, a11y
```

**Structure Decision**: no new top-level structure. This feature edits the catalogue tier that specs
002/003 built and adds one collection beside the vocabularies already there. The only new component
is the client wrapper in R8, which lives with `product-details` because that is what it feeds.

## Phasing

The four stories are independent and ship in spec priority order. US1 is first because it is the
only one that is currently losing sales.

| Phase | Story | Why here |
| --- | --- | --- |
| 2 | Foundational | Everything additive: the `colours` collection, `variants.attributes`, `variants.availability`. Migration **M1**. Nothing removed, so the storefront is unchanged. |
| 3 | **US1** — made to order cascades | A live defect, and the MVP. Uses the variant columns from M1. |
| 4 | **US2** — per-stone properties | Uses `variants.attributes` from M1. Independent of US1's logic. |
| 5 | **US3** — editable colours | Migration **M2** moves colour onto the relationship. Touches the filter pipeline, which nothing above does. |
| 6 | **US4** — sizes removed | Migration **M3**. Last, so nothing above waits on it. The widest diff and the lowest risk. |

**Three migrations, not one — this corrects an earlier draft of this plan.** The first draft said one
migration covering all four, on the reasoning that four rollbacks are worse than one. Writing the
task list showed why that does not work: in Payload the config change *is* the schema change, so
dropping `products.sizes` in the foundational phase breaks `typecheck` until US4's code lands, and
the four independently shippable stories the spec is built around collapse into one release.

Splitting additive from destructive along story lines restores them. M1 unblocks everything and
removes nothing; M2 and M3 belong to the stories that make their columns unnecessary. Constitution IV
asks for a tested rollback per schema change, which this satisfies three times rather than once.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| `variants.availability` duplicates the parent's value | `admin.condition` is synchronous and cannot reach the parent (`payload/dist/fields/config/types.d.ts:111`), so FR-001 — "no quantity field is offered" — is otherwise unimplementable | A custom client field component fetching the parent adds a bespoke component, a request per drawer, and a flicker while the field decides whether it exists. **Constrained**: the storefront reads availability from the parent it already has, so a stale mirror can misdraw an admin form but can never sell what should not be sold. |
| Two hooks keep that mirror in step | A variant created against an already-made-to-order piece must be right immediately, and a piece switching mode must update stones that already exist | One hook covers one of the two cases. Neither hook reads what the other writes, so unlike `clearOtherDefaults` in spec 004 there is no recursion argument to make. |

## Open risks — outcome

- **M2 is the migration that can break public links.** *Held.* All 35 colour assignments moved
  intact, and `/all-jewelry?colour=black&colour=green` returns the same pieces. The generated
  migration would have destroyed them — it dropped `products_colour` on its first line and added the
  relationship column on its third — so the data move was written by hand ahead of the drop.
- **`cartItemMatcher` changes meaning.** *Held, and the override is gone entirely.* With size
  removed a line is a product and a stone, which is exactly what the plugin's default compares, so
  the custom matcher was deleted rather than left comparing one fewer thing.
- **The e2e suite is near its budget.** *Confirmed, and it bit.* `listing.spec.ts`'s price slider and
  two `product.spec.ts` gallery tests pass alone and fail under parallel load. Nothing in this
  feature touches the gallery.

## What the rehearsals caught

Recorded because the value of T010/T032/T045 is otherwise invisible:

- **M1's generated `down` was broken.** `DROP TABLE colours CASCADE` removes the FK that the next
  line drops by name, so the rollback failed partway and the schema never came back. `IF EXISTS` on
  both; M3 had the same shape.
- **M2's generated `up` destroyed data**, as above.
- **M2's `down` narrows**, so it refuses with a count and a HINT when a fifth colour is in use —
  verified firing, and verified passing once the colour is cleared.

## Two requirements were wrong, not the code

- **FR-022** said a colour no piece carries must not be offered. `getFilterFacets` has held since
  spec 003 that hiding empty options "makes the panel change shape as a visitor filters, which loses
  the option they were about to press". The owner asked for the colour logic to stay as it is, so the
  requirement was reversed in spec.md, the contract and the quickstart.
- **Three older tests asserted behaviour this feature deliberately reverses** —
  `catalog-mappers.test.ts` on availability, and `product.spec.ts`'s "the two actions are present and
  disabled", which had been stale since spec 005 and was only kept green by the size selector
  blocking add-to-cart.
