# Jewelry Store MVP — Product Brief

**Status**: Reference document — not a Spec Kit feature spec

**Created**: 2026-08-25

**Source**: Expanded from [website-overview.md](./website-overview.md) plus the clarification
session recorded below.

**Purpose**: This is the whole-MVP picture: every user journey, requirement, edge case, and success
measure in one place, including the Phase 2 constraint that the data model must not have to be
rebuilt later. It is deliberately larger than a single feature.

**How it is used**: Feature specs under `specs/` are carved from this brief and are the documents
that go to `/speckit-plan` and `/speckit-implement`. This brief stays the shared reference they draw
from, so that four independent specs do not make four independent decisions about the same domain.

**Decomposition**:

| Spec | Covers | Brief sections |
|------|--------|----------------|
| `001-design-system-foundation` | Project scaffold, brand tokens, UI kit, layout shell | Cross-cutting (FR-062 – FR-064) |
| `002-product-catalog` | Products, attributes, categories, diamond and size options, availability | User Stories 1–2 |
| `003-customer-accounts` | Verification-code sign-in, profiles | User Story 3 |
| `004-requests-and-handoff` | Cart, request submission, WhatsApp/Telegram handoff, admin queue | User Stories 4–5 |
| `005-editorial-blog` | Posts, categories, product cross-linking | User Story 6 |

Requirement numbers below (FR-nnn) are brief-local. Each feature spec renumbers its own.

## Clarifications

### Session 2026-08-25

- **Q: Are product attributes descriptive, or selectable options?** → Exactly two selectable option
  types: **"Choose Your Diamond:"** and **"Size:"**. Every other attribute (metal, carat weight,
  finish, provenance) is descriptive only — read and filtered, never chosen.
- **Q: How is availability tracked?** → Per-product **availability mode flag**: *made-to-order*
  (always available) or *stock-tracked* (owner-maintained quantity). Individual diamond options
  carry their own availability so a specific stone can be marked as taken.
- **Q: Does the verification code replace the password, or the password reset?** → **The password
  reset.** The overview's phrase "account creation and login using a verification-code flow rather
  than a traditional password reset" was read here as passwordless, which was wrong. Customers
  register with email, password, and confirmation; a code then verifies the email address, and a
  code — not a reset link — is what authorises a password reset. Sign-in is email and password.
- **Q: Is a submitted order a firm purchase or a request?** → A **request**. "Checkout" and
  "Buy now" create an order record and then hand the customer off to the seller on **WhatsApp or
  Telegram** with a pre-filled message describing their order. The seller resolves availability,
  price, payment, and delivery in that conversation. No money is taken on the site.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Store Owner Publishes a Self-Managed Catalog (Priority: P1)

The store owner opens the admin area, defines the attributes that matter for their jewelry (metal
type, carat weight, finish, provenance), and creates products using those attributes alongside
images, price, and craftsmanship notes. For pieces that need them, they attach the diamonds a
customer may choose from and the sizes available. Visitors immediately see the new products on the
storefront — browsing a listing, filtering by attribute, and opening a detail page that shows
everything the owner filled in. When the owner later decides they also need a "chain length"
attribute, they add it themselves and it appears on the storefront without anyone touching code.

**Why this priority**: A live, owner-maintained catalog is the smallest thing that is a real
product on its own. Without it there is nothing to read about, choose, or request. It is also the
story that proves the central promise of the project — the owner runs the store without developer
involvement.

**Independent Test**: Fully testable by having the owner define a new attribute, create a product
using it, publish, and confirm the product and its attribute render on the public listing and
detail page — with no deployment in between. Delivers a browsable online catalog.

**Acceptance Scenarios**:

1. **Given** the owner is in the admin area, **When** they define a new descriptive product
   attribute and save it, **Then** that attribute becomes available on the product editing form
   without a code change or deployment.
2. **Given** a product with images, price, and populated attributes, **When** the owner publishes
   it, **Then** it appears on the public product listing and its detail page shows all populated
   attributes and descriptive content.
3. **Given** a product is saved as a draft, **When** an anonymous visitor browses the storefront,
   **Then** the draft is not visible anywhere publicly, while the owner can still preview it.
4. **Given** a catalog of published products, **When** a visitor filters the listing by a category
   and an attribute value, **Then** only products matching every applied filter are shown.
