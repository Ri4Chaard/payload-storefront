# Feature Specification: Our Story — An Editable About Page and a Shared FAQ

**Feature Branch**: `006-our-story-faq`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "we should create About Us (our story) page.
[Figma design] . The page should
be fully customizable, all images and text should be able to fill from admin. The admin snould be
able to paste video instead of photo also. At the bottom of the page there are FAQ. We will also
have FAQ as separate page so we should make faq as separate tab in the admin panel."

**Source**: One Figma section — `220:699` ("Наша история Our Story") — holding the page at three
widths: `310:6495` (1920), `413:7655` (768), `413:7965` (390).

This spec fills two links that already exist in the site chrome and lead nowhere:

- [src/components/layout/header/header.tsx](../../src/components/layout/header/header.tsx) — the
  primary navigation has carried **About us → `/about`** since spec 001.
- [src/components/layout/footer/footer.tsx](../../src/components/layout/footer/footer.tsx) — the
  footer carries **Our Story → `/about`** under ABOUT and **FAQ → `/faq`** under CUSTOMER CARE.
- [src/mocks/home.ts](../../src/mocks/home.ts) — the home page's about band ends in a
  **"Discover our story" → `/about`** call to action.

Three entry points, one destination, and today that destination is a 404. This spec builds it.

It is also the first spec in which a **page's own composition** — not a product, not a listing —
comes out of Payload. Spec 002 shipped the home page reading `src/mocks/home.ts` for its hero and
about band, and named that as the last of the deviation it opened. This page is drawn with seven
photographs and roughly forty distinct strings, and Constitution I does not permit any of them to
live in a component.

## Design Inventory

### Frames in the section

| Frame            | Node       | Size     | Covers                                    |
| ---------------- | ---------- | -------- | ----------------------------------------- |
| Our Story        | `310:6495` | 1920×4519 | The page at desktop                       |
| our-story-tablet | `413:7655` | 768×3998  | The same page, one column at 768          |
| our-story-mobile | `413:7965` | 390×4267  | The same page at phone width              |

### Band-by-band status

| #  | Band                       | Desktop      | Tablet     | Mobile     | Status                                     |
| -- | -------------------------- | ------------ | ---------- | ---------- | ------------------------------------------ |
| —  | Contact banner + header    | `310:6496/7` | `411:8570` | `544:16131`| Built — `ContactBanner`, `Header`          |
| 1  | Page header (eyebrow + h1) | `310:6501`   | `413:7676` | `413:7981` | **New band**; `SectionHeading` is close    |
| 2  | Full-bleed opening media   | `310:6772`   | `413:7679` | `413:7984` | **New** — the first photo-or-video slot    |
| 3  | A closer look              | `205:1870`   | `413:7680` | `413:7985` | **New band** — copy, chips, figures, media |
| 3a | — subject chips            | `310:6470`   | `413:7683` | `413:7987` | Built — `Chip`                             |
| 3b | — figure triplet           | `310:6483`   | `413:7697` | `413:7996` | **New** — word over caption, ×3            |
| 4  | The Aurum Standard       | `312:6926`   | `413:7708` | `413:8007` | **New** — media banner with copy + CTA     |
| 5  | From diamond to jewel      | `312:6940`   | `413:7725` | `413:8024` | **New** — heading + three numbered steps   |
| 6  | Crafted to last            | `312:6967`   | `413:7749` | `413:8048` | Same band as #4, **no CTA**                |
| 7  | Every detail, answered     | `310:6776`   | `413:7754` | `413:8053` | **New band** — FAQ list beside copy + CTA  |
| 7a | — a question               | `310:6805`   | `413:7758` | `413:8057` | Built — `Accordion`                        |
| —  | Footer                     | `310:6550`   | `416:8850` | `411:8625` | Built — `Footer`                           |

Bands 4 and 6 are the same construction drawn twice: a full-bleed media plate with a text column
laid over it. They differ in which side the column sits on, whether an eyebrow is present, and
whether the band ends in a button. That is a variant set, not two components — Constitution II —
and correspondingly one block, not two (FR-048).

**The table's row order is the default arrangement, not the page's structure.** Each band is a block
the editor places, so the seven rows describe what ships, not what is possible.

### What each band actually contains

Reading the desktop frame top to bottom, every string and every picture an editor must own:

