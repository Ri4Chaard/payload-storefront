# Phase 1 — Data Model: Checkout, Cart and Messenger Handoff

**Feature**: `005-checkout-handoff` | **Date**: 2026-09-08 | **Plan**: [plan.md](./plan.md)

Two tiers, as in specs 003 and 004: what Payload stores, and the narrower view models that cross
into components. The boundary is deliberate — `src/lib/catalog/types.ts` records why, and the same
rule holds here.

**This feature adds exactly one table.** `carts` and `carts_items` — including `size_id` and its
foreign key — were landed by spec 003 and are already in
`migrations/20260828_161241_catalog.json`. Nothing about them changes.

---

## 1. Payload schema

### 1.1 `contact-settings` — new global (FR-033 – FR-042)

Where the shop's own messenger accounts live. Registered in `payload.config.ts` alongside `Shop` and
`AccountSettings`, `admin.group: 'Shop'` so the three configuration surfaces sit together.

**Access** — stated explicitly, never left to default (Constitution IV):

| Operation | Rule | Why |
| --- | --- | --- |
| `read` | `() => true` | The destinations are shown to every visitor who opens the modal. Public by nature. |
| `update` | `isAdmin` | FR-041. A customer session must never reach this. |

**Hooks**: `afterChange: [revalidateGlobalOnChange]` — the same hook `Shop` uses. FR-042 requires a
saved change to reach the storefront without a deployment, and after R11 these values appear in the
footer on every cached product page.

| Field | Type | Required | Label | Admin description | Rules |
| --- | --- | --- | --- | --- | --- |
| `messengers` | `array` | — | Messengers | "The platforms offered when a customer completes their order. Drag to reorder — customers see them in this order." | Row order **is** display order (FR-038). No `position` field. |
| `messengers[].platform` | `select` | yes | Platform | "Which service this row opens." | Options `whatsapp`, `telegram`, `instagram`. Unique across rows. |
| `messengers[].destination` | `text` | yes | Account | "WhatsApp: the phone number, written however you like — `+1 (555) 010 20-30` is fine. Telegram and Instagram: the username." | Normalised on save (§3). Validated per platform (FR-039). |
| `messengers[].handle` | `text` | yes | Displayed handle | "What customers see beneath the platform name, e.g. `@aurum`. This is a label — it does not have to match the account above." | FR-037: separate from `destination`, never derived from it. |
| `messengers[].enabled` | `checkbox` | — | Offer this messenger | "Untick to hide the row without losing the account details." | Default `true`. Validation only bites when ticked (FR-039). |
| `messageTemplate` | `textarea` | — | Message wording | "The message customers arrive with. `{{items}}` is replaced by their selection, `{{total}}` by the total, and `{{customer}}` by their name and delivery address when they are signed in and have saved them — it disappears when they have not. Leave `{{items}}` in, or the seller receives an empty request." | Must contain `{{items}}` (FR-040). `{{customer}}` and `{{total}}` are optional. Default is the shipped wording, which uses all three. |

**Field-level validation** (FR-039 — the save is refused, the field is named):

- `destination` where `platform` is `whatsapp`: must reduce to 8–15 digits after normalisation.
  Message: *"That does not look like a phone number with a country code. Write it as you would say
  it — `+1 (555) 010 20-30`."*
- `destination` where `platform` is `telegram` or `instagram`: 5–32 characters of
  `[A-Za-z0-9_]` after normalisation. Message names the field and the expected shape.
- Validation runs only when `enabled` is true, so an owner may park a half-filled row unticked.
- `messageTemplate` without `{{items}}` is refused with the reason.

**Why an array and not three field groups**: FR-038 requires reordering, and Payload's array field
is what gives an editor drag handles. Three named groups would need a `position` number that an
editor could set to two identical values.

### 1.2 `carts` — unchanged, restated

Restated because this feature is its first consumer and the shape drives §2.

