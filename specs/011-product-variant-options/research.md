# Research: Product Variant Options

**Feature**: [spec.md](./spec.md) · **Date**: 2026-09-23

Nine decisions. Two of them — R1 and R5 — are the ones that could have gone badly if taken while
writing code rather than before.

---

## R1 — Colour reuses the CATEGORY shape, not the size shape

**Decision**: `colour` becomes a `hasMany` **relationship** to a new owner-managed `colours`
collection holding a localized `label`, a stable `value`, and an `order`. The product keeps one
field, still multi-valued, still filterable.

**This is the question the owner raised, and the answer is that both instincts were right.**
"Colour is just an attribute" and "sizes were playing a big value in the product" are both true, and
they are true about *different halves* of what `sizes` was.

`sizes` had two halves that this codebase never separated:

| Half | What it did | Does colour need it? |
| --- | --- | --- |
| A small owner-managed vocabulary with a localized label, a stable `value`, an `order`, and a `category` scope | Fed the filter drawer and resolved chip labels | **Yes**, minus `category` |
| A load-bearing role on the product | A required selector before add-to-cart, part of cart-line identity (`cartItemMatcher`), carried into the seller's message | **No**, and it must never acquire one |

So the vocabulary half is worth copying and the product-role half is exactly what must not be. That
distinction is invisible when you look at `sizes.ts` as one thing, which is why the instinct to
avoid it was sound.

The shape actually being copied is **`categories`/`collections`**: a relationship to a small
collection, resolved through the `Reference` machinery in `queries.ts`, filtered in `matches()` by a
stable slug. Colour becomes the third member of a club that already has two — and, as it happens,
takes the seat `sizes` is vacating in the same feature.

**Why a relationship and not a select with dynamic options**: Payload builds its config once at
boot, so a `select`'s `options` cannot be read from the database without a custom client field
component. A relationship gets the picker, the localized labels and referential integrity for free,
and is what every other filterable vocabulary here already is.

**Alternatives considered**:

- *Keep `select`, add a custom admin component that fetches the colour list.* Keeps the column as it
  is and avoids a data migration — but buys a bespoke React field to maintain, and still needs a
  `validate` hook so the API cannot write a colour nobody defined. Rejected: more code for less
  integrity.
- *Model colour as a row in the existing `attributes` collection.* The literal reading of "colour is
  just an attribute", and it fails on one word in `attributes.ts`: attributes are **deliberately not
  filterable** (003/R4), because making every attribute a filter is a join per active filter on the
  query that runs on every listing view. Colour is a filter and must stay one.
- *A `colours` array on the `shop` global.* Lighter, and loses referential integrity: deleting a
  colour leaves products pointing at a string nothing defines — the exact state FR-023 forbids.

---

## R2 — Colour moves from the parser's closed set to its open set

**Decision**: `parseFilters` stops validating `colour` against a compile-time constant and treats it
the way it already treats `category`, `collection` and `size`: accept the values, and let
`getListing` decide which name something real.

**This is what "the colours logic should stay as-is" actually costs**: one line moves.

```
colour: parseClosedSet(input, 'colour', COLOURS, dropped)   →   colour: unique(valuesFor(input, 'colour'))
```

Everything else about the filter is untouched — the same `colour` key, the same repeated values, the
same chips, the same `matches()` predicate, the same round-trip through `toSearchParams`. A visitor
cannot tell the difference, and neither can a crawler.

The validity check does not disappear; it moves to where the catalogue is in scope.
`filters.ts` already says so in its own docblock — *"This module can only judge the closed sets …
whether `category=rungs` names a real category depends on the catalogue, so `getListing` finishes
the job"* — so `colour` joins `unknownValues()` and the `applied` narrowing beside `category`. An
unknown colour is dropped and reported, which is FR-030 behaving identically to today.

`shape` stays a closed set. Diamond shapes are not in this feature's scope, so `parseClosedSet`,
`SHAPES` and `SHAPE_KEYS` all survive — only `COLOURS` and `COLOUR_KEYS` go.

**Alternative considered**: keep a closed set and regenerate the constant from the database at build
time. Rejected — it reintroduces the deployment that FR-017 exists to remove.

---

## R3 — Colour labels move out of the message files and into Payload

**Decision**: delete the `colour.*` keys from `en/uk/ru.json`. A colour's customer-facing name is
its localized `label` on the row, resolved through `Reference` like a category title.

