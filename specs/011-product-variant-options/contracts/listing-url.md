# Contract: The listing URL

**Feature**: [../spec.md](../spec.md) · **Supersedes**: the colour and size clauses of
`003-shop-catalog/contracts/catalog-data.md` §4

The listing URL is this shop's most public interface. It is bookmarked, shared, and indexed, so a
change here is a change to links that already exist in the world. This records exactly what moves.

---

## What does not change

Everything a visitor or a crawler can observe about colour:

| | Before | After |
| --- | --- | --- |
| Key | `colour` | `colour` |
| Repeats for multiple values | `?colour=black&colour=green` | unchanged |
| Position in the canonical key order | after `size`, before `shape` | after `collection`, before `shape` |
| Values | `black`, `clear`, `green`, `multicolor` | **the same four**, plus whatever the owner adds |
| Absent means | no colour filter | unchanged |
| Round-trip | `parse → toSearchParams` returns the input | unchanged |

**FR-020 is a promise about strings.** The four identifiers survive the move from an enum column to
a `colours` row, so every link that worked before works after and returns the same pieces (SC-006).
Renaming a colour's label in the admin does not touch its `value`, so the promise holds for renames
too (FR-019).

---

## What changes

### `size` is gone

`?size=` is no longer read. `parseFilters` reads named keys and ignores the rest, so a URL carrying
it **loads normally and applies its remaining filters** (FR-028). It is not reported as a dropped
filter, because after this feature it is not a filter that was dropped — it is a parameter the shop
has never heard of, like `utm_source`.

Removed from `FilterState`, `DEFAULT_FILTERS`, `KEY_ORDER` and `MultiFilterKey`.

### Where an unknown colour is caught

Unchanged in effect, different in location.

| | Before | After |
| --- | --- | --- |
| Validated in | `parseFilters`, against the `COLOURS` constant | `getListing`, against the catalogue |
| Unknown value | dropped, reported in `dropped` | dropped, reported in `ignored` |
| Visitor sees | the notice naming what was ignored | the same notice |

This is the arrangement `category` and `collection` have always had, and the reason `filters.ts`
already describes itself as able to judge "only the closed sets". Colour stops being one.

`shape` **remains** a closed set validated in the parser. `parseClosedSet`, `SHAPES` and
`SHAPE_KEYS` all survive; only `COLOURS` and `COLOUR_KEYS` are deleted.

---

## Canonical form

Unchanged rules, one fewer key:

- Defaults are never written: `page=1`, `sort=recommended`, `inStock=0`.
- Keys are emitted in a fixed order so one grid has one URL.
- Duplicate values collapse.

```
/rings?colour=black&colour=green&minPrice=1200&sort=price-asc
```

---

## Facets

`ListingResult.facets.colours` keeps its shape — `{ value, label }[]` — and changes source:

| | Before | After |
| --- | --- | --- |
| Values | the `COLOURS` constant | the `colours` collection, in `order` |
| Labels | `colour.*` message keys, falling back to `titleCase` | the row's localized `label` |
| Offered when | always | always — a zero count is shown rather than the option hidden, as for every other facet (FR-022) |

`facets.sizes` is removed.
