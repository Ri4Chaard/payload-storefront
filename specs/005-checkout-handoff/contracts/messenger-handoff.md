# Contract — Messenger Handoff (`src/lib/messengers/`)

**Feature**: `005-checkout-handoff` | Covers FR-021 – FR-024, FR-028, FR-033 – FR-042

Three pure modules and one global. Nothing here touches a database except the settings read, which
keeps the whole of the link-building and message-composition logic in the fast unit tier
([research R17](../research.md)).

---

## 1. `normalise.ts` — what an owner types becomes what we store

```ts
export type Platform = 'whatsapp' | 'telegram' | 'instagram'

export function normaliseDestination(
  platform: Platform,
  input: string,
): { ok: true; value: string } | { ok: false; error: string }
```

Run as Payload field validation on save (FR-039), so a malformed destination is refused with the
field named rather than discovered by a customer landing in an empty chat.

| Platform | Accepts | Stores | Rule |
| --- | --- | --- | --- |
| `whatsapp` | `+1 (555) 010 20-30`, `001 555 0102030`, `15550102030` | `15550102030` | Strip everything but digits, then strip leading zeros. 8–15 digits remain, or it is refused. |
| `telegram` | `aurum`, `@aurum`, `https://t.me/aurum` | `aurum` | Strip a leading `@` or a `t.me/` prefix. 5–32 of `[A-Za-z0-9_]`. |
| `instagram` | `aurum`, `@aurum`, a profile URL | `aurum` | As Telegram, against `instagram.com/`. |

**This normalisation is the feature, not a nicety.** WhatsApp's click-to-chat format requires the
number in international format with **no `+`, no spaces, no brackets, no dashes and no leading
zero**. The shop's own number, as written everywhere else in this repo, is `+1 (555) 010 20-30` — so
an owner pasting a hand-built `wa.me` URL produces a dead link, and an owner typing the number they
say out loud produces a working one. FR-035 exists because of exactly this gap.

The refusal messages name the field and show the shape, never a regex.

---

## 2. `links.ts` — identifier plus text becomes a URL

```ts
export interface MessengerLink {
  platform: Platform
  label: string           // 'WhatsApp' — the drawn platform name
  handle: string          // '@aurum' — the displayed handle, from the global
  href: string
  carriesMessage: boolean
}

export function buildLink(
  platform: Platform,
  destination: string,
  message: string,
): { href: string; carriesMessage: boolean }
```

| Platform | `href` | `carriesMessage` |
| --- | --- | --- |
| `whatsapp` | `https://wa.me/<destination>?text=<encodeURIComponent(message)>` | `true` |
| `telegram` | `https://t.me/<destination>?text=<encodeURIComponent(message)>` | `true` |
| `instagram` | `https://ig.me/m/<destination>` | `false` |

Both pre-fill formats are verified against primary sources, not recalled — Telegram's API reference
documents `?text=` as *"UTF-8 text to pre-enter into the text input bar, if the user can write in the
chat"*, and states that it trims to the configured message-length maximum. See
[research R10](../research.md) for the citations.

**`carriesMessage: false` is load-bearing.** Instagram has no documented way to pre-fill a direct
message, so its row must behave differently and say so: the modal offers the message on the
clipboard and tells the customer the chat will open empty. FR-021 requires the modal to list what
each row does; letting a customer arrive at a blank Instagram chat believing their selection went
with them is the failure this flag prevents.

Links open in a new tab with `rel="noopener noreferrer"`.

---

## 3. `message.ts` — the cart becomes text

```ts
export interface MessageCustomer {
  name: string | null
  address: string | null      // already formatted, postcode included
}

export function composeMessage(
  cart: CartView,
  template: string,
  customer: MessageCustomer | null,   // null for an anonymous visitor
): string
```

| Placeholder | Renders | When absent |
| --- | --- | --- |
| `{{items}}` | One line per cart line: name, chosen stone, chosen size, quantity | Required — the template is refused without it (FR-040) |
| `{{total}}` | The formatted subtotal | — |
| `{{customer}}` | The name and delivery address the customer saved on their profile | **Collapses to nothing**, taking its surrounding blank line with it |

- Lines excluded by the loader's issue classification are excluded here too. The seller must not
  receive a request for a piece the customer was just told is unavailable.

### The customer block (FR-043 – FR-046)

`customer` is resolved by `getMessageCustomer()` in `src/lib/cart/message-customer.ts`:

```ts
export async function getMessageCustomer(): Promise<MessageCustomer | null>
```

- Resolves the session with `getCustomer()` — which **returns `null`** for an anonymous visitor.
  **Never `requireCustomer` / `requireCustomerUser`, which redirect**: calling one of those here
  would bounce an anonymous visitor to `/sign-in` in the middle of pressing CHECKOUT, an accidental
  sign-in gate that FR-031 and FR-046 forbid ([research R18](../research.md)).