| Field | Origin | Notes |
| --- | --- | --- |
| `items[]` | plugin | `product`, `variant?`, `quantity`, `currency` |
| `items[].size` | **ours**, spec 003 | `relationship → sizes`. The field the plugin's own React provider cannot set (research R1). |
| `secret` | plugin | Bearer credential. `read: () => false`; returned once at creation via `req.context.newCartSecret`. Held in the httpOnly cookie (R2). |
| `customer` | plugin | Null for a guest cart. |
| `subtotal` | plugin | Computed by `beforeChangeCart`. **Never rendered** — research R5. |
| `currency` | plugin | Defaults `USD`; the only supported currency. |
| `status` | plugin | Virtual, `afterRead`. Not used by this feature. |

Line identity is `(product, variant, size)`, enforced by `cartItemMatcher` in
`src/collections/carts.ts` (FR-004).

---

## 2. View models — `src/lib/cart/types.ts`

Narrower than the documents, for the reasons `src/lib/catalog/types.ts` sets out. **No raw amount
reaches a component except where arithmetic demands it**, and every amount that does is an integer
count of minor units.

```
CartView
  lines        CartLineView[]
  itemCount    number            // total quantity, for "Products, N items" and the header badge
  subtotal     string            // formatted, computed here (R5) — never cart.subtotal
  shipping     string            // always "$0"; arranged with the seller
  currency     string
  issues       CartIssue[]       // FR-014 — non-empty blocks checkout until acknowledged
  empty        boolean

CartLineView
  id           string            // the array row id; what the mutation actions address
  title        string
  href         string | null     // null once the product is gone (FR-008, edge case)
  image        CatalogImage | null
  diamond      string | null     // the chosen stone's label
  size         string | null     // the chosen size's label
  unitPrice    string            // formatted
  lineTotal    string            // formatted
  unitMinor    number            // integer minor units — the only raw amount, for the total
  quantity     number
  maxQuantity  number | undefined  // ceiling for the stepper; undefined = made to order
  available    boolean

CartIssue
  lineId       string
  kind         'unpublished' | 'unavailable' | 'price-changed' | 'quantity-reduced'
  message      string            // what the customer is shown on that line
```

**Why `unitMinor` is present and `subtotal` is not a number**: the total is summed from integers and
formatted once, at the boundary, by `formatPrice` — which throws on a non-integer rather than
rendering `$24,899.999999999996`. Nothing that *draws* a price reads `unitMinor`; it exists so the
sum happens in one place instead of being reconstructed from strings.

**Why lines carry labels, not ids**: a component that can see `variantId` can be made to send it
somewhere. The intent (`CartIntent`) is the only thing that carries identifiers, and it flows the
other way.

**Issue lines still render.** A line with `available: false` keeps its name and photograph so the
customer can see what changed, and is excluded from `subtotal` and `itemCount`.

---

## 3. Messenger normalisation and link building — `src/lib/messengers/`

Pure functions, no database, unit-tested (research R17). The stored `destination` is the raw account
identifier; the URL is always built, never stored (R10).

```
normaliseDestination(platform, input) -> string | { error: string }
```

| Platform | Accepted input | Stored |
| --- | --- | --- |
| `whatsapp` | `+1 (555) 010 20-30`, `001 555 0102030`, `15550102030` | `15550102030` — digits only, no `+`, no leading zero |
| `telegram` | `aurum`, `@aurum`, `https://t.me/aurum` | `aurum` |
| `instagram` | `aurum`, `@aurum`, a profile URL | `aurum` |

```
buildLink(platform, destination, message) -> { href: string; carriesMessage: boolean }
```

| Platform | `href` | `carriesMessage` |
| --- | --- | --- |
| `whatsapp` | `https://wa.me/<destination>?text=<encoded>` | `true` |
| `telegram` | `https://t.me/<destination>?text=<encoded>` | `true` |
| `instagram` | `https://ig.me/m/<destination>` | `false` |