1. **Page header** — an eyebrow (`OUR STORY`) and the page's only `h1`, drawn centred over two
   lines (`IMMORTALIZING MEMORIES AND EMOTIONS IN EXTRAORDINARY, TIMELESS CREATIONS`).
2. **Opening media** — full width, 530 tall at desktop, 400 at tablet, 240 at mobile. Drawn as a
   photograph; the brief requires it to be able to be a video instead.
3. **A closer look** — a paragraph (`Exceptional diamonds begin with exceptional standards…`), six
   subject chips (`Lab-Grown Diamonds`, `Fine Jewelry`, `Exceptional Quality`, `Timeless Design`,
   `Craftsmanship`, `Certified Diamonds`), three figures each a word over a caption (`CERTIFIED` /
   `selected diamonds`, `EXCEPTIONAL` / `quality standards`, `TIMELESS` / `designed to last`), and
   a media panel to the right at desktop. Mobile drops two of the six chips and moves the media
   below the figures — a reflow, not a different content set.
4. **The Aurum Standard** — background media, eyebrow `THE AURUM STANDARD`, headline
   `SELECTED FOR BRILLIANCE. CRAFTED WITHOUT COMPROMISE.`, a paragraph, and a button reading
   `EXPLORE THE COLLECTION`. Text sits left; the plate's subject sits right.
5. **From diamond to jewel** — a centred heading and three steps. Each step is a media tile, an
   ordinal (`01`, `02`, `03`), a title (`SELECT`, `CRAFT`, `CREATE`) and a caption. Three across at
   desktop and tablet, stacked at mobile.
6. **Crafted to last** — background media, headline `CRAFTED TO LAST`, a paragraph. Text sits right
   at desktop, left at tablet and mobile. No button.
7. **Every detail, answered** — a heading, an intro paragraph, a button reading `CONTACT US`, and a
   column of accordion questions: seven drawn at desktop, four at tablet, three at mobile. One is
   drawn open, so the open state is part of the design.

**Seven media slots in total**: the opening plate, the closer-look panel, the Standard banner's
plate, three step tiles, and the Crafted-to-last plate. Each must accept a video in place of a
photograph.

### What is deliberately absent from the drawing

The drawing shows no empty states — no page with a band unfilled, no FAQ list with nothing in it,
no media slot left blank. It shows exactly seven questions at desktop and fewer at the narrower
widths, which is layout fill rather than a rule about how many exist. Both gaps are settled in
Requirements below rather than inferred from pixels.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A visitor reads the shop's story (Priority: P1)

Someone who has just seen a ring they like wants to know who is selling it. They follow **About us**
from the header, or **Discover our story** from the home page, and land on a page that opens with a
statement of what the shop is for, shows the work close up, explains how a stone becomes a piece,
and ends by answering the questions they were about to ask.

**Why this priority**: This is the feature. Three navigation entries have pointed at a missing page
since the site's first spec; every other story here exists to keep this one filled in.

**Independent Test**: Publish the page with the drawn content and visit `/about` at 1920, 768 and
390. All seven bands render in order, the page has exactly one `h1`, and every drawn string appears.
Delivers value on its own: the dead link is alive.

**Acceptance Scenarios**:

1. **Given** the story page is published with all bands filled, **When** a visitor follows
   **About us** from the header, **Then** the page renders every band in the drawn order and the
   header's About entry is marked as the current page.
2. **Given** the visitor is on a 390px-wide phone, **When** the page loads, **Then** each band
   reflows to its drawn mobile arrangement, the three steps stack, and no part of the page scrolls
   horizontally.
3. **Given** the visitor navigates by keyboard alone, **When** they tab through the page, **Then**
   every link, button and question receives a visible focus indicator in document order, and each
   question can be opened and closed with the keyboard.
4. **Given** a screen reader user reaches the page, **When** they list its headings, **Then** they
   hear one page title followed by band headings one level below it, with no skipped level.

---

### User Story 2 - The owner writes the page without a developer (Priority: P2)

The owner opens the admin, finds the story page in one place, and edits it: the headline, every
paragraph, the chips, the three figures, the three steps, both banner headlines and the CTA the
Standard banner points at. They also **rearrange the page itself** — dragging the "from diamond to
jewel" band above the Standard banner, dropping in a second banner, removing one they no longer
want. They preview the result, then publish. Nothing they changed required a deployment.

