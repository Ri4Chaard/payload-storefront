# Feature Specification: Checkout — Cart, Buy Now and Messenger Handoff

**Feature Branch**: `005-checkout-handoff`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "We should create users checkout and add the ability to add products
into checkout or buy them immidiately via 'Buy now' button. We will not have any stripe right now so
we should redirect customers with their checkouts into the WhatsApp or Telegram seller direct
message. We should implement this checkout screens:
[Figma design]
[Figma design]
[Figma design]
[Figma design] and the social media
redirect modal which will appear on 'Buy now' or 'Checkout' button in the Checkout page:
[Figma design]"

**Source**: Five Figma nodes — the Shopping Cart page at three widths (`255:3635`, `425:11164`,
`425:11269`), the remove-item confirmation (`590:14357`), and the section `590:13773` ("Переход на
соц сети после покупки") holding the messenger handoff modal at three widths.

This is the spec [docs/mvp-brief.md](../../docs/mvp-brief.md) calls `004-requests-and-handoff`
(User Story 4, FR-034 – FR-050). It is renumbered `005` because `004` was taken by customer
accounts. It is the spec that three earlier ones deliberately left a hole for:

- [src/lib/catalog/cart-intent.ts](../../src/lib/catalog/cart-intent.ts) — spec 003 built the
  calling side of ADD TO CART and BUY NOW, the validation and the signature, and left one function
  body empty with the note "004 puts the line in the cart here". This spec is that body.
- [src/collections/carts.ts](../../src/collections/carts.ts) — the `carts` table and its `size`
  field on each item already exist, enabled but unused, "so that 004 starts against a schema that
  already fits". This spec is its first consumer.
- [src/payload.config.ts](../../src/payload.config.ts) — `orders: false` and `transactions: false`,
  because "an Aurum order is a request handed to WhatsApp or Telegram, with no payment anywhere",
  and modelling that before there were screens to judge it against would have landed a model already
  known to be wrong. This spec has the screens.
- [003-shop-catalog](../003-shop-catalog/spec.md) inventoried the handoff modal (`590:13108`) and
  ruled it **out of scope** there. It is in scope here.

## Design Inventory

Five nodes, eight frames. Unusually little of it is new construction: the cart row, the quantity
stepper, the modal shell, the checkbox and the button all exist. What is new is the page that
arranges them, the modal that lists the messengers, and everything behind both.

### Frames in the nodes

| Frame                        | Node        | Size      | Covers                                            |
| ---------------------------- | ----------- | --------- | ------------------------------------------------- |
| Shopping Cart                | `255:3635`  | 1920×1387 | The cart page at desktop — rows plus summary card  |
| Tablet_Shopping_Cart         | `425:11164` | 768×1809  | The same page, one column, summary below the rows  |
| Mobile_Shopping_Cart         | `425:11269` | 390×2091  | The same page at phone width                       |
| REMOVE ITEM                  | `590:14357` | 1920×1080 | The removal confirmation over the cart             |
| Your selection is in the cart| `590:13222` | 1920×1080 | Handoff modal over a listing, desktop              |
| — the modal alone            | `590:13108` | 500×556   | Three messenger rows, close affordance             |
| Планшет                      | `590:13774` | 1024×1366 | The same modal, unchanged, at tablet               |
| Мобильный                    | `590:13874` | 390×844   | The modal at 358 wide — tighter padding, 82px rows |

### Band-by-band status

| Band                     | Desktop      | Tablet      | Mobile      | Status                                            |
| ------------------------ | ------------ | ----------- | ----------- | ------------------------------------------------- |
| Contact banner + header  | `255:3636/7` | `419:14083` | `544:16115` | Built — `ContactBanner`, `Header`                 |
| Page heading             | `255:3639`   | `419:14081` | `425:11274` | Built — `SectionHeading`                          |
| Cart row                 | `258:3949`   | `425:11177` | `425:11276` | Built — `CartItem`, unused until now              |
| Quantity control         | `258:3956`   | `425:11186` | `425:11285` | Built — `QuantityStepper`                         |
| Remove affordance        | `258:3993`   | `425:11183` | `425:11282` | Built — `IconButton` with the bin                 |
| Cart list container      | `258:3930`   | `425:11175` | `425:11275` | **New** — the card the rows sit in                |
| Order summary card       | `255:3868`   | `425:11228` | `425:11327` | **New** — three rows, button, agreement           |
| Terms agreement          | `258:3892`   | `425:11246` | `425:11345` | **New row**; `Checkbox` and `Link` exist          |
| Checkout button          | `255:3883`   | `425:11240` | `425:11339` | Built — `Button`                                  |
| Remove confirmation      | `590:14357`  | —           | —           | **New content**; `Modal` exists                   |
| Handoff modal            | `590:13108`  | `590:13775` | `590:13875` | **New** — the largest new component               |
| Messenger row            | `590:13188`  | `590:13779` | `590:13879` | **New** — mark, name, handle, chevron             |
| Footer                   | `255:3643`   | `419:14085` | `419:14252` | Built — `Footer`                                  |

### What the cart page actually contains

Reading `255:3635` at 1920: the page title **SHOPPING CART**, then a two-column body inside the
1720px content width. The left column is a white card 1200 wide holding the rows; each row is a
120px photograph, the name in caps above the unit price, a bin beneath them, then a quantity stepper
and the line total right-aligned. The right column is a 500-wide **ORDER SUMMARY** card: `Products,
2 items` with an amount, `Shipping` with `$ 0`, `Subtotal` with an amount, a full-width **CHECKOUT**
button, and beneath it an unticked checkbox reading `I agree to the Terms of Use and Return Policy.`
with both policy names underlined as links.

At 768 and 390 the two columns become one — the rows stack, and the summary card follows them. The
row itself re-flows rather than shrinking: at 390 the photograph, a narrow text column and the
stepper sit side by side, and the line total is dropped, leaving the unit price as the only amount
on the row.

**The drawn numbers do not add up, in all three frames.** Desktop shows three rows at `$ 24,900`,
`Products, 2 items` and a subtotal of `$ 49,800`; tablet and mobile show three rows at `$24,900`,
`Products 3 items`, `$19,800`, and a subtotal of `$40,800`. These are placeholders, and they are
worth naming because Constitution VI settles what the real behaviour is: every amount on this page
is computed by the server from current catalogue data, and none of it is carried from the client.

### What the handoff modal actually contains

`590:13108` is a 500×556 card: a close mark top-right, the heading **YOUR SELECTION IS IN THE CART**
over two centred lines — "To complete your order, please contact us through your preferred social
platform." — then three tappable rows. Each row is a circular platform mark, the platform name over
`@aurum`, and a chevron. The three drawn are, in order, **Instagram**, **Telegram**, **WhatsApp**.
The mobile version keeps all three at 82px tall inside a 358-wide card.

There is no order reference anywhere in the modal, no note field, no confirmation screen, and no
step between pressing CHECKOUT and seeing these three rows.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Put a chosen piece in the cart (Priority: P1)

A visitor on a product page has chosen a diamond and a size. They press ADD TO CART. The piece is
added with exactly those choices, the header's cart count goes up, and they are told it worked
without being taken off the page they are on.

**Why this priority**: Everything else here operates on a cart, and there is currently no way to put
anything in one — the button exists and is deliberately inert. This is the smallest slice that turns
the storefront from a brochure into a shop, and it is independently valuable even if the customer
then does nothing else.

**Independent Test**: Add a piece with both options chosen, reload the page, and confirm the header
count survives; add the same piece in a different size and confirm two distinct lines exist rather
than a quantity of two.

**Acceptance Scenarios**:

1. **Given** a published, available product with a chosen diamond and size, **When** the visitor
   presses ADD TO CART, **Then** a cart line is created carrying the product, the diamond and the
   size, and the header's cart count increases by the quantity added.
2. **Given** a product that offers a diamond or a size, **When** the visitor presses ADD TO CART
   without choosing one, **Then** the action is refused and the message names the choice that is
   missing.
3. **Given** a product whose stock has reached zero, or whose chosen diamond has, **When** the
   visitor presses ADD TO CART, **Then** the action is refused and the reason is given in words.
4. **Given** a piece already in the cart with the same product, diamond and size, **When** the
   visitor adds it again, **Then** the existing line's quantity increases and no second line appears.
5. **Given** the same product with a *different* diamond or size, **When** the visitor adds it,
   **Then** it becomes a separate line.
6. **Given** an anonymous visitor with items in their cart, **When** they sign in, **Then** their
   items are merged into their account's cart and nothing is dropped from either side.

---

### User Story 2 - Review and adjust the cart (Priority: P2)

The customer opens the cart from the header. They see every piece they chose with its photograph,
name, unit price and quantity, and a running total. They can change a quantity, remove a line — with
a confirmation first — and see the totals follow.

**Why this priority**: This is the page the feature is named for and the one the designs describe in
most detail. It is testable and valuable on its own: a customer who can assemble and correct a
selection has something to show the seller even if the handoff is done by hand.

**Independent Test**: With three lines in a cart, change a quantity and confirm the summary updates;
press the bin, cancel, and confirm nothing is removed; press it again, confirm, and confirm the line
and its contribution to the total both disappear.

**Acceptance Scenarios**:

1. **Given** a cart with lines, **When** the customer opens the cart page, **Then** each line shows
   its photograph, name, chosen options, unit price and quantity, and the summary shows the item
   count, shipping, and the subtotal.
2. **Given** a line, **When** the customer increases or decreases its quantity, **Then** the line
   total and the summary are recalculated by the server and the change survives a reload.
3. **Given** a line, **When** the customer presses the bin, **Then** a confirmation asks "Are you
   sure you want to remove this item from your cart?" and nothing is removed until they confirm.
4. **Given** that confirmation, **When** the customer dismisses it by the close mark, the backdrop,
   or Escape, **Then** the line is untouched.
5. **Given** an empty cart, **When** the customer opens the cart page, **Then** they are told it is
   empty and are given a way back into the catalogue, and no summary card or checkout action is
   offered.
6. **Given** a cart holding a piece that has since been unpublished, gone out of stock, or changed
   price, **When** the customer views the cart, **Then** the change is shown on that line and the
   customer must acknowledge it before checkout proceeds.
7. **Given** the cart page at 390, 768 and 1920, **When** it is rendered, **Then** it matches the
   drawn arrangement at each width and the page never scrolls horizontally.

---

### User Story 3 - Hand the cart to the seller (Priority: P3)

The customer agrees to the terms and presses CHECKOUT. A modal tells them their selection is in the
cart and that completing the order means contacting the seller, and offers Instagram, Telegram and
WhatsApp. Choosing one opens that conversation with a message already written — every piece, its
chosen diamond and size, its quantity, and the total.

**Why this priority**: This is what the feature is *for*, and it is what replaces payment. It sits
below the cart because there is nothing to hand over until a cart exists.

**Independent Test**: Submit a three-line cart, confirm the modal lists the destinations the owner
configured, and confirm the composed message names every piece and every chosen option — verified
across a product with both options, one option, and neither.

**Acceptance Scenarios**:

1. **Given** a cart with at least one line and the terms unticked, **When** the customer presses
   CHECKOUT, **Then** the action is refused and the agreement is identified as what is missing.
2. **Given** the terms ticked, **When** the customer presses CHECKOUT, **Then** the handoff modal
   opens listing every messenger the owner has configured, each with its handle.
3. **Given** the modal, **When** the customer chooses a messenger, **Then** that messenger opens
   addressed to the seller with a message containing each piece, its chosen diamond and size, its
   quantity, and the cart total.
4. **Given** a signed-in customer who has saved a name and a default delivery address, **When** the
   message is composed, **Then** it carries both alongside the pieces and the total.
5. **Given** a signed-in customer who has saved neither, or an anonymous visitor, **When** the
   message is composed, **Then** it carries the pieces, options and total and simply omits the
   customer block — no placeholder text, no empty heading, no prompt to sign in.
6. **Given** the modal, **When** the customer dismisses it, **Then** their cart is unchanged and
   they are returned to the cart page.
7. **Given** a device where no messenger can be opened, **When** the customer reaches the handoff,
   **Then** the message text is offered in a copyable form together with the seller's contact
   details.
8. **Given** any point in this flow, **When** the customer reads the page, **Then** it is
   unambiguous that they are sending a request, that no payment is taken on the site, and that the
   seller will confirm availability, final price, payment and delivery.

---

### User Story 4 - Buy one piece immediately (Priority: P4)

A customer looking at a single piece does not want a cart. They press BUY NOW and go straight to the
same messenger modal, with a message describing just that piece — and whatever was already in their
cart stays exactly where it was.

**Why this priority**: It is a shortcut through a path User Story 3 has already built, so it is
cheap once that exists — but it is the path with the sharpest failure mode, because a BUY NOW that
quietly submits or empties the customer's cart destroys work they did not offer up.

**Independent Test**: With three unrelated lines already in the cart, use BUY NOW on a fourth
product; confirm the composed message names only that fourth piece, and confirm the cart still holds
exactly the original three.

**Acceptance Scenarios**:

1. **Given** a product with every required option chosen, **When** the customer presses BUY NOW,
   **Then** the handoff modal opens with a message describing only that piece and its chosen options.
2. **Given** a customer with an existing cart, **When** they use BUY NOW, **Then** their cart is
   neither submitted nor emptied nor added to.
3. **Given** a product with an unmade required choice or no availability, **When** the customer
   presses BUY NOW, **Then** it is refused on the same terms as ADD TO CART, naming what is missing.

---

### User Story 5 - The owner controls where customers are sent (Priority: P5)

The store owner changes the WhatsApp number, adds a Telegram handle, reorders the platforms, or
rewords the message customers arrive with — in the admin, without a deployment.

**Why this priority**: The destinations drawn in Figma are placeholders (`@aurum` three times, and
[src/lib/contact.ts](../../src/lib/contact.ts) still carries bare `https://wa.me/` and
`https://t.me/` roots marked "these need the real accounts before launch"). Shipping the handoff with
hardcoded destinations would make the shop's own phone number a code change, which Constitution I
forbids. It is last because the flow works before it does, with whatever is configured.

**Independent Test**: Change a handle in the admin and confirm the modal and the composed message
both follow within the caching window, with no deployment.

**Acceptance Scenarios**:

1. **Given** the admin, **When** the owner edits a messenger's destination or handle, **Then** the
   handoff modal shows the new value and links to it, with no deployment.
2. **Given** the WhatsApp setting, **When** the owner types the shop's number as they would write it
   — `+1 (555) 010 20-30` — **Then** it is accepted, and choosing WhatsApp in the modal opens a
   conversation with that number.
3. **Given** the Telegram setting, **When** the owner types `@aurum`, or pastes a `t.me` link,
   **Then** both are accepted and resolve to the same conversation.
4. **Given** the admin, **When** the owner enables a messenger but leaves its destination empty or
   malformed, **Then** the save is refused and the message names the field at fault.
5. **Given** the admin, **When** the owner disables a messenger, **Then** it disappears from the
   modal and the remaining ones keep their order.
6. **Given** the admin, **When** the owner reorders the messengers, **Then** the modal lists them in
   the new order.
7. **Given** the admin, **When** the owner rewords the message template, **Then** newly composed
   messages use the new wording and still carry the customer's selection.
8. **Given** the admin, **When** the owner disables every messenger, **Then** the customer is shown
   the copyable fallback rather than an empty modal.
9. **Given** a signed-in customer rather than an administrator, **When** they attempt to change these
   settings through any route, **Then** they are refused.

---

### Edge Cases

- **A line's product is deleted while the cart holds it.** The line cannot render a name or a price.
  It must be shown as no longer available and excluded from the total rather than crashing the page
  or silently vanishing.
- **A diamond is taken while it sits in a cart.** Stock is per-diamond, so the line is valid and its
  option is not. The line must say so, and checkout must not proceed until the customer acknowledges.
- **Quantity exceeds what remains in stock.** The stepper must not offer more than is available, and
  a cart assembled before stock fell must be corrected at view time, not at handoff.
- **The same cart is submitted twice** — double click, refresh, retry. This must not produce two of
  anything the customer or the owner can see.
- **A cart survives longer than the catalogue.** A cart abandoned for months must still open, and
  every line in it must resolve or be reported.
- **Anonymous cart meets an account cart at sign-in.** Both must survive the merge; matching lines
  combine their quantities rather than one replacing the other.
- **The customer is signed out mid-cart** (session expiry). The cart must not disappear silently.
- **A messenger app is not installed** on a desktop browser. The link opens a web client where one
  exists, and the copyable fallback covers the rest.
- **The composed message is very long.** A twenty-line cart must still open the messenger; the
  message must be truncated in a way that keeps the reference to the full selection intact rather
  than losing the last pieces without saying so.
- **Long product names and non-Latin characters** must not break the row at 390, nor the composed
  message.
- **Prices change between viewing the cart and pressing CHECKOUT.** The amount the seller receives
  must be the one the customer agreed to on screen, or the customer must be told it changed.
- **Zero-price or price-on-request pieces**, if the catalogue permits them, must not produce a
  message reading `$0`.

## Requirements *(mandatory)*

### Functional Requirements

#### Cart contents

- **FR-001**: Visitors MUST be able to add a product to a cart from the product page, carrying the
  chosen diamond and the chosen size where the piece offers them.
- **FR-002**: The system MUST refuse to add a product that is unpublished or unavailable, or whose
  chosen diamond is unavailable, and the refusal MUST name in words what is wrong.
- **FR-003**: The system MUST refuse to add a product with a required choice unmade, and MUST name
  the unmade choice.
- **FR-004**: The same product with different chosen options MUST be held as distinct cart lines;
  the same product with identical options MUST combine into one line with a summed quantity.
- **FR-005**: An anonymous visitor's cart MUST persist on their device across sessions, and MUST be
  merged into their account's cart when they sign in, without dropping lines from either side.
- **FR-006**: A signed-in customer's cart MUST persist across sessions and devices.
- **FR-007**: A customer MUST NOT be able to read or modify another customer's cart.

#### The cart page

- **FR-008**: The cart page MUST list every line with its photograph, product name, chosen options,
  unit price and quantity, and MUST link each line to its product page.
- **FR-009**: Customers MUST be able to change a line's quantity and MUST NOT be able to set it
  above the quantity available or below one.
- **FR-010**: Removing a line MUST require confirmation in a dialog reading "REMOVE ITEM / Are you
  sure you want to remove this item from your cart?"; dismissing it MUST leave the line untouched.
- **FR-011**: The order summary MUST show the number of items, a shipping line, and the subtotal,
  and MUST update whenever the cart changes.
- **FR-012**: Every amount shown MUST be computed by the system from current published catalogue
  data. An amount supplied by the customer's device MUST NEVER determine what is displayed or what
  is sent to the seller.
- **FR-013**: Monetary values MUST be handled as integer minor units with an explicit currency, and
  MUST be formatted for display in one place.
- **FR-014**: The cart MUST be revalidated against current published product, option and
  availability data when it is viewed and again at checkout; a line that has become unavailable or
  changed price MUST be surfaced and MUST be acknowledged before checkout proceeds.
- **FR-015**: An empty cart MUST show an empty state with a route back into the catalogue, and MUST
  NOT offer a checkout action.
- **FR-016**: The header MUST show a live count of the items in the cart and MUST link to the cart
  page.
- **FR-017**: The page MUST render at 390, 768 and 1920 as drawn, MUST NOT scroll horizontally at
  any width, and MUST meet WCAG 2.2 AA — including operating the stepper, the bin, the agreement and
  the checkout action by keyboard alone.
- **FR-018**: The terms agreement MUST be presented unticked, MUST link to the Terms of Use and the
  Return Policy, and checkout MUST be refused until it is ticked, naming the agreement as the reason.

#### Handoff to the seller

- **FR-019**: Pressing CHECKOUT on a valid, agreed cart MUST open the handoff modal; pressing BUY
  NOW on a product with every required choice made MUST open the same modal for that one piece.
- **FR-020**: BUY NOW MUST NOT submit, empty, or add to the customer's existing cart.
- **FR-021**: The modal MUST state that the order is completed by contacting the seller, MUST list
  every messenger the owner has enabled with its platform name and handle, and MUST be dismissible
  by the close mark, the backdrop and Escape.
- **FR-022**: Choosing a messenger MUST open that conversation addressed to the seller with a
  pre-filled message containing every piece, its chosen diamond and size, its quantity, and the
  total — plus, where the customer is signed in and has saved them, their name and delivery address
  (FR-043 – FR-046).
- **FR-023**: The seller's destination for each messenger, whether it is offered, its order in the
  list, and the wording of the pre-filled message MUST be editable by the owner without a code
  change or a deployment. See *Seller destinations in the admin* below for what that surface is
  required to do.
- **FR-024**: The modal MUST **always** present the composed message in a copyable form together
  with the seller's contact details, alongside whatever messenger rows are offered — not only when
  none can be opened. A page cannot tell whether a messenger will actually open on the device in
  front of it, so a fallback that waits to detect failure is a fallback that never appears for the
  customer who needed it. Where no messenger is configured at all, the copy affordance is the only
  thing the modal offers.
- **FR-025**: The flow MUST state plainly that the customer is sending a purchase request, that no
  payment is taken on the site, and that the seller will confirm availability, final price, payment
  and delivery.
- **FR-026**: Pressing CHECKOUT or BUY NOW repeatedly — double-click, refresh, or retry — MUST
  result in a single handoff: one modal, and one message composed from one reading of the cart. It
  MUST NOT open two messenger windows or compose two messages that disagree with each other.
- **FR-027**: The customer's cart MUST survive the handoff unchanged. Opening the modal, choosing a
  messenger, and returning to the site MUST all leave every line exactly as it was. The cart is
  emptied only by the customer removing lines from it.
- **FR-028**: The composed message MUST survive long carts, long product names and non-Latin
  characters without losing pieces silently. The budget is **2,000 characters for the finished link,
  measured after percent-encoding** — not a character count of the message as written. A message
  that would exceed it MUST be truncated at a line boundary and MUST gain a final line stating how
  many pieces are not listed, so a truncated request still reads as a complete one.
- **FR-028a**: Because the budget is measured after encoding, a cart written in Cyrillic or Arabic
  MUST be expected to reach it far sooner than the same cart in Latin script — roughly one line for
  every six. The truncation rule MUST therefore be exercised against a non-Latin cart, not only
  against an implausibly long Latin one.

#### What is deliberately not recorded

- **FR-029**: A handoff MUST NOT create a server-side order or request record. The system reads the
  cart, composes the message, and opens the conversation; the conversation is the record. No
  reference number, no line snapshot, no acknowledgement email, and no admin queue are produced.
- **FR-030**: Because nothing is recorded, the flow MUST NOT tell the customer that anything has
  been submitted, received, or is awaiting a reply. The modal states that the order is completed by
  contacting the seller (FR-021, FR-025), and that MUST remain literally true.

#### Identity

- **FR-031**: An anonymous visitor MUST be able to complete the whole flow — add to cart, view the
  cart, CHECKOUT, BUY NOW and the handoff — without an account, and MUST NOT be shown a sign-in gate
  at any step.
- **FR-032**: Signing in MUST NOT interrupt or discard a handoff in progress, and a visitor who
  signs in after building a cart MUST keep it (FR-005).

#### Seller destinations in the admin

Where the shop's own WhatsApp and Telegram accounts are set — the requirements behind User Story 5.
Everything above sends the customer somewhere; this is what decides where. A shop's own phone number
is not a code change.

- **FR-033**: The admin MUST offer one settings surface where the owner manages every messenger
  offered at handoff, grouped alongside the shop's existing settings rather than filed under system
  configuration.
- **FR-034**: For each messenger the owner MUST be able to set, independently of the others: the
  platform, the **destination** the row opens, the **handle** displayed beneath the platform name in
  the modal, and whether the row is **offered** at all.
- **FR-035**: The WhatsApp destination MUST be entered as a phone number and the system MUST build
  the conversation link from it. The owner MUST NOT be required to paste a `wa.me` URL, and a number
  written with spaces, brackets, dashes or a leading `+` MUST be accepted and normalised rather than
  rejected.
- **FR-036**: The Telegram destination MUST be entered as a username and the system MUST build the
  conversation link from it. A leading `@`, or a pasted `t.me` URL, MUST be accepted and normalised.
- **FR-037**: The displayed handle MUST be editable separately from the destination, because the two
  differ — the modal shows `@aurum` while WhatsApp is reached by a phone number — and an owner who
  changes only one MUST NOT silently change the other.
- **FR-038**: The owner MUST be able to reorder the messengers, and the modal MUST present them in
  that order. Disabling one MUST NOT disturb the order of the rest.
- **FR-039**: A messenger that is offered MUST have a usable destination. The system MUST refuse to
  save an enabled messenger whose destination is missing or malformed, and MUST name the field at
  fault, so that the modal can never draw a row that leads nowhere.
- **FR-040**: The wording of the pre-filled message MUST be editable, and the admin MUST document
  which parts of it the system fills in. A saved template MUST still produce a message carrying the
  customer's selection; a template that would drop it MUST be refused rather than silently sending
  the seller an empty request.
- **FR-041**: Every field on this surface MUST carry an editor-facing label and a description saying
  what it does and where it appears, and MUST be writable only by administrators. Read access is
  public by nature — these values are shown to every customer who opens the modal.
- **FR-042**: A saved change MUST reach the storefront without a deployment, and MUST invalidate any
  cached rendering of the modal, so the owner can verify the new destination in the same session.

#### What the message carries about the customer

Numbered after the admin section because these identifiers are stable; they belong with FR-022,
which is where the message is defined.

The shop already knows some customers. A signed-in customer may have set a name and saved a delivery
address on their profile — spec 004 built both. Sending the seller a request that omits them, when
the customer has already typed them once, makes the seller ask for them again in the very
conversation this feature exists to start.

- **FR-043**: Where the customer is signed in and has saved a name, the message MUST carry it. Where
  they have saved a delivery address, the message MUST carry that address, including the parts a
  courier needs.
- **FR-044**: Where a customer has several saved addresses, the message MUST carry the one marked as
  their default.
- **FR-045**: Every part of this MUST degrade independently. A missing name, a missing address, or
  no account at all MUST each omit only that part — the message still carries the pieces, the
  options and the total, and MUST remain a complete, readable request. **An anonymous visitor's
  message is the same message with the customer block absent.**
- **FR-046**: Composing the message MUST NOT require a signed-in customer, and MUST NOT redirect,
  prompt, or otherwise interrupt an anonymous visitor at any point (FR-031). Reading who the
  customer is MUST be an optional lookup, never a guard.

#### How long a cart is kept, and how it is erased

A cart is a record of what somebody wants, tied either to their account or to their device. It is a
data collection point, and it therefore needs a stated life and a working deletion path — the one
part of this feature that "no payment" does not simplify away.

- **FR-047**: A guest cart MUST be deleted after **30 days without activity**. Its credential cookie
  expires on the same clock, so after that the cart is unreachable by anyone; keeping it would be
  keeping a row nobody can ever open.
- **FR-048**: A signed-in customer's cart MUST be deleted after **12 months without activity**. Long
  enough that a cart is still there when someone comes back for it; bounded, so the table does not
  grow without end.
- **FR-049**: Deleting a customer MUST delete their carts in the same operation. A customer who asks
  to be erased MUST NOT leave a cart naming what they wanted behind them.
- **FR-050**: Both cart cookies MUST be strictly functional — the credential needed to open a cart,
  and a display count. Neither carries anything else, neither is used for analytics or tracking, and
  the pair therefore MUST NOT be gated behind cookie consent. A cart the visitor cannot keep is not
  a cart.
- **FR-051**: The retention periods MUST be stated somewhere a person can read them without reading
  the code, and MUST be changeable without one.

#### One set of accounts

- **FR-052**: The messenger accounts offered at handoff and those shown in the site's chrome — the
  contact strip, the footer, and the mobile navigation — MUST be the same records. Changing an
  account in one place MUST change it everywhere it appears, and no second copy of the shop's
  WhatsApp, Telegram or Instagram identity may exist in the codebase.

### Key Entities

- **Cart**: A selection belonging to either a signed-in customer or an anonymous device. Transient —
  revalidated against the catalogue rather than treated as a record. Already modelled.
- **Cart Line**: A product reference, the chosen diamond and size where offered, and a quantity. Two
  lines of the same product with different choices are distinct. Already modelled, including `size`.
- **Seller Contact Settings**: The owner-editable set of messengers offered at handoff. For each:
  the platform; the **destination** the row opens, held as the raw account identifier — a phone
  number for WhatsApp, a username for Telegram and Instagram — rather than as a built link; the
  **handle** displayed beneath the platform name, which is separate from the destination and may
  differ from it; whether the row is offered; and its position in the list. Alongside them, the
  wording of the pre-filled message. New, and the only new entity this feature introduces.

- **Customer** and **Saved Address**: read, never written, by this feature. Both were modelled by
  [004-customer-accounts](../004-customer-accounts/spec.md); the message borrows the customer's name
  and their default address (FR-043, FR-044) and adds no field to either.

There is deliberately no **Request** or **Order** entity. See FR-029 and *Out of Scope*.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A customer who has chosen a diamond and a size can go from the product page to an open
  messenger conversation with their selection written out in under 60 seconds.
- **SC-002**: The pre-filled message contains every piece and every chosen diamond and size in 100%
  of submissions, verified across products with both options, one option, and neither.
- **SC-003**: 95% of customers who reach the handoff either open a messenger with the pre-filled
  message or are given the copyable fallback.
- **SC-004**: Repeated, refreshed or retried checkouts of the same cart open exactly one messenger
  conversation and compose one message; no run of repeated presses produces two messages that
  disagree.
- **SC-005**: 100% of BUY NOW handoffs, and 100% of cart handoffs, leave the customer's cart with
  exactly the lines it had before — verified after the customer returns from the messenger.
- **SC-006**: Every amount a customer sees, and every amount the seller receives, matches the
  current published catalogue; no amount originating on the customer's device is ever displayed or
  sent.
- **SC-007**: The store owner can set the shop's real WhatsApp number and Telegram username, or
  reword the message, and see it take effect on the storefront within the same working session —
  entering the number and the username as they would write them, without constructing a link, and
  without a deployment or developer help.
- **SC-008**: The cart page and both modals pass an automated WCAG 2.2 AA scan at 390, 768 and 1920,
  and the whole flow is completable by keyboard alone and with a screen reader.
- **SC-009**: The cart page stays within the site's route budgets — 300KB gzipped total and 100KB
  above the measured framework baseline.
- **SC-010**: No customer can read or modify another customer's cart, verified by test rather than
  by inspection.
- **SC-011**: A visitor with no account completes the flow end to end — add to cart, adjust it,
  CHECKOUT, open a messenger — without ever being shown a sign-in prompt.
- **SC-012**: No configuration reachable through the admin can produce a messenger row in the modal
  that leads nowhere, verified by attempting to save each broken combination.
- **SC-013**: The same cart produces the same message for an anonymous visitor and for a signed-in
  customer who has saved nothing, and differs only by the customer block for one who has — verified
  across all four combinations of name present or absent and address present or absent.
- **SC-014**: A cart past its retention period is gone, and a deleted customer leaves no cart behind
  — both verified by test rather than by inspection, against a clock the test controls.
- **SC-015**: A twenty-line cart written in Cyrillic produces a link inside the 2,000-character
  budget, still names every piece it lists, and says how many it does not.
- **SC-016**: Changing one messenger account in the admin changes it in the handoff modal, the
  contact strip, the footer and the mobile navigation — verified by changing one value and checking
  all four.
- **SC-017**: The copy affordance is present on every handoff, on every device, regardless of how
  many messengers are configured.

## Assumptions

- **The Shopping Cart page *is* the checkout.** The user calls these "checkout screens" and the
  designs draw one page whose action is labelled CHECKOUT. There is no separate checkout route, no
  address step and no payment step, because there is no payment.
- **No contact-details step and no customer note.** Brief FR-041 asks for both; nothing in the five
  designs draws either, and the modal opens directly from CHECKOUT. Treated as out of scope here.
  Anything the customer wants to add, they add in the messenger conversation that opens.
  - **This is not contradicted by FR-043 – FR-046.** Those add no screen, no field and no step: they
    read a name and an address the customer already typed on their profile and put them in the
    message. What stays out of scope is *asking* for details during checkout.
- **The customer never sees a surprise.** The address travels as a draft in the customer's own
  messenger, on their own device, which they read and can edit or delete before sending. Nothing is
  transmitted anywhere by the site itself. That is what makes carrying a home address here
  proportionate, and it is why FR-045 must hold: a message that silently gained a block the customer
  did not expect is a different thing from a draft they are looking at.
- **The customer's email address is not included.** They asked for name and address; the seller can
  reply in the conversation that just opened, so an email adds a personal detail without adding a
  way to reach them. Adding it later is one placeholder.
- **Instagram is offered alongside WhatsApp and Telegram.** The user named two; the design draws
  three, Instagram first. All three are built. Instagram is assumed not to carry a pre-filled
  message — its links open a profile or a chat, not a chat with text — so choosing it opens the
  conversation and offers the message to copy. This is a behavioural difference the modal must not
  hide from the customer.
- **The `@aurum` handles and the `wa.me` / `t.me` roots drawn are placeholders.** Real
  destinations are configured by the owner — FR-033 to FR-042.
- **The admin surface has no Figma frame, and does not need one.** It is built from the admin's
  native field types rather than designed, so the requirements above describe what it must let the
  owner do and refuse, not how it looks. What it must *not* do is make the owner assemble a link by
  hand: FR-035 and FR-036 exist because pasting a malformed `wa.me` URL is the single most likely
  way to point the whole handoff at nothing.
- **The shipping row always reads `$ 0`.** Nothing computes delivery; it is arranged with the seller.
  The row is drawn, so it is rendered, and it says zero rather than pretending to a calculation.
- **The empty cart state is not drawn.** FR-015 requires one; its arrangement follows the existing
  empty-state pattern used by the catalogue listing.
- **Cart lines carry no discounts, promotions or tax.** None is drawn, none is modelled, and the
  seller settles final price in conversation.
- **The `carts` collection and `CartItem` component are used as they stand.** Both were built ahead
  of this spec for this purpose; neither is expected to need reshaping.
- **The Terms of Use and Return Policy links point at the site's existing policy destinations.** If
  those pages do not yet exist, providing them is a dependency of FR-018 rather than part of it.
- **Stock is decremented by the owner, not by this flow.** No payment means no capture, so nothing
  here reserves or reduces inventory; the brief assigns that to the owner working the queue.
- **The handoff is compose-and-redirect.** Decided rather than assumed — see *Out of Scope*. The
  conversation the customer opens is the only record of what they wanted.
- **The cart is never emptied by the site.** Because nothing records a submission, the site cannot
  know a message was actually sent, and clearing a cart on a guess destroys work the customer did.
  A lingering cart is recoverable; a wrongly emptied one is not.
- **Anonymous visitors complete the whole flow.** Guest carts are already enabled in the current
  configuration, and the designs draw no gate. Accounts remain useful — a signed-in cart follows the
  customer between devices — but they are never required.

## Out of Scope

Named here because [docs/mvp-brief.md](../../docs/mvp-brief.md) asks for each of them and this spec
deliberately does not deliver them. Each is additive later; none is designed around.

- **Persisted request records** — brief FR-042, FR-045, FR-047, FR-051 to FR-052. No order
  reference, no point-in-time line snapshot, no immutable record. `orders` and `transactions` stay
  disabled in the plugin configuration, exactly as spec 003 left them.
- **The admin request queue** — brief User Story 5. There is nothing to queue.
- **The acknowledgement email** — brief FR-049. Nothing is submitted, so there is nothing to
  acknowledge.
- **A confirmation screen with a reference** — brief FR-048. The handoff modal is the last screen.
- **A contact-details step and a customer note** — brief FR-041. Neither is drawn; both belong to
  the messenger conversation.
- **Payment of any kind.** No Stripe, no adapter, no `payments` configuration. Stated so that the
  absence is a recorded decision rather than an oversight.
- **A checkout kill switch.** The constitution asks that behaviour-changing commerce features ship
  behind a flag with a documented kill switch; the owner has decided against one for this feature.
  Recorded as a deliberate exception in the plan's Complexity Tracking rather than left unsaid, and
  worth knowing the shape of: the thing most likely to need switching off is a wrong messenger
  destination, and FR-023 already lets the owner fix or disable that from the admin in seconds
  without a deploy. What is left uncovered is a fault in the cart or the handoff itself, which would
  need a revert.
- **Checkout logging and monitoring.** Not addressed by this revision. The constitution requires
  structured logging with a correlation ID and alerting on checkout conversion and error rate; no
  requirement or task here provides either. Named so the gap is visible rather than forgotten.

The consequence to hold on to: if a customer builds a cart, opens WhatsApp and then closes it
without sending, the shop has no trace of them. That is accepted for this feature, and it is the
single strongest argument for landing request records in a follow-up spec.
