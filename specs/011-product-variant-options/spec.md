# Feature Specification: Product Variant Options

**Feature Branch**: `011-product-variant-options`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "We have some updates: 1) the attributes description should be applied to specific variant if such was added; 2) Lets remove sizes, they are deprecated right now; 3) Let's make colours also editable; 4) If we set "Made to order" then we should not have ability to add stock to specific variant, they should also be "Made to order""

## Overview

Four corrections to how a piece of jewelry is described and made available. Three are the owner
gaining control of things the code currently decides for them; one is a live defect that can leave a
made-to-order piece unorderable.

They are grouped because they all touch the same two screens — the product form in the admin, and
the product page a customer buys from — and shipping them separately would mean reviewing that form
four times.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A made-to-order piece is orderable without inventing stock (Priority: P1)

The owner marks a ring **Made to order**, then adds the stones a customer chooses between. Today
each stone still asks "how many exist", and a stone left at zero — the honest answer for something
made to order — is shown to customers as unavailable. A made-to-order ring with five stones, none of
which has had a number typed into it, cannot be ordered at all.

Marking the parent piece made to order must carry to its stones: no quantity is asked for, and every
published stone is orderable.

**Why this priority**: it is the only one of the four that loses sales. The other three are the
owner working around the system; this one produces a product page that refuses to sell a piece the
owner believes is on sale, with nothing on screen explaining why.

**Independent Test**: mark a piece made to order, add two stones without touching any quantity, and
confirm both can be selected and added to a cart from the storefront.

**Acceptance Scenarios**:

1. **Given** a piece set to **Made to order** with three stones, **When** the owner opens any of
   those stones, **Then** no quantity field is offered.
2. **Given** that piece, **When** a customer opens the product page, **Then** every published stone
   is selectable and labelled as made to order rather than as carrying a count.
3. **Given** that piece, **When** a customer adds a stone to their cart, **Then** no upper limit is
   placed on how many they may request.
4. **Given** a piece set to **Stock tracked**, **When** the owner opens one of its stones, **Then**
   the quantity field is offered exactly as it is today, and a stone at zero is shown to customers
   as unavailable.
5. **Given** a made-to-order piece whose stones carry quantities from when it was stock tracked,
   **When** the owner switches it back to **Stock tracked**, **Then** those quantities are still
   there and take effect again.
6. **Given** a made-to-order piece, **When** the owner needs one particular stone to stop being
   offered, **Then** they can take it off sale without reintroducing a quantity.

---

### User Story 2 - Descriptive properties can differ per stone (Priority: P2)

A product's descriptive properties — carat weight, clarity, certificate number — are written once on
the piece. But on a piece where the customer chooses between stones, several of those properties
describe **the stone**, not the setting: two stones in the same ring have different carat weights and
different certificates.

The owner needs to give a property its value on an individual stone, and the customer needs to see
the values for the stone they have actually selected.

**Why this priority**: it is a correctness problem in what the shop tells customers about what they
are buying — a certificate number against the wrong stone is worse than no certificate number — but
unlike US1 it does not stop anyone ordering.

**Independent Test**: put different carat weights on two stones of one ring, then confirm the
product details change as a customer switches between them.

**Acceptance Scenarios**:

1. **Given** a piece with two stones, **When** the owner edits one stone, **Then** they can give any
   of the shop's defined properties a value for that stone alone.
2. **Given** a stone carrying its own value for a property the piece also defines, **When** a
   customer selects that stone, **Then** the stone's value is shown in place of the piece's.
3. **Given** a stone carrying a property the piece does not define at all, **When** a customer
   selects that stone, **Then** that property appears alongside the piece's own.
4. **Given** a piece whose stones carry no properties of their own, **When** a customer views it,
   **Then** the details read exactly as they do today.
5. **Given** a piece with stones, **When** the product page first loads and no stone has been
   chosen yet, **Then** the piece's own values are shown.
6. **Given** a customer switching between stones, **When** the selection changes, **Then** the
   details update without a page reload.

---

### User Story 3 - The owner defines the colours (Priority: P3)