**Why this priority**: "Fully customizable, all images and text should be able to fill from admin"
is the explicit brief, and Constitution I makes it non-negotiable: a marketing request that needs a
code change to alter copy is a modelling defect. Without this, the page is a prettier mock.

**Independent Test**: Change one string in every band in the admin, reorder two bands, add a third
banner and remove it again, publish, reload `/about`, and see every change. Then confirm no string
on the rendered page is absent from the admin form.

**Acceptance Scenarios**:

1. **Given** an admin editing the story page, **When** they change the page headline and publish,
   **Then** the live page shows the new headline and the previous version remains restorable.
2. **Given** an admin adds a seventh subject chip, **When** they publish, **Then** the chip row
   grows and wraps rather than clipping or pushing the band's other content out of place.
3. **Given** an admin removes the Standard banner's button label and link, **When** they publish,
   **Then** the band renders without a button and the rest of the band is unchanged.
4. **Given** an admin drags the "from diamond to jewel" band above the Standard banner, **When**
   they publish, **Then** the live page renders the bands in the new order and every band is
   otherwise unchanged.
5. **Given** an admin adds a second banner band and fills it, **When** they publish, **Then** it
   renders as a banner in the position they placed it, with no code change and no new component.
6. **Given** an admin removes a band from the page, **When** they publish, **Then** it is absent and
   the bands above and below meet correctly.
7. **Given** an admin has added a band but not filled it, **When** the page renders, **Then** that
   band is absent rather than showing an empty frame.
8. **Given** an admin reorders the bands so that a banner now sits first, **When** the page renders,
   **Then** the page still has exactly one top-level heading and no heading level is skipped.
9. **Given** an admin edits the page, **When** they save without publishing, **Then** the live page
   is unchanged and the draft is previewable.

---

### User Story 3 - The owner uses a video where a photograph was drawn (Priority: P3)

A step in "From diamond to jewel" is better shown moving than still. The owner opens that step's
media slot, switches it from a photograph to a video, and picks the video from the shop's own media
library exactly as they would pick a photograph — uploading it there first if it is not already.
They add a still image for the slot to show before it plays, and publish. The tile keeps its drawn
shape and its place in the layout; only what fills it changes.

**Why this priority**: An explicit requirement in the brief, and it constrains the content model
rather than decorating it — a media slot that only holds an upload cannot be retrofitted to hold a
video without touching every band that uses it. It is P3 because the page is coherent and shippable
with photographs alone.

**Independent Test**: Switch each media slot on the page to a video in turn, publish, and confirm
the band renders the video in the same frame the photograph occupied, at all three widths.

**Acceptance Scenarios**:

1. **Given** a media slot set to video, **When** the page renders, **Then** the video fills the same
   frame the photograph would have, cropped the same way, with no layout shift as it loads.
2. **Given** an admin opening a media slot, **When** they choose video, **Then** they pick from the
   media library the same way they pick a photograph, and there is no field into which an external
   address could be pasted.
3. **Given** a video already used in one slot, **When** the admin sets a second slot to it,
   **Then** it is selected from the library rather than uploaded again.
4. **Given** an admin uploads a video that is over the size limit or in an unaccepted format,
   **When** they upload it, **Then** the upload is refused with a message naming the limit.
5. **Given** a media slot set to video and used as a band background, **When** the page loads,
   **Then** the video plays without sound and repeats, and the text laid over it stays legible.
6. **Given** a visitor whose system asks for reduced motion, **When** a background video would play,
   **Then** it does not play, its file is not downloaded, and the poster is shown instead.
7. **Given** a band whose media is a video sits below the fold, **When** the visitor never scrolls
   to it, **Then** its file is not downloaded and the page costs them nothing for it.
8. **Given** a media slot left empty, **When** the page renders, **Then** the band renders without a
   hole — the slot's frame collapses rather than reserving blank space.
9. **Given** an admin sets a slot to video without giving it a poster, **When** they attempt to
   publish, **Then** they are told which slot is at fault in the admin rather than discovering it
   on the live page.

---

### User Story 4 - The owner manages questions once, for every place they appear (Priority: P4)

