# Phase 0 — Research: Checkout, Cart and Messenger Handoff

**Feature**: `005-checkout-handoff` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

Every decision below was taken against the installed code rather than from recall. Where a finding
comes from a dependency, the file is named so the next reader can check it rather than trust it —
`@payloadcms/plugin-ecommerce` is at 3.88.0 and its `dist/` is the only documentation it ships.

The headline: **the cart table, its `size` column and its matcher already exist and are already
migrated**; what does not exist is any way for the storefront to reach them. Nine of the fourteen
decisions below are about that reach, and four of them turn on the same discovery — the plugin's
own client-side cart provider cannot represent a chosen size.

---

## R1 — The cart is driven by our own Server Actions, not the plugin's React provider

**Decision**: Do **not** mount `EcommerceProvider` / `useCart`. Write our own server actions in
`src/lib/cart/` that call the plugin's exported cart *operations* (`addItem`, `updateItem`,
`removeItem`, `clearCart`) through Payload's Local API.

**Rationale**: three independent reasons, any one of which would be enough.

1. **The provider cannot carry a size.** `dist/react/provider/index.d.ts` types the hook as
   `addItem: (item: { product, variant? }, quantity?) => Promise<void>`. There is no third
   identifier. Spec 003 added `size` to every cart item precisely because size is a product field
   rather than a variant type, and `src/collections/carts.ts` documents that a lost size means
   "a chosen size would be lost between the product page and the seller's message" — the exact
   failure. The runtime would in fact forward an extra key (`addItem` spreads `item`), so the
   escape is a `@ts-expect-error` on a published type — a cast against a dependency's contract on
   the one field the whole feature exists to carry.
2. **It puts the guest cart secret in `localStorage`.** Lines 199–218 of the provider write
   `cartID` and `${key}_secret` to `localStorage`. That secret is a bearer credential: the
   collection's `read`, `update` **and `delete`** access all resolve through
   `hasCartSecretAccess`, so anything that can read it can empty a stranger's cart. `localStorage`
   is readable by any script on the origin. R2 puts it in an httpOnly cookie instead.
3. **It would make the cart page a client tree.** The provider is `'use client'` and fetches over
   REST on mount. Constitution V makes server components the default and requires `use client` to
   be justified by actual interactivity and pushed down. The cart page's content — photographs,
   names, prices, totals — is not interactive; only the stepper and the two buttons are.

**Alternatives considered**: *Use the provider and cast.* Rejected on (2) and (3) alone — the size
cast is only the most visible of the three problems. *Fork the provider.* Rejected: it is 1093
lines of code we would then own, to reach four operations the package already exports from its
root (`dist/index.d.ts` exports `addItem`, `clearCart`, `removeItem`, `updateItem`,
`defaultCartItemMatcher`, `isNumericOperator`).

**Consequence for the seam**: `src/lib/catalog/cart-intent.ts` keeps its signatures. Its `submit`
body — the one marked "004 puts the line in the cart here" — becomes a call into `src/lib/cart/`.

---

## R2 — Guest carts are identified by an httpOnly cookie holding the id and the secret

**Decision**: One cookie, `aurum-cart`, `httpOnly`, `sameSite: 'lax'`, `secure` in production,
holding the cart id and the plugin-generated secret. Written by the server action that creates the
cart, read by the loader and by every subsequent action.

**Rationale**: the plugin already generates the credential and hands it over exactly once.
`dist/collections/carts/beforeChange.js` mints `crypto.randomBytes(20).toString('hex')` on create
when there is no customer, and stashes it in `req.context.newCartSecret`; the collection's
`afterRead` hook copies it onto the returned document *only* on that request — the `secret` field's
own access is `read: () => false` forever after. So the secret is available at creation and never
again, which forces a decision about where to keep it, and httpOnly is the only option that keeps
it out of reach of scripts. `sameSite: 'lax'` because a cart must survive a return from WhatsApp in
the same tab; `strict` would drop the cookie on some of those returns and empty the visitor's cart
in front of them.

**Alternatives considered**: *`localStorage`, as the plugin does.* Rejected in R1. *A signed cart
id with no secret.* Rejected: the plugin's access control is written against the secret, so this
would mean bypassing `overrideAccess` on every read — replacing a working access rule with our own.

---

## R3 — Local API calls into the cart operations MUST pass a `req`, or access silently fails

**Decision**: Every call into a cart operation passes a request object: `{ user }` for a signed-in
customer, `{ context: { cartSecret } }` for a guest. A spike task verifies this against a running
database before the rest of the cart work starts.