Colour is a filter customers browse by, and its four values are fixed in code. Adding rose gold, or
renaming one, is a developer task and a deployment — which is exactly the arrangement every other
descriptive vocabulary in this shop avoids.

The owner needs to add, rename, reorder and retire colours themselves, in every language the shop
sells in.

**Why this priority**: it is the owner's autonomy rather than a customer-visible defect, and today's
four values are workable in the meantime. It is also the change most likely to disturb existing
links, so it benefits from going out after the two above.

**Independent Test**: add a new colour in the admin, apply it to a piece, and confirm it appears in
the filter drawer and filters correctly — with no deployment.

**Acceptance Scenarios**:

1. **Given** the admin, **When** the owner adds a colour and applies it to a piece, **Then** it
   appears as a filter option and selecting it returns that piece, with no deployment.
2. **Given** a colour already applied to published pieces, **When** the owner renames what customers
   read, **Then** existing links that filter on that colour keep working.
3. **Given** the shop's three languages, **When** the owner names a colour, **Then** they can give it
   a name in each, and an untranslated one falls back rather than disappearing.
4. **Given** the four colours in use today, **When** this ships, **Then** every piece keeps the
   colours it had and every existing filter link still resolves.
5. **Given** a colour applied to no pieces, **When** a customer opens the filter drawer, **Then** it
   is offered with a count of zero, the way every other empty facet already is — so the panel does
   not change shape under somebody mid-filter.

---

### User Story 4 - Sizes leave the shop (Priority: P4)

Sizes are deprecated. The shop no longer sells by size, but the product form still asks for them, the
filter drawer still offers a SIZE group, and the product page still demands a choice before a piece
can be added to a cart — a required step for information nobody uses.

**Why this priority**: it removes work rather than adding capability, and the other three are all
worth more to the owner. It is listed last so that nothing above waits on it.

**Independent Test**: confirm a piece that previously required a size choice can be added to a cart
in one step, and that no size appears anywhere in the admin or the storefront.

**Acceptance Scenarios**:

1. **Given** a piece that offered sizes, **When** a customer opens it, **Then** no size selector is
   shown and the piece can be added to a cart without choosing one.
2. **Given** any listing, **When** a customer opens the filters, **Then** no SIZE group is offered.
3. **Given** a saved or shared link carrying a size filter, **When** it is opened, **Then** the page
   loads and shows the remaining filters rather than erroring.
4. **Given** the admin, **When** the owner edits a piece, **Then** there is no size field and no
   Sizes section anywhere in the navigation.
5. **Given** a cart holding an item with a size chosen before this change, **When** the customer
   opens their cart, **Then** the line is intact and can still be sent to the seller.

---

### Edge Cases

- A piece is switched from stock tracked to made to order **while a customer has it in their cart**
  with a quantity above what was in stock. The request is a conversation with the seller rather than
  a payment, so the cart stands and the ceiling simply stops applying.
- Every stone on a made-to-order piece is taken off sale. The piece has stones but none to offer, and
  must read as unavailable rather than as a selector with nothing in it.
- A stone carries a value for a property that has since been deleted from the shop's vocabulary. The
  orphaned value must not appear as a blank row.
- A colour is deleted while pieces still carry it. Either the deletion is refused or those pieces
  lose the colour — silently leaving a filter value nothing can match is the outcome to avoid.
- Two colours are given the same customer-facing name in one language. Filtering must stay
  unambiguous.
- A property is given a value on a stone but left empty on the piece, and the customer has not yet
  chosen a stone.

## Requirements *(mandatory)*

### Functional Requirements

#### Made to order (US1)

- **FR-001**: When a piece is set to **Made to order**, the system MUST NOT offer a quantity field on
  any of that piece's stones.
- **FR-002**: When a piece is set to **Made to order**, the system MUST treat every published stone
  of that piece as available, regardless of any quantity stored against it.
- **FR-003**: The system MUST NOT impose an upper limit on how many of a made-to-order stone a
  customer may request.
- **FR-004**: The system MUST preserve any quantity already recorded on a stone when its piece is
  switched to made to order, and MUST honour it again if the piece is switched back to stock
  tracked.
