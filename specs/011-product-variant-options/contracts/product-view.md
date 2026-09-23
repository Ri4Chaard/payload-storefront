# Contract: The product view model

**Feature**: [../spec.md](../spec.md) · **Supersedes**: the `ProductView` clauses of
`003-shop-catalog/contracts/catalog-data.md`

What `src/lib/catalog/mappers.ts` hands the product page. The rule this file exists to hold is the
one 003 set and this feature keeps: **a component never sees an inventory number**, so it is never
in a position to answer "is this orderable" for itself.

---

## `ProductView`

| Field | Change |
| --- | --- |
| `sizes: SizeOption[]` | **removed**, with `SizeOption` |
| `attributes: ProductAttribute[]` | unchanged — the piece's own rows, the page's initial state (FR-012) |
| `diamondOptions[]` | each gains `attributes` and loses its count-derived ceiling when the piece is made to order |
| everything else | unchanged |

---

## `DiamondOption`

| Field | Type | Notes |
| --- | --- | --- |
| `id`, `label`, `price`, `image` | unchanged | |
| `available` | boolean | **Now answered by the piece as well as the stone** — see the table below. |
| `maxQuantity` | number \| undefined | `undefined` on a made-to-order piece. No ceiling to reach (FR-003). |
| `attributes` | `ProductAttribute[]` | The stone's own rows. Empty for a stone that carries none. |

### Availability

Replaces the rule at `mappers.ts:128`, whose comment currently states the opposite:

| Piece | Stone | `available` | `maxQuantity` |
| --- | --- | --- | --- |
| Made to order | published | `true` | `undefined` |
| Stock tracked | `inventory > 0` | `true` | `inventory` |
| Stock tracked | `inventory = 0` | `false` | — |

Unpublished stones never reach the view model at all — the storefront reads published-only, which is
how FR-006 is satisfied without a new field.

**`ProductView.available`** stays the piece's own answer, with one addition: a made-to-order piece
whose every stone is unpublished is `false` rather than a selector with nothing in it (FR-008).

---

## Merging attributes (FR-010, FR-011, FR-016)

The page shows one list. Given the piece's rows and the selected stone's:

1. Start from the piece's rows, in the attribute's own `order`.
2. For each stone row, **replace** the piece's row for the same attribute.
3. Append stone rows whose attribute the piece does not carry.
4. Re-sort by `order`, so a value does not move because of where it came from.
5. Drop any row whose attribute no longer exists (FR-015).

Before a stone is selected, the list is step 1 alone (FR-012).

```
piece:    Metal = 18k gold     Carat = 1.0 ct       Setting = prong
stone B:                       Carat = 1.5 ct       Certificate = GIA 22
result:   Metal = 18k gold     Carat = 1.5 ct       Setting = prong    Certificate = GIA 22
```

**The merge is by attribute, not by position.** Two rows for one attribute is the outcome to avoid —
a stone showing two carat weights is worse than showing neither.

---

## Reaching the details from the selector

`ProductDetails` keeps its props and its stories. The selected stone is published by a client
context that `ProductPurchase` writes and a thin wrapper reads, so the details update without a
reload (FR-013) and the rich text stays server-rendered
([R8](../research.md#r8--the-selected-stone-reaches-the-details-through-a-client-boundary-not-a-rewrite)).

The context carries the selected stone id and nothing else.