5. **Given** the owner marks a product as stock-tracked and sets its quantity to zero, **When** a
   visitor views it, **Then** it is shown as unavailable and cannot be added to a cart.
6. **Given** the owner marks a product as made-to-order, **When** a visitor views it, **Then** it
   is always available regardless of any quantity value.

---

### User Story 2 - Customer Chooses a Diamond and a Size (Priority: P2)

A customer opens an engagement ring. Beneath the images they see **"Choose Your Diamond:"** with
the stones the owner has attached — each showing its own specifications and the price it brings —
and **"Size:"** with the sizes available. As they pick a diamond the displayed price updates. Only
once they have made every required choice can they add the piece to their cart or use "Buy now".
Their choices travel with the item all the way through to the message the seller receives.

**Why this priority**: These two choices are what turn a catalog entry into a specific orderable
piece. Without them the seller receives requests they cannot act on, and the price shown is not the
price the customer means. It sits ahead of the cart because the cart is meaningless without it.

**Independent Test**: Fully testable by opening a product with both option types, confirming the
price responds to the diamond selection, confirming add-to-cart is refused until both are chosen,
and confirming the selections appear on the cart line. Delivers configurable products.

**Acceptance Scenarios**:

1. **Given** a product with diamond options, **When** the customer selects a different diamond,
   **Then** the displayed price updates to reflect that stone.
2. **Given** a product with a required diamond or size choice, **When** the customer attempts to
   add it to the cart or use "Buy now" without choosing, **Then** the action is refused and the
   unmade choice is clearly indicated.
3. **Given** a product with no diamond options and no sizes — a plain band, a pair of earrings —
   **When** the customer views it, **Then** no option selectors are shown and it can be added
   directly.
4. **Given** a diamond option the owner has marked as no longer available, **When** the customer
   views the product, **Then** that stone is either not offered or shown as unavailable and cannot
   be selected.
5. **Given** a customer has chosen a diamond and a size, **When** they view their cart, **Then**
   both choices are shown on that line alongside the resulting price.

---

### User Story 3 - Customer Registers and Signs In (Priority: P3)

A customer who wants to send a request registers with their email address, a password, and a
confirmation of that password. The site emails them a short one-time code, they enter it, and their
email address is verified — the account is now usable. On later visits they sign in with the email
and password they chose. Their session persists so they are not asked again on the next visit, and
they can update their contact details or sign out at any time. If they forget the password, a
verification code — not a reset link — is what lets them set a new one.

**Why this priority**: Sending a request requires knowing who the customer is, so this gates the
request story. It is also the prerequisite for customer-visible order history in Phase 2.

**Independent Test**: Fully testable by registering, receiving and entering the code, confirming an
authenticated session exists with a profile the customer can edit, signing out, and signing back in
with the password — no catalog or cart involvement required. Delivers customer identity.

**Acceptance Scenarios**:

1. **Given** a visitor who has never registered, **When** they submit their email, a password, and a
   matching confirmation, **Then** an account is created and a verification code is emailed to them.
2. **Given** a password and confirmation that do not match, **When** the visitor submits the form,
   **Then** registration is refused and the mismatch is shown clearly.
3. **Given** an unverified account, **When** the customer enters the code they received, **Then**
   their email address is verified and the account becomes usable.
4. **Given** a returning customer, **When** they sign in with their email and password, **Then**
   they are signed into their existing account rather than a duplicate one.
5. **Given** a code that has expired or has already been used, **When** the customer submits it,
   **Then** it is refused with a clear message and the option to request a new one.
6. **Given** repeated incorrect code or password attempts for one address, **When** the attempt limit
   is reached, **Then** further attempts are temporarily refused and the customer is told what to do.
7. **Given** a customer who has forgotten their password, **When** they request a reset, **Then** a
   verification code is emailed and entering it lets them set a new password.
8. **Given** a signed-in customer, **When** they sign out, **Then** their session ends and protected
   pages are no longer accessible.

---

### User Story 4 - Customer Sends Their Order to the Seller (Priority: P4)

A customer has pieces in their cart — or is looking at one piece and wants it now. They press
"Checkout" (or "Buy now" on a single product) and confirm their contact details and any note about
sizing, engraving, or timing. The site records the request, shows them a reference number, and
offers to open the conversation with the seller on WhatsApp or Telegram. Choosing one opens the
messenger with a message already written for them — reference number, pieces, chosen diamonds and
sizes, and their note — ready to send. The seller replies personally to confirm availability,
price, payment, and delivery.