- Reads the customer's addresses and takes the one with `isDefault` (FR-044). Spec 004's
  `assignFirstAddressAsDefault` and `keepOneDefault` hooks guarantee exactly one.
- Formats it with `formatPostalAddress()`, **not** `src/lib/addresses/types.ts`'s `formatAddress()`.
  That one deliberately drops the postcode — correct for a profile row, wrong for an address a ring
  is posted to. The existing function is left untouched; this is a different question.

**Degradation is per field, not per auth state** (FR-045). Each of `name` and `address` is included
if present and omitted if not, independently. A customer who registered and never filled in their
profile produces exactly the message an anonymous visitor produces — one rule, not four states.

`{{customer}}` collapsing must take its blank line with it, or every anonymous message carries a
ragged gap where the block would have been.

**Composed once per modal opening** and held for the modal's lifetime
([research R14](../research.md)). This is what FR-026 means once FR-029 has removed the record that
idempotency would otherwise have guarded: the risk is not two rows, it is two messages composed from
two reads of a cart whose price changed in between, so the customer sees one total and the seller
receives another.

**Length** (FR-028): Telegram trims to its own maximum, and a very long `wa.me` URL can be rejected
by the browser. A message over the safe budget is truncated at a **line boundary** and gains a final
line naming how many pieces were not listed — never a mid-word cut that silently loses the last
piece. A truncated message is still a complete, readable request.

Non-Latin product names pass through `encodeURIComponent` unchanged; a unit test covers Cyrillic,
since the shop's own market is Kazakhstan and the UAE.

---

## 4. `contact-settings` — the global

Modelled in [data-model.md §1.1](../data-model.md). What matters at this boundary:

- **Read is public, update is `isAdmin`** (FR-041). Stated explicitly, never by omission.
- **Row order is display order** (FR-038) — a Payload array, so an editor gets drag handles and
  there is no `position` number two rows can share.
- **`enabled` hides a row without losing the account** (FR-034), and validation bites only when it
  is ticked, so a half-filled row can be parked.
- **`handle` is separate from `destination`** (FR-037). The modal shows `@aurum` while WhatsApp is
  reached by a phone number; deriving one from the other would make the drawn design unreachable.
- `afterChange: [revalidateGlobalOnChange]` so a saved change reaches the storefront without a
  deployment (FR-042) — necessary because after [R11](../research.md) these values also appear in
  the footer of every cached product page.

### Reader

```ts
export async function getMessengers(): Promise<{ platform, label, handle, destination }[]>
export async function getMessageTemplate(): Promise<string>
```

Server-only, `cache()`d per request, `enabled` rows only, in array order. A Local API global read is
not a request-time API, so calling it from the root layout does not force dynamic rendering — which
is what makes [R11](../research.md)'s footer migration free.

---

## 5. The fallback (FR-024)

Reached when no messenger is enabled, or when the customer cannot follow a link. The modal presents
the composed message in a copyable form together with `CONTACT.email` and `CONTACT.phone` from
`src/lib/contact.ts`.

This is also the Instagram path in part: its row opens the chat *and* puts the message on the
clipboard, because `carriesMessage` is false.

---

## 6. Test obligations

| Test | Tier | Covers |
| --- | --- | --- |
| `+1 (555) 010 20-30` → `15550102030` | unit | FR-035, SC-007 |
| Leading zeros and international prefixes stripped | unit | FR-035 |
| `@aurum`, a bare username and a `t.me` URL all normalise identically | unit | FR-036 |
| A destination that cannot normalise is refused, field named | integration | FR-039, SC-012 |
| An enabled row with an empty destination cannot be saved | integration | FR-039, SC-012 |
| A disabled row with a broken destination *can* be saved | integration | FR-034 |
| Built links match the verified formats exactly | unit | FR-022, R10 |
| Instagram reports `carriesMessage: false` | unit | FR-021 |
| Message contains every line, stone, size and quantity | unit | FR-022, SC-002 |
| Products with both options, one option and neither | unit | SC-002 |
| A signed-in customer with a name and a default address gets both in the message | unit | FR-043 |
| The **default** address is chosen when several are saved | integration | FR-044 |
| Name present, address absent — and the reverse — each omit only their own part | unit | FR-045 |
| An anonymous visitor's message equals a profile-less customer's message | unit | FR-045 |
| `{{customer}}` collapses without leaving a blank line | unit | FR-045 |
| Composing for an anonymous visitor never redirects | integration | FR-031, FR-046, R18 |
| The message address includes the postcode `formatAddress` drops | unit | R18 |
| Cyrillic and a 40-character name survive encoding | unit | FR-028 |
| An over-length message truncates at a line boundary and says so | unit | FR-028 |
| A template without `{{items}}` is refused | integration | FR-040 |
| Reordering rows reorders the modal | e2e | FR-038 |
| A customer session cannot update the global | integration | FR-041 |
