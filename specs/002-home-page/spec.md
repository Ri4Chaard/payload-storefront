# Feature Specification: Home Page

**Feature Branch**: `002-home-page`

**Created**: 2026-08-27

**Status**: Draft

**Input**: User description: "Ok, I think we are ready build our home page:
[Figma design]"

**Source**: Figma node `255:3353`, which holds five frames — the page at 1920, 1024 and 390, plus
two navigation overlays. This spec covers the three page frames. It is the first spec that composes
the kit built in [001-design-system-foundation](../001-design-system-foundation/spec.md) into a real
screen, and the first that needs content.

## Clarifications

### Session 2026-08-27

- **Q: Is the jewelry row a static four, or a carousel?** → A carousel. The drawing parks a hidden
  "scroll right" control at `x=1650` on the desktop frame; that control is real and the row holds
  more than the four pieces drawn.
- **Q: Where do the photographs come from?** → Export them from Figma. Placeholders only where an
  export is unavailable.
- **Q: Extend spec 001, or open a new one?** → New. Spec 001's T079 builds a *placeholder* home page
  from kit primitives to prove the kit composes. This is the marketing home page, it needs content,
  and it forces changes to the kit — different scope, different spec.

## Design Inventory

Reading the three frames band by band, roughly half of what is drawn already exists:

| Band                | Desktop `1920` | Tablet `1024` | Mobile `390` | Status                              |
| ------------------- | -------------- | ------------- | ------------ | ----------------------------------- |
| Contact banner      | `196:869`      | `440:12206`   | hidden       | Built — `ContactBanner`             |
| Header              | `196:813`      | `440:12469`   | `440:13435`  | Built — `Header`                    |
| **Hero**            | `138:309`      | `440:12503`   | `440:13458`  | **New**                             |
| **Shop by category**| `144:835`      | `440:12512`   | `440:13487`  | **New section**, card needs changes |
| **All jewelry**     | `144:839`      | `440:12540`   | `440:13525`  | **New section**, card reusable      |
| **About Aurum**   | `158:402`      | `440:12764`   | `440:13678`  | **New**                             |
| Service promises    | `355:7806`     | `440:12805`   | `440:13687`  | Built — `FeatureStrip`              |
| Footer              | `196:602`      | `440:13064`   | `440:14328`  | Built — `Footer`                    |

