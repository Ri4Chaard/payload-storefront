# Feature Specification: Shop — Catalog Listing and Product Detail

**Feature Branch**: `003-shop-catalog`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "I want you to analyze the items in the shop. And I want you to write
specification for implementing such pages with functionality (write user stories)" —
[Figma design]

**Source**: Figma section `225:1292` ("Магазин"), which holds nine frames: the listing at three
widths, a second listing for All Jewelry, the filter drawer and its overlay, the sort menu, the
product page at three widths, a size dropdown, a full-screen photograph, and the messenger handoff
modal at three widths.

This is the spec the brief calls `002-product-catalog` (see
[docs/mvp-brief.md](../../docs/mvp-brief.md), User Stories 1–2). It is renumbered `003` because
`002` was taken by the home page. It is also the spec that **ends the mock-content deviation**
recorded in [002-home-page](../002-home-page/spec.md): the catalogue schema is decided here, with
real screens to judge it against, exactly as 001/research.md R9 planned.

## Design Inventory

Nine frames, read band by band. Roughly a third of what is drawn already exists in the kit built in
[001-design-system-foundation](../001-design-system-foundation/spec.md).

### Frames in the node

| Frame                             | Node                      | Size       | Covers                                     |
| --------------------------------- | ------------------------- | ---------- | ------------------------------------------ |
| Магазин (category listing)        | `222:706`                 | 1920×2856  | Listing at desktop, titled "Diamond Rings" |
| Tablet Product Listing            | `412:7714`                | 768×1931   | Listing at tablet                          |
| Mobile Product Listing            | `412:7860`                | 375×2219   | Listing at mobile                          |
| ALL JEWELRY                       | `355:7139`                | 1920×2797  | The same listing, titled "All Jewelry"     |
| FILTERS (drawer over the listing) | `225:1431`                | 1920×1080  | Drawer, scrim, and the fuller toolbar      |
| Frame 64 (drawer alone)           | `532:12507`               | 350×1080   | The drawer as a component                  |
| Sort by                           | `225:1854`                | 200×210    | The sort menu, four options                |
| Товар (product page)              | `231:1901`                | 1920×2782  | Product detail at desktop                  |
| tablet-product                    | `410:7283`                | 768×3266   | Product detail at tablet                   |
| mobile-product                    | `410:7626`                | 390×4003   | Product detail at mobile                   |
| Frame 78 (size dropdown open)     | `301:5845`                | 505×432    | The option select, five rows, scrolled     |
| Картинка товара на весь экран     | `308:6392`                | 1920×1080  | Full-screen photograph with paging         |
| Your selection is in the cart     | `590:13222`               | 1920×1080  | Messenger handoff modal, desktop           |
| Планшет / Мобильный (same modal)  | `590:13774` / `590:13874` | 1024 / 390 | The modal at the two smaller widths        |

### Band-by-band status

| Band                    | Desktop              | Tablet      | Mobile      | Status                                                            |
| ----------------------- | -------------------- | ----------- | ----------- | ----------------------------------------------------------------- |
| Contact banner + header | `222:707/708`        | `412:7716`  | `412:7862`  | Built — `ContactBanner`, `Header`                                 |
| Listing title block     | `222:709`            | `412:7735`  | `412:7870`  | **New** — title + subtitle                                        |
| Filter toolbar          | `355:7627`           | `412:7738`  | `412:7873`  | **New** — the largest new component                               |
| Active filter chips     | `I355:7627;355:7602` | hidden      | hidden      | **New** — `Chip` exists, the row does not                         |
| Product grid            | `222:982`            | `412:7764`  | `412:7881`  | **New grid**, `ProductCard` reusable                              |
| Filter drawer           | `231:2321`           | `532:12507` | `532:12507` | **New** — `Checkbox`, `ScrollArea` exist                          |
| Sort menu               | `225:1854`           | `412:7750`  | `412:7876`  | `Menu` + `MenuOption` exist, wiring is new                        |
| PDP gallery             | `297:4567`           | `410:7290`  | `410:7633`  | **New** — `ImageCarousel` is a start                              |
| PDP information column  | `242:2479`           | `410:7310`  | `410:7659`  | **New** — `Field`, `Button`, `QuantityStepper`, `Accordion` exist |
| Complete the Collection | `242:2585`           | `410:7395`  | `410:7726`  | Reuses the home page's carousel band                              |
| Service promises        | `355:7775`           | `410:7440`  | `410:7783`  | Built — `FeatureStrip`                                            |
| Footer                  | `231:1977`           | `410:7480`  | `410:7827`  | Built — `Footer`                                                  |
| Full-screen photograph  | `308:6392`           | —           | —           | **New** — deferred here by 002                                    |
| Handoff modal           | `590:13108`          | `590:13775` | `590:13875` | Drawn here, **out of scope** — see below                          |

### What the toolbar actually contains

Reading `225:1431` (the fullest version drawn) left to right at 1920: a **FILTERS** button with a
funnel; a rule; **Shape** — a label over seven 26px stone silhouettes; a rule; **Price** — a label
over a two-handle slider, beside two boxes reading `$500` and `$7,300`; a rule; **SORT BY** with a
chevron; a rule; **IN-STOCK ONLY** with a toggle. Beneath it, a row of removable chips: `Rings ×`,
`Up to $7,300 ×`, `Best selling ×`.

The earlier frame `222:706` draws the same toolbar without the in-stock toggle. The fuller version
is treated as current.

At tablet the toolbar keeps only the FILTERS pill, the shape row and the sort pill. At mobile it
collapses to two triggers side by side: `FILTERS (2)` — carrying a count of what is applied — and
`SORT BY`.

### What the drawer contains

Six groups are drawn, in this order: **CATEGORY** (All jewelry, Rings, Bracelets, Earrings,
Necklaces), **COLOR** (Black, Clear, Green, Multicolor), **PRICE** (MIN and MAX boxes over a
two-handle slider), **SIZE** (2, 2.25, 2.5, 2.75, 3), **COLLECTION** (Deia, Marvel, Molten,
Spartan), **DIAMOND SHAPE** (Oval, Round, Emerald). The list scrolls under a fixed footer holding
**CLEAR** and **APPLY**.