**Rationale**: `dist/collections/carts/operations/createRequestWithSecret.js` reads
`if (!secret || !req) return req` — hand it a `secret` but no `req` and it returns `undefined`,
the operation then calls `payload.findByID({ overrideAccess: false, req: undefined })`, the access
function sees neither a user nor a `context.cartSecret`, and the read is refused. The failure mode
is an operation that reports "cart not found" for a cart that exists, which reads like a bug in our
code and is not.

This is the one decision in this document taken from reading rather than from running, which is
why it gets a spike rather than a paragraph. What has to be confirmed is narrow: that Payload's
Local API accepts a partial `req` carrying only `context`, and that `hasCartSecretAccess` sees it.

**Alternatives considered**: *`payload.find({ overrideAccess: true, where: { and: [{ id }, { secret }] } })`*
— the pattern the plugin's own `mergeCart` uses. Kept as the documented fallback if the spike
fails; rejected as the default because `overrideAccess: true` turns off the collection's access
control and re-implements it in a `where` clause, which Constitution IV treats as the thing access
rules exist to prevent.

---

## R4 — Merging a guest cart at sign-in is ours to write, because the plugin's merge loses sizes

**Decision**: Implement the merge in `src/lib/cart/merge.ts`, called from the existing sign-in
action, using the `cartItemMatcher` already exported by `src/collections/carts.ts`.

**Rationale**: the plugin ships a merge, and it is wrong for this schema in two ways that compound.
`dist/collections/carts/createCartsCollection.js` registers it as
`mergeCartEndpoint({ cartsSlug })` — note the absent `cartItemMatcher` — above a comment reading
"mergeCartEndpoint uses its own matcher that handles CartItemData for both items". That matcher,
`defaultMergeItemMatcher` in `operations/mergeCart.js`, compares product and variant and stops. So
merging a guest cart holding a ring in size 6 into an account cart holding the same ring in size 7
produces one line of quantity two — the precise defect `src/collections/carts.ts` documents and
guards against for `addItem`, reappearing on a different path. And `mergeCart` is **not exported
from the package root**, so the correct matcher cannot be injected even by calling it directly.

FR-005 says the merge must drop nothing from either side. A matcher that collapses two sizes into
one drops a size.

**Alternatives considered**: *Call the merge endpoint and accept the collapse.* Rejected — it
silently produces a cart the seller cannot fulfil, which is the failure this schema was shaped to
avoid. *Skip merging; keep the guest cart until it is manually re-added.* Rejected: FR-005.

---

## R5 — `cart.subtotal` is not what the page renders

**Decision**: The cart loader computes every displayed amount itself, from the same published
catalogue reads the rest of the storefront uses. `cart.subtotal` is treated as the plugin's
internal denormalisation and is never rendered.

**Rationale**: `beforeChangeCart` does compute a subtotal server-side, which satisfies the letter of
Constitution VI — but it computes the wrong number for this page. It loops every item and reads
`priceIn{currency}` with a bare `payload.findByID` — no `overrideAccess: false`, no status filter —
so an item whose product has since been **unpublished or sold out still contributes to the total**.
FR-014 requires exactly those items to be surfaced and excluded until acknowledged, so the drawn
"Subtotal" and `cart.subtotal` would disagree the moment anything went stale. Two numbers that
disagree is worse than one number computed once, in the layer that already knows what "published"
and "available" mean (`src/lib/catalog/mappers.ts`).

There is a second, quieter reason. `priceField` is built as `` `priceIn${data.currency}` ``, so a
cart saved without a `currency` reads `priceInundefined` and the subtotal becomes `NaN`. The field
does default to `USD` (`dist/fields/currencyField.js`, single supported currency), but the loader
computing its own total means a regression there shows up as a wrong admin sidebar rather than as a
wrong price in front of a customer.

**Alternatives considered**: *Render `cart.subtotal`.* Rejected above. *Fix the plugin's hook via
an override.* Rejected: we would be reimplementing the loop anyway, and then owning it in the one
place a mistake charges someone the wrong amount.

---

## R6 — Line unit prices are resolved at read time, not stored on the line

**Decision**: The loader resolves each line's unit price from its variant, or from the product where
the piece has no stones — the same `lowestPriceMinor` / variant-price path the product page uses.