The two remaining frames in the node — `Menu планшет` (`440:13282`) and `Menu мобильный`
(`440:14517`) — are the designed replacement for the deliberately-plain disclosure panel built in
001/T074. They are shell work, not home-page work, and are **out of scope here**. See
[Out of Scope](#out-of-scope).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A Visitor Lands and Learns What Aurum Sells (Priority: P1)

Someone arrives at the root URL from a search result or an advert. Before scrolling, they see a
photograph of the jewelry, a headline naming what the shop sells, a sentence explaining the
proposition, and one way in. Scrolling further, they find who the company is and why to trust it.
They can leave for a collection page from either place.

**Why this priority**: This is the whole point of a home page — the first screen and the brand
statement. Delivered alone it is already a publishable page: hero, about, the existing service
promises, header and footer, in the real shell with real metadata. Neither of the two browsing
stories can be reviewed in place until the page around them exists.

**Independent Test**: Load `/` at 1920, 1024 and 390. Confirm the headline, the supporting sentence
and the call to action are real text over the photograph — selectable, translatable, and read aloud
in order by a screen reader — that the about band renders its heading, body and route onward, and
that the page carries a title and description of its own.

**Acceptance Scenarios**:

1. **Given** a visitor at 1920, **When** the page loads, **Then** the hero fills the width with the
   photograph, and the headline, sentence and "Shop now" control sit centred over its lower third.
2. **Given** a visitor at 390, **When** the page loads, **Then** the same three elements appear at
   the mobile type sizes with the photograph cropped to the taller frame, and no element overflows
   the viewport.
3. **Given** a screen reader user, **When** they list the headings, **Then** the hero headline is
   the page's only `h1` and each band below announces its own heading beneath it.
4. **Given** a visitor who cannot see the photograph, **When** it fails to load, **Then** the
   headline and sentence remain legible against the fallback surface.
5. **Given** the about band, **When** a visitor activates its call to action, **Then** they are
   routed to the story page.

---

### User Story 2 - A Visitor Browses by Category (Priority: P2)

A visitor who knows they want earrings rather than a necklace scans a band of four collection tiles
— rings, bracelets, earrings, necklaces — each a photograph carrying the collection name and a way
in. They pick one and land on that collection.

**Why this priority**: Category entry is the primary navigation path into the catalogue for someone
who has not decided on a piece, and it is the more valuable of the two browsing bands because it
does not depend on which products happen to be featured. It sits behind US1 only because it needs a
page to sit in.

**Independent Test**: Load `/` at all three widths and confirm four tiles render in the drawn
arrangement — four across, then two-by-two, then two-by-two — that each tile is exactly one link
whose accessible name is the collection, and that a keyboard reaches all four in reading order.

**Acceptance Scenarios**:

1. **Given** a visitor at 1920, **When** the category band renders, **Then** four tiles sit in one
   row at the drawn proportions.
2. **Given** a visitor at 1024, **When** the band renders, **Then** the four tiles sit two-by-two in
   the drawn **landscape** proportion, which is wider than tall.
3. **Given** a visitor at 390, **When** the band renders, **Then** the tiles sit two-by-two at the
   compact type size with the call to action spanning the tile's width.
4. **Given** a screen reader user, **When** they list the links, **Then** each tile contributes one
   link named for its collection — not two, and not a link whose name repeats the photograph.
5. **Given** a keyboard user, **When** they tab into the band, **Then** each tile shows a visible
   focus indicator and its call to action reveals the same way it does on hover.

---

### User Story 3 - A Visitor Browses Featured Pieces (Priority: P3)

A visitor scans a row of actual jewelry — photograph, name, price — and can move through more pieces
than fit on screen. They open one, or follow the row's own route to the full catalogue.

**Why this priority**: The most catalogue-dependent band, and the one whose value is smallest before
real products exist. It also carries the most behaviour — paging, overflow, and a reveal that has to
work on a touch screen — so it benefits from landing after the simpler bands have settled the
section conventions.

**Independent Test**: Load `/` at all three widths, confirm the row shows the drawn number of cards,
page it forwards and back with the control and with the keyboard, and confirm every card remains
reachable and openable when the pointer cannot hover.

**Acceptance Scenarios**:

1. **Given** a visitor at 1920, **When** the row renders, **Then** four cards fill the content width
   and a control to advance is present whenever pieces remain beyond the edge.
2. **Given** a visitor at 1024 or 390, **When** the row renders, **Then** the cards overflow the
   frame and the row scrolls sideways.
3. **Given** a visitor at the last page, **When** they advance again, **Then** the row behaves
   predictably at the boundary rather than scrolling to nothing.
4. **Given** a keyboard user, **When** they reach the row, **Then** the scrolling region itself is
   focusable and operable with the arrow keys.
5. **Given** a touch device with no hover, **When** the row renders, **Then** the paging control and
   each card's action are visible without a hover that can never occur.
6. **Given** a visitor, **When** they activate the band's own call to action, **Then** they are
   routed to the full catalogue.

---

### User Story 4 - The Page Works However a Visitor Arrives (Priority: P4)

Someone arrives on a mid-range phone over a slow connection, or with JavaScript blocked, or at 200%
zoom, or using a keyboard and a screen reader, or with reduced motion requested. In every case they
get a usable page rather than a broken one.

**Why this priority**: These are the properties that make the previous three stories real rather
than nominal, and they can only be measured once the bands exist. Ordering them last is a sequencing
decision, not a statement about their importance — the constitution's budgets are non-negotiable and
this story is where they are proven for this route.

**Independent Test**: Run the accessibility sweep at three widths, load the page with JavaScript
disabled, at 200% zoom, and at a 320px viewport, and measure the largest contentful paint against
the budget.

**Acceptance Scenarios**:

1. **Given** JavaScript is disabled, **When** the page loads, **Then** every band renders its
   content and every link works; only the paging of the jewelry row degrades, to a plain scroller.
2. **Given** a 320px viewport, **When** the page loads, **Then** nothing causes horizontal page
   scroll.
3. **Given** 200% browser zoom, **When** the page loads, **Then** all content remains reachable
   without horizontal page scroll.
4. **Given** a visitor who has requested reduced motion, **When** they interact with the page,
   **Then** no transition or scroll animation plays.
5. **Given** an automated accessibility sweep at 1920, 1024 and 390, **When** it runs, **Then** it
   reports no violations.

### Edge Cases

- **A pale photograph behind white text.** The hero headline and the category tile names are white
  over a photograph, with no scrim drawn. The supplied photographs are near-black velvet and read
  comfortably; a lighter replacement would be a contrast failure that no automated check can catch,
  because contrast cannot be measured against an image.
- **A product name longer than one line.** The drawing truncates to a single line. The names already
  supplied run to fifty-four characters and real catalogue names run longer.
- **Fewer products than fill a row.** Three products at 1920 must not leave a paging control that
  pages to nothing.
- **A missing photograph.** Every band except the service promises is photograph-led. Each must
  remain legible when an image fails.
- **A category with no photograph at all.** The tile must still be a working link to the collection.
- **Text at a length the drawing does not show.** Every band is drawn with one exact string. Bands
  must grow rather than clip — this is the same failure already avoided in `FeatureCard`, where the
  drawn height became a minimum rather than a fixed value.

## Requirements *(mandatory)*

### Content and Data

- **FR-001**: The page MUST render its content from a single route-level source, so that replacing
  that source with Payload is one file. This follows the rule established in 001/T088: only
  route-level loaders may read from `src/mocks/`, never components.
- **FR-002**: Every band MUST receive its content as data — headings, body copy, labels, links,
  photographs and prices — with no user-facing string hardcoded inside a section component.
- **FR-003**: Section components MUST NOT reach for the content source themselves. They receive
  props, which is what makes them reviewable in Storybook and swappable in 003.
- **FR-004**: Prices MUST be supplied already formatted for display. Currency arithmetic and
  rounding are a commerce concern and belong nowhere near a presentation component.

### The Hero

- **FR-005**: The hero MUST present a headline, a supporting sentence and one call to action over a
  full-bleed photograph, bottom-aligned, at the drawn heights for each breakpoint.
- **FR-006**: The headline MUST be the page's only first-level heading and MUST be real text, not
  part of the photograph.
- **FR-007**: The hero photograph MUST be treated as the page's largest contentful paint element and
  loaded with that priority.
- **FR-008**: The hero MUST guarantee its text's contrast independently of which photograph is
  supplied, and MUST allow that guarantee to be waived for a photograph known to be dark.

### Shop by Category

- **FR-009**: The band MUST present a heading and four collection tiles at every breakpoint.
- **FR-010**: Tile proportions MUST follow the design: portrait at 1920, **landscape** at 1024,
  portrait again at 390. The existing `CategoryCard` is fixed to a single portrait ratio, so the
  proportion MUST become the caller's decision rather than the card's.
- **FR-011**: At 390 the tile MUST use the compact type sizes drawn and its call to action MUST span
  the tile's width; at 1024 and above it MUST match the desktop treatment exactly.
- **FR-012**: Each tile MUST expose exactly one link, named for its collection.
- **FR-013**: Changes to `CategoryCard` MUST be recorded in
  [contracts/ui-kit.md](../001-design-system-foundation/contracts/ui-kit.md) and covered by stories,
  because it is a kit component and the kit is a contract.

### All Jewelry

- **FR-014**: The band MUST present a heading, a row of product cards, and a call to action routing
  to the full catalogue.
- **FR-015**: The row MUST be a carousel: it holds more pieces than are visible and offers a way to
  reach them.
- **FR-016**: At 1920 the row MUST show four cards across the content width; at 1024 and 390 the
  cards MUST keep their drawn widths and the row MUST scroll sideways.
- **FR-017**: Paging controls MUST be present only when there is somewhere to page to, and MUST
  behave predictably at both boundaries.
- **FR-018**: The row MUST be operable by keyboard — the scrolling region focusable, the controls
  reachable — and by touch, where no hover exists to reveal anything.
- **FR-019**: The row MUST reuse `ProductCard` unchanged. If it cannot, the card is wrong and the
  card is what gets fixed.

### About Aurum

- **FR-020**: The band MUST present a photograph beside a heading, body copy and a call to action —
  side by side at 1920 and 1024, stacked at 390.
- **FR-021**: The heading MUST carry the drawn two-tone treatment without splitting the accessible
  name into fragments.

### Photography

- **FR-022**: Every photograph MUST be exported from the design, committed to the repository, and
  served through the framework's image pipeline with explicit dimensions and responsive sizes.
- **FR-023**: Committed photographs MUST be converted to a modern format and resized to the largest
  size actually rendered. The raw exports are 2–3MB apiece and MUST NOT be committed as they are.
- **FR-024**: Product photographs supplied with transparency MUST be composited over the surface
  they are drawn on before conversion, not flattened onto black.
- **FR-025**: Photographs that carry meaning MUST have alternative text; photographs that repeat
  adjacent text MUST be marked decorative rather than given a second copy of it.

### The Page

- **FR-026**: The page MUST render inside the existing shell, with the bands in the drawn order and
  a heading hierarchy that descends without skipping.
- **FR-027**: The page MUST supply its own title and description.
- **FR-028**: Every band MUST be a landmark or a labelled region as its content warrants, so the
  page can be navigated by structure rather than by scrolling.
- **FR-029**: The page MUST render meaningful content server-side. Client-side interactivity is
  limited to the carousel's paging and the reveals already built into the cards.
- **FR-030**: The page MUST meet WCAG 2.2 AA at 1920, 1024 and 390, MUST NOT scroll horizontally at
  320px or 200% zoom, and MUST stay within the route's JavaScript budget.

### Key Entities

- **Category**: A collection a visitor can browse. Name, route, photograph, and the label on its
  call to action. Four exist: rings, bracelets, earrings, necklaces.
- **Product**: A piece of jewelry as it appears in a listing. Name, display price, route, and one or
  more photographs. Everything else a product has — stone, metal, size, stock — belongs to the
  catalogue spec, not here.
- **Page content**: The strings and photographs of the hero and about bands. Modelled as data so the
  swap to Payload is a source change rather than a rewrite.

## Success Criteria *(mandatory)*

- **SC-001**: The page renders every drawn band at 1920, 1024 and 390, matching the design's
  measured geometry — section padding, band heights, tile proportions and gaps.
- **SC-002**: The automated accessibility sweep reports zero violations at all three widths.
- **SC-003**: The page is fully operable with a keyboard alone, including paging the carousel, and
  every focusable element shows a visible indicator.
- **SC-004**: With JavaScript disabled, every band renders and every link works.
- **SC-005**: No horizontal page scroll at a 320px viewport or at 200% zoom.
- **SC-006**: Largest contentful paint stays within 2.5s at the 75th percentile on mid-range mobile,
  and the route's initial JavaScript stays under 200KB gzipped.
- **SC-007**: Total committed photography for this page is under 1.5MB, against 16MB of raw export.
- **SC-008**: Replacing the mock content source with a Payload-backed one requires changing one file
  per route and no component.
- **SC-009**: This spec touches the kit exactly twice — `CategoryCard` gains the drawn responsive
  proportion and compact frame, and the scroll-snap mechanism inside `ImageCarousel` is extracted so
  the jewelry row reuses it rather than copying it. Every other primitive is consumed as built. A
  third kit change means a band is being built wrong.
- **SC-010**: Every existing gate stays green — naming, stories, styles, contrast, tokens, lint,
  types, unit tests, story tests, accessibility tests, build.

## Assumptions

- The kit from spec 001 is the vocabulary. New work in this spec is composition, not primitives,
  with the single recorded exception of `CategoryCard`'s proportion.
- Content is mocked. See the deviation below — this is a staged decision, not a rejection of
  Principle I.
- Routes referenced by the calls to action (`/rings`, `/all-jewelry`, `/about`, …) do not exist yet.
  They are written as the real paths and will resolve when those specs land; until then they lead to
  the branded 404 built in 001/T078.
- Copy is the English drawn in the design. The desktop product card's action is drawn in Russian
  ("ВЫБРАТЬ РАЗМЕР") while every other frame is English; this is read as an oversight in the
  drawing, and the English "Select size" is used. Flagged for the designer.
- The photographs exported from Figma are the real brand photography, not comps.
- Internationalisation is not in this spec. The header already carries a language selector; wiring
  it is a later concern.

## Deviation from Principle I, Recorded

The constitution requires that all user-facing content come from Payload collections or globals, and
that pages be assembled from Payload Blocks. This spec does neither. It renders from `src/mocks/`.

This is the staging decided in spec 001, where T088 established the mocks directory precisely so
this page could be built before the content model existed, with the swap costing one file per route.
Modelling `Products`, `Categories` and a home page global here would mean designing the catalogue
schema — variants, stones, metals, pricing, inventory — to render four tiles and a row of four
cards, which inverts the order of the work and would almost certainly produce the wrong schema.

The deviation is bounded by FR-001 through FR-004 and measured by SC-008. It ends when the
catalogue spec lands.

## Out of Scope

- **The navigation overlays** at `440:13282` and `440:14517`. They are drawn in this node but they
  replace shell navigation, apply to every page, and belong with the shell.
- **The collection, product and about pages** the calls to action route to.
- **Payload collections** for products and categories — see the deviation above.
- **PhotoSwipe fullscreen zoom**, deferred to the product detail page where it belongs.
- **Search**, which the header draws but which needs a catalogue to search.