`carriesMessage: false` is the flag FR-021 hangs on: the Instagram row must say the message will not
travel with the customer, and the modal offers it on the clipboard instead. Both formats are
verified against primary sources in [research R10](./research.md).

```
composeMessage(cart: CartView, template: string, customer: MessageCustomer | null) -> string

MessageCustomer
  name     string | null      // customers.name — composed from first + last by a hook
  address  string | null      // the default saved address, formatted WITH its postcode
```

Substitutes `{{items}}` — one line per cart line, name, chosen stone, chosen size, quantity —
`{{total}}`, and `{{customer}}`. Composed **once per modal opening** and held for the modal's
lifetime (research R14), so a double-click cannot produce two messages that disagree.

`{{customer}}` collapses to nothing — taking its surrounding blank line with it — whenever the
datum is absent, which is the case for every anonymous visitor and for any customer who has not
filled in their profile (FR-045). **Degradation is per field, not per auth state**: `name` and
`address` are each included if present and omitted if not, independently.

`MessageCustomer` is assembled by `getMessageCustomer()` in `src/lib/cart/message-customer.ts`,
which resolves the session through `getCustomer()` — the accessor that returns `null` — and never
through `requireCustomer`, which redirects and would put an accidental sign-in gate in the middle of
checkout ([research R18](./research.md)).

**No new table and no new field.** Everything here already exists: `customers.name`, and the
`addresses` collection with its `isDefault` flag, both landed by spec 004.

---

## 4. Cookies

| Name | httpOnly | Holds | Lifetime | Why |
| --- | --- | --- | --- | --- |
| `aurum-cart` | **yes** | Cart id + plugin secret | 30 days, `sameSite: 'lax'`, `secure` in production | The bearer credential for a guest cart. `lax` so it survives the return from WhatsApp in the same tab; `strict` would drop it and empty the cart in front of the visitor (R2). |
| `aurum-cart-count` | no | An integer, nothing else | Same | Read by the client so the header badge does not force every route into dynamic rendering (R8). Carries no id and no secret — losing it costs a stale number, not a cart. |

Deleted together when a cart is emptied or merged into an account cart.

**Both are strictly functional and are not gated behind cookie consent** (FR-050). One is the
credential without which a visitor cannot reopen their own cart; the other is a number. Neither is
used for analytics, and neither identifies a person to anybody but the cart they own. The
constitution gates *non-essential* cookies on consent, and a cart the visitor cannot keep is not a
cart.

## 4a. Retention and erasure (FR-047 – FR-051)

The cart is this feature's only data collection point, and "no payment" does not exempt it.

| Subject | Kept for | Deleted by |
| --- | --- | --- |
| Guest cart | **30 days** without activity | The nightly job. The credential cookie expires on the same clock, so past 30 days the row is unreachable by anyone — keeping it would be keeping a secret nobody can spend. |
| Customer cart | **12 months** without activity | The nightly job. Long enough that a cart is still there when someone returns for it, bounded so the table cannot grow without end. |
| Any cart belonging to a deleted customer | — | The deletion itself, in the same operation (FR-049) |

Both periods are **configuration, not constants** (FR-051) — a stated retention period that only
exists in a source file is one nobody outside the repository can read or change.

The nightly runner already exists: `payload.config.ts` drains the `nightly` queue every fifteen
minutes for spec 004's `purge-accounts` task. Cart expiry is a second task on the same queue, not a
second scheduler. Erasure hangs off the customer deletion path spec 004 already built.

---

## 5. What is deliberately absent

- **No `orders` / `requests` table.** FR-029. `orders: false` and `transactions: false` stay as spec
  003 left them.
- **No per-line price column.** FR-012 wants the current catalogue price; a stored one would be a
  snapshot, and FR-029 ruled snapshots out (R6).
- **No `position` field on a messenger row.** Array order is the order (R9).
- **No customer note, contact-details step, or reference number.** Out of scope in the spec.