**Why this priority**: This is what makes the MVP a store rather than a brochure, and it depends on
the catalog (P1), the option choices (P2), and identity (P3). The messenger handoff is deliberately
the lightest possible path to a real conversation while payments are out of scope.

**Independent Test**: Fully testable by submitting a cart and a "Buy now", confirming an order
record exists with a correct snapshot, confirming the pre-filled messenger message contains the
reference and every chosen option, and confirming the record survives the customer never sending
the message. Delivers end-to-end request capture.

**Acceptance Scenarios**:

1. **Given** a signed-in customer with a valid cart, **When** they press "Checkout" and confirm,
   **Then** an order record is created with a unique reference and the customer sees a confirmation
   with that reference.
2. **Given** a customer viewing a single product with all required options chosen, **When** they
   press "Buy now", **Then** a request is created for that one piece without their existing cart
   being submitted or emptied.
3. **Given** a submitted request, **When** the customer chooses WhatsApp or Telegram, **Then** that
   messenger opens addressed to the seller with a pre-filled message containing the reference, each
   piece, its chosen diamond and size, and the customer's note.
4. **Given** a submitted request, **When** the customer closes the page without ever sending the
   message, **Then** the order record still exists and is visible to the owner in the admin queue.
5. **Given** a customer on a device where neither messenger can be opened, **When** they reach the
   handoff, **Then** they are given the message text to copy and the seller's contact details as a
   fallback.
6. **Given** a request has just been submitted, **When** the customer submits the same cart again
   (double-click, refresh, or retry), **Then** exactly one order exists — no duplicate.
7. **Given** a submitted request, **When** the owner later edits, reprices, or deletes one of the
   products in it, **Then** the record still shows the item name, chosen options, and price as they
   were at submission time.
8. **Given** the customer is anywhere in the submission flow, **When** they read the page, **Then**
   it is unambiguous that they are sending a request and that no payment is being taken on the site.

---

### User Story 5 - Store Owner Works the Request Queue (Priority: P5)

The store owner opens the admin area and sees every submitted request — newest first — with the
customer, pieces, chosen options, totals, and current status. They open one, continue the
conversation on WhatsApp or Telegram, and move the request through statuses as it progresses,
recording internal notes as they go. When a sale completes on a stock-tracked piece, they adjust
its quantity themselves.

**Why this priority**: The seller can technically work from the messenger conversation alone, so
this is the last slice needed for a viable MVP — but it is what makes request handling repeatable
rather than dependent on scrolling a chat history.

**Independent Test**: Fully testable by submitting requests, then confirming the owner can list,
open, re-status, and annotate them, with every status change recorded. Delivers request operations.

**Acceptance Scenarios**:

1. **Given** submitted requests exist, **When** the owner opens the request list, **Then** all are
   listed newest first with reference, customer, total, and status.
2. **Given** a request, **When** the owner changes its status and saves, **Then** the new status is
   shown and the change is recorded with who made it and when.
3. **Given** a request, **When** the owner adds an internal note, **Then** the note is visible to
   admins and never shown to the customer.
4. **Given** any request, **When** the owner opens it, **Then** the item names, chosen diamonds and
   sizes, unit prices, and totals are exactly those captured at submission.
5. **Given** two open requests for the same stock-tracked piece, **When** the owner views the
   queue, **Then** both are visible and neither has silently consumed the stock.

---

### User Story 6 - Store Owner Publishes Editorial Content (Priority: P6)

The store owner writes collection stories, care guides, and behind-the-scenes posts in the admin
area, organizes them into categories, and publishes them — or schedules them for later. Posts mix
headings, images, quotes, and links, and can reference specific products so a reader moving through
a story can jump straight to the piece being described. Visitors browse the blog index, filter by
category, and read individual posts.

**Why this priority**: Editorial content builds trust and drives organic traffic, which is core to
the business goal, but the store transacts without it. It is the highest-value addition once the
commercial path works end to end.

**Independent Test**: Fully testable by drafting a post, scheduling it, confirming it stays private
until its publish time, then confirming it appears on the index, filters correctly by category, and
its product references link through. Delivers a content platform.