**Rationale**: `dist/fields/cartItemsField.js` adds a per-item `amountField` only when
`individualPrices` is set, and the carts collection does not set it. So there is no price on the
line to read, which is the correct shape here: FR-012 wants the current catalogue price, and a
stored one would be a snapshot — and FR-029 has ruled out snapshots entirely.

---

## R7 — Cart mutations end with `refresh()`, never `revalidatePath`

**Decision**: Server actions that change a cart call `refresh()` from `next/cache`.

**Rationale**: `revalidatePath` invalidates a **shared** cache entry. A cart is per-visitor, so
calling it would either do nothing useful or evict a catalogue page for everyone because one person
changed a quantity. `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md`
documents `refresh()` as refreshing the calling client's router from within a Server Action, which
is precisely the scope of a cart change. It may only be called from a Server Action — not from a
route handler — which suits, since R1 puts every mutation in one.

`src/lib/revalidate.ts` is untouched by this feature except for the new global (R9).

---

## R8 — The header's cart count must not make every route dynamic

**Decision**: The count is delivered to the already-client `Header` by a small client provider seeded
from a **separate, readable** `aurum-cart-count` cookie, and updated from the value each cart
server action returns. The root layout does not read `cookies()`.

**Rationale**: `cookies()` is a request-time API — reading it in a layout opts the whole route into
dynamic rendering (`.../04-functions/cookies.md`). The root layout wraps every page, and
`/products/[slug]` is prerendered from `generateStaticParams` with `src/lib/catalog/prerender.ts`
behind it. Reading the cart cookie in the layout would therefore convert the entire prerendered
catalogue into on-demand rendering to draw a number in a badge — a Core Web Vitals regression
against Constitution V, traded for a decoration.

A second cookie is not duplication of state: the authoritative cart lives in Postgres, the httpOnly
cookie (R2) is the credential, and this one is a display hint that is allowed to be briefly stale.
It is deliberately *not* httpOnly, because its whole purpose is to be read without a server round
trip. It carries a count and nothing else — no ids, no secret, nothing that identifies a cart.

`Header` is already `'use client'` (`src/components/layout/header/header.tsx:1`) and already takes
`cartCount`, so nothing about the component changes.

**Alternatives considered**: *Read the cookie in the layout.* Rejected above. *Suspense around a
server-rendered badge.* The partial-prerender behaviour that would make this work is described in
the docs under Cache Components, which `next.config.mjs` does not enable; turning it on is a
site-wide rendering change and not this feature's to make. *No count until the cart page.* Rejected:
FR-016.

---

## R9 — Seller destinations live in a new `contact-settings` global

**Decision**: A new Payload global, `contact-settings`, `admin.group: 'Shop'`, holding an array of
messenger rows plus the message template. Not fields added to `Shop`.

**Rationale**: `Shop` is documented as "shop-wide copy that is not per-product" and every field on
it is product-page accordion content; `AccountSettings` is documented as "how the accounts feature
behaves — not what it says". Messenger destinations are neither. They are the shop's identity, they
are read by the chrome on every route, and they belong beside the other two rather than inside one
of them — which is what `admin.group: 'Shop'` achieves and what FR-033 asks for.

An **array** rather than three named field groups, because FR-038 requires reordering and Payload's
array field is what makes rows reorderable in the admin. Order is the array's own order; there is no
`position` field to keep in sync.

This global is the feature's only schema change, and therefore its only migration. The cart table,
`carts_items.size_id` and its foreign key are already in
`migrations/20260828_161241_catalog.json`.

---

## R10 — Both named messengers can carry a pre-filled message; Instagram cannot

**Decision**: Store the raw account identifier and build the link. Verified formats:

| Platform  | Link built                                   | Pre-fill | Identifier stored           |
| --------- | -------------------------------------------- | -------- | --------------------------- |
| WhatsApp  | `https://wa.me/<digits>?text=<encoded>`       | Yes      | Phone number                |
| Telegram  | `https://t.me/<username>?text=<encoded>`      | Yes      | Username                    |
| Instagram | `https://ig.me/m/<username>`                  | **No**   | Username                    |

**Rationale**: Telegram's own API reference documents `t.me/<username>?text=<draft_text>` as
"UTF-8 text to pre-enter into the text input bar, if the user can write in the chat", and states
that it trims to the configured message-length maximum — which is FR-028's truncation concern
answered by the platform rather than by us. WhatsApp's click-to-chat format requires the number in
international format **digits only**: no `+`, no spaces, no brackets, no dashes, and no leading
zero. Instagram has no documented equivalent for pre-filling a direct message.