- **FR-005**: Where a piece is **Stock tracked**, the system MUST keep today's behaviour exactly: a
  quantity per stone, and a stone at zero shown as unavailable.
- **FR-006**: The owner MUST be able to withdraw an individual stone from a made-to-order piece
  without reintroducing a quantity.
- **FR-007**: A customer-facing availability label MUST reflect the piece's mode, so a made-to-order
  stone reads as made to order rather than as in stock.
- **FR-008**: Where a made-to-order piece has stones but none is available to offer, the piece MUST
  read as unavailable rather than presenting an empty selector.

#### Per-stone properties (US2)

- **FR-009**: The owner MUST be able to record a value for any of the shop's defined properties
  against an individual stone.
- **FR-009a**: Only the property name/value rows become per-stone. The free-form "Product details"
  text and the short description beneath the price MUST remain properties of the piece, shown
  unchanged whichever stone is selected. *Decided 2026-09-23: the narrowest of the three readings —
  a stone differs from its siblings in carat, clarity and certificate, which are all property rows,
  and prose that changed under the customer as they compared stones would make two stones hard to
  compare rather than easy.*
- **FR-010**: Where a stone carries a value for a property the piece also carries, the system MUST
  show the stone's value to a customer who has selected that stone.
- **FR-011**: Where a stone carries a property the piece does not carry, the system MUST show it
  alongside the piece's own properties.
- **FR-012**: Before a customer has selected a stone, the system MUST show the piece's own property
  values.
- **FR-013**: The displayed properties MUST update when the customer changes their stone selection,
  without a page reload.
- **FR-014**: Property values on a stone MUST be translatable into each language the shop sells in,
  and MUST fall back rather than render empty where a translation is absent.
- **FR-015**: The system MUST NOT display a property whose definition has been removed from the
  shop's vocabulary.
- **FR-016**: The ordering of properties MUST remain the owner's, and MUST be consistent whether a
  value came from the piece or from the stone.

#### Editable colours (US3)

- **FR-017**: The owner MUST be able to create, rename, reorder and retire colours without a
  deployment.
- **FR-018**: A colour MUST carry a customer-facing name per language and a stable identifier that
  does not change when that name is edited.
- **FR-019**: Filtering by colour MUST continue to work by the stable identifier, so links shared or
  indexed before a rename keep resolving.
- **FR-020**: The four colours in use today MUST survive this change with their existing identifiers,
  so no published piece loses its colour and no existing filter link breaks.
- **FR-021**: A piece MUST be able to carry more than one colour, as it can today.
- **FR-022**: The filter drawer MUST take its colour options from the catalogue, so a colour the
  owner adds appears there without a deployment. A colour no visible piece carries is still offered,
  with a count of zero. *Reversed during implementation on 2026-09-23: this requirement originally
  said such a colour must NOT be offered, which contradicted a decision `getFilterFacets` has carried
  since spec 003 — "hiding them makes the panel change shape as a visitor filters, which loses the
  option they were about to press; showing a zero is the honest answer to 'do you have this'". Every
  other facet behaves that way, and the owner asked for the colour logic to stay as it is, so the
  requirement was wrong rather than the code.*
- **FR-023**: The system MUST prevent a colour from being deleted while pieces still carry it, or
  remove it from those pieces as part of the deletion — it MUST NOT leave a piece referring to a
  colour that no longer exists.
- **FR-024**: Colour MUST remain a property of the piece rather than of an individual stone.

#### Sizes removed (US4)

- **FR-025**: The system MUST NOT offer a size selector on any product page, and MUST NOT require a
  size before a piece can be added to a cart.
- **FR-026**: The system MUST NOT offer a SIZE group in the filter drawer or toolbar.
- **FR-027**: The system MUST NOT present any size field in the admin, nor a Sizes section in its
  navigation.
- **FR-028**: A URL carrying a size filter MUST load successfully and apply its remaining filters.
- **FR-029**: A cart line that recorded a size before this change MUST remain usable, and MUST still
  be sendable to the seller.
- **FR-030**: Removing size data MUST be reversible, in line with the project's rule that a schema
  change affecting existing content ships with a tested rollback path.

### Key Entities