**Acceptance Scenarios**:

1. **Given** the owner is in the admin area, **When** they create a post with rich content and
   assign it a category, **Then** they can save it as a draft and preview it privately.
2. **Given** a draft or scheduled post, **When** an anonymous visitor browses the blog, **Then** the
   post is not visible until it is published or its scheduled time arrives.
3. **Given** several published posts across categories, **When** a visitor filters the index by a
   category, **Then** only posts in that category are listed, with pagination.
4. **Given** a post that references a product, **When** a reader follows that reference, **Then**
   they land on the product's detail page.
5. **Given** a post references a product that is later unpublished, **When** a reader views the
   post, **Then** the post still renders correctly without a broken link or error.

---

### Edge Cases

- **Messenger unavailable**: the customer is on a desktop without WhatsApp or Telegram installed,
  the deep link is blocked, or the app fails to open. The request must already be recorded, and a
  copyable message plus the seller's contact details must be offered.
- **Customer never sends the message**: the handoff opens but the customer abandons it. The order
  record must persist and appear in the admin queue — the seller's only loss is the notification,
  not the request.
- **Two requests, one stone**: two customers request the same stock-tracked piece or the same
  individual diamond. Because requests are not sales, both are recorded and both are shown to the
  owner; neither customer is told the piece is theirs.
- **Diamond taken mid-session**: a customer has a specific diamond in their cart when the owner
  marks it unavailable. This must be surfaced before the request is sent, not after.
- **Options removed from a product**: the owner deletes a size or a diamond option that sits in
  someone's cart, or that appears in a submitted request. Carts must surface it; submitted requests
  must still display the original choice.
- **Product changes underneath a cart**: a product is unpublished, deleted, renamed, or repriced
  while it sits in one or more carts. The customer must be told before they can submit.
- **Attribute schema changes on populated products**: the owner renames, retypes, or removes a
  descriptive attribute that existing products already use. Existing content must not be silently
  lost, and the storefront must not render an empty or broken attribute row.
- **Verification code abuse**: someone requests codes repeatedly for an address they do not own, or
  brute-forces codes. Rate limiting and attempt limits must apply, and the flow must not reveal
  whether an email is already registered.
- **Email delivery fails**: the verification code or request acknowledgement does not arrive. The
  customer needs a clear resend path, and a failed acknowledgement must never roll back or hide a
  successfully created request.
- **Duplicate submission**: double-clicked submit, browser refresh on the confirmation page, or a
  retried request must result in exactly one order record.
- **"Buy now" with a full cart**: using "Buy now" on one product must not submit or empty the
  customer's existing cart.
- **Empty or stale cart at submission**: the cart is empty, or every item has become unavailable.
  Submission must be refused with an explanation rather than creating an empty request.
- **Sign-in mid-cart**: an anonymous visitor with a cart signs in and already has a saved cart on
  the account. Merging must not silently drop items from either.
- **Content without media**: a product with no images, or a post with no cover image, must render
  acceptably rather than leaving a broken layout.
- **Long or unusual content**: very long product names, long attribute values, and non-Latin
  characters must not break listing, detail, cart, request, or messenger-message layouts.
- **Deep links to hidden content**: a direct URL to a draft, scheduled, or unpublished product or
  post must not expose it to an anonymous visitor.
- **Account deletion with requests attached**: a customer asks for erasure while historical requests
  exist. Personal data must be removable without destroying the seller's commercial record.

## Requirements *(mandatory)*

### Functional Requirements

#### Catalog & Descriptive Attributes

- **FR-001**: The store owner MUST be able to create, edit, publish, unpublish, and delete products
  without developer involvement or a deployment.
- **FR-002**: The store owner MUST be able to define and modify the set of descriptive product
  attributes — including each attribute's label, data type, whether it is required, and its allowed
  values — without a code change or deployment, and apply them to products.
- **FR-003**: Descriptive attributes MUST be presentational and filterable only. They MUST NOT be
  selectable by the customer and MUST NOT affect price.
- **FR-004**: Products MUST support multiple images with a designated primary image and
  owner-authored alternative text for each.
- **FR-005**: Products MUST support long-form descriptive content (craftsmanship notes, care
  instructions, provenance) in addition to structured attributes.