This table is the whole justification for FR-035 and FR-036. An owner typing their number the way
they write it — `+1 (555) 010 20-30`, the number already in `src/lib/contact.ts` — produces a
**broken link** if pasted into a `wa.me` URL by hand, and a working one if the system strips it to
`15550102030`. The normalisation is the feature, not a nicety.

Instagram's row therefore behaves differently: it opens the conversation and offers the message on
the clipboard. FR-021 requires the modal to say so rather than let the customer arrive at an empty
chat believing the message went with them.

**Alternatives considered**: *`t.me/share/url`* — genuinely pre-fills, but it opens a chat *picker*
and frames the result as sharing a link; the customer would have to find the seller themselves.
Rejected now that the direct `?text=` form is confirmed. *Storing a full URL per platform.*
Rejected: it moves the formatting rules from code that is tested into a text field an owner has to
get right, which is the failure FR-039 exists to make impossible.

**Sources**: [Telegram deep links](https://core.telegram.org/api/links),
[wa.me link format](https://help.businesschat.io/en/articles/6517838-how-to-build-a-whatsapp-click-to-chat-url-wa-me).

---

## R11 — The new global also replaces `SOCIAL_LINKS`, because two sources of one fact is the defect

**Decision**: The `contact-settings` global becomes the single source of truth for the shop's
messenger accounts. `SOCIAL_LINKS` in `src/lib/contact.ts` is deleted, and the three chrome
components take their links from the global via the layout.

**Rationale**: without this, the feature ships a shop where the owner sets the real WhatsApp number
in the admin, the handoff modal uses it, and **the footer icon on every page still points at
`https://wa.me/`** — the bare placeholder root that `src/lib/contact.ts` marks "these need the real
accounts before launch". That is Constitution I (a fact an editor must be able to change) and
Principle II (duplication, NON-NEGOTIABLE) failing on the same line.

It is also cheap, which is why it is in scope rather than deferred. `contact-banner`, `footer` and
`mobile-nav` already accept `social` as a prop with `SOCIAL_LINKS` merely as its default value — the
change is passing a value from the layout, not rewriting three components. `CONTACT` (email, phone)
stays where it is; this feature has no reason to touch it.

Reading a global in the root layout does not force dynamic rendering — a Local API read is not a
request-time API — so R8's constraint does not apply here.

---

## R12 — The cart route is dynamic; nothing about it is cached

**Decision**: `/cart` reads the cart cookie and therefore renders per request. No `revalidate`, no
prerender, and it is absent from `src/lib/revalidate.ts`'s invalidation list.

**Rationale**: it is per-visitor by construction, and `src/lib/revalidate.ts` already documents the
pattern for routes that are deliberately not cached ("three routes are deliberately absent from this
file, for the same reason: they are not cached"). This is a fourth, and the note there is where the
next reader will look.

---

## R13 — The two modals need one new `Modal` size, and nothing else

**Decision**: Add a `size="lg"`-style token for the drawn 500px panel and a way to centre the
heading. Reuse `Modal` for both new dialogs.

**Rationale**: `src/components/ui/modal/modal.tsx` already owns the focus trap, Escape, the scroll
lock, the scrim and the inert background through `useOverlay`, and it already renders full-bleed
below `sm` — which is what the 358-wide mobile handoff frame is. What it does not have is the drawn
geometry: its two sizes are `sm:w-200` (800px, the address modal) and `sm:w-112.5` (450px), and both
drawn dialogs are 500px with a **centred** heading and no right-aligned footer. Principle II says
extend with props or variants rather than copy, and this is a prop.

---

## R14 — Idempotency without records means guarding the handoff, not the submission

**Decision**: FR-026 is met by composing the message **once** per modal opening and disabling the
CHECKOUT trigger while the modal is open.

**Rationale**: with FR-029 ruling out server-side records, "no duplicates" cannot mean "one row".
What can still go wrong is real: a double-click composing two messages from two reads of the cart,
which can differ if a price changed between them, so the customer could see one total and the seller
receive another. Composing once at open and holding that string for the life of the modal removes
the window entirely.

---

## R15 — What may be a client component, and the budget it has to fit

**Decision**: Four client trees, each as small as it can be — the quantity stepper and remove control
on a cart row, the summary card's agreement checkbox and CHECKOUT button, the handoff modal, and the
cart-count provider. The rows' photographs, names, prices and the computed totals render on the
server.

**Rationale**: Constitution V allows 300KB gzipped per route and 100KB above the measured framework
baseline of 181KB — and records that today's worst route already spends 84KB of that 100KB delta.
The margin is 16KB, so this is a real constraint and not a formality. The cart page adds no new
dependency (R1 is the decision that avoids one), and `zod` — the chunk the constitution names as the
overage on the account routes — is already in the shared graph, so validating a cart action's input
with it costs nothing new on this route.

Measurement is against a production server, as Constitution V requires; a task carries it.

---

## R16 — The size the product page holds is a value, not an id

**Decision**: `ProductPurchase` maps the chosen size's `value` back to its `SizeOption.id` before
building a `CartIntent`.

**Rationale**: a small, concrete trap. `ProductOptions` is typed `size: string | null` and
`onSizeChange: (value: string) => void`, and its options are built as `value: option.value` — so the
component holds `"6.5"`, while `CartIntent.sizeId` and the `carts_items.size_id` foreign key both
want the numeric id. The stone next to it goes the other way: its options are `value: String(option.id)`
and the handler does `Number(value)`. Two adjacent selects with opposite conventions is exactly where
a `Number("6.5") → 6.5` gets written and stored as a broken relationship.

---

## R18 — The customer block reuses spec 004's data, but neither of its two helpers as they stand

**Decision**: `composeMessage` takes an optional `{ name, address }`. It is assembled by a new
`getMessageCustomer()` that returns `null` for anyone not signed in, and a new `formatPostalAddress()`
that is **not** `formatAddress` (FR-043 – FR-046).

**Rationale**: the data exists — `customers.name` is composed from first and last by a hook, and
`getCustomerAddresses()` already returns `CustomerAddress[]` with exactly one `isDefault` guaranteed
by spec 004's `assignFirstAddressAsDefault` / `keepOneDefault` hooks. Two things about the existing
helpers make reusing them directly wrong, and both fail quietly rather than loudly.

1. **`getCustomerAddresses()` calls `requireCustomerUser()`, which redirects.** Calling it during
   checkout for an anonymous visitor would bounce them to `/sign-in` in the middle of pressing
   CHECKOUT — a sign-in gate that FR-031 forbids, arriving by accident rather than by design, and
   arriving only for the visitors least likely to report it. The lookup must be optional: resolve
   the customer with `getCustomer()` (which returns `null`), and only then read addresses.
2. **`formatAddress()` deliberately omits the postcode.** Its own docstring says so, and the reason
   is sound *for the profile*: "it distinguishes nothing a customer looks at, and it is the part of
   an address most likely to push the line past the width of the box." A message to a seller who has
   to post a ring is the one place that reasoning inverts. Reusing it would produce an address that
   looks right in review and is missing the part a courier needs.

So the message gets its own formatter. This is not a Principle II violation: the two functions
answer different questions — *"which of my addresses is this?"* and *"where should this be sent?"* —
and the existing one is left exactly as it is, still doing its job on the profile.

**Alternatives considered**: *Widen `formatAddress` with an `includePostcode` flag.* Rejected — a
boolean parameter that changes what an address *means* is the kind of flag whose two call sites
drift, and the profile's careful reasoning about line width would then live next to a branch that
ignores it. *Put the whole customer block in the owner's template as free text.* Rejected: the owner
cannot type a customer's address, and a template placeholder that renders nothing for half of all
customers needs the collapse rule of FR-045 in code regardless.

**Degradation is per field, not per auth state.** "Signed in" is not the condition — *having the
datum* is. A customer who registered and never opened their profile has an account, no name and no
address, and their message is identical to an anonymous visitor's. That is one rule to implement and
one rule to test, instead of four states.

---

## R17 — Testing follows the existing three tiers

**Decision**: Unit tests (`tests/unit`, no database) for link building, phone/username
normalisation, message composition and totals arithmetic. Integration tests
(`tests/integration`, real Postgres, `fileParallelism: false`) for the cart operations, access
control, and the sign-in merge. Playwright for the two modals, the responsive frames and the a11y
scan.

**Rationale**: the split already exists and the reasoning is recorded in
`vitest.integration.config.ts` — unit tests must stay runnable "on a laptop with nothing installed".
Everything in R10 (normalisation, link building) is a pure function and belongs in the fast tier;
everything in R2–R4 (cookies, access, merge) is the seam with Postgres and cannot honestly be tested
anywhere else. Constitution's CI gates make the business-logic coverage mandatory rather than
optional, and name checkout specifically as needing two reviewers.
