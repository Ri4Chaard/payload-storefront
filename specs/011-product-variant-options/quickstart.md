# Quickstart: Product Variant Options

**Feature**: [spec.md](./spec.md) · **Date**: 2026-09-23

How to prove this feature works, by hand, in the order the user stories ship. Each section stands
alone — US1 can be verified before US2 exists.

## Prerequisites

```bash
docker compose --profile local up -d
pnpm payload migrate
pnpm dev
```

Storefront http://localhost:3000 · Admin http://localhost:3000/admin

---

## 1. Made to order stops asking for stock (US1, P1)

**The defect first**, so the fix is visible as a change rather than asserted:

1. Before the migration, mark a ring **Made to order** and add two stones, leaving both quantities
   empty. Open the product page — **both stones read as unavailable and the piece cannot be
   ordered.** That is what US1 fixes.

Then, after:

2. Admin → a ring → sidebar → **Made to order**. Add two stones. → Neither stone's form offers a
   quantity field (FR-001).
3. Product page → both stones are selectable, and each is labelled as made to order rather than
   carrying a count (FR-002, FR-007).
4. Add one to the cart and raise the quantity well past anything plausible → no ceiling (FR-003).
5. Switch the ring to **Stock tracked** → the quantity field is back on both stones, **carrying the
   numbers they had before** if they ever had any (FR-004, FR-005). Set one to `0` → it reads as
   unavailable.
6. Switch back to **Made to order**, then unpublish one stone → it disappears from the selector; the
   other still sells (FR-006).
7. Unpublish the second as well → the piece reads as unavailable rather than showing an empty
   selector (FR-008).

**Also check the cascade caught up**: after step 5, open a stone created *before* the switch. Its
form must agree with the piece it belongs to — that is the hook in
[R5](./research.md#r5--a-variant-cannot-see-its-parent-so-the-parent-tells-it) doing its job, and
the most likely thing to be subtly wrong.

---

## 2. Properties differ per stone (US2, P2)

1. Admin → **Attributes** → confirm `Carat weight` and `Certificate` exist, or add them.
2. A ring with two stones → on the ring itself, set `Metal = 18k gold` and `Carat weight = 1.0 ct`.
3. Stone A → set `Carat weight = 1.5 ct` and `Certificate = GIA 22`. Leave stone B with none.
4. Product page, before touching the selector → the piece's values show: Metal, Carat 1.0 (FR-012).
5. Select stone A → Carat becomes **1.5**, Certificate **appears**, Metal is **unchanged**, and the
   order does not shuffle (FR-010, FR-011, FR-016). No page reload (FR-013).
6. Select stone B → back to the piece's own values (FR-004 of US2's scenarios).
7. Switch the site to Ukrainian → the values translate where translated and fall back where not
   (FR-014).
8. Delete `Certificate` from **Attributes** → it stops appearing on stone A, with no blank row left
   behind (FR-015).

**Check what stays put**: the "Product details" prose and the short description under the price must
read the same whichever stone is selected — FR-009a, the decision taken on 2026-09-23.

---

## 3. The owner defines the colours (US3, P3)

1. Admin → **Colours** → the four existing values are there, with their labels.
2. Add `Rose gold`, `value = rose-gold`, and give it Ukrainian and Russian labels.
3. Apply it to a piece and publish.
4. Listing → filter drawer → **Rose gold** is offered; selecting it returns that piece, with **no
   deployment** (FR-017, SC-005).
5. The URL reads `?colour=rose-gold`.
6. Rename the label to `Rose` → the piece is still returned by `?colour=rose-gold`, and existing
   links still work (FR-018, FR-019).
7. Switch to Ukrainian → the drawer shows the Ukrainian label; the URL is unchanged.
8. **The regression that matters**: open a link saved before this feature —
   `/rings?colour=black&colour=green` — and confirm it returns exactly the pieces it did before
   (FR-020, SC-006).
9. Try to delete a colour still applied to a piece → refused, naming how many (FR-023).
10. Remove it from every piece, then delete → gone from the drawer.
11. A colour applied to nothing IS offered, with a count of zero (FR-022) — the same as every other
    empty facet. *This step said the opposite until implementation: `getFilterFacets` has held since
    spec 003 that hiding empty options "makes the panel change shape as a visitor filters, which
    loses the option they were about to press". The requirement was the thing at fault, not the
    code.*
12. `?colour=nonsense` → the page loads, the notice names the ignored filter, and the grid is not
    narrowed by it.

---

## 4. Sizes leave (US4, P4)

1. Product page → no size selector, and the piece adds to the cart in **one** action (FR-025,
   SC-007).
2. Filter drawer and toolbar → no SIZE group (FR-026).
3. Admin → no size field on a product, no **Sizes** in the navigation (FR-027).
4. Open `/rings?size=6&colour=black` → loads, applies the colour, ignores the rest (FR-028).
5. A cart line saved **before** the change → still listed, still sendable to the seller (FR-029).
6. Search the repository for user-visible size copy → nothing left (SC-008).

---

## 5. The rollback rehearsal

The one step worth doing on a scratch database rather than the dev one, for the reason spec 004's
country enum taught: **this `down` narrows.**

```bash
docker exec -i <postgres> psql -U aurum -d postgres \
  -c "DROP DATABASE IF EXISTS aurum_rollback;" -c "CREATE DATABASE aurum_rollback;"

DATABASE_URI="postgres://aurum:aurum@localhost:5432/aurum_rollback" pnpm payload migrate
```

Then, against that database:

1. Save a product carrying a colour, a product carrying a size, a cart line carrying a size, and a
   stone carrying its own attribute value.
2. Add a **fifth** colour and apply it to a piece.
3. `pnpm payload migrate:down` → **must refuse**, naming the piece that uses a colour the old enum
   cannot represent, and leaving the schema untouched.
4. Remove that colour from the piece and run it again → clean.
5. Confirm the dev database is untouched: `pnpm payload migrate:status`.

A `down` that succeeds at step 3 is the bug. Losing a colour quietly to make a schema change work is
exactly what Constitution IV's rollback requirement exists to prevent.

---

## Gates

```bash
pnpm lint && pnpm typecheck
pnpm check:naming && pnpm check:stories && pnpm check:tokens && pnpm check:styles && pnpm check:contrast
pnpm test && pnpm test:integration
pnpm test:e2e && pnpm test:a11y && pnpm test:stories
```

Run the e2e suite on a warm server. A cold `next dev` compiling a route on first hit can exhaust a
test's budget and report as a product failure.