- **FR-006**: The store owner MUST be able to organize products into owner-managed categories or
  collections, and a product MUST be able to belong to more than one.
- **FR-007**: The public product listing MUST support pagination, sorting (at minimum by price, by
  newest, and by name), and filtering by category and by descriptive attribute value, with multiple
  filters combinable.
- **FR-008**: The product detail view MUST present images, price, every populated descriptive
  attribute, descriptive content, available options, and current availability.
- **FR-009**: Visitors MUST be able to search the catalog by keyword across product names,
  descriptive content, and attribute values.
- **FR-010**: Draft and unpublished products MUST NOT be reachable by the public, including by
  direct URL, while remaining previewable by the store owner.
- **FR-011**: Prices MUST be displayed in a single store currency, and it MUST be stated to the
  customer that tax, shipping, and final pricing are settled with the seller directly.

#### Selectable Options — Diamond and Size

- **FR-012**: The system MUST support exactly two customer-selectable option types: **"Choose Your
  Diamond:"** and **"Size:"**. No other attribute is selectable.
- **FR-013**: The store owner MUST be able to attach diamond options to a product without a code
  change, each with its own descriptive specifications (such as cut, carat, clarity, colour), its
  own price, its own availability, and optionally its own image.
- **FR-014**: The store owner MUST be able to define the sizes available for a product without a
  code change.
- **FR-015**: A product MUST be able to have neither option type, either one alone, or both — a
  plain band with sizes but no diamond, earrings with neither, a ring with both.
- **FR-016**: Where a product offers an option type, the customer MUST choose a value before the
  product can be added to the cart or requested via "Buy now"; the system MUST refuse the action
  and indicate the unmade choice.
- **FR-017**: The price displayed on the product detail view MUST update to reflect the selected
  diamond, and the resulting price MUST be the one carried into the cart.
- **FR-018**: A diamond option marked unavailable MUST NOT be selectable, and MUST be either hidden
  or clearly shown as unavailable.
- **FR-019**: Chosen options MUST be carried through to the cart line, the order record, the
  customer's acknowledgement, and the pre-filled seller message.

#### Availability

- **FR-020**: Every product MUST carry an availability mode set by the owner: **made-to-order** or
  **stock-tracked**.
- **FR-021**: A made-to-order product MUST always be available to add and request, regardless of any
  quantity value.
- **FR-022**: A stock-tracked product MUST carry an owner-maintained quantity; when that quantity
  reaches zero the product MUST be presented as unavailable and MUST NOT be addable to a cart.
- **FR-023**: Individual diamond options MUST carry their own availability independently of the
  product's mode, so that a single stone can be marked as taken.
- **FR-024**: Submitting a request MUST NOT automatically decrement stock. Because a request is not
  a sale, the owner adjusts quantities when a sale actually completes.
- **FR-025**: The system MUST allow more than one open request against the same stock-tracked
  product or diamond, and MUST make that situation visible to the owner rather than resolving it
  silently.

#### Customer Accounts & Access

- **FR-026**: Customers MUST be able to create an account by submitting an email address and
  password and confirming a one-time verification code delivered to it.
- **FR-027**: Returning customers MUST sign in through the email and password they used to create
  their account, and the flow MUST resolve to their existing account rather than creating a duplicate.
- **FR-028**: Verification codes MUST expire after a bounded period, MUST be single-use, and MUST be
  invalidated when a newer code is issued for the same address.
- **FR-029**: The system MUST rate-limit verification code requests and sign-in attempts per email
  address and per origin, and MUST limit consecutive incorrect attempts before temporarily refusing
  further ones.
- **FR-029a**: Passwords MUST be stored using a memory-hard hash, and MUST have a documented minimum
  strength enforced at registration.
- **FR-029b**: A customer who forgets their password MUST be able to set a new one by entering a
  verification code emailed to them, rather than by following a reset link.
- **FR-030**: The sign-in flow MUST NOT reveal whether an email address is already registered.
- **FR-031**: A signed-in customer MUST remain signed in across visits until they sign out or their
  session expires, and signing out MUST end the session immediately.
- **FR-032**: Customers MUST be able to view and edit their own contact details (name, email, phone,
  preferred messenger handle) and MUST NOT be able to view or modify any other customer's data.
