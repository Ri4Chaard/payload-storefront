# Contract — Cart Server Actions (`src/lib/cart/actions.ts`)

**Feature**: `005-checkout-handoff` | Companion to [cart-loader.md](./cart-loader.md)

The whole mutation surface of the cart. One `'use server'` file; nothing else in the app writes to
`carts`.

> **Every action is a public POST endpoint.** Next's own docs are explicit: *"Server Functions are
> reachable via direct POST requests, not just through your application's UI. Always verify
> authentication and authorization inside every Server Function."* Ownership here is not a UI
> concern — it is re-derived from the cookie or the session on every call (§2), never taken from an
> argument.

---

## 1. Shared result shape

```ts
export type CartActionResult =
  | { ok: true; itemCount: number }
  | { ok: false; reason: CartActionFailure; field?: 'diamond' | 'size' | 'quantity' | 'product' }

export type CartActionFailure =
  | 'unavailable'      // the piece, or the chosen stone, cannot be bought
  | 'missing-option'   // a required choice was not made — `field` names it
  | 'not-found'        // the line, or the cart, is gone
  | 'error'            // anything else; never leaks a database message
```

`itemCount` rides on every success so the caller can update the header badge without a second read
(research R8). Failures name the **field**, not a sentence — the words belong to the interface that
has to say them, which is the rule `validateIntent` already follows in
`src/lib/catalog/cart-intent.ts`.

Actions **return** failures; they do not throw. A thrown error in a Server Action reaches the client
as an opaque digest, which cannot satisfy FR-002's "the refusal MUST name in words what is wrong".

---

## 2. Ownership resolution (`src/lib/cart/session.ts`)

Called first by every action and by the loader.

```ts
export type CartOwner =
  | { kind: 'customer'; user: CustomerUser }
  | { kind: 'guest'; cartId: number; secret: string }
  | { kind: 'none' }               // no session and no cookie — nothing to read
```

- A signed-in customer is resolved through the existing `requireCustomerUser`-style path in
  `src/lib/auth/dal.ts`. The customer's cart is found by `customer` relationship, not by cookie.
- A guest is resolved from the httpOnly `aurum-cart` cookie.
- **A customer session always wins over a cookie.** If both are present the guest cart is merged
  (§5) and the cookie cleared, so a signed-in visitor can never end up writing to an orphan.

Every downstream Payload call passes a `req`:

| Owner | `req` passed | Access rule that runs |
| --- | --- | --- |
| customer | `{ user }` | `isDocumentOwner` |
| guest | `{ context: { cartSecret: secret } }` | `hasCartSecretAccess` |

**`req` is never omitted.** `createRequestWithSecret` returns `req` unchanged when `req` is falsy,
so an omitted request means the secret is silently dropped and the read is refused — research R3,
and the subject of the phase-0 spike.

`overrideAccess: false` on every call. Access control is the plugin's collection's job; re-deriving
it in a `where` clause is what Constitution IV forbids.

---

## 3. Actions

### `addToCart(intent: CartIntent): Promise<CartActionResult>`

FR-001 – FR-004. The body `src/lib/catalog/cart-intent.ts` has been holding open since spec 003.

1. Load the product **from the published catalogue** (`getProduct`, `overrideAccess: false`).
   Absent ⇒ `{ ok: false, reason: 'unavailable', field: 'product' }`.
2. `validateIntent(intent, product)` — the existing, already unit-tested function. Non-null ⇒
   return its `field` and `reason` unchanged.
3. Resolve the owner (§2). `kind: 'none'` ⇒ create a cart, capture `doc.secret` from the creation
   response (it is never readable again), write the cookie.
4. `addItem({ payload, cartsSlug: 'carts', cartID, item: { product, variant?, size? }, quantity, req, cartItemMatcher })`
   — our matcher, passed explicitly, so a differing size makes a new line instead of incrementing
   one (FR-004).
5. Write `aurum-cart-count`, call `refresh()`, return the new count.

**The intent carries identifiers only** — no price, no title, no formatted string. The note at the
top of `cart-intent.ts` explains why at length, and it still holds: a page that can name its own
price is a page that can be edited to name a smaller one.