A seventh was added in build: **IN-STOCK ONLY**. The toolbar carries that toggle at 1920 and drops
it at both narrower widths, so as drawn it is a filter a phone can never turn off. It is in the
drawer, hidden at `xl` where the toolbar owns it. See inconsistency 12.

### What the product page contains

A five-thumbnail rail with its own up/down paging beside an 850×853 photograph; then an eyebrow
carrying the category ("RING"), the name as the page's heading, the price, a descriptive paragraph;
then **Choose Your Diamond:** and **Size:** as two selects side by side; then a quantity stepper
beside **ADD TO CART**, and **BUY NOW** beneath it at full width; then three accordions — **PRODUCT
DETAILS**, **3 YEAR WARRANTY + FREE RETURNS**, **DELIVERY**. Below the fold: _Complete the
Collection_ (four cards), the service promises, the footer.

### Inconsistencies found in the drawing

These are recorded rather than resolved, and are listed again under [Open Questions](#open-questions).

1. **The sort menu and the sort chip disagree.** The menu offers Recommended, Price Ascending, Price
   Descending, Newest. The chip beneath the toolbar reads `Best selling`, which is not one of them.
   **Resolved: the menu is authoritative.** The four orderings are written once, in
   `SORT_LABELS`, and the chip is built from the same record the menu draws from.
2. **Seven shapes in the toolbar, three in the drawer.** The toolbar's quick shape row draws seven
   silhouettes; the drawer's DIAMOND SHAPE group lists Oval, Round and Emerald only.
3. **Three price formats in one design.** `$ 24,900` on the cards, `$38 320,00` on the desktop
   product page, `$58,320.00` on the mobile one.
4. **The product description is another brand's copy.** "every Graff diamond is meticulously set by
   our master artisans" (`231:2339`) is placeholder text naming a competitor.
5. **The product name differs between widths.** "Paragon Emerald Cut Diamond Engagement Ring" at
   1920, "Polygon Emerald Cut Diamond Engagement Ring" at 768 and 390.
6. **Frame widths do not match the project's breakpoints.** Listing frames are 768 and 375; product
   frames are 768 and 390; handoff frames are 1024 and 390. The home page settled on 1920/1024/390.
7. **Nothing is drawn for a listing beyond twelve cards.** No pagination, no "load more", and the
   carousel arrow parked in the grid is hidden. **Resolved: LOAD MORE**, with a count above it —
   see Open Question 1.
8. **No empty state is drawn** for a filter combination that matches nothing.
9. **COLOR is a filter group with no counterpart on the product page.** Nothing in the product
   information column shows a colour.
10. **The listing card is drawn twice and differs.** The 1920 listing (`222:982`) places the same
    `Default` card the home page uses, whose action is revealed on hover. The 768 and 375 listings
    (`412:7714`, `412:7860`) draw a permanently visible **BUY NOW** under every card — an action
    spec 002 established as desktop-only, from the home page's own drawn card heights.
    **Resolved at the owner's direction: both.** The listing draws the action solid below `xl` and
    hover-revealed at `xl`, which is all three frames rather than a compromise between them. The
    card gained `ctaVisibility` to say so, per FR-017's rule that the card is what gets fixed; the
    home row is untouched. The label reads "Buy now" as the narrow frames draw it — see Open
    Question 9.
11. **The narrow listing frames use a 40px gutter**, where every other band at that width uses 24.
    The listing follows `Container` rather than the frame; a listing inset further than the header
    above it would be the only page in the shop that is.
12. **The drawer is described as seven groups and draws six.** IN-STOCK ONLY is drawn in the
    toolbar instead — and only in the 1920 toolbar, which the 768 and 375 frames both drop along
    with the price. **Resolved: the drawer carries it as a seventh group**, `xl:hidden` so that the
    two are never both on screen. Every control the narrow toolbars drop is in the drawer, which is
    what makes the drawer the complete filtering surface a phone and a scriptless browser both need.
13. **The sort trigger reads two different things.** `SORT BY` at 1920 (`225:1475`) and 390
    (`412:7876`); `RECOMMENDED` — the current ordering — at 1024 (`412:7750`). **Resolved in favour
    of `SORT BY` at every width**: the chip row already names the current ordering, and the menu
    marks it. A trigger that reads the value at one width and the label at two others is a
    difference nobody chose.
14. **The FILTERS trigger differs by width in two more ways**, and here the frames are consistent
    enough to follow: the funnel glyph is drawn only at 1920, and the applied count `(2)` only at
    375. Both are honoured as drawn. Above `md` the count would repeat the chip row directly
    beneath it.
15. **The two triggers are drawn as two different controls.** On the same phone frame
    (`412:7873`), FILTERS is Manrope **Bold** in a 32px box and SORT BY is Manrope **Medium** in a
    36px one; the tablet frame repeats the weight difference. **Confirmed by the owner as a mistake
    in the file.** They are one control: one weight, one height (36px, the larger of the two), and
    one width (160px at 768, the drawn width of the wider pill; 200px at 1920; half the row on a
    phone, as drawn).
16. **The filter bar is a white strip at 768 and 375 and no fill at all at 1920.** Not an
    inconsistency once measured — `412:7738` and `412:7873` both paint `#FFFFFF` between two
    hairlines, `225:1437` paints nothing and carries the bottom hairline alone — but worth writing
    down, because it is the difference between a band laid over the listing and a row sitting on
    it. Both are built. The type follows the same split: 16px at 1920, 12–13px below it, which is
    what makes the narrow bar read as a strip rather than a shrunken toolbar. 13px and 11px have no
    step on the scale and land on `caption`.
17. **The card's name is drawn two different ways at the same width.** The home row's 390 card
    (`440:13594`) sets it at 16px, one line, `white-space: nowrap`, ellipsis — with a
    hundred-character placeholder name to prove the point. The listing's 375 and 768 cards
    (`412:7765`, `412:7773`) set it at 14px and let it run to as many lines as it needs.
    **Resolved: both.** They are different jobs rather than a slip — a rail of fixed-width cards
    stays tidy with one line, and a grid needs the name because it is the only thing telling one
    piece from another. At 174px, one truncated line of 16px type is about eleven characters.
    `ProductCard` gained `nameFit` to say which. At 1920 the two drawings agree again and both
    truncate.
18. **The narrow listing card's price is maroon and 15px** (`primary-default`, `412:7770`), where
    the 1920 card's price is 16px and inherits neutral; its action is 13px in a 40px box against
    16px in a 52px one, and both its photograph and its button are drawn with a 4px radius where
    1920 draws square. **Not built** — recorded and left for the owner, because it recolours every
    price on the listing and rounds a card the home page shares.
19. **The product description is drawn at 1920 and absent at 1024 and 390.** `231:2339` sits under
    the price on the desktop frame; `410:7309` and `410:7642` stop after it. **Resolved: it renders
    at every width.** FR-035 puts the description in the column, and the visitor least able to go
    and find the information elsewhere is the one on a phone. It closes over its own absence, so a
    piece the owner has not described still has no empty paragraph and no reserved gap.
20. **The mobile gallery's dots are a 14px target.** 8px circles 6px apart (`410:7637`), against
    WCAG 2.2 AA 2.5.8's 24px, and the spacing exception does not rescue them at that pitch.
    **Resolved: the control is 24px and the drawn dot is what it contains.** The dots look exactly
    as drawn; the row is 120px wide for five photographs rather than the drawn 36px for three.
21. **The mobile photograph is 390×360, the tablet one square, the desktop one 850×853.**
    **Resolved: square throughout.** 850:853 is square to within three pixels, and one aspect ratio
    is what lets the same track hold the same photographs at every width instead of reflowing them.
22. **The gallery's arrows are drawn INSIDE the rail frame** (`297:4591` sits within `297:4568`),
    which reads as a scrollbar for the thumbnails. **Resolved, owner 2026-08-31: they page the
    photographs.** A rail that only ever scrolls is a control for a control; the thing a visitor
    wants to move is the picture. They are therefore present whenever there is more than one
    photograph rather than only when the rail overflows, and the rail scrolls itself to keep the
    current thumbnail in view. The set also loops — next from the last is the first, the same
    reasoning `ImageCarousel` uses for `wrap`. **The swipe loops too** (owner, 2026-08-31):
    `Carousel` gained `loop`, which puts an `inert` copy of the last photograph before the first and
    of the first after the last, so native scrolling never runs out of track in either direction.
23. **The size list draws per-size stock that the catalogue does not hold.** Every row at
    `301:5845` carries "In stock" or "Made to order"; `Size` has no such field, and the stones
    carry availability while the sizes do not. **Not invented** — the size rows render without
    metadata, because printing a promise the shop has not made is worse than leaving the column
    empty. A question for the owner: either sizes gain a stock state, or the drawing loses one.
24. **`Complete the Collection` is a 2×2 grid at 390 and a row of four at 768 and 1920**
    (`410:7848` against `410:7516`). **Resolved: the carousel, at every width.** FR-037 says the
    band IS the home page's `JewelryCarousel`, and building a second grid for one breakpoint is the
    near-duplicate that requirement exists to prevent.

## Clarifications

### Session 2026-08-28

- **Q: Does this spec introduce the Payload collections, or extend the mocks?** → **Payload.** Spec
  002 recorded its mock-content deviation as ending "when the catalogue spec lands". This is that
  spec. Rendering a filterable listing from `src/mocks/` would build the filtering twice.
- **Q: Are the drawer's SIZE and COLLECTION groups the same data as the product page's "Size:"
  selector?** → **Size, yes; collection, no.** "Size:" on the product page is the brief's selectable
  option type (FR-012 of the brief) and the drawer filters on the same values. COLLECTION is an
  owner-managed grouping — Deia, Marvel, Molten, Spartan — which is the brief's FR-006 category
  concept under a second name.
- **Q: Is CATEGORY in the drawer the same thing as the page's own category?** → Yes. `/rings` is
  the listing with `category=rings` pre-applied; the drawer shows it applied and it can be removed,
  which navigates to `/all-jewelry`. One listing surface, two entry points.
- **Q: Do filters live in the URL?** → **Yes.** A filtered listing must be shareable, linkable from
  an advert, and survivable across a back button. This also gives the no-JavaScript path a working
  form submission.
- **Q: Does the drawer apply as you touch it, or on APPLY?** → **On APPLY**, as drawn. The drawer
  holds a draft; CLEAR empties the draft; APPLY commits it to the URL and closes. The toolbar's own
  quick controls — shape, price, sort, in-stock — commit immediately, because they have no APPLY.
- **Q: Is the messenger handoff modal in scope?** → **No.** It is drawn in this node but it is the
  brief's User Story 4, reserved for `004-requests-and-handoff` along with the cart it reports on.
  This spec builds the two buttons that lead to it and the documented seam they call. See
  [Out of Scope](#out-of-scope).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - The Owner Publishes a Catalog Nobody Has to Deploy (Priority: P1)

The store owner opens the admin area and creates a piece of jewelry: photographs with alternative
text, a name, a price, the category and collection it belongs to, the descriptive attributes that
matter for it, whether it is made to order or stock-tracked, and — where the piece needs them — the
diamonds a customer may choose from and the sizes it comes in. They publish. The piece is on the
storefront. They unpublish it and it is gone, including from its own URL.

**Why this priority**: Every other story on this page reads from this. Without it the listing is a
picture of a listing. It is also the story that proves the central promise of the project — the
owner runs the store without a developer — and it is what retires the mock-content deviation that
spec 002 opened.

**Independent Test**: Create a product in the admin area with two photographs, a price, a category,
one diamond option and three sizes; publish it; confirm it appears on `/all-jewelry` and that its
own page shows everything entered. Unpublish it and confirm both the listing and the direct URL stop
showing it. No deployment in between.

**Acceptance Scenarios**:

1. **Given** the owner is in the admin area, **When** they publish a product with images, price,
   category and description, **Then** it appears on the public listing and its detail page renders
   every populated field.
2. **Given** a product saved as a draft, **When** an anonymous visitor requests its URL directly,
   **Then** they get the branded 404 — while the owner can still preview it.
3. **Given** the owner adds a new descriptive attribute, **When** they apply it to a product,
   **Then** it renders in that product's details without a code change or a deployment.
4. **Given** a product marked stock-tracked with quantity zero, **When** a visitor views it,
   **Then** it is shown as unavailable and cannot be added to a cart.
5. **Given** a product marked made-to-order, **When** a visitor views it, **Then** it is available
   regardless of any quantity value.
6. **Given** the owner reorders a product's photographs, **When** a visitor opens it, **Then** the
   first photograph is the one shown in the listing and the one the gallery opens on.

---

### User Story 2 - A Visitor Browses a Listing (Priority: P2)

A visitor arrives at `/rings` from the header or from the home page's category band. They see the
collection named, a sentence beneath it, and a grid of pieces — photograph, name, price. They scan,
they hover a card to see a second photograph and a way in, and they open one.

**Why this priority**: The listing is the shop. Delivered alone — no filters, no sort — it is
already a publishable page and the destination the home page has been linking to since 002. Every
remaining story on this page either narrows this grid or is reached through it.

**Independent Test**: Load `/all-jewelry` and `/rings` at 1920, 1024 and 390. Confirm the grid is
four, three and two columns, that each card carries one link named for the piece, that the category
listing shows only that category, and that a keyboard reaches every card in reading order.

**Acceptance Scenarios**:

1. **Given** a visitor at 1920, **When** the listing renders, **Then** cards sit four across the
   content width at the drawn proportions and gaps.
2. **Given** a visitor at 1024, **When** the listing renders, **Then** cards sit three across; at
   390, two across.
3. **Given** `/rings`, **When** the listing renders, **Then** the title block reads the category's
   own name and only that category's products are shown.
4. **Given** a screen reader user, **When** they list the links, **Then** each card contributes one
   link named for the piece — not one per photograph and not one per action.
5. **Given** a touch device with no hover, **When** the listing renders, **Then** each card's action
   and its gallery arrows are reachable without a hover that can never occur.
6. **Given** a catalogue larger than one page of results, **When** the visitor reaches the end,
   **Then** there is a way to see the rest and the current position survives a back button.
7. **Given** a category with no published products, **When** the listing renders, **Then** it says
   so in the visitor's language rather than rendering an empty frame.

---

### User Story 3 - A Visitor Studies One Piece (Priority: P3)

A visitor opens a ring. They page through its photographs from the thumbnail rail, open one full
screen and page it there, read the price and the description, and open the accordions for the
details, the warranty and the delivery terms. Below, they find four pieces that complete the
collection and can open any of them.

**Why this priority**: The page a listing exists to reach. It carries the information a customer
needs before they will talk to a seller at all, and it is a complete, valuable page before any of
its selectors work. It sits behind the listing only because it needs somewhere to be reached from.

**Independent Test**: Open a product at 1920, 1024 and 390. Page the gallery with the rail, with
the keyboard, and full screen. Open and close every accordion. Confirm the name is the page's only
first-level heading and that the related row routes onward.

**Acceptance Scenarios**:

1. **Given** a visitor at 1920, **When** the page loads, **Then** the thumbnail rail sits beside the
   main photograph with its own paging, and selecting a thumbnail changes the main photograph.
2. **Given** a visitor at 390, **When** the page loads, **Then** the gallery, the information, the
   selectors, the actions and the accordions stack in the drawn order, and the gallery is a swipeable
   photograph with dot indicators rather than a thumbnail rail.
3. **Given** the main photograph, **When** the visitor activates it, **Then** it opens full screen
   with paging and a close control, closes on Escape, and returns focus to where it was opened from.
4. **Given** an accordion, **When** the visitor opens it, **Then** its state is announced and only
   the drawn sections are present.
5. **Given** a product with one photograph, **When** the page loads, **Then** no rail and no paging
   controls are offered.
6. **Given** a product whose description is empty, **When** the page loads, **Then** the layout
   closes over the gap rather than leaving a hole.
7. **Given** a screen reader user, **When** they list the headings, **Then** the product name is the
   only first-level heading and every band below announces its own heading beneath it.

---

### User Story 4 - A Visitor Narrows the Listing (Priority: P4)

A visitor wants a ring, in white, under seven thousand, in an oval stone, in a size 6. They open
FILTERS, tick what they want across the drawer's groups, and press APPLY. The grid narrows, chips
appear beneath the toolbar naming each thing they applied, and the URL is one they can send to
someone. They drop the price limit by removing its chip. They press CLEAR and are back to
everything.

**Why this priority**: The behaviour that makes a catalogue of any size usable, and the largest new
component in the design. It sits behind the listing because it narrows something that must first
exist, and behind the product page because a visitor who cannot filter can still browse and buy.

**Independent Test**: Apply one filter from each drawer group and confirm the grid, the chip row and
the URL agree. Reload the URL in a fresh session and confirm the same result. Remove a chip, press
CLEAR, and confirm each returns the expected wider result. Repeat at 390 through the drawer.

**Acceptance Scenarios**:

1. **Given** the drawer is open, **When** the visitor ticks values and presses APPLY, **Then** the
   drawer closes, the grid shows only products matching **every** applied group, and a chip appears
   for each.
2. **Given** the drawer is open, **When** the visitor ticks values and closes it without APPLY,
   **Then** nothing changes.
3. **Given** applied filters, **When** the visitor presses CLEAR, **Then** every filter is dropped
   and the listing returns to the category it started from.
4. **Given** a chip, **When** the visitor removes it, **Then** only that filter is dropped and the
   others remain applied.
5. **Given** a filtered listing, **When** the visitor copies the URL and opens it in a new session,
   **Then** they see the same products with the same chips and the drawer pre-ticked to match.
6. **Given** the toolbar's quick controls — shape, price, in-stock — **When** the visitor uses one,
   **Then** it applies immediately without an APPLY step.
7. **Given** a combination matching no products, **When** it is applied, **Then** the listing says
   so and offers a way back to a wider result.
8. **Given** a visitor at 390, **When** they open FILTERS, **Then** the drawer covers the screen,
   the page behind does not scroll, focus is trapped inside it, and Escape closes it.
9. **Given** filters are applied at 390, **When** the visitor looks at the trigger, **Then** it
   carries the count of what is applied, as drawn.
10. **Given** JavaScript is unavailable, **When** the visitor submits the drawer, **Then** it
    behaves as a form and the filtered listing is rendered by the server.

---

### User Story 5 - A Visitor Orders the Listing (Priority: P5)

A visitor presses SORT BY and picks Price Ascending. The grid reorders, a chip names the ordering,
and the URL carries it.

**Why this priority**: Small, self-contained, and genuinely useful once a listing runs past a
screen — but the least of the listing behaviours, and the only one whose absence leaves the page
merely less convenient rather than incomplete.

**Independent Test**: Open the sort menu, choose each option in turn, and confirm the grid order,
the chip and the URL agree each time and survive a reload.

**Acceptance Scenarios**:

1. **Given** the sort menu, **When** it opens, **Then** it offers exactly the drawn options and
   marks which is current.
2. **Given** an option is chosen, **When** the menu closes, **Then** the grid reorders, the URL
   records the ordering, and focus returns to the trigger.
3. **Given** a sorted listing, **When** filters are also applied, **Then** both hold together.
4. **Given** a keyboard user, **When** they reach the trigger, **Then** the menu opens, arrows move
   between options, Enter chooses, and Escape closes without changing anything.

---

### User Story 6 - A Visitor Chooses a Diamond and a Size (Priority: P6)

A customer opens an engagement ring. Beneath the description they find **Choose Your Diamond:** with
the stones the owner attached — each showing its specification and what it costs — and **Size:**
with the sizes available. They pick a stone and the price changes. Until they have made both
choices, ADD TO CART and BUY NOW refuse and say which choice is missing.

**Why this priority**: What turns a catalogue entry into a specific orderable piece. It sits last on
this page because the page is informative without it, and because its destination — the cart and the
seller handoff — belongs to the next spec. Everything before this point is deliverable without it.

**Independent Test**: Open a product with both option types; confirm the price responds to the
diamond; confirm both actions are refused until both choices are made and that the unmade one is
named; open a product with neither option type and confirm no selectors are shown and the actions
are immediately available.

**Acceptance Scenarios**:

1. **Given** a product with diamond options, **When** the customer selects a different stone,
   **Then** the displayed price updates to that stone's price.
2. **Given** a required choice not yet made, **When** the customer activates ADD TO CART or BUY NOW,
   **Then** the action is refused and the unmade choice is named in a message a screen reader
   announces.
3. **Given** a product with no diamond options and no sizes, **When** the customer views it,
   **Then** no selectors are shown and both actions are available immediately.
4. **Given** a diamond option the owner has marked unavailable, **When** the customer opens the
   selector, **Then** that stone is shown as unavailable and cannot be chosen.
5. **Given** an unavailable product, **When** the customer views it, **Then** both actions are
   disabled with the reason stated, and the reason is not conveyed by colour alone.
6. **Given** a quantity stepper at 1, **When** the customer presses minus, **Then** it does not go
   below 1; the plus control stops at any stock-tracked ceiling.
7. **Given** every required choice is made, **When** the customer activates either action, **Then**
   the product, the chosen stone, the chosen size and the quantity are handed to the cart seam
   defined in [FR-041](#the-seam-to-004).

---

### User Story 7 - The Shop Works However a Visitor Arrives (Priority: P7)

Someone arrives on a mid-range phone over a slow connection, or with JavaScript blocked, or at 200%
zoom, or using a keyboard and a screen reader, or with reduced motion requested. In every case they
can browse the catalogue, filter it, open a piece, and read everything about it.

**Why this priority**: These properties make the six stories above real rather than nominal, and can
only be measured once the pages exist. Ordering them last is sequencing, not judgement — the
constitution's budgets are non-negotiable and this is where they are proven for these routes.

**Independent Test**: Run the accessibility sweep over the listing, the open drawer, the product
page and the open full-screen gallery at three widths; load each route with JavaScript disabled, at
200% zoom and at 320px; measure largest contentful paint on the product page against the budget.

**Acceptance Scenarios**:

1. **Given** JavaScript is disabled, **When** the listing loads, **Then** the grid renders, links
   work, and filtering and sorting still work as form submissions.
2. **Given** JavaScript is disabled, **When** a product page loads, **Then** every photograph, the
   description and all accordion content are readable; only the full-screen gallery is unavailable.
3. **Given** a 320px viewport or 200% zoom, **When** any route loads, **Then** nothing causes
   horizontal page scroll.
4. **Given** a visitor who has requested reduced motion, **When** they open the drawer or page the
   gallery, **Then** no transition plays.
5. **Given** an automated accessibility sweep at 1920, 1024 and 390 over the listing, the open
   drawer, the product page and the open gallery, **When** it runs, **Then** it reports no
   violations.
6. **Given** a listing of any supported size, **When** it loads, **Then** the route stays within the
   JavaScript budget and photographs below the fold are not fetched before they are needed.

### Edge Cases

- **A name longer than one line.** The card clamps to one line and the drawn names already run to
  fifty-four characters. The full name must remain the link's accessible name.
- **A product with no photograph at all.** The card and the gallery must both remain working links
  to a readable page.
- **A filter combination matching nothing.** Nothing is drawn for this. It must be a designed state,
  not an empty grid.
- **A category with a single product**, which must not leave paging that pages to nothing.
- **A price range whose handles cross.** Min above max must be prevented or normalised, not sent to
  the server as an impossible query.
- **A filter value that no longer exists** — an owner deletes the Molten collection while it sits in
  someone's shared URL. The listing must ignore the unknown value and say what it ignored.
- **A stone taken while the page is open.** The customer chose it minutes ago; the owner has since
  marked it unavailable. This must be caught before the piece reaches the cart, not after.
- **An option removed from a product** the visitor has open. The selector must not offer a value the
  server will reject.
- **Non-Latin names and prices.** The site is already multilingual in the header. Names, attribute
  values and formatted prices must not break the card, the grid, the chips or the messenger message.
- **A stock-tracked product at quantity zero** must be visible in the listing and clearly unavailable
  on its page, not silently hidden — the owner still wants it seen.
- **Deep links to a draft** must return the branded 404 for the public and preview for the owner.
- **Very many filters applied at once**, whose chip row must wrap rather than overflow the gutter.

## Requirements _(mandatory)_

### Content and Data

- **FR-001**: Products, categories, collections, diamond options and sizes MUST be Payload
  collections. This retires the `src/mocks/` deviation recorded in 002 for these routes.
- **FR-002**: The store owner MUST be able to create, edit, publish, unpublish and delete a product
  without a code change or a deployment.
- **FR-003**: Descriptive product attributes MUST be owner-definable — label, type, whether
  required, allowed values — and MUST be presentational and filterable only. They MUST NOT be
  selectable and MUST NOT affect price.
- **FR-004**: Products MUST support multiple photographs in an owner-controlled order, each with
  owner-authored alternative text, the first being the one the listing shows.
- **FR-005**: A product MUST belong to exactly one category and to zero or more collections.
- **FR-006**: Every product MUST carry an availability mode — made-to-order or stock-tracked — and
  stock-tracked products MUST carry an owner-maintained quantity.
- **FR-007**: Diamond options MUST be attachable per product, each with its own specification text,
  its own price, its own availability, and optionally its own photograph.
- **FR-008**: Sizes MUST be definable per product, and a product MUST be able to have neither option
  type, either alone, or both.
- **FR-009**: Draft and unpublished products MUST NOT be reachable by the public, including by
  direct URL, while remaining previewable by the owner.
- **FR-010**: Prices MUST be stored as a minor-unit integer in one store currency and formatted for
  display at the boundary. No component may perform currency arithmetic.
- **FR-011**: Route-level loaders MUST be the only place that reads the catalogue. Components
  receive props — the rule established in 001/T088 and carried by 002/FR-003.

### Routes

- **FR-012**: The shop MUST expose one listing surface at `/all-jewelry` and one per category
  (`/rings`, `/bracelets`, `/earrings`, `/necklaces`), differing only in the category applied and the
  title block shown. These are the routes the home page has linked to since 002.
- **FR-013**: Each product MUST have its own route at `/products/[slug]`, with an owner-editable
  slug that is stable across renames.
- **FR-014**: Every listing and product route MUST supply its own title, description and canonical
  URL, and MUST render its meaningful content server-side.

### The Listing

- **FR-015**: The listing MUST present a title block — the category name and its supporting sentence
  — above the toolbar at every width.
- **FR-016**: The grid MUST be four columns at 1920, three at 1024 and two at 390, at the drawn card
  proportions, gaps and gutters.
- **FR-017**: The grid MUST reuse `ProductCard` unchanged. If it cannot, the card is wrong and the
  card is what gets fixed — the rule 002/FR-019 set.
- **FR-018**: The listing MUST go beyond the first set of results by EXTENDING rather than
  replacing — a count of what is shown against what there is, and one control that adds the next
  set — and how much is shown MUST be part of the URL so that a back button and a shared link both
  return to it. Nothing is drawn for this; see [Open Questions](#open-questions).
- **FR-019**: A listing matching no products MUST render a designed empty state naming the filters
  responsible and offering a way to widen them.

### Filtering

- **FR-020**: The complete filter state MUST live in the URL's query string, and the page MUST be
  renderable from that state alone by the server.
- **FR-021**: The drawer MUST offer the seven drawn groups in the drawn order and MUST be scrollable
  beneath a footer that stays visible.
- **FR-022**: Ticking values in the drawer MUST edit a draft. APPLY commits the draft and closes;
  CLEAR empties it; dismissing the drawer discards it.
- **FR-023**: The toolbar's own controls — shape, price, in-stock, sort — MUST commit immediately,
  because no APPLY is drawn beside them.
- **FR-024**: Values within one group MUST combine as OR; separate groups MUST combine as AND.
- **FR-025**: Each applied filter MUST appear as a removable chip beneath the toolbar, and removing
  one MUST drop only that filter.
- **FR-026**: The price filter MUST offer both the two-handle slider and the numeric boxes, kept in
  step with one another, and MUST NOT permit a minimum above the maximum.
- **FR-027**: Below `md` the drawer MUST cover the viewport, trap focus, prevent the page behind
  from scrolling, close on Escape, and restore focus to its trigger — matching the behaviour already
  built for the navigation menu in 002/FR-034.
- **FR-028**: Below `md` the FILTERS trigger MUST carry the count of applied filters, as drawn.
- **FR-029**: Filtering MUST work without JavaScript, as a form whose submission produces the same
  URL the interactive path produces.
- **FR-030**: A filter value present in the URL but absent from the catalogue MUST be ignored, and
  the listing MUST say that it was.

### Sorting

- **FR-031**: The sort menu MUST offer exactly the drawn options, mark the current one, and record
  the choice in the URL.
- **FR-032**: The menu MUST be operable by keyboard — open, arrow, choose, escape — and MUST return
  focus to its trigger. `Menu` and `MenuOption` from the kit are the components for this.

### The Product Page

- **FR-033**: The gallery MUST present a thumbnail rail with its own paging beside the main
  photograph at 1920 (`297:4568`) and beneath it at 1024 (`410:7302`), and selecting a thumbnail
  MUST change the main photograph. At 390 the design draws no rail at all (`410:7635`): the
  photograph is swiped, with dot indicators (`410:7637`) reporting position. Both arrangements MUST
  be operable by keyboard, and the dots MUST be controls, not decoration.
- **FR-034**: The main photograph MUST open full screen, with paging, a close control, Escape to
  close, focus trapped while open and focus restored on close.
- **FR-034a**: The full-screen photograph MUST be zoomable — shallow, enough to read a stone rather
  than to inspect pixels — with pinch on touch, and MUST be zoomable without a pointer. Node
  `308:6392` draws no zoom affordance and the viewer adds none: the owner asked for the two drawn
  controls and no third. The keyboard requirement is met by `+` and `-` instead, which is why it is
  written as "without a pointer" rather than "with a control". See [research.md](./research.md) R11.
- **FR-035**: The information column MUST present the category as an eyebrow, the name as the page's
  only first-level heading, the price, the description, the selectors, the actions and the drawn
  accordions, in that order.
- **FR-036**: Accordion content MUST come from the catalogue where it is per-product (details) and
  from a shared source where it is not (warranty, delivery). Neither may be hardcoded in a component.
- **FR-037**: _Complete the Collection_ MUST reuse `JewelryCarousel`, the band built for the home
  page, populated from the product's collection, and MUST be absent rather than empty when there is
  nothing to show.

### Options and Actions

- **FR-038**: Where a product offers an option type, the customer MUST choose a value before either
  action can be used; the refusal MUST name the unmade choice and MUST be announced, not merely
  coloured.
- **FR-039**: The displayed price MUST reflect the selected diamond, and that price MUST be the one
  handed onward.
- **FR-040**: An unavailable diamond MUST be shown as unavailable and MUST NOT be selectable; an
  unavailable product MUST disable both actions with the reason stated in text.

<a id="the-seam-to-004"></a>

- **FR-041**: ADD TO CART and BUY NOW MUST hand the product, the chosen diamond, the chosen size,
  the quantity and the resulting price to a single documented seam. This spec builds the controls,
  their validation and the seam; `004-requests-and-handoff` builds what is on the other side of it.
  The seam MUST be one module, so that wiring it is one file.

### Quality

- **FR-042**: Every new component MUST be a kit component with stories, or a composition of them.
  The design needs three primitives the kit does not have — a two-handle range slider, a modal
  drawer, and a full-screen image viewer — and each MUST enter the kit rather than the page.
  Changes to kit components MUST be recorded in
  [contracts/ui-kit.md](../001-design-system-foundation/contracts/ui-kit.md).
- **FR-043**: Every route MUST meet WCAG 2.2 AA at 1920, 1024 and 390 — including the open drawer
  and the open full-screen gallery — MUST NOT scroll horizontally at 320px or 200% zoom, and MUST
  stay within the route's JavaScript budget.
- **FR-044**: Product photography MUST be served through the framework's image pipeline with
  explicit dimensions, responsive sizes, and lazy loading below the fold; the product page's main
  photograph is its largest contentful paint element and MUST be loaded with that priority.
- **FR-045**: All user-facing strings on these routes MUST be translatable, as the header's language
  selector already promises.

### Key Entities

- **Product**: A piece of jewelry. Name, slug, price, description, photographs, category, zero or
  more collections, descriptive attribute values, availability mode and quantity, diamond options,
  sizes, and the per-product accordion content.
- **Category**: The five the drawer lists — all jewelry, rings, bracelets, earrings, necklaces. Name,
  slug, and the title-block sentence its listing shows.
- **Collection**: An owner-managed grouping — Deia, Marvel, Molten, Spartan. A product may sit in
  more than one. This is what _Complete the Collection_ reads.
- **Diamond option**: A stone attached to a product. Specification text, price, availability, and
  optionally a photograph. Selectable, and it moves the price.
- **Size**: A value a product is available in. Selectable, and it does not move the price.
- **Descriptive attribute**: An owner-defined label, type and allowed values. Presentational and
  filterable; never selectable.
- **Filter state**: The applied categories, colours, price bounds, sizes, collections, shapes,
  in-stock flag, ordering and position. Lives in the URL, not in a component.

## Success Criteria _(mandatory)_

- **SC-001**: The owner creates, publishes and unpublishes a product entirely from the admin area,
  and the storefront reflects each within one page load — no deployment, no developer.
- **SC-002**: The listing renders at 1920, 1024 and 390 matching the design's measured geometry —
  gutters, card proportions, gaps, toolbar heights and the collapsed mobile toolbar.
- **SC-003**: Every filter and sort combination is expressible as a URL that reproduces the same
  listing in a fresh session.
- **SC-004**: With JavaScript disabled, the listing renders, filtering and sorting work, and every
  product page is fully readable.
- **SC-005**: The automated accessibility sweep reports zero violations over the listing, the open
  drawer, the product page and the open full-screen gallery, at all three widths.
- **SC-006**: Every route is fully operable with a keyboard alone, including the drawer, the sort
  menu, the gallery and the full-screen viewer, with a visible focus indicator throughout.
- **SC-007**: No horizontal page scroll at a 320px viewport or at 200% zoom on any route.
- **SC-008**: Largest contentful paint on a product page stays within 2.5s at the 75th percentile on
  mid-range mobile, and each route's initial JavaScript stays under 200KB gzipped.
- **SC-009**: `ProductCard`, `FeatureStrip`, `JewelryCarousel`, `Footer`, `Header`, `Accordion`,
  `Checkbox`, `Chip`, `Menu`, `MenuOption`, `QuantityStepper`, `Field`, `TextInput`, `Switch` and
  `ScrollArea` are consumed as built. Every kit change this spec makes
  is recorded in the contract with a story. More than three such changes means a band is being built
  wrong.

  **Standing at nine, and assessed rather than counted.** The threshold is a smell detector for a
  band FIGHTING the kit — reshaping primitives because the composition is wrong. That is not what
  these are, and the test is what the alternative would have been:

  | Change | What it is | The alternative |
  | --- | --- | --- |
  | `Menu` closes on choose | A **defect repair**, not an API change. The menu button pattern requires it; focus was stranded in a dismissed panel. `LanguageSelector` had the same bug since 002 and is fixed by it | none — it was broken |
  | `Chip` gained `href` | Applying a convention the kit **already had**: `Button` and `IconButton` both take `href` for a control that navigates. Chip was the odd one out | a second pill in `active-filters`, duplicating Chip's styling — what FR-024 forbids |
  | `Switch` gained `as="span"` | The same: `Button` already documents `as="span"` for a drawing inside a link that owns the interaction | hand-drawing the toggle in the toolbar, duplicating Switch's visual |
  | `ProductCard` gained `ctaHref` | A **defect repair**. The action was a `<button>` with an `onClick` no caller passed, at `z-10` over the card's own anchor. It did nothing, and hover was hiding it | none — it was dead |
  | `ProductCard` gained `ctaVisibility`, `nameFit` | FR-017 doing exactly what it says: "the card is wrong and the card is what gets fixed" | a second card in the grid |
  | `Carousel` gained `controls: 'none'`, `activeIndex`/`onActiveIndexChange` | The **extraction of 002 finishing its job**. `Carousel` exists because two callers needed one scroll-snap track; the gallery is the third, and the only thing it needed that the primitive lacked was the ability to say and be told which item is showing | a second scroll-snap track in `product-gallery`, which is the exact duplicate `Carousel` was extracted to prevent |
  | `Carousel` gained `loop` | Owner-requested. `wrap` only ever governed the arrows — the swipe underneath still stopped at the ends, because native scrolling has them. Removing them is the track's own business, and the track is this component | edge copies hand-managed in `product-gallery`, reaching into a track it does not own |
  | `Carousel` gained `autoAdvance`, and `useAutoAdvance` joined the kit | Owner-requested for two bands. The timer is a hook rather than a `Carousel` internal because the gallery's pause has to cover its rail and dots, which are outside the carousel | two timers, and a gallery that moves the visitor off the thumbnail they just chose |
  | `JewelryCarousel`'s `cta` became optional | The band is reused for _Complete the Collection_ (FR-037) and the product page draws no button there (`242:2585`) | a second copy of the band, or a button the design does not have pointing at a listing nobody asked for |

  Two defects, two applications of an existing convention, two variants the drawing asks for, two
  reuses that needed the shared thing to admit a second caller, and two owner requests.

  Four of the nine are `Carousel`, which is worth saying plainly: that is not the component being
  fought, it is the component finally being finished. 002 extracted it from `ImageCarousel` with
  exactly the two callers it then had, and everything since — a position it can report and be told,
  arrows it can do without, a timer, and ends it can do without — is the third caller asking for
  what a shared scroll-snap track always needed. None of it changed how the first two behave. Every one is additive with the
  previous behaviour as its default, and the only pre-existing consumers of any changed component —
  `LanguageSelector`, and the home page's own carousel — were repaired or left untouched.

  `JewelryCarousel` is a section rather than a kit primitive, so it is listed here for honesty
  rather than because FR-042 counts it.

  **What to watch instead of the count**: `ProductCard` has taken three of the five, and two of its
  props (`ctaVisibility`, `nameFit`) both mean "this is the listing's card". Figma models those as
  variants of one component. Inconsistency 18 lists three more narrow-card differences left
  unbuilt; if any of them lands as a fourth independent axis, the card HAS been built wrong, and
  the fix at that point is one `variant` prop rather than a fourth.
- **SC-010**: Wiring the cart in `004` touches the seam module and no component built here.
- **SC-011**: The catalogue schema survives `004` and `005` without a destructive migration — the
  Phase 2 constraint the brief exists to protect.
- **SC-012**: Every existing gate stays green — naming, stories, styles, contrast, tokens, lint,
  types, unit tests, story tests, accessibility tests, build.

## Assumptions

- The kit from 001 is the vocabulary; new work here is composition plus the drawer, the toolbar and
  the gallery, which have no equivalent yet.
- The project's breakpoints — 1920, 1024, 390 — govern, not the frame widths drawn. Frames at 768 and
  375 are read as the tablet and mobile designs.
- Copy is the English drawn in the design, except the product description, which names a competitor
  and is treated as placeholder. See [Open Questions](#open-questions).
- The seven-silhouette shape row in the toolbar and the three-value DIAMOND SHAPE group in the drawer
  are the same filter. The catalogue's own shape values decide what is offered; the drawer's three are
  read as a partial drawing.
- Photographs come from the catalogue, not from committed exports. The exports committed in 002 stay
  where they are; this spec's images are uploads.
- Search is still out of scope, as it was in 002, though the header draws it.

## Open Questions

For the designer or the owner. None of them blocks starting; each has a stated default.

1. **What happens past twelve cards?** Nothing is drawn. Default: a "load more" control that extends
   the grid and records position in the URL. **Resolved at the owner's direction, twice.** Built
   first as numbered pages, then replaced with the default after the owner checked how comparable
   houses do it: `Showing 24 of 29 pieces` over a LOAD MORE control. `?page=N` survives and changes
   meaning — it counts how many sets are SHOWN rather than which one is, so `?page=3` contains
   `?page=1`.
2. **Is the sort chip "Best selling" a fifth ordering?** It is not in the menu. Default: the menu is
   authoritative and the chip is stale.
3. **Which price format is correct?** Three appear. Default: `$24,900` — the card format, which is
   the one drawn most.
4. **Seven shapes or three?** Default: whatever the catalogue holds, rendered from data.
5. **What does COLOR filter against?** No colour appears anywhere on the product page. Default: a
   descriptive attribute named "Colour", filterable and shown in the product details accordion.
6. **What is the empty state?** Not drawn. Default: the title block, the chips, a sentence, and a
   control that clears the filters.
7. **The product description names another brand.** Real copy needed.
8. **"Paragon" or "Polygon"?** The desktop and mobile frames disagree on the product's name.

## Out of Scope

- **The messenger handoff modal** (`590:13222`, `590:13774`, `590:13874`) and the cart it reports on.
  Drawn in this node, but it is the brief's User Story 4 and belongs to `004-requests-and-handoff`
  with the order record, the pre-filled message and the fallback for a device with no messenger.
  This spec builds the two buttons, their validation, and the seam at FR-041.
- **Customer accounts.** `003-customer-accounts` in the brief's decomposition; nothing on these
  pages requires a signed-in visitor.
- **Search**, which the header draws and which needs its own spec.
- **The admin request queue.**
- **Payments.** Out of scope for the whole MVP — the site takes no money.