- **FR-033**: The store owner and admin users MUST authenticate separately from customers, and
  customer accounts MUST NOT grant any access to the admin area.

#### Cart

- **FR-034**: Visitors MUST be able to add products to a cart, change item quantities, remove items,
  and view a summary listing each item with its chosen options, unit price, and a running total.
- **FR-035**: The same product with different chosen options MUST be treated as distinct cart lines.
- **FR-036**: A signed-in customer's cart MUST persist across sessions and devices; an anonymous
  visitor's cart MUST persist on their device and MUST be merged into their account cart when they
  sign in, without dropping items from either.
- **FR-037**: The cart MUST be revalidated against current published product, option, and
  availability data both when viewed and at submission, and any item that has become unavailable or
  has changed price MUST be surfaced to the customer for acknowledgement before submission proceeds.
- **FR-038**: The system MUST refuse to add an unpublished or unavailable product, or an unavailable
  diamond option, to a cart.
- **FR-039**: Line totals and the cart total MUST be computed by the system from current published
  product and option data; amounts supplied by the customer's device MUST NEVER be used to determine
  what is shown or sent to the seller.

#### Request Submission & Seller Handoff

- **FR-040**: A signed-in customer MUST be able to submit their whole cart via **"Checkout"**, and
  MUST be able to submit a single product directly via **"Buy now"** without their existing cart
  being submitted or emptied.
- **FR-041**: At submission the customer MUST be able to confirm their contact details and attach a
  free-text note (sizing, engraving, delivery timing).
- **FR-042**: Every submission MUST create an order record with a unique reference and a
  point-in-time snapshot of each line — product name, chosen diamond, chosen size, unit price,
  quantity — plus totals, and that snapshot MUST remain accurate regardless of any later catalog
  change or product deletion.
- **FR-043**: After the record is created, the system MUST offer the customer a handoff to the
  seller on **WhatsApp** or **Telegram**, opening the chosen messenger with a pre-filled message
  containing the order reference, each piece with its chosen options, and the customer's note.
- **FR-044**: The seller's WhatsApp and Telegram destinations, and the wording of the pre-filled
  message, MUST be editable by the owner without a code change or deployment.
- **FR-045**: The order record MUST exist and be visible in the admin queue whether or not the
  customer opens the messenger and whether or not they send the message.
- **FR-046**: Where no messenger can be opened, the system MUST present the message text in a
  copyable form together with the seller's contact details as a fallback.
- **FR-047**: Submission MUST be idempotent: a repeated submission of the same cart or the same
  "Buy now" — whether from a double-click, a page refresh, or a retried request — MUST NOT create
  more than one order record.
- **FR-048**: Successful submission MUST show a confirmation containing the reference, and a cart
  submission MUST clear the submitted cart while a "Buy now" MUST leave the cart untouched.
- **FR-049**: The customer MUST receive an email acknowledgement containing the reference and the
  pieces requested, and a failure to deliver it MUST NOT invalidate the request.
- **FR-050**: The submission flow MUST make unambiguously clear that the customer is sending a
  purchase request, that no payment is taken on the site, and that the seller will respond to
  confirm availability, final price, payment, and delivery.

#### Request Management (Admin)

- **FR-051**: The store owner MUST see all submitted requests, newest first, showing reference,
  submission date, customer, item count, total, and current status.
- **FR-052**: The store owner MUST be able to open any request and see its full line snapshot with
  chosen options, totals, customer contact details, chosen messenger, and customer note.
- **FR-053**: The store owner MUST be able to move a request through a defined set of statuses
  covering at least: new, seller contacted, confirmed, completed, and cancelled.
- **FR-054**: Every status change MUST be recorded with who made it and when.
- **FR-055**: The store owner MUST be able to record internal notes on a request that are never
  shown to the customer.
- **FR-056**: Request records and their status history MUST be retained and MUST NOT be editable in
  place — corrections are recorded as new entries in the history.

#### Editorial Content

- **FR-057**: The store owner MUST be able to create, edit, categorize, schedule, publish, and
  unpublish blog posts without developer involvement or a deployment.
- **FR-058**: Posts MUST support rich authored content including headings, formatted text, images,
  quotes, and links, composed in the admin area without writing code.
- **FR-059**: Posts MUST be linkable to related products, and a post MUST continue to render
  correctly if a referenced product is later unpublished or deleted.