The owner opens a **FAQ** tab in the admin — its own place, not a field buried inside the story
page — and writes questions and answers. They order them, unpublish one that is out of date, and
choose which of them the story page shows. When the standalone FAQ page arrives, it reads the same
questions with nothing to migrate and nothing to re-type.

**Why this priority**: The brief asks for this shape specifically ("we should make faq as separate
tab in the admin panel") and gives the reason (a separate FAQ page is coming). Modelling the
questions inside the story page would guarantee a second copy later — the duplication Constitution
II exists to prevent, applied to content instead of components.

**Independent Test**: Create, reorder, unpublish and delete questions in the FAQ tab and see each
change on `/about` after publishing. Confirm the questions are addressable independently of the
story page — the story page can be unpublished and the questions still exist.

**Acceptance Scenarios**:

1. **Given** an admin in the FAQ tab, **When** they add a question and answer and publish it,
   **Then** it becomes available for the story page to show.
2. **Given** several published questions, **When** the admin reorders them, **Then** the story page
   shows them in the new order without any further edit to the story page.
3. **Given** a question is unpublished, **When** the story page renders, **Then** that question is
   absent, and the questions around it close up.
4. **Given** an answer contains a link and a list, **When** a visitor opens that question, **Then**
   the link and the list render as written.
5. **Given** no questions are published at all, **When** the story page renders, **Then** the FAQ
   band is absent entirely rather than showing a heading over nothing.

---

### User Story 5 - The page is found and shared correctly (Priority: P5)

The page carries the metadata that decides how it appears in a search result and in a chat preview,
and the owner controls that metadata rather than a developer having chosen it.

**Why this priority**: Constitution V requires editor-controlled metadata and a canonical URL on
every page of this kind. It is last because it changes nothing a visitor on the page can see.

**Independent Test**: Set a meta title, description and social image in the admin, publish, and
inspect the served page and a link preview.

**Acceptance Scenarios**:

1. **Given** the admin has set page metadata, **When** the page is served, **Then** it emits that
   title, description, canonical URL and social image.
2. **Given** the admin has set no metadata, **When** the page is served, **Then** it falls back to
   the page's own headline and first paragraph rather than emitting nothing.
3. **Given** the admin publishes a change, **When** the next visitor arrives, **Then** they see the
   new content — a published change never leaves a stale page behind.

---

### Edge Cases

- **A band is only partly filled.** A banner with a headline but no background media, or media but
  no headline. The band must render what it has and hold its drawn proportions rather than
  collapsing to a strip of text or showing an empty plate.
- **Copy is much longer than drawn.** A translated headline that runs to four lines, a paragraph of
  double the drawn length, a chip whose label is thirty characters. Drawn heights are minima; bands
  grow instead of clipping, and the chip row wraps.
- **Copy is much shorter than drawn.** A one-word headline must not leave the banner's text column
  floating in an odd place.
- **More or fewer than three steps.** The drawing shows three; an owner may write two or five. The
  band must lay out what exists without leaving a gap where a fourth would be.
- **More or fewer than six chips**, and none at all — the chip row disappears rather than reserving
  its height.
- **A question with a very long answer**, and a question whose answer is empty. An empty answer is a
  question that cannot be usefully opened; the model must prevent it rather than render it.
- **The same question is chosen twice** for the story page. It appears once.
- **A video slot on a slow connection.** The band must not shift when the video finally arrives, and
  a poster or first frame must hold the space until it does.
- **A video and an image are both provided** for one slot. Exactly one renders, decided by the
  slot's stated kind, never by which one happens to be present.
- **A video slot with no poster.** The slot cannot hold its space or serve a reduced-motion visitor,
  so a poster is required rather than optional.
- **A video that is too large or in a format browsers will not play.** Refused at upload, naming the
  limit, rather than published and discovered by a visitor.
- **A video deleted from the media library while a slot still points at it.** The slot must fall
  back to its poster rather than render a broken frame.
- **A page composed in an order nobody drew** — a banner first, two media plates in a row, the FAQ
  band in the middle. Each must render correctly wherever it is placed, and the heading hierarchy
  must survive it.
- **A composition with no page-header block, or with two of them.** The first must still produce
  exactly one top-level heading; the second must not produce two.
- **A page with no blocks at all**, and a page with twenty. Neither is an error.
- **A block type is removed from the code while pages still use it.** The page must not fail to
  render because of content it no longer understands.
- **The story page has never been published.** `/about` must not serve a broken page; the three
  links that point at it are live in production today.
- **A visitor arrives at `/about` with the FAQ band's CTA pointing at a page that does not exist
  yet.** The CTA's destination is editor-controlled, so this is an editing mistake to make visible,
  not a crash.

## Requirements *(mandatory)*

### Functional Requirements

**The page and its route**

- **FR-001**: The site MUST serve a story page at `/about`, the destination the header, the footer
  and the home page's call to action already point at.
- **FR-002**: The page MUST render its blocks in the order the editor arranged them, between the
  existing contact banner and header above and the existing footer below. As shipped, that order is
  the drawn one: page header, opening media, "a closer look", the Standard banner, "from diamond to
  jewel", the "crafted to last" banner, the FAQ band (FR-052).
- **FR-003**: The page MUST render meaningful content server-side; it MUST NOT require client-side
  data fetching to show its copy or its images.
- **FR-004**: Every band MUST be omitted entirely when the content it needs is absent, and the
  page MUST remain visually coherent with any subset of bands present.
- **FR-005**: The page MUST render correctly at the three drawn widths and at every width between
  them, with no horizontal scrolling and no fixed-pixel container widths.
- **FR-006**: The page MUST carry exactly one top-level heading, and every band heading MUST sit one
  level beneath it with no skipped levels — **in every composition the editor can build**, not only
  in the drawn one. See FR-051.
- **FR-007**: The page MUST meet WCAG 2.2 Level AA, and MUST be fully operable by keyboard alone,
  including opening and closing every question.

**Editable content**

- **FR-008**: Every user-visible string on the page MUST be editable in the admin without a
  deployment. No copy drawn in the design may be hardcoded in a component.
- **FR-009**: The page-header block MUST expose an editable eyebrow and headline.
- **FR-010**: The "closer look" block MUST expose an editable paragraph, an editable list of
  subject chips of any length including none, an editable list of figures — each a headline word
  and a caption — and a media slot.
- **FR-011**: The banner block MUST expose an editable eyebrow, headline, paragraph, an optional
  call-to-action label and destination, a media slot, and the side the text column sits on. The
  Standard banner and "crafted to last" are two uses of it, not two blocks (FR-048).
- **FR-012**: The process-steps block MUST expose an editable heading and an editable, reorderable
  list of steps, each step being a media slot, a title and a caption. The ordinal shown on a step
  MUST follow the step's position rather than being typed by the editor.
- **FR-013**: The FAQ block MUST expose an editable heading, intro paragraph, an optional
  call-to-action label and destination, and the selection of questions it shows.
- **FR-014**: Reordering a repeatable list in the admin MUST change the rendered order, with the
  stored order being the displayed order.
- **FR-015**: The page's content MUST support drafts, versions and preview, so a change can be seen
  and reverted without a deployment.
- **FR-016**: Publishing a change MUST make it visible to the next visitor. A stale page after
  publish is a defect.
- **FR-017**: Reading the page's content MUST be public; changing it MUST be restricted to
  administrators, stated explicitly rather than inherited by omission.

**Media slots**

- **FR-018**: A media slot MUST be **one shared definition** used by every block that shows imagery
  — the media plate, the closer-look panel, the banner's plate, and each step. The drawn page uses
  seven of them; a composition with more blocks has more, and the definition does not change.
- **FR-019**: Every media slot MUST accept either a photograph or a video, chosen by the editor,
  and MUST render the chosen kind in the frame its block gives that slot.
- **FR-020**: A slot's kind MUST be explicit. When both a photograph and a video are present, the
  stated kind decides what renders.
- **FR-021**: A video MUST be supplied **only from the shop's own media library**, chosen the same
  way a photograph is chosen. There is no field anywhere in a media slot into which an address can
  be typed or pasted, and no video is ever served from a third party.
- **FR-021a**: The media library MUST accept video uploads. A video already uploaded MUST be
  reusable in a second slot without being uploaded again.
- **FR-021b**: An uploaded video MUST have a stated maximum file size and a stated set of accepted
  formats, both refused at the point of upload with a message naming the limit, rather than at
  render.
- **FR-022**: Every video slot MUST carry a **poster still image**. The poster is what holds the
  slot's space, what renders before the video is ready, and what a visitor sees when the video does
  not play.
- **FR-023**: A video used as a band background MUST play automatically without sound, repeat, and
  play inline on mobile. A video that is the subject of a band rather than its background MAY offer
  playback controls.
- **FR-024**: A video MUST NOT play, and its file MUST NOT be downloaded, for a visitor whose
  system requests reduced motion. The poster MUST be shown instead.
- **FR-024a**: A video's file MUST NOT begin downloading until the visitor has scrolled its slot
  into view, so that a video on a band they never reach costs them nothing.
- **FR-024b**: Every media slot MUST reserve its space before its content loads, so that no band
  shifts as the page loads.
- **FR-025**: Every photograph MUST carry alternative text, and a photograph that is purely
  decorative MUST be marked as such rather than described. A video MUST carry an accessible
  description of what it shows.
- **FR-026**: Photographs MUST be served in modern formats at sizes appropriate to the width they
  are displayed at.
- **FR-027**: An unusable video reference MUST be reported to the editor in the admin, naming the
  slot, rather than surfacing on the live page.

**Questions**

- **FR-028**: Questions and answers MUST live in their own admin section, separate from the story
  page, reachable as its own tab.
- **FR-029**: Each question MUST have a question, an answer supporting formatted text including
  links and lists, a published state, and a position.
- **FR-030**: A question MUST NOT be publishable with an empty question or an empty answer.
- **FR-031**: The set of questions is shared content: it MUST be readable by any page that needs it,
  and MUST NOT be owned by the story page.
- **FR-032**: The story page MUST show a subset of questions chosen by the editor, in an order the
  editor controls, and the same question chosen twice MUST appear once.
- **FR-033**: An unpublished or deleted question MUST disappear from the story page without any
  further edit to the story page.
- **FR-034**: The FAQ band MUST be absent when no question it would show is published.
- **FR-035**: Opening a question MUST NOT close another — any number may be open at once — and the
  band MUST expose each question's open or closed state to assistive technology.
- **FR-036**: Reading questions MUST be public; changing them MUST be restricted to administrators.
- **FR-037**: Questions MUST support drafts and versions on the same terms as the story page.
- **FR-038**: The questions' shape MUST anticipate a standalone FAQ page — grouping questions under
  a heading MUST be possible without a change to what has already been written.

**Metadata and delivery**

- **FR-039**: The page MUST emit an editor-controlled title, description and social image, falling
  back to its own headline, first paragraph and first photograph when the editor sets none.
- **FR-040**: The page MUST emit a canonical URL.
- **FR-041**: The page's caching and revalidation MUST be stated explicitly, and publishing either
  the page or a question it shows MUST invalidate it.
- **FR-042**: The page MUST stay within the site's performance budgets: initial JavaScript no more
  than 300KB gzipped for the route, and no more than 100KB gzipped above the measured framework
  baseline. Video MUST NOT be counted against a visitor's connection before the content they came
  for has rendered.
- **FR-043**: The page MUST reuse the existing header, contact banner, footer, button, chip,
  accordion, container and image primitives rather than introducing near-duplicates of them.
- **FR-044**: A component built for this page that gains a second consumer MUST live in the shared
  UI kit, and both banner bands MUST be one component with variants rather than two components.
- **FR-045**: All colour, spacing, typography, radius and motion values MUST reference the existing
  design tokens.

**Shape of the content model**

- **FR-046**: The story page's body MUST be an **ordered list of content blocks the editor
  composes**. The editor MUST be able to add a block, remove a block, and reorder blocks, and the
  rendered page MUST follow that order.
- **FR-047**: The available block types MUST cover every band the design draws: a page header, a
  full-bleed media plate, a "closer look" band, a banner band, a process-steps band, and an FAQ
  band. Adding a band to the page means picking a block in the admin, never writing a component.
- **FR-048**: The two banner bands MUST be **one block type with variants** — which side the text
  column sits on, whether an eyebrow shows, whether it ends in a call to action — not two block
  types. A block type that duplicates an existing one is rejected on the same terms a duplicated
  component is.
- **FR-049**: A block type MUST be usable **more than once** on the page wherever that is
  meaningful. An editor who wants three banners or a second media plate composes them; nothing
  caps a block type at one use except where FR-051 says otherwise.
- **FR-050**: Blocks MUST be defined as **shared definitions available to any page**, not scoped to
  the story page. The later FAQ page and blog compose the same blocks rather than redefining them.
- **FR-051**: Exactly one block on the page MUST own the page's top-level heading. Where more than
  one block could claim it, the first such block in the order owns it and the rest render one level
  down, so that reordering can never produce two top-level headings or none (FR-006).
- **FR-052**: The drawn arrangement MUST be the **shipped default composition**, so an untouched
  install renders the seven bands in the order Figma draws them.
- **FR-053**: An empty block list MUST render a coherent page — chrome, metadata and nothing
  between — rather than an error or a broken layout.
- **FR-054**: FR-014's within-list reordering — the chips, the figures, the steps, the chosen
  questions — is unchanged and operates inside a block, independently of the block order itself.
- **FR-055**: Every block MUST be verified in the admin by actually composing and previewing the
  page with it before it is considered done. A block that renders correctly but is unusable in the
  admin is a defect.

### Key Entities

- **Story page**: the `/about` page's content — a single record, not a list. Holds the page's
  metadata and, as its body, an **ordered list of blocks**. It does not hold the bands themselves;
  it holds which blocks are on it and in what order. Versioned and publishable.
- **Block**: one band of the page, as a shared, reusable definition — page header, media plate,
  closer look, banner, process steps, FAQ. A block is chosen and positioned by the editor, may
  appear more than once, and is available to any page rather than owned by this one.
- **Media slot**: a reusable content shape used by every block that shows imagery. States its kind
  — photograph or video — and holds whichever the kind names, plus a poster still image when it is a
  video, and the accessible description. Both kinds come from the shop's own media library. One
  definition reused, not one field group per block.
- **Figure**: a headline word and a caption, used three times in "a closer look".
- **Subject chip**: a short label. An ordered list of them.
- **Step**: a media slot, a title and a caption. An ordered list of them; the displayed ordinal is
  its position.
- **Banner**: one block type with variants — an eyebrow, a headline, a paragraph, an optional call
  to action, a media slot, and which side the text sits on. The Standard banner and Crafted to last
  are two uses of it, and a third is composition rather than code.
- **Question**: a question, a formatted answer, a published state and a position. Owned by neither
  page; related to the story page by the story page's selection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All three existing links to `/about` — header, footer, home page — resolve to a
  rendered page. Zero dead links remain among them.
- **SC-002**: 100% of the strings drawn in the Figma section are editable in the admin. An audit
  comparing the rendered page against the admin form finds no string that exists only in code.
- **SC-003**: An owner who has never seen the page before can change the page headline, one
  paragraph, one photograph and one question, and publish all four, in under 10 minutes without
  assistance.
- **SC-004**: Every media slot on the page can be switched between a photograph and a video — and
  back — without a deployment, and the band's layout is unchanged in either state at all three
  widths.
- **SC-004a**: A band whose media is a video costs a visitor who never scrolls to it zero additional
  bytes, measured against the same page with that slot set to a photograph.
- **SC-005**: The page passes an automated accessibility scan with zero violations at Level AA, at
  all three widths, with a question both open and closed.
- **SC-006**: Largest Contentful Paint is at or under 2.5 seconds and Cumulative Layout Shift at or
  under 0.1 on a mobile connection, measured with every media slot filled and at least one of them
  a video.
- **SC-007**: The route's initial JavaScript is at or under 300KB gzipped and at or under 100KB
  gzipped above the measured framework baseline.
- **SC-008**: A published change to the page or to a shown question is visible to the next visitor
  within one page load; no stale content is served after publish.
- **SC-009**: A question written once appears on the story page with no second copy of its text
  anywhere in the content model, verified by there being exactly one editable place its wording
  exists.
- **SC-010**: The page renders correctly with every band filled, with a single band filled, and with
  no band at all — three states, none of which produces a broken or empty-framed layout.
- **SC-011**: An editor can reorder the page's bands, add a second use of any repeatable block, and
  remove a band, entirely in the admin. Producing a page arrangement the design never drew requires
  zero code changes.
- **SC-012**: Every block type renders correctly in first, middle and last position, and the page
  keeps exactly one top-level heading with no skipped levels in every one of those arrangements.
- **SC-013**: The feature introduces zero new Constitution I exceptions: the page is assembled from
  blocks, and no band exists as a bespoke page component.

## Assumptions

- **The route is `/about`.** The design is titled "Our Story" and the header says "About us"; the
  code already resolves both to `/about`, so that is the destination rather than a new `/our-story`.
- **One story page, not many.** Nothing in the brief or the design suggests a second page of this
  shape, so the page is a single record rather than an entry in a list of pages.
- **The drawn copy is the shipped default.** An untouched install renders what Figma shows, so the
  page is never blank before an owner has edited it, and the drawn strings are content an editor can
  change rather than a developer's placeholder.
- **The FAQ band's call to action goes to contact.** The drawn button reads `CONTACT US`, matching
  the footer's existing Contact us entry. Its destination is editor-controlled regardless.
- **The Standard banner's call to action goes to the catalogue.** The drawn button reads
  `EXPLORE THE COLLECTION`; `/all-jewelry` exists and is the obvious default. Editor-controlled
  regardless.
- **The number of questions shown on the story page is the editor's choice.** Seven at desktop, four
  at tablet and three at mobile in the drawing is layout fill; the band shows what the editor chose
  at every width rather than hiding questions on small screens.
- **Questions are plain question-and-answer pairs, not per-product.** The product page's own
  accordions — product details, warranty, delivery — are separate content already modelled in Shop
  settings and are untouched here.
- **Videos have no sound to lose.** Every media slot in this design is imagery; a video in one of
  them is a moving photograph, so muted autoplay is the expected behaviour rather than a
  compromise.
- **The existing `Accordion`, `Chip`, `Button`, `Container`, `Header` and `Footer` are fit for
  purpose** and are extended with variants where the design differs, not reimplemented.
- **The existing `media` library holds photographs only today.** Accepting video uploads is a change
  to how media is modelled. Video is chosen the way a photograph is chosen, from the same library,
  which is why a slot needs no second selection mechanism.
- **No transcoding.** An uploaded video is served as the owner uploaded it, so the size and format
  limits of FR-021b are what keeps a 200MB master off the page. If that turns out to be too blunt,
  it is a later change, not a hidden pipeline.
- **Nothing is embedded from a third party.** No YouTube, no Vimeo, no external player. This keeps
  the page's JavaScript inside the budget, keeps consent-gating out of the picture, and makes
  muted-autoplay background video and the reduced-motion rule straightforwardly satisfiable.
- **The owner composes the page.** The bands are blocks they arrange, and the drawn order is a
  starting arrangement rather than a fixed structure. This is what "fully customizable" is taken to
  mean, and it is what Constitution I requires.
- **One story page, composed of shared blocks — not a general `pages` collection.** The blocks are
  defined so a later FAQ page or blog composes the same ones, but this feature ships one page.
- **Traffic is modest.** This is a marketing page, not the catalogue; it needs to be fast and
  correct rather than to scale to a spike.

## Out of Scope

- **The standalone `/faq` page.** This feature delivers the shared questions and the story page's
  FAQ band only. The questions are modelled so that page reads them with nothing to migrate and
  nothing to re-type (FR-031, FR-038), but the page itself is a later spec — the footer's `/faq`
  link stays dead until then, as it is today.
- **A general `pages` collection.** The story page's body is composed of blocks (FR-046), and those
  blocks are defined for any page to use (FR-050), but this feature ships **one** page. Letting an
  editor create arbitrary new pages, with slugs and routing of their own, is a later change that
  these blocks are the groundwork for.
- **Embedded video from YouTube, Vimeo or any external host.** Video comes from the shop's own
  media library only (FR-021).
- **The blog.** The footer's ABOUT column also carries "Our Blog"; it stays a dead link here.
- **Contact and Shipping & Returns pages.** Also linked from the footer, also unbuilt, also not this
  feature.
- **Translations.** The language selector in the header is unchanged; this page ships in one
  language and the model does not attempt a translation layer.
- **Search over the questions.** The drawing shows a list, not a search field.
- **Per-product FAQs.** Questions here are about the shop, not about a piece.
- **Reworking the home page's hero and about band onto this content model.** They still read
  `src/mocks/home.ts`; closing that deviation is its own change.
- **Video transcoding, thumbnails generated from video, or adaptive streaming.** FR-022's poster is
  an image the editor supplies, not a frame the system extracts.