- **Piece (product)**: what a customer browses and buys. Carries its own descriptive properties, its
  colours, and whether it is made to order or stock tracked. Loses its sizes.
- **Stone (variant)**: an option the customer chooses between within a piece. Carries its own price,
  its own photograph, and — new here — its own descriptive property values. Stops carrying a quantity
  when its piece is made to order, and can be withdrawn individually.
- **Property (attribute)**: an owner-defined descriptive field — carat weight, certificate, finish.
  Defined once for the shop; given values on a piece and, now, on a stone.
- **Colour**: an owner-defined value a piece can carry and a customer can filter by. New as an
  editable vocabulary; previously fixed in code.
- **Size**: removed. Its vocabulary, its use on a piece, and its place in the filters and on the
  product page all go.
- **Cart line**: a piece, a chosen stone, and a quantity. Stops carrying a size.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A made-to-order piece with stones can be ordered by a customer without the owner
  entering a single quantity — zero fields, down from one per stone.
- **SC-002**: 100% of published stones on a made-to-order piece are offered to customers, where
  today a stone left at zero is offered to none.
- **SC-003**: The owner can give a stone its own carat weight and certificate and see them on the
  storefront in under two minutes, without help.
- **SC-004**: A customer switching between stones sees the details for their selection immediately,
  with no page reload.
- **SC-005**: The owner can add a new colour and have it filtering pieces on the live site in under
  two minutes, with no deployment and no developer involvement.
- **SC-006**: Every link that filtered by colour before this change still returns the same pieces
  after it.
- **SC-007**: A piece that previously required a size choice can be added to a cart in one action
  instead of two.
- **SC-008**: No screen in the admin or the storefront mentions size after this ships.
- **SC-009**: No published piece loses a colour, a property value, or its availability as a result of
  this change.

## Assumptions

- **"Made to order" remains a property of the piece, not of a stone.** The owner sets it once and it
  carries down. A piece with some stones made to order and others counted was not asked for and is
  not modelled.
- **Withdrawing a single stone uses the take-off-sale control stones already have**, rather than a
  new field. This is what makes FR-006 answerable without reintroducing a quantity.
- **Quantities already stored on stones are kept, not erased**, when a piece becomes made to order.
  They are ignored while it is, which makes switching modes non-destructive and reversible.
- **A stone's property value replaces the piece's for the same property**, rather than appearing
  twice. Showing two carat weights for one stone would be worse than either.
- **"The attributes description" means the property rows**, not the piece's prose. Confirmed with the
  owner on 2026-09-23; see FR-009a for what stays on the piece and why.
- **Colour stays a filter on the piece and does not become a way of choosing between stones.** "Make
  colours editable" is read as making the list of colours the owner's to maintain — the same
  arrangement properties already have — not as relocating colour onto stones.
- **The four existing colour values are carried over as owner-editable rows keeping their current
  identifiers**, so published pieces and shared links are unaffected.
- **Removing sizes destroys no customer history.** Sizes are recorded on the vocabulary, on pieces,
  and on live cart lines only; enquiries hold a name, an address and a message, and the shop keeps no
  order records, so there is nothing historical to preserve.
- **Existing cart lines outlive the change.** Carts are working state rather than a record, so a size
  already chosen simply stops being shown and stops distinguishing one line from another.
- **The size filter disappearing from a shared link is acceptable**, and degrades to the remaining
  filters rather than to an error page.
- **All four changes ship against the shop's existing three languages**, and any new owner-facing
  vocabulary is translatable on the same terms as the existing ones.

## Dependencies

- The owner-defined properties vocabulary already exists and is reused rather than replaced.
- The existing take-off-sale mechanism on stones is relied on by FR-006.
- The shop's three-language content model is relied on by FR-014 and FR-018.

## Out of Scope

- Making colour, or any other property, a way of choosing between stones. Only the descriptive
  property rows described in US2 become per-stone.
- Per-stone **"Product details"** text and per-stone **short description**. Both stay on the piece
  (FR-009a). Considered and declined rather than overlooked.
- Reintroducing size in any other form, including as a property or as a stone option.
- Bulk editing of stones. Each is edited individually, as today.
- Any change to how prices are set on a piece or a stone.