- **FR-060**: The blog index MUST support filtering by category and pagination, listing posts newest
  first.
- **FR-061**: Draft and scheduled posts MUST NOT be publicly reachable, including by direct URL,
  until published or until their scheduled publish time; the owner MUST be able to preview them.

#### Cross-Cutting

- **FR-062**: Every publicly reachable page MUST have owner-editable title and description metadata
  and a canonical URL, and product, category, and post pages MUST expose structured data appropriate
  to their type.
- **FR-063**: The entire customer journey — browse, search, filter, choose options, cart, sign in,
  submit, hand off — MUST be fully usable on a mobile phone.
- **FR-064**: The entire customer journey MUST be operable by keyboard alone and usable with a
  screen reader.
- **FR-065**: Personal data MUST have a documented retention period and a working deletion path that
  removes the customer's personal data while preserving the seller's commercial record of what was
  requested.
- **FR-066**: The catalog, content, and account data model MUST accommodate the Phase 2 additions —
  in-platform payments, saved shipping and billing addresses, customer-visible order history, and
  transaction records — without requiring existing customers to re-register and without migrating or
  discarding existing catalog or editorial content.

### Key Entities

- **Product**: A piece of jewelry offered for sale. Carries a name, URL slug, base price,
  publication state, availability mode, stock quantity where tracked, descriptive content, ordered
  images, and values for the owner-defined descriptive attributes. Belongs to zero or more
  categories, and may offer diamond options and sizes.
- **Attribute Definition**: An owner-created description of a descriptive product field — its label,
  data type, whether it is required, and its allowed values. Editable without code changes.
  Presentational and filterable only.
- **Diamond Option**: A specific stone a customer may choose for a product, with its own
  specifications, price, availability, and optional image.
- **Size Option**: A size a customer may choose for a product.
- **Category / Collection**: An owner-managed grouping of products used for navigation and
  filtering. Has a name, slug, and optional descriptive content.
- **Media Asset**: An uploaded image with alternative text, used by products, diamond options, and
  posts.
- **Blog Post**: An editorial article with a title, slug, rich content, publication state and
  scheduled publish time, one or more categories, and optional references to products.
- **Blog Category**: An owner-managed grouping of posts, with a name and slug.
- **Customer**: A person with an account, identified by email address. Holds a hashed password,
  contact details, a preferred messenger handle, and whether their email has been verified. Owns a
  cart and any submitted requests.
- **Verification Code**: A short-lived, single-use credential emailed to an address to verify it at
  registration or to authorise a password reset, with an expiry and an attempt counter. It does not
  by itself establish a session.
- **Cart**: A collection of cart lines belonging to either a signed-in customer or an anonymous
  device. Transient — revalidated against the catalog rather than treated as a record.
- **Cart Line**: A product reference, chosen diamond and size where offered, and a quantity. Two
  lines of the same product with different choices are distinct.
- **Order (Request)**: An immutable record of a submission, holding a unique reference, the
  customer's contact details at submission, the chosen messenger, the customer note, computed
  totals, current status, and a status history. Customer-facing language calls it a request; the
  admin queue treats it as an order record. Never rewritten in place.
- **Order Line**: A point-in-time snapshot of one requested piece — product name, chosen diamond,
  chosen size, unit price, quantity — independent of the live product record.
- **Status History Entry**: A record of one status transition, capturing the old and new status, the
  admin who made it, the timestamp, and any note.
- **Seller Contact Settings**: The owner-editable WhatsApp and Telegram destinations and the
  pre-filled message template used at handoff.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can go from landing on the site to a sent request — including
  creating an account and choosing a diamond and size — in under 5 minutes.
- **SC-002**: The store owner can publish a new product with images, price, descriptive attributes,
  diamond options, and sizes in under 10 minutes, without developer help and without a deployment.
- **SC-003**: The store owner can introduce a brand-new descriptive attribute and see it rendered on
  the public storefront within the same working session, with zero code changes and zero
  deployments.
- **SC-004**: 100% of submitted requests are visible in the admin queue immediately, including those
  where the customer never opened or never sent the messenger message.
- **SC-005**: 95% of customers who reach the handoff step successfully open WhatsApp or Telegram
  with the pre-filled message, or are given the copyable fallback.