### `setLineQuantity(lineId: string, quantity: number): Promise<CartActionResult>`

FR-009. Clamped server-side against the stone's or the piece's current ceiling — the client's
stepper is a convenience, not the constraint. `quantity < 1` is refused rather than silently
removing the line; removal has its own confirmation (FR-010) and must not be reachable by holding
the minus key.

Uses the plugin's `updateItem` with a direct value rather than `{ $inc }`, so two rapid clicks
converge on what the customer sees instead of compounding.

### `removeLine(lineId: string): Promise<CartActionResult>`

FR-010. Assumes the confirmation has already happened in the UI — the action itself is
unconditional, because a "confirmed" boolean crossing the wire would be a client-supplied
authorisation.

### `beginCheckout(): Promise<CheckoutResult>`

FR-019, FR-021, FR-022, FR-026, FR-027.

```ts
export type CheckoutResult =
  | { ok: true; message: string; messengers: MessengerLink[] }
  | { ok: false; reason: 'empty' | 'issues' | 'no-messengers' | 'error' }
```

1. Re-read and re-validate the cart (loader, §[cart-loader.md](./cart-loader.md)). Unacknowledged
   issues ⇒ `'issues'`; empty ⇒ `'empty'` (FR-014, FR-015).
2. Compose the message **once** from that read (research R14) and build a link per enabled
   messenger.
3. **Does not clear the cart** (FR-027) and **does not write anything** (FR-029).

`'no-messengers'` is not an error state for the customer — it is what routes them to the copyable
fallback (FR-024).

### `buyNow(intent: CartIntent): Promise<CheckoutResult>`

FR-019, FR-020. Validates the intent exactly as `addToCart` does, then composes a message for that
one piece **without touching the cart at all** — no create, no add, no clear. The cart is not read
and not written; that is the whole content of FR-020, and it is a property of the code path rather
than a check inside one.

Distinct from `addToCart` at the signature, as `cart-intent.ts` predicted in spec 003: *"in 004 they
diverge: one stays on the page and one leaves for the checkout."*

---

## 4. Settling the mutation

Every successful mutating action ends with `refresh()` from `next/cache` — **never**
`revalidatePath`, which invalidates a cache shared by every visitor (research R7). `refresh()` may
only be called from a Server Action, which is why all of these are one.

---

## 5. `mergeGuestCart(user, cookie): Promise<void>` (`src/lib/cart/merge.ts`)

FR-005. Called from the existing sign-in action after the session is established.

Written here rather than delegated because the plugin's `mergeCartEndpoint` is registered without a
matcher and its internal `defaultMergeItemMatcher` compares product and variant only — so a size 6
and a size 7 of the same ring merge into one line of quantity two. It is also not exported from the
package root, so the correct matcher cannot be injected (research R4).

- Guest lines are matched into the account cart with `cartItemMatcher` from
  `src/collections/carts.ts`; matches sum their quantities, non-matches are appended.
- Nothing is dropped from either side.
- The guest cart is deleted and both cookies cleared, in that order — a delete that fails must not
  leave the visitor holding a cookie for a cart they can no longer reach.
- Failure is logged and swallowed. A merge that throws must never block a sign-in.

---

## 6. Test obligations

| Test | Tier | Covers |
| --- | --- | --- |
| A guest `req` carrying only `context.cartSecret` passes `hasCartSecretAccess` | integration | R3 spike — blocks the phase |
| Same product, different size ⇒ two lines | integration | FR-004 |
| Same product, same size ⇒ one line, summed | integration | FR-004 |
| Customer A cannot read or mutate customer B's cart | integration | FR-007, SC-010 |
| A guest cookie for someone else's cart is refused | integration | FR-007 |
| Merge keeps both sizes and sums only true matches | integration | FR-005, R4 |
| Unpublished / sold-out product refused, field named | integration | FR-002 |
| Missing size or stone refused, field named | unit | FR-003 |
| Quantity clamped to current stock server-side | integration | FR-009 |
| `buyNow` leaves an existing cart byte-identical | integration | FR-020, SC-005 |
| Repeated `beginCheckout` composes one message | unit | FR-026, SC-004 |
| No action returns a raw database error | integration | `'error'` opacity |