Constitution I: Payload is the single source of truth for content an editor owns. A colour the owner
can create but cannot name in Ukrainian is not editable, and a name split between a database row and
three JSON files has two places to change and one of them gets forgotten.

This also removes `titleCase(value)` as the colour fallback. It exists today because the enum values
are single lowercase English words; a label supplied by the owner needs no such rescue, and
`titleCase('rose-gold')` would produce `Rose-gold` anyway. Missing translations fall back through
Payload's own locale fallback, which is what every other localized label in the shop does.

`titleCase` stays for `shape`, which is still an enum.

---

## R4 — One migration, and its `down` narrows

**Decision**: a single migration creates `colours`, moves each product's colour values onto
relationship rows, drops `products_colour` and `enum_products_colour`, and drops everything belonging
to sizes.

The colour data lives in `products_colour` — a child table with a `parent_id` and an
`enum_products_colour` value (`20260828_161241_catalog.ts:178`). The four existing values are
seeded as `colours` rows **keeping `black`, `clear`, `green`, `multicolor` as their `value`**, which
is the whole of FR-019 and FR-020: the URL a customer bookmarked and the URL a crawler indexed both
still resolve, because the string in them never changes.

**The `down` is the risky direction and must be rehearsed**, for the same reason spec 004's country
enum was: going back means narrowing to four values, and a colour the owner has added since cannot
be represented. The rollback therefore refuses rather than silently discarding, in the shape 004
already established — count the offending rows, `RAISE EXCEPTION` naming them, and tell the operator
what to do about it. Reversibility is Constitution IV and it is not satisfied by a `down` that loses
data quietly.

The same migration drops `sizes`, `products_sizes` and the cart's `size` column. Rehearsing the
rollback with a product carrying a size and a cart line carrying one is the test that matters.

---

## R5 — A variant cannot see its parent, so the parent tells it

**Decision**: products gain an `afterChange` hook that writes their `availability` onto every one of
their variants. The variant's quantity field then hides on its own data, and the storefront reads
availability from the variant it already has in hand.

**The problem**: `admin.condition` is synchronous and receives only the document being edited
(`payload/dist/fields/config/types.d.ts:111` — `data`, `siblingData`, and `{ blockData, operation,
path, user }`). A variant holds `product` as an id. There is no way, inside a condition, to ask what
mode the parent is in. FR-001 says the quantity field must not be offered; without something on the
variant itself, it cannot be hidden.

**Why denormalise rather than fetch**: the alternative is a custom client field component that
requests the parent product and hides itself once the answer arrives — a bespoke component, a
request per variant drawer, and a visible flicker while the field decides whether it exists. A
denormalised column is one hook and a `condition` that reads like every other condition in the file.

Cascading writes across rows on an `afterChange` is an established pattern here, not a new one:
`clearOtherDefaults` in `src/fields/address-hooks.ts` does exactly this for the default-address
invariant, including the recursion argument that keeps it terminating. This cascade is simpler — it
writes a value that is never read back by the same hook, so it cannot fight itself.

**The sync obligation is real and is the cost**: a variant created before its parent's availability
is set, or created directly against a product already made to order, must still get the right value.
Both are covered by also stamping it in the variant's own `beforeChange` from the parent it is being
created against — the hook that has `req` and can read.

**Alternatives considered**:

- *Custom admin field component.* Above.
- *Leave the field visible and ignore it.* Fails FR-001, and an editable field whose value is
  ignored is worse than no field: it invites the owner to type a number and believe it matters.
- *Make `availability` a variant-level choice.* Rejected in the spec's Assumptions — a piece whose
  stones disagree about whether they are made to order was not asked for.

---

## R6 — The storefront availability rule gains one input

**Decision**: `isVariantAvailable` takes the piece's availability as well as the stone, and returns
`true` unconditionally when the piece is made to order.

The current rule is explicit about doing the opposite, in a comment that is now the defect:

> `/** A stone is available above its own zero, whatever the parent's availability mode says. */`
> — `src/lib/catalog/mappers.ts:128`

That line, plus the `maxQuantity` ceiling built from `variant.inventory` at `:212`, is the whole of
US1 on the storefront side. The mapper already has the product in hand when it maps the variants, so
nothing new has to be fetched — this is a signature change and two conditionals, not a new query.