- **SC-006**: The pre-filled message contains the reference, every piece, and every chosen diamond
  and size in 100% of submissions, verified across products with both options, one option, and
  neither.
- **SC-007**: A customer completes account creation — from entering their email to being signed in —
  in under 90 seconds.
- **SC-008**: 90% of first-time customers complete account creation on their first attempt without
  contacting the seller for help.
- **SC-009**: Zero duplicate order records are created across repeated, refreshed, or retried
  submissions of the same cart or "Buy now".
- **SC-010**: 100% of order records display the item names, chosen options, and prices as they were
  at submission, verified after the underlying products, diamonds, and sizes have been edited,
  repriced, and deleted.
- **SC-011**: Every published product, category, and blog post is reachable from the home page
  within 3 clicks.
- **SC-012**: Product listing and product detail pages present usable content within 2.5 seconds on
  a mobile connection at the 75th percentile.
- **SC-013**: 100% of the browse → choose → cart → sign-in → submit → hand off journey is
  completable using a keyboard alone and with a screen reader.
- **SC-014**: Zero draft, scheduled, or unpublished products and posts are reachable by an anonymous
  visitor, verified by direct-URL access attempts.
- **SC-015**: The store owner performs 100% of routine catalog and content changes — new products,
  new attributes, new diamonds, new sizes, new posts, price edits, stock adjustments, and changes to
  the seller's messenger destinations — without a developer.
- **SC-016**: Phase 2 capabilities (payments, saved addresses, order history, transactions) can be
  added with no existing customer required to re-register and no catalog or editorial content
  migrated or lost.

## Assumptions

- **Requests, not sales**: no money is taken on the site and no payment instrument data is collected
  anywhere. Price, payment, and delivery are agreed between seller and customer in the messenger
  conversation.
- **Messenger channels**: WhatsApp and Telegram only for the MVP. Additional channels (Instagram,
  email-only, phone) are out of scope but the seller contact settings should not preclude them.
- **Account required to submit**: browsing, searching, choosing options, and building a cart are open
  to anonymous visitors; submitting a request requires a signed-in customer. This follows the
  overview's ordering of registration before order submission. *Worth revisiting — see Open
  Questions.*
- **Single market**: one store currency and one content language for the MVP. Multi-currency and
  multi-language are out of scope.
- **Code delivery by email**: verification codes are delivered by email. SMS delivery is out of
  scope for the MVP.
- **No tax or shipping calculation**: the MVP does not compute tax or shipping rates. Both are
  settled by the seller directly.
- **Manual stock**: stock quantities are maintained by the owner. Nothing decrements automatically,
  because a request is not a sale.
- **Diamonds are per-product**: diamond options are attached to the products that offer them rather
  than managed as a shared, independently searchable inventory of stones. A shared stone inventory
  is out of scope for the MVP.
- **Small trusted admin team**: the store owner and any staff are a small, trusted group. Granular
  admin role permissions are out of scope for the MVP; admins are distinct from customers.
- **Owner-supplied media**: product, diamond, and editorial imagery is supplied by the store owner at
  adequate resolution. Photography and retouching are out of scope.
- **Modern browsers, mobile-first**: current versions of major browsers, with the majority of
  customer traffic on mobile — which also makes the messenger deep links the common case rather than
  the exception.
- **Out of scope for the MVP**: product reviews and ratings, wishlists, discount codes and
  promotions, gift cards, returns and exchanges workflows, multi-vendor selling, live chat, and
  in-platform customer order history (Phase 2).

### Open Questions

Not blocking, but worth a decision before or during planning:

- **Should sending a request really require an account?** The messenger handoff means the seller
  already gets the customer's identity through WhatsApp or Telegram, so mandatory registration adds
  friction to the exact step that converts. Allowing an anonymous request — capturing name and
  contact at submission and optionally offering an account afterwards — would likely raise
  conversion. The account requirement is retained here because the overview sequences registration
  before ordering, and because it is the foundation for Phase 2 order history.

### Dependencies

- A transactional email delivery service capable of sending verification codes and request
  acknowledgements reliably and promptly.
- Reachable WhatsApp and Telegram destinations for the seller, monitored during business hours.
- Image storage and delivery capable of serving responsive, optimized product, diamond, and
  editorial imagery.
- Store owner availability to author the initial catalog, attribute definitions, diamond options,
  and launch content.
