# Contract — Cart Loader (`src/lib/cart/loader.ts`)

**Feature**: `005-checkout-handoff` | Companion to [cart-actions.md](./cart-actions.md)

The read side. The only module that turns a `carts` document into something a component may see, and
**the only place a displayed amount is computed** (FR-012).

---

## 1. Surface

```ts
export async function getCart(): Promise<CartView>          // empty CartView when there is none
export async function getCartCount(): Promise<number>       // for the header; cheap, no depth
```

`getCart` is wrapped in React's `cache()` so a render that asks twice — the page and the summary
card — reads once. Per-request only; nothing about a cart is cached across requests (research R12).

Returns an empty `CartView` rather than `null` for "no cart". A caller cannot then forget the null,
and the empty state (FR-015) is a normal render rather than a branch.

---

## 2. What it does, in order

1. **Resolve the owner** — `src/lib/cart/session.ts`, per
   [cart-actions.md §2](./cart-actions.md). `kind: 'none'` short-circuits to the empty view.
2. **Read the cart** with `overrideAccess: false` and the owner's `req`, at a depth that resolves
   `items[].product`, `items[].variant` and `items[].size`.
3. **Re-read each product from the published catalogue.** This is the revalidation FR-014 requires,
   and it is why the loader does not simply render what the cart row says.
4. **Classify each line** into a `CartLineView` plus zero or more `CartIssue`s.
5. **Compute the totals** from the surviving lines.

---

## 3. Why `cart.subtotal` is not rendered

The plugin's `beforeChangeCart` does compute a subtotal server-side, so Constitution VI's letter is
satisfied by it — but it computes a different number than this page must show. It loops every item
and reads `priceIn{currency}` with a bare `payload.findByID`: no `overrideAccess: false`, no status
filter. **An item whose product has since been unpublished or sold out still contributes.**

FR-014 requires exactly those items to be surfaced and excluded until acknowledged, so the drawn
"Subtotal" and `cart.subtotal` would disagree the moment anything went stale — and two numbers that
disagree about money is worse than one number computed once, in the layer that already knows what
*published* and *available* mean.

There is a quieter reason too. `priceField` is built as `` `priceIn${data.currency}` ``, so a cart
saved without a currency reads `priceInundefined` and the subtotal silently becomes `NaN`. The field
defaults to `USD`, but computing our own means a regression there shows up as a wrong number in an
admin sidebar rather than in front of a customer. See [research R5](../research.md).

`cart.subtotal` remains useful to the shop owner in the admin. It is simply not what the storefront
draws.

---

## 4. Issue classification (FR-014)

| Condition | `kind` | Line renders? | In totals? |
| --- | --- | --- | --- |
| Product no longer published, or deleted | `unpublished` | Yes, named, `href: null` | No |
| Product or chosen stone out of stock | `unavailable` | Yes, greyed with a reason in **text** | No |
| Current price ≠ price when the line was added | `price-changed` | Yes, with both amounts | Yes, at the current price |
| Quantity exceeds current stock | `quantity-reduced` | Yes, clamped, with a note | Yes, at the clamped quantity |

Two rules hold across all four:

- **A line never silently disappears.** A cart that quietly loses a piece is a cart the customer
  cannot reason about; the edge case in the spec names this directly.
- **The reason is in text, never in colour alone.** The same rule `ProductPurchase` already follows
  for a sold-out piece (FR-040 of spec 003).

`issues` being non-empty is what `beginCheckout` refuses on until acknowledged. Acknowledgement is a
client interaction — the customer sees the change and presses on — and is not persisted, because
FR-029 leaves nowhere to persist it.

---

## 5. Amounts

- Every unit price is resolved from the **variant** where the piece has stones, and from the
  **product** where it has none — `carts_items` carries no price of its own, by design
  ([research R6](../research.md)).
- Line total is `unitMinor × quantity`, integer arithmetic throughout.
- Subtotal is the sum of the line totals of lines not excluded by §4.
- Formatting happens exactly once, at the boundary, through `formatPrice` — which throws on a
  non-integer minor unit rather than rendering a float artefact. Nothing that draws a price reads
  `unitMinor`.
- `shipping` is the string `"$0"`. Nothing computes delivery; it is arranged with the seller.

Currency is `CATALOG_CURRENCY` from `src/lib/catalog/price.ts`, not read from the cart row.

---

## 6. `getCartCount`

Reads the same cart at `depth: 0` and sums quantities. Deliberately does **not** revalidate: the
badge is a hint, and making the header pay for a catalogue re-read on every route would be a poor
trade. The authoritative count is what the cart page shows.

Callers are the cart mutation actions (which return the fresh count) and nothing in a layout —
reading `cookies()` in the root layout would opt every route into dynamic rendering and cost the
prerendered catalogue ([research R8](../research.md)).

---

## 7. Test obligations

| Test | Tier | Covers |
| --- | --- | --- |
| Totals ignore an unpublished line | integration | FR-014, R5 |
| Totals ignore a sold-out line but the line still renders | integration | FR-014 |
| Subtotal is summed from integers and formatted once | unit | FR-012, FR-013 |
| A deleted product yields a named line with `href: null`, not a crash | integration | edge case |
| Quantity above stock is clamped and flagged | integration | FR-009, FR-014 |
| Loader never returns `cart.subtotal` | integration | R5 — asserted, so the negative stays true |
| Empty cart returns `empty: true` and no summary | unit | FR-015 |