The denormalised column from R5 is what the **admin** needs. The mapper could use either; it uses
the parent it already has, so the two never disagree about which is authoritative.

---

## R7 — Per-stone properties reuse the product's own array, unchanged

**Decision**: variants gain the same `attributes` array the product has — a relationship to
`attributes` plus a localized `value` — and the product page merges the two by attribute, with the
stone winning.

Copying the field definition rather than inventing a second shape means one mental model for the
owner (the row looks identical wherever they meet it) and one mapper for the values. The array is
already written to survive the trap spec 010 found: `value` is localized but **not** `required`,
because a required localized child inside a non-localized array cannot be saved in any language
until it is filled in every language. That comment is load-bearing and travels with the copy.

**The merge rule** (FR-010, FR-011, FR-016): start from the piece's rows in the owner's order; for
each stone row, replace the piece's row with the same attribute if there is one, otherwise append.
Ordering stays the attribute's own `order`, so a value does not jump position depending on where it
came from — which is FR-016, and the reason the merge is by attribute rather than by array index.

An orphaned row — a value whose attribute has been deleted — is dropped at map time (FR-015). The
existing product mapper already faces this; the variant mapper inherits the same guard.

---

## R8 — The selected stone reaches the details through a client boundary, not a rewrite

**Decision**: a small client context publishes the selected stone; `ProductDetails` stays a
presentational component and gains a thin client wrapper that picks which attribute list to hand it.

`ProductPurchase` already owns the selection — FR-039 makes the price follow the chosen stone — but
it and `ProductDetails` are siblings in the server-rendered page
(`src/app/(frontend)/[locale]/products/[slug]/page.tsx:155,168`). FR-013 needs the details to react
to a choice made in the other component, without a reload.

Three ways to do that, and the cheapest is not the obvious one:

- *Move `ProductDetails` inside `ProductPurchase`.* Smallest diff, wrong shape: it puts the warranty
  and delivery accordions — which have nothing to do with a stone — inside the purchase client
  component, and pushes the server-rendered rich text across the boundary.
- *Lift both into one client component.* Same problem, larger.
- *A context provider around both, consumed by a wrapper.* `ProductDetails` keeps its props, its
  stories and its server-rendered rich text. One new client component decides which attributes to
  pass. Chosen.

The provider carries the selected stone id and nothing else, so it does not become the page's state
container by accident.

---

## R9 — Sizes come out in one pass, including the cart

**Decision**: remove the vocabulary, the product field, the filter, the selector **and** the cart
line's size in the same change. Leave existing cart lines intact.

The surface is wider than the spec's four screens, and enumerating it now is what stops half of it
shipping:

| Where | What goes |
| --- | --- |
| `src/collections/sizes.ts` | the collection |
| `src/collections/products.ts` | the `sizes` relationship |
| `src/collections/carts.ts` | the `size` field **and** its role in `cartItemMatcher` |
| `src/lib/catalog/filters.ts` | `size` from `FilterState`, `KEY_ORDER`, `DEFAULT_FILTERS`, `MultiFilterKey` |
| `src/lib/catalog/queries.ts` | the `matches` branch, `sizeLabel`, `Reference.sizes`, the facet, the chip, the `unknownValues` branch |
| `src/lib/catalog/types.ts`, `mappers.ts` | `SizeOption`, `sizes` on the view model |
| `src/lib/cart/` | `actions.ts`, `merge.ts`, `operations.ts`, `totals.ts`, `types.ts`, `cart-intent.ts` |
| `src/components/commerce/` | `product-options`, `product-purchase`, `filter-drawer`, `filter-toolbar`, `cart-item`, `cart-lines`, `handoff-modal` |
| `src/i18n/messages/*.json` | `catalog.size`, `product.chooseSize`, `product.selectSize`, `product.sizeLabel` |
| `scripts/`, `tests/` | seeds, and the unit and e2e specs that assert a size |

**`cartItemMatcher` is the one to be careful with.** Two lines are currently the same line only if
the product, the stone *and* the size match. Dropping size from the comparison means two lines that
differed only by size collapse into one on the next merge — which is correct once size is gone, and
is why FR-029 says an existing line must stay *usable* rather than *unchanged*.

**A URL carrying `?size=` needs no special handling** (FR-028). `parseFilters` reads named keys and
ignores everything else, so the parameter is simply not seen: the page loads and the remaining
filters apply. This is worth an assertion rather than an implementation.
