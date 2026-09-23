# Data Model: Product Variant Options

**Feature**: [spec.md](./spec.md) · **Research**: [research.md](./research.md) · **Date**: 2026-09-23

Three migrations cover everything below — see [Migrations](#migrations) for why it is three and not
one. Constitution IV: generated, committed, and each with a `down` rehearsed against real rows.

---

## New: `colours`

An owner-managed vocabulary. Modelled on `categories`/`collections` rather than on `sizes` — see
[R1](./research.md#r1--colour-reuses-the-category-shape-not-the-size-shape) for why the distinction
matters.

| Field | Type | Notes |
| --- | --- | --- |
| `label` | text, **localized**, required | What the customer reads. "Black", "Чорний". Replaces the `colour.*` message keys ([R3](./research.md#r3--colour-labels-move-out-of-the-message-files-and-into-payload)). |
| `value` | text, required, unique, indexed | The stable identifier in `?colour=`. **Renaming the label must never touch this** (FR-018, FR-019). |
| `order` | number, sidebar, default 0 | Lowest first in the drawer. Same as every other vocabulary here. |

**Access**: `read: () => true`, writes `isAdmin` — identical to `attributes` and the departing
`sizes`.

**Hooks**: `revalidateOnChange`, `revalidateOnDelete`. A colour is a filter option and a chip label
on cached routes.

**Deletion (FR-023)**: refused while any product still carries the colour. A product pointing at a
row that no longer exists is the one outcome the relationship is here to prevent, and silently
stripping the colour from published pieces would be a content change nobody asked for. The refusal
names the count, as the address migration's guard does.

**Seeded on migration** with exactly the four values in use — `black`, `clear`, `green`,
`multicolor` — carrying their existing identifiers so nothing bookmarked or indexed breaks (FR-020).

---

## Changed: `products`

| Field | Change | Why |
| --- | --- | --- |
| `colour` | `select hasMany` → **`relationship hasMany` → `colours`** | FR-017. Storage changes; the field's role, multiplicity and filterability do not. |
| `sizes` | **removed** | FR-027. |
| `availability` | unchanged | Still the piece's own choice, still `made-to-order` / `stock-tracked`. |
| `attributes` | unchanged | The piece keeps its own rows; stones may now override them. |

`details` (rich text) and `description` stay on the piece and do **not** become per-stone — FR-009a,
the decision recorded on 2026-09-23.

---

## Changed: `variants`

Two additions, one of which is not the owner's to edit.

| Field | Type | Notes |
| --- | --- | --- |
| `attributes` | array — `attribute` relationship + localized `value` | FR-009. **The product's array definition, copied unchanged**, including its deliberate absence of `required` on `value` ([R7](./research.md#r7--per-stone-properties-reuse-the-products-own-array-unchanged)). |
| `availability` | select, **read-only**, hook-written | Mirrors the parent. Exists so the quantity field can hide itself; see below. |
| `inventory` | condition changes | Shown only when `availability === 'stock-tracked'` (FR-001). Value preserved, never cleared (FR-004). |

### Why `availability` is stored on the variant at all

`admin.condition` is synchronous and sees only the document being edited, so a variant cannot ask
what mode its parent is in ([R5](./research.md#r5--a-variant-cannot-see-its-parent-so-the-parent-tells-it)).
The column exists for the admin form and for nothing else.

**It is never the storefront's source of truth.** The mapper has the parent product in hand when it
maps its variants and reads availability from there, so a stale mirror can misdraw an admin form but
can never sell something that should not be for sale.

**Kept in step by two hooks**:

| Hook | Fires | Does |
| --- | --- | --- |
| `cascadeAvailability` | `products.afterChange` | Writes the piece's `availability` to every one of its variants, when and only when the value changed. |
| `stampAvailability` | `variants.beforeChange` | Reads the parent and stamps the new variant, so one created against an already-made-to-order piece is right immediately. |

Neither reads what the other writes, so the pair cannot fight — the property `clearOtherDefaults`
had to argue for at length in spec 004 is trivially true here.

### Withdrawing one stone (FR-006)

No new field. Variants already carry `_status` (draft/published) and `deletedAt`; unpublishing is
how a single stone leaves a made-to-order piece. The storefront already reads published-only.

---

## Changed: `carts`

| Field | Change | Why |
| --- | --- | --- |
| `items[].size` | **removed** | FR-025. |

`cartItemMatcher` drops size from its comparison. Two lines that differed only by size become one on
the next merge — correct once size is gone, and the reason FR-029 promises an existing line stays
*usable* rather than *identical*.

---

## Removed: `sizes`

The collection, its rows, and `products_sizes`. Nothing preserves them: sizes exist on the
vocabulary, on pieces, and on live cart lines only. Enquiries hold a name, an address and a message,
and the shop keeps no order records — so there is no history to lose.

---

## Availability, in one place

The rule after this feature, replacing the comment at `mappers.ts:128` that currently says the
opposite:

| Piece | Stone | Orderable? | Ceiling |
| --- | --- | --- | --- |
| Made to order | published | **yes, always** | none |
| Made to order | unpublished | no | — |
| Stock tracked | `inventory > 0` | yes | `inventory` |
| Stock tracked | `inventory = 0` | no | — |

A made-to-order piece whose every stone is unpublished reads as unavailable rather than as an empty
selector (FR-008).

---

## Migrations

**Three, split additive from destructive along story lines.** A single migration would drop
`products.sizes` before US4's code exists — in Payload the config change *is* the schema change — and
that breaks `typecheck` until the last story lands, collapsing four shippable stories into one
release. See [tasks.md](./tasks.md#why-three-migrations).

| | Story | Does |
| --- | --- | --- |
| **M1** | Foundational | Create `colours`, seed the four rows with their current `value`s. Add `variants.attributes`. Add `variants.availability` and backfill from each parent. **Removes nothing.** |
| **M2** | US3 | Move `products_colour` rows onto colour relationships; drop `products_colour` and `enum_products_colour`. |
| **M3** | US4 | Drop `carts.items.size`, `products_sizes` and `sizes`. |

**M2's `down` narrows and must refuse rather than discard.** Reversing it means an enum of exactly
four values, and a colour the owner has added since cannot be represented — the same shape of problem
spec 004's country enum had, solved the same way: count the offending rows, raise with a message
naming them and what to do about them, and leave the schema alone. A rollback that quietly drops a
colour from published products is not a rollback.

M1 is purely additive, so its rollback should be clean — confirm that rather than assume it.

**Rehearse with**: a product carrying a colour, a fifth colour the old enum cannot hold, a product
carrying a size, a cart line carrying a size, and a variant carrying its own attribute value.
