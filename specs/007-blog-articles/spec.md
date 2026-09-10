# Feature Specification: Our Blog — An Article Collection, an Index, and the Article Page

**Feature Branch**: `007-blog-articles`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "We need to create blogs and blog page, here is figma:
[Figma design]"

**Source**: One Figma section — `312:7335` ("Наш блог Our Blog") — holding two pages at three widths
each: the index (`312:6976`, `415:7900`, `415:8018`) and an article (`312:8140`, `418:8580`,
`418:8881`).

This spec fills the last dead link in the site chrome:

- [src/components/layout/footer/footer.tsx:90](../../src/components/layout/footer/footer.tsx#L90) —
  the footer has carried **Our Blog → `/blog`** under ABOUT since spec 001. It is a 404 today, and
  it is the only one left: spec 006 closed `/about`, and `/faq` is the other half of that spec.

It is also the **second** feature whose page composition comes out of Payload, and the first whose
content is a *list* of such pages. Spec 006 modelled one page as a global because nothing suggested
a second of its shape. A blog is the opposite case by definition — it is a collection of documents
that share a shape, each at its own address, each with its own metadata. What 006 built as
foundations (the block registry, `mediaSlot`, `RichText`, `slugField`, `seoField`) is the vocabulary
this spec assembles rather than re-invents.

## Design Inventory

### Frames in the section

| Frame                | Node       | Size      | Covers                                  |
| -------------------- | ---------- | --------- | --------------------------------------- |
| Наш блог Our Blog    | `312:6976` | 1920×2352 | The index at desktop                    |
| tablet-blog          | `415:7900` | 768×2574  | The index, two columns, at 768          |
| mobile-blog          | `415:8018` | 390×2387  | The index, one column, at 390           |
| Наш блог → Статья    | `312:8140` | 1920×2618 | An article at desktop                   |
| tablet-article-page  | `418:8580` | 768×2894  | The same article at 768                 |
| mobile-article-page  | `418:8881` | 390×3282  | The same article at 390                 |

### Band-by-band status — the index

| # | Band                    | Desktop      | Tablet     | Mobile      | Status                                   |
| - | ----------------------- | ------------ | ---------- | ----------- | ---------------------------------------- |
| — | Contact banner + header | `312:6977/8` | `416:8817` | `544:16133` | Built — `ContactBanner`, `Header`        |
| 1 | Page header             | `312:6979`   | `415:7918` | `415:8024`  | Built — the `page-header` block (006)    |
| 2 | Category tab strip      | `312:7365`   | `415:7921` | `415:8027`  | **New** — five tabs, one active          |
| 3 | Article mosaic          | `312:7367`   | `415:7933` | `415:8039`  | **New** — the card, and the grid rhythm  |
| 4 | Load more               | `312:7485`   | `415:7981` | `415:8067`  | Built — `LoadMore` (003)                 |
| — | Footer                  | `312:7060`   | `416:8887` | `416:9093`  | Built — `Footer`                         |

### Band-by-band status — the article

| # | Band                    | Desktop      | Tablet     | Mobile      | Status                                   |
| - | ----------------------- | ------------ | ---------- | ----------- | ---------------------------------------- |
| — | Contact banner + header | `312:8141/2` | `419:10297`| `544:16132` | Built                                    |
| 1 | Title, eyebrow, deck    | `312:8484/5` | `418:8632` | `418:8933`  | **New** — eyebrow, `h1`, standfirst      |
| 2 | Hero media              | `312:8486`   | `418:8636` | `418:8937`  | **New** — reuses the `mediaSlot` (006)   |
| 3 | Chapter                 | `312:8491`   | `418:8639` | `418:8948`  | **New** — heading, lede, body, list      |
| 3a| — pull quote            | `312:8506`   | `532:12930`| `418:8961`  | **New** — a ruled, indented line         |
| 4 | On this page            | `312:8409`   | `418:8674` | `418:8938`  | **New** — sidebar at ≥768, card at 390   |
| — | Footer                  | `312:8145`   | `419:10299`| `419:10466` | Built                                    |

### The card, exactly as drawn

One component at four sizes, not four components. Every instance is an image with a category badge
inset 16px from its top-left corner, a 20px gap, then a title on one line-box and a date under it.

| Instance          | Node       | Card width | Image height |
| ----------------- | ---------- | ---------- | ------------ |
| Desktop, wide     | `312:7397` | 1140       | 300          |
| Desktop, narrow   | `312:7425` | 560        | 300          |
| Tablet, lead      | `415:7934` | 688        | 380          |
| Tablet, in a pair | `415:7944` | 332        | 240          |
| Mobile            | `415:8040` | 358        | 200          |

### The mosaic rhythm

The desktop grid is 1720 wide with a 20px gutter, so a narrow cell is 560 and a wide cell is 1140
(two narrows plus the gutter). Reading `312:7367` top to bottom, the seven drawn cards fall into a
three-row cycle:

```
row 1   [ wide 1140          ] [ narrow ]
row 2   [ narrow ] [ narrow ] [ narrow ]
row 3   [ narrow ] [ wide 1140          ]
```

Tablet keeps a different rhythm — one full-width lead card, then rows of two — and mobile is a
single column. All three are **positional**: the same rhythm is drawn regardless of what is in the
cells, and nothing in the design marks a particular article as large.

### Design inconsistencies

Recorded here rather than silently resolved, in the manner of spec 006.

1. **The desktop article has no eyebrow.** Tablet (`418:8633`) and mobile (`418:8934`) both open
   with `OUR BLOG` above the title; desktop (`312:8484`) starts at the title. Resolved toward the
   two frames that agree — the eyebrow is drawn at every width (FR-021).
2. **The contents list does not match the article it sits beside.** The sidebar lists ten entries
   against four drawn chapters, and four of its labels are not the headings they point at
   (`Diamond Cut & Brilliance` against the chapter titled `Cut: Where Brilliance Begins`,
   `Color: What to Look For` against `Color: Finding the Right Balance`). Read as a drafting
   placeholder rather than a second data source: the contents list is generated from the chapters,
   with an optional short label per chapter for when the heading is too long to sit in the rail
   (FR-027).
3. **`+ 5 more chapters below`** is a literal string in the mobile contents card (`418:8946`). A
   hardcoded count is wrong the moment an article has a different number of chapters; the count is
   computed, and the row disappears when nothing is truncated (FR-029).
4. **The desktop tab strip distinguishes the active tab by colour alone** (`312:7366` dark against
   four muted siblings), while tablet and mobile draw a 2px underline beneath it. Colour alone is
   not an acceptable state signal; the underline is drawn at every width (FR-013).
5. **The contents rail is not sticky in the draw**, and at desktop it is 500 wide against a 1198
   content column — 456 tall beside 1824 of article. A rail that scrolls away after the first
   screen is a rail nobody can use; it sticks (FR-030).
6. **The index draws seven cards and a LOAD MORE.** Seven is exactly one mosaic cycle, so it is
   taken as the page size rather than as an arbitrary number of placeholders (FR-018).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A visitor reads an article (Priority: P1)

Someone arrives at an article — from a search result, a shared link, or the index — and reads it.
The page opens with an eyebrow, the article's title and a one-sentence standfirst, then a wide
photograph, then the article itself in named chapters. Beside the chapters, a contents list shows
where they are and lets them jump. On a phone the contents list becomes a card above the article
instead of a rail beside it.

**Why this priority**: The article page is the thing being built. An index that lists nothing worth
opening has no value; a single well-made article at a shareable address has value on its own, and it
is what every other story eventually points at.

**Independent Test**: Publish one article in the admin, open its address directly, and read it at
390, 768 and 1920 without touching the index.

**Acceptance Scenarios**:

1. **Given** a published article with a title, standfirst, hero photograph and four chapters,
   **When** a visitor opens its address, **Then** all four are rendered in that order and the title
   is the page's only top-level heading.
2. **Given** that article at 1920, **When** the visitor scrolls past the first chapter, **Then** the
   contents list remains visible and the entry for the chapter currently on screen is marked as
   current.
3. **Given** that article at 390, **When** the page loads, **Then** the contents list is a card
   between the hero photograph and the first chapter, and lists at most five chapters plus a count
   of those it did not list.
4. **Given** any entry in the contents list, **When** the visitor activates it by pointer or by
   keyboard, **Then** the page moves to that chapter's heading and the address updates so the
   position can be shared and the back button returns.
5. **Given** a chapter carrying a pull quote, **When** it renders, **Then** the quote is visually
   distinct from the surrounding paragraphs and is announced as a quotation rather than as body copy.
6. **Given** an article that has never been published, **When** anyone who is not signed in to the
   admin requests its address, **Then** the site responds as it does for any address that does not
   exist.

---

### User Story 2 - A visitor browses the blog (Priority: P2)

Someone follows **Our Blog** from the footer and lands on the index: a heading, a row of category
tabs, and a mosaic of article cards, newest first. Each card shows its photograph, the category it
belongs to, its title and the date it was published. When there are more articles than fit, one
control adds the next set without losing their place.

**Why this priority**: This is the link that is broken today, and it is how anybody finds an article
in the first place. It depends on US1 having something to link to.

**Independent Test**: With several published articles seeded, open `/blog` and reach any of them in
one click, at all three widths.

**Acceptance Scenarios**:

1. **Given** more published articles than one page holds, **When** a visitor opens the index,
   **Then** the newest are shown, in the drawn mosaic rhythm, and a control offers the next set.
2. **Given** that control, **When** the visitor activates it, **Then** the additional cards join the
   ones already on screen, the visitor's scroll position is preserved, and the address reflects what
   is now shown so the back button and a shared link both behave.
3. **Given** a card, **When** the visitor activates any part of it — photograph, title or date —
   **Then** they arrive at that article.
4. **Given** the index at 768 and at 390, **When** it renders, **Then** the mosaic becomes the drawn
   two-column and one-column arrangements and nothing scrolls horizontally.
5. **Given** no published articles at all, **When** a visitor opens the index, **Then** the heading
   still renders, a short message explains there is nothing yet, and no load control is drawn.

---

### User Story 3 - An editor writes, arranges and publishes (Priority: P3)

Someone with admin access writes an article in the CMS: a title, a standfirst, a photograph, a
category, a publication date, and as many chapters as the piece needs. They save it as a draft, come
back to it, and publish it when it is ready. Nothing about it required a developer.

**Why this priority**: Constitution I makes this non-negotiable rather than optional, and the two
reader stories are only demonstrable because this exists. It is separated because the *editorial*
guarantees — drafts, ordering, the ability to change every string and every picture — are testable
on their own and are what the feature is judged on six months from now.

**Independent Test**: In the admin, create an article from nothing, save it unpublished, confirm it
is absent from the index and unreachable at its address, then publish it and confirm both change.

**Acceptance Scenarios**:

1. **Given** the admin, **When** an editor creates an article and types a title, **Then** its
   address is proposed from that title, and renaming the article later does not change the address.
2. **Given** a saved draft, **When** the editor returns to it, **Then** their work is intact and the
   article is still absent from the index and from its public address.
3. **Given** a published article, **When** the editor changes any string, photograph, chapter or
   chapter order and saves, **Then** the change is visible to visitors without a deploy.
4. **Given** an article, **When** the editor tries to save it without a title, a standfirst, a
   category or a publication date, **Then** the save is refused and the admin says which field is
   at fault.
5. **Given** the index's heading and standfirst, **When** an editor changes them, **Then** the
   change is visible to visitors without a deploy — the index's own copy is content, not code.

---

### User Story 4 - A visitor narrows the blog to one subject (Priority: P4)

The tab strip above the mosaic reads LATEST, DIAMONDS, JEWELRY, GUIDES, STORIES. Choosing one
narrows the mosaic to that subject; LATEST means everything. The choice is in the address, so it can
be shared, bookmarked and stepped back out of.

**Why this priority**: Drawn prominently and cheap once the mosaic exists, but a blog with a handful
of articles is entirely usable without it. It is the first thing to cut if the feature has to ship
short.

**Independent Test**: With articles in at least two categories, choose each tab and confirm the
mosaic and the address both change, and that reloading the address reproduces the same view.

**Acceptance Scenarios**:

1. **Given** the index, **When** a visitor chooses a category tab, **Then** only articles in that
   category are shown, that tab is marked as current by more than colour, and the address carries
   the choice.
2. **Given** a narrowed index with more matches than one page holds, **When** the visitor loads
   more, **Then** the narrowing is preserved.
3. **Given** an address naming a category that does not exist, **When** it is requested, **Then**
   the site responds as it does for any address that does not exist.
4. **Given** a category with no published articles, **When** its tab is chosen, **Then** the tab
   strip still renders and a short message explains there is nothing in that category yet.
5. **Given** the categories, **When** an editor adds, renames, reorders or removes one, **Then** the
   tab strip changes to match without a deploy.

---

### User Story 5 - The blog is found and shared correctly (Priority: P5)

An article shared into a messenger shows its own title, its own standfirst and its own photograph. A
search engine indexes each article at its own address with the metadata the editor wrote, not one
the developer chose.

**Why this priority**: Constitution V requires editor-controlled metadata on article pages by name.
It is last because it is invisible until the first article is shared, and because every earlier
story is demonstrable without it.

**Independent Test**: Inspect the metadata emitted for the index and for an article, with and
without editor overrides filled in.

**Acceptance Scenarios**:

1. **Given** an article with no metadata overrides, **When** its page is requested, **Then** its
   title, standfirst and hero photograph are used for search and social previews.
2. **Given** an article whose editor filled in overrides, **When** its page is requested, **Then**
   the overrides are used instead.
3. **Given** a published article, **When** the site's machine-readable list of addresses is
   requested, **Then** the article and the index both appear in it and unpublished articles do not.

---

### Edge Cases

- **An article with no chapters.** The title, standfirst and hero still render; the contents list is
  not drawn at all rather than drawn empty.
- **An article with one chapter.** A contents list of one entry is noise — it is drawn only from two
  chapters upward.
- **A chapter heading long enough to wrap three lines in the rail.** The rail's entries wrap rather
  than truncate mid-word, and the optional short label exists for exactly this case.
- **Two chapters with the same heading.** Their jump targets must still be distinct, so a visitor
  choosing the second entry does not land on the first.
- **An article with no hero photograph.** The band is omitted and the chapters move up; nothing
  reserves an empty box.
- **A photograph deleted from the library while an article still references it.** The card and the
  hero render without it rather than breaking the page.
- **A publication date in the future.** Treated as content, not as a schedule — this feature does
  not publish anything on a timer, so a future date is displayed as written.
- **A `load more` address beyond the last page.** Resolves to something coherent rather than an
  error page, and the load control is absent.
- **An article whose address collides with an existing one.** Refused at save with an explanation,
  never silently suffixed.
- **A visitor who has asked for reduced motion.** Choosing a contents entry moves the page without
  a smooth-scrolling animation.
- **The tab strip narrower than its tabs at 390.** It scrolls horizontally within itself, and that
  scroll is reachable by keyboard; the page itself never scrolls sideways.
- **An article in a category that is later deleted.** The article stays published and reachable; its
  card renders without a badge rather than with a dangling one.

## Requirements *(mandatory)*

### Functional Requirements

#### The index

- **FR-001**: The site MUST serve a blog index at `/blog`, replacing the 404 the footer link reaches
  today.
- **FR-002**: The index MUST show published articles newest-first by publication date.
- **FR-003**: The index MUST open with an eyebrow and a heading whose text is editable content, not
  code.
- **FR-004**: Each article MUST be represented by a card carrying its photograph, its category, its
  title and its publication date, and the whole card MUST be a single link to the article.
- **FR-005**: The card MUST expose one link per article to assistive technology, not three
  overlapping ones.
- **FR-006**: At the widest breakpoint the mosaic MUST follow the drawn three-row cycle — wide plus
  narrow, three narrow, narrow plus wide — repeating for as many articles as are shown.
- **FR-007**: At the middle breakpoint the mosaic MUST render as a full-width lead card followed by
  rows of two.
- **FR-008**: At the narrowest breakpoint the mosaic MUST render as a single column.
- **FR-009**: A partial final row MUST render without stretching or leaving a hole — the rhythm
  degrades gracefully at any article count from one upward.
- **FR-010**: The category badge MUST sit over the photograph, inset from its top-left corner, and
  MUST remain legible over both light and dark photographs.
- **FR-011**: Publication dates MUST render in one consistent long form across every card and every
  article page.
- **FR-012**: When there are no articles to show, the index MUST render its heading and a short
  explanatory message, and MUST NOT draw the load control.

#### Narrowing by category

- **FR-013**: The index MUST offer a tab per category plus a LATEST tab meaning "no narrowing", and
  MUST mark the current tab by a means other than colour alone.
- **FR-014**: The tab strip's membership, labels and order MUST come from editable content, so that
  adding or renaming a category needs no deploy.
- **FR-015**: The current narrowing MUST be encoded in the address so it can be shared, bookmarked
  and reversed with the back button.
- **FR-016**: An address naming a category that does not exist MUST be answered the way any unknown
  address is.
- **FR-017**: Narrowing MUST be preserved when more articles are loaded.

#### Loading more

- **FR-018**: The index MUST show at most one full mosaic cycle — seven articles — per page.
- **FR-019**: When more articles match than are shown, the index MUST offer one control that adds
  the next page to what is already on screen, MUST state how many are shown against how many match,
  and MUST announce that count when it changes.
- **FR-020**: Loading more MUST work with scripting unavailable, MUST update the address, and MUST
  NOT move the visitor's scroll position.

#### The article page

- **FR-021**: Each published article MUST be reachable at its own address under `/blog`, and MUST
  open with an eyebrow, the article's title as the page's only top-level heading, and a standfirst.
- **FR-022**: The article MUST be able to carry a hero photograph or a hero video, using the same
  media slot the rest of the site uses; when neither is set, the band MUST be omitted.
- **FR-023**: An article's body MUST be composed of ordered chapters, each with a heading and rich
  text supporting at minimum paragraphs, bold, links, and bulleted lists.
- **FR-024**: A chapter MUST be able to carry an optional emphasised sub-heading above its body, as
  the drawn chapters do.
- **FR-025**: A chapter MUST be able to carry an optional pull quote, rendered as a quotation rather
  than as body copy.
- **FR-026**: Each chapter heading MUST be a stable jump target derived from the chapter, unique
  within the article even when two headings read alike.
- **FR-027**: The contents list MUST be generated from the article's chapters in order, using each
  chapter's short label where the editor supplied one and its heading otherwise. It MUST NOT be a
  separately maintained list.
- **FR-028**: The contents list MUST be drawn only when the article has two or more chapters.
- **FR-029**: At the narrowest breakpoint the contents list MUST render as a card above the article,
  listing at most five chapters followed by a computed count of the remainder, and MUST omit that
  count when nothing was omitted.
- **FR-030**: At the wider breakpoints the contents list MUST remain visible as the article scrolls,
  and MUST mark the chapter currently on screen as current.
- **FR-031**: Activating a contents entry MUST move to that chapter, update the address, move
  keyboard focus to the chapter so a keyboard visitor continues from there, and MUST NOT animate the
  movement for a visitor who has asked for reduced motion.

#### Editing

- **FR-032**: Articles MUST be managed in the CMS as their own collection, with its own place in the
  admin navigation.
- **FR-033**: Every visitor-facing string and every photograph on the index and on an article MUST
  be editable in the CMS without a deploy. No article copy, heading, label or date may be hardcoded.
- **FR-034**: An article MUST require a title, a standfirst, a category and a publication date, and
  MUST refuse to save without them, naming the field at fault.
- **FR-035**: An article's address MUST be proposed from its title when first created and MUST NOT
  change when the title later changes.
- **FR-036**: Article addresses MUST be unique, and a collision MUST be refused with an explanation
  rather than resolved silently.
- **FR-037**: Articles MUST support an unpublished draft state. A draft MUST be absent from the
  index, absent from the machine-readable address list, and unreachable at its address by anyone who
  is not signed in to the admin — unreachable through the content API as well as through the page.
- **FR-038**: Chapters MUST be reorderable in the admin, and their order MUST be the order they are
  read in and the order the contents list takes.
- **FR-039**: Blog categories MUST be managed as editable content with a title, an address segment
  and an explicit order.
- **FR-040**: An article MUST carry exactly one category.
- **FR-041**: Deleting a category MUST NOT unpublish or orphan the articles that referenced it.
- **FR-042**: The index's own copy — eyebrow, heading, empty-state message and metadata — MUST be
  editable in the CMS.

#### Metadata, accessibility and performance

- **FR-043**: The index and every article MUST emit editor-controlled search and social metadata,
  falling back to the document's own title, standfirst and hero photograph when no override is set.
- **FR-044**: Published articles and the index MUST appear in the site's machine-readable list of
  addresses; drafts MUST NOT.
- **FR-045**: Both pages MUST meet WCAG 2.1 AA — a single top-level heading, headings in order,
  visible focus on every interactive element, the tab strip and the contents list operable by
  keyboard, and text over photographs meeting contrast.
- **FR-046**: Every photograph MUST carry alternative text from the media library; decorative
  photographs MUST be marked as such rather than described.
- **FR-047**: Both pages MUST render usably from 320px upward with no horizontal page scroll.
- **FR-048**: Both pages MUST stay inside the project's per-route weight and performance budgets.
- **FR-049**: Photographs below the fold on the index MUST NOT be fetched before they are needed.

#### Reuse

- **FR-050**: The index's page header, the load control, the media slot, the rich-text renderer, the
  button, the container and the card's link behaviour MUST reuse what the kit already has. Any claim
  that a new component is needed MUST name what was searched and why it did not fit.
- **FR-051**: The card MUST be one component with size variants, not one component per drawn width.
- **FR-052**: Colours, spacing, type, radii and breakpoints MUST come from design tokens. No raw hex
  values and no one-off pixel sizes.
- **FR-053**: An untouched install MUST render both pages coherently — the index with its drawn
  heading and an empty-state message, and no article page until an article exists.

### Key Entities

- **Article**: One piece of writing at its own address. Carries a title, an address segment, a
  standfirst, one category, a publication date, an optional hero photograph or video, an ordered
  list of chapters, optional metadata overrides, and a published/draft state.
- **Chapter**: One named section of an article. Carries a heading, an optional short label for the
  contents list, an optional emphasised sub-heading, rich-text body, and an optional pull quote. Its
  position in the article is its position in the contents list.
- **Blog Category**: A subject an article belongs to — Diamonds, Jewelry, Guides, Stories. Carries a
  title, an address segment and an explicit order. Distinct from the shop's product categories,
  which describe what a piece *is* rather than what an article is *about*.
- **Blog Index Settings**: The index page's own content — eyebrow, heading, empty-state message and
  metadata overrides. One record, not a list.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every link to `/blog` in the site chrome resolves to a real page; the site has zero
  internal links that lead to a missing page.
- **SC-002**: A visitor arriving at the index reaches any article shown on it in one interaction,
  and any article in a given category in two.
- **SC-003**: On a mid-range phone over a 4G connection, the largest piece of content on the index
  and on an article appears within 2.5 seconds at the 75th percentile.
- **SC-004**: Automated accessibility checks report zero WCAG 2.1 AA violations on the index, on the
  index narrowed to a category, and on an article, at 390, 768 and 1920.
- **SC-005**: The index and an article render with no horizontal page scroll at every width from
  320px to 1920px.
- **SC-006**: An editor with no developer involvement publishes a new article and sees it live on
  the index within 5 minutes of starting, measured from an empty form.
- **SC-007**: 100% of the visitor-facing strings and photographs on both pages can be changed from
  the admin; a reviewer finds zero hardcoded article copy in the codebase.
- **SC-008**: Choosing any entry in the contents list places that chapter's heading within the
  visitor's first screen, at every width.
- **SC-009**: An unpublished article is unreachable by address and absent from the index, the
  category views and the machine-readable address list — verified for both the page and the content
  API.
- **SC-010**: Both pages stay inside the project's per-route weight budget as measured on a
  production build.
- **SC-011**: The index behaves correctly at 0, 1, 7, 8 and 40 published articles — no empty rows,
  no stretched cards, no load control where nothing is left to load.

## Assumptions

Reasonable defaults chosen where the brief and the design did not decide. Each is a decision that
can be reversed cheaply if it turns out to be wrong.

- **Addresses.** Articles live at `/blog/<slug>`; the index at `/blog`; a narrowing is a query on
  the index rather than a path segment, matching how the shop already encodes its filters and
  avoiding a collision between a category segment and an article segment.
- **Page size.** Seven, because that is one complete mosaic cycle and it is what the design draws
  before its LOAD MORE. The catalogue's twelve is a different grid and does not transfer.
- **Load more, not numbered pages.** The design draws one control, and the kit already has it. The
  numbered `Pagination` component stays with the catalogue, where the owner asked for it.
- **Blog categories are their own taxonomy.** The shop's `categories` collection answers "what is
  this piece", and its members (rings, bracelets, earrings, necklaces) are not the blog's
  (Diamonds, Jewelry, Guides, Stories). Sharing one collection would put article subjects into the
  shop's filter drawer.
- **One category per article, no tags.** The card has room for one badge and the design shows one.
- **No author, no reading time, no share buttons, no related articles, no comments.** None is drawn,
  and each is a separate editorial decision with its own surface.
- **Publication date is content, not a schedule.** The editor sets it; publishing is the draft
  toggle. Nothing goes live on a timer.
- **The hero uses the existing media slot**, so an article can open on a video for the same reasons
  the Our Story page can, at no additional cost.
- **Chapter bodies are rich text, not blocks.** The drawn chapters are prose, sub-headings and
  bulleted lists — what a rich-text field already covers. The block registry stays available for a
  later spec that needs a gallery or a product embed mid-article.
- **The contents list is generated, never authored.** See design inconsistency 2.
- **English only.** The header carries a language control, but nothing on the site is translated
  today and this spec does not change that.
- **Drafts follow the pattern spec 006 established** for questions: unpublished content is
  unreachable rather than merely hidden, enforced in the read access rule.
- **Cache invalidation is decided at planning time.** Spec 006 records why `/about` takes neither a
  revalidation hook nor caching; a blog is a different shape — many cacheable pages that change
  rarely — and the right answer for it may differ. Flagged rather than assumed.

## Out of Scope

- Comments, reactions, or any visitor-submitted content.
- Author profiles and bylines.
- Search within the blog, tags, or archives by month.
- An RSS or Atom feed.
- Related-article recommendations at the foot of an article.
- Newsletter capture beyond the footer form that already exists.
- Scheduled or timed publication.
- Translations and localisation.
- Any change to the shop's product categories or to the catalogue.
