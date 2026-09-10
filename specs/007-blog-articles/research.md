# Phase 0 — Research

**Feature**: 007-blog-articles · **Plan**: [plan.md](./plan.md) · **Spec**: [spec.md](./spec.md)

Every decision below displaced an alternative that was plausible enough to have been shipped. The
alternative is recorded so a reviewer can reopen the question with the same information.

---

## R1 — Blog categories are their own collection, not the shop's

**Decision**: A new `article-categories` collection (title, slug, order). `articles.category` is a
`relationship` to it, `hasMany: false`, required.

**Rationale**: The existing `categories` collection answers *what is this piece* — rings, bracelets,
earrings, necklaces — and it drives three things that have nothing to do with writing: the
`/rings` route, the eyebrow above a product, and the CATEGORY group in the filter drawer. Adding
`Guides` and `Stories` to it would put article subjects into the shop's filter drawer and give each
one a product listing at `/guides`. `src/collections/categories.ts` already records that "All
jewelry is not a row here" for the same class of reason: a row in that collection is a shop route.

**Alternatives considered**:

- *Reuse `categories` with a `kind` discriminator.* One collection, one admin tab — and every read
  in `src/lib/catalog/queries.ts` would need a filter it does not have today, with the failure mode
  being a blog category silently appearing in the shop.
- *A `select` field with fixed options.* Cheapest, and it fails FR-014 outright: adding a category
  would be a deploy, which is exactly what Constitution I calls a modelling defect.

**Consequence**: Deleting a category must not orphan articles — see R14.

---

## R2 — The index's copy is flat fields on a global, not a block composition

**Decision**: A `blog-page` global with `eyebrow`, `heading`, an empty-state pair and `seo`. The
route renders the existing `PageHeaderBlock` component with those fields.

**Rationale**: `/about` is block-composed because it is seven bands whose order is genuinely the
editor's. The blog index is one page header above a mosaic, and **the mosaic cannot be a block** —
it is the page's purpose, not a band an editor can move or delete. A `body: blocks` field here would
offer an editor the ability to reorder a header against a grid that is not in the list, which is a
worse admin than four labelled fields.

**Alternatives considered**:

- *`blockReferences: ['page-header', …]` plus a fixed mosaic underneath.* Consistent with 006 and
  buys the ability to add a banner above the grid. Rejected as speculative: nothing in the brief or
  the design asks for it, and it can be added later without moving the four fields that exist.
- *Hardcode the heading.* Fails FR-042 and Constitution I.

**Consequence**: `PageHeaderBlock` must stop being typed against `StoryBlock` — see R15.

---

## R3 — A chapter is a heading, an optional lede, one rich-text body and an optional pull quote

**Decision**: `articles.chapters` is an array of `{ heading, tocLabel?, lede?, body, pullQuote? }`.
`body` is `richText` with the lexical feature set **restricted to remove headings**.

**Rationale**: The drawn chapters are prose, a bold summary line, and bulleted lists — everything a
rich-text field already renders through `RichText`, which spec 006 promoted to the UI kit for
exactly this class of content. Composing chapters from blocks would build a second block registry
for content that has no blocks in it.

Headings are removed from the editor's toolbar because the page's outline is a contract, not a
preference: `h1` is the article title and `h2` is the chapter heading, and an editor who inserts an
`h2` inside a body creates a section the contents rail cannot see and an outline a screen reader
reads as broken. Restricting the feature set is Constitution IV's "invalid content cannot be
published in the first place", applied to structure rather than to values.

**Alternatives considered**:

- *A `passages` array inside each chapter* (`lede` + `body`, repeated). The draw's first chapter has
  two such pairs, so this is the literal reading of the design. Rejected: three levels of nesting in
  the admin to express what a bold paragraph inside the body already expresses.
- *No `lede` field at all*, with the summary line as bold text in the body. Tempting, and it is one
  fewer field — but FR-024 asks for a labelled sub-heading, and a field a designer can restyle later
  is worth more than a `<strong>` that cannot be told apart from inline emphasis. The boundary is
  written into the admin description: `lede` is the chapter's one summary line; further emphasis is
  bold text in the body.
- *Markdown in a textarea.* No.

---

## R4 — The mosaic is positional, and it is grid spans over a three-column track

**Decision**: The desktop grid is three equal columns with a 20px gutter — which reproduces the
drawn 560px narrow cell and 1140px wide cell exactly inside the 1720px container. A card's emphasis
is a function of its index:

| Breakpoint | Track    | Emphasised when      | Effect                       |
| ---------- | -------- | -------------------- | ---------------------------- |
| ≥ xl       | 3 columns| `i % 7 === 0` or `6` | spans 2 columns              |
| md – xl    | 2 columns| `i % 5 === 0`        | spans 2 columns (the lead)   |
| < md       | 1 column | never                | —                            |

Both flags are computed in the mapper and arrive at the card as two booleans; the card applies
`xl:col-span-2` / `md:col-span-2` and the matching aspect ratios. `grid-auto-flow` stays at its
default — explicitly **not** `dense`.

**Rationale**: The same rhythm is drawn regardless of what is in the cells, and each breakpoint
draws a different one, which an editorial "feature this article" flag could not express — a single
stored flag cannot be true at 1920 and false at 768. Computing it from the index also makes FR-009
free: spans are assigned left to right, so a partial final row is short rather than holed, and there
is no arrangement of any article count that leaves a gap in the middle.

`dense` is rejected because it reorders cards to fill gaps, and the index is chronological. A
visitor who reads the third card expects it to be the third newest.

**Alternatives considered**:

- *A `featured` checkbox on the article.* The interpretation this spec's checklist flagged as
  reopenable. It cannot express three different rhythms, and it hands an editor a control whose
  effect depends on where the article happens to land in the order.
- *CSS `grid-template-areas` per cycle.* Reproduces the draw and stops working the moment a page has
  four cards instead of seven.

---

## R5 — The tab strip is links with `aria-current`, not a `tablist`

**Decision**: A `<nav>` of `next/link`s. The current tab carries `aria-current="page"` and a 2px
underline drawn at **every** breakpoint. The strip scrolls horizontally within itself at narrow
widths; the page never does.

**Rationale**: Each tab is a real address (R11), so it is a link. ARIA's `tablist` pattern describes
panels swapped in place without navigation, and applying it here would promise a screen-reader user
keyboard semantics — arrow-key roving focus, `aria-selected` — that a set of links does not have and
should not have. `aria-current` is the correct announcement for "this is the view you are on".

The underline is added at desktop against the draw (spec inconsistency 4): the desktop frame
distinguishes the active tab by colour alone, which fails WCAG 1.4.1 and disappears entirely for a
monochrome or high-contrast display.

**Alternatives considered**: a `<select>` on mobile (a second control to keep in sync, and it hides
the categories a visitor came to see); buttons plus client-side filtering (fails FR-015, and needs
JavaScript for something the server already does).

---

## R6 — Caching: the index is dynamic, the article is cached, and articles get their own hook

**Decision**:

| Route          | Strategy                                                        | Invalidated by |
| -------------- | --------------------------------------------------------------- | -------------- |
| `/blog`        | `export const dynamic = 'force-dynamic'`                        | nothing — it is never cached |
| `/blog/[slug]` | `generateStaticParams` via `prerenderable()`, `dynamicParams` default | a narrow article hook |
| `/sitemap.xml` | `force-dynamic` (see R7)                                        | nothing |

`src/lib/revalidate.ts` changes in two ways:

1. A new `revalidateArticleOnChange` / `revalidateArticleOnDelete` pair, attached to `articles`,
   which marks **only** `/blog/<slug>` — plus the address a renamed article has just left, the same
   `renamedFrom` treatment products already get.
2. The shared `invalidate()` gains an articles pass, so that a write which can touch anything —
   above all a photograph re-uploaded in `media` — still reaches both cached route families.

**Rationale**: `/blog` reads `searchParams`; a narrowed, paged grid is a function of the query
string, exactly as `/[category]` is, and that file already records why it is not cached. It also has
no dynamic segment, so without `force-dynamic` Next would try to prerender it during a container
build that has no database — the chicken-and-egg `src/lib/catalog/prerender.ts` documents in full,
and the reason `/` and `/about` are both `force-dynamic`.

Articles are the opposite shape: many pages, each a pure function of one document, changing rarely
and read often. That is the product page's shape, and it takes the product page's answer.

The hook has to be new rather than reused because `invalidate()` walks **every product slug**. An
article edit routed through `revalidateOnChange` would mark the entire catalogue stale — the precise
failure `src/collections/questions.ts` refused to introduce, quoted there as evicting "the entire
catalogue because somebody fixed a typo in an answer".

**Alternatives considered**:

- *Time-based `revalidate = 3600`.* `revalidate.ts` opens by rejecting intervals site-wide: "an
  interval is a guess in both directions". Every write goes through Payload, so an exact signal
  exists.
- *`force-dynamic` on the article too.* Simplest, and it throws away the one place on this site
  where caching is unambiguously correct. An article is the same bytes for every visitor for weeks.
- *Tag-based invalidation with `revalidateTag`.* Next 16 requires a `cacheLife` profile as a second
  argument (upgrade guide, "Caching APIs"), and this codebase has no tagging scheme. Introducing one
  for one collection would be a second, parallel invalidation model.

---

## R7 — The sitemap is a new `app/sitemap.ts`, and it must be `force-dynamic`

**Decision**: `src/app/sitemap.ts` exporting `MetadataRoute.Sitemap`, covering the home page, the
listings, product pages, `/about`, `/blog` and every published article. It sets
`export const dynamic = 'force-dynamic'` and builds absolute URLs from `NEXT_PUBLIC_SERVER_URL`.

**Rationale**: Verified in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`:
*"`sitemap.js` is a special Route Handler that is cached by default unless it uses a Request-time API
or dynamic config option."* Cached by default is precisely the failure this codebase has already
been bitten by once — the container image is built with no database, so a cached sitemap would be
generated empty at build and served empty forever. `force-dynamic` is the same fix, for the same
reason, as on `/`, `/about` and `/blog`.

It covers the whole site rather than the blog alone because a sitemap is a claim about what exists.
Recorded in the plan's Complexity Tracking so the scope is challengeable.

**Alternatives considered**: `generateSitemaps` for splitting into multiple files (needed past
50,000 URLs; this site has hundreds); a static `sitemap.xml` (cannot list content that did not
exist at build).

---

## R8 — Four new components, and the search that justifies each

FR-050 requires the reuse search to be recorded rather than asserted.

| New component      | What was searched                                                        | Why it did not fit |
| ------------------ | ------------------------------------------------------------------------ | ------------------ |
| `ArticleCard`      | `CategoryCard`, `FeatureCard`, `ProductCard`                              | All three are commerce shapes with price, availability or a hover swap. The article card is a photograph with an overlaid badge and two lines under it, and it has no state |
| `ArticleMosaic`    | `ProductGrid`, `JewelryCarousel`                                          | `ProductGrid` is a uniform track by construction; the whole point here is that two cells in seven are twice as wide |
| `CategoryTabs`     | `NavLink`, `Chip`, `Menu`, `Breadcrumbs`                                  | `NavLink` is the 70px header item with its own hover rule; `Chip` is a pill with a fill, and its `href` branch is the filter chip's *removal* affordance. Neither draws an underline rule beneath a baseline |
| `TableOfContents`  | `Accordion`, `ScrollArea`, `Breadcrumbs`                                  | Nothing in the kit tracks reading position or renders a rail that follows the page |

Reused unchanged: `Header`, `ContactBanner`, `Footer`, `Container`, `Button`, `Link`, `Image`,
`Media`, `RichText`, `PageHeaderBlock`, `mediaSlot`, `slugField`, `seoField`/`seoTab`,
`adminOrPublishedStatus`, `prerenderable`, `convertLexicalToHTML`.

Promoted rather than copied (Constitution II, second consumer): `LoadMore` → `components/ui/load-more`;
`ListingEmpty` → `components/ui/empty-state` as `EmptyState`, with `clearHref`/`clearLabel` relaxed
into one optional `action?: { href, label }` so the "nothing published yet" case can render without
an action while the "nothing in this category" case offers *See all articles*. Both keep their
stories, which move with them.

---

## R9 — The contents rail tracks position with one observer, in one client leaf

**Decision**: `table-of-contents.tsx` is a **server** component that renders the whole list as
anchors. `toc-current.tsx` is a `'use client'` leaf that does one thing: observe the chapter
headings and set `aria-current="true"` on the matching link. With scripting off, every link still
works and nothing is marked current.

Smooth scrolling is applied in CSS under `@media (prefers-reduced-motion: no-preference)` only.
Chapter headings carry `tabIndex={-1}` and a `scroll-margin-top` matching the sticky header, so a
jump lands the heading clear of the chrome and moves keyboard focus into the chapter rather than
leaving it on the rail.

**Rationale**: This is the feature's only interactivity, and Constitution V requires `use client` to
be pushed to a leaf. An observer over the headings is ~30 lines; the smallest scroll-spy package is
a dependency against the JavaScript budget for the same behaviour.

**Alternatives considered**: `scroll`/`resize` listeners with `getBoundingClientRect` (fires on every
frame; `IntersectionObserver` is what it is for); `:target` CSS alone (marks the last *clicked*
entry, not the one being read, and never updates while scrolling).

---

## R10 — Anchors are derived in the mapper, and deduplicated there

**Decision**: A chapter's anchor is its heading slugified with the same rules `src/fields/slug.ts`
uses. Within one article, a repeated result gains a `-2`, `-3` suffix in document order. Nothing is
stored.

**Rationale**: FR-026 requires uniqueness, and two chapters can legitimately share a heading
("Summary"). Deriving means an editor never sees an anchor field and never has to keep it in step
with a renamed heading. Doing it in the mapper makes the invariant unit-testable with no rendering,
which is where 006 put the equivalent heading-level rule.

**Trade-off, stated plainly**: a renamed heading changes its anchor, so a previously shared deep
link stops landing on that chapter. It still lands on the article. A stored anchor would fix that
and would introduce a field editors must maintain by hand; for a marketing blog, the cheaper failure
is the right one. If deep links to chapters ever matter, `tocLabel`'s sibling is a stored `anchor`
and this paragraph is where to look.

---

## R11 — Seven per page, accumulating, in the address

**Decision**: `BLOG_PAGE_SIZE = 7`. `?page=2` means *the first fourteen*, not *the second seven* —
the catalogue's existing semantics, which is what makes `LoadMore` reusable unchanged. Narrowing is
`?category=<slug>`; LATEST is the absence of the parameter. `src/lib/blog/blog-url.ts` is the only
module that writes a blog address.

**Rationale**: Seven is one complete mosaic cycle, and it is what the design draws before its LOAD
MORE. The one-writer rule is `listing-url.ts`'s lesson restated: six callers assembling
`basePath + query` themselves is six chances to disagree about whether the category belongs in the
path.

**Alternatives considered**: a `/blog/category/<slug>` path segment, mirroring `/rings`. Rejected —
the shop's single-category-is-a-path rule exists because a category listing there is a first-class
merchandising page with its own copy and SEO. A blog tab is a filter, and a path segment would
collide conceptually with `/blog/<article-slug>` for any reader of the URL.

---

## R12 — Dates are formatted in the mapper, not in the component

**Decision**: The view model carries both a machine value (ISO, for `<time datetime>` and for
structured data) and a display string, formatted once with `Intl.DateTimeFormat('en-US', { month:
'long', day: '2-digit', year: 'numeric' })` — which produces the drawn `August 08, 2026`.

**Rationale**: Formatting in a component means formatting on the server and again on the client,
against whatever locale the visitor's browser reports — the classic hydration mismatch, and one that
shows up as a React error in production rather than as a visual bug. Doing it once in the mapper
also means one format across cards, the article page and the structured data, which is FR-011.

---

## R13 — `schema.org/Article` on the article page, and the breadcrumb question

**Decision**: The article route emits `Article` JSON-LD (headline, description, image, `datePublished`,
`dateModified`, `mainEntityOfPage`, publisher) and a `BreadcrumbList` for Home → Our Blog → the
article, using the same inline `<script type="application/ld+json">` pattern
`src/app/(frontend)/products/[slug]/page.tsx` already uses.

**Open point for the designer, recorded rather than resolved**: Constitution V names `BreadcrumbList`
as required on article pages, and **no breadcrumb is drawn** on any of the three article frames.
Emitting the data without drawing the trail is defensible — the hierarchy is real and the header and
footer both expose it — but the honest options are to draw one (the kit has `Breadcrumbs`) or to
amend the constitution's list. Spec 006 set the precedent of not adding undrawn elements, so this
ships as data only, flagged.

---

## R14 — A deleted category must not take its articles with it

**Decision**: `articles.category` is required at the field level, but the collection does **not**
cascade. A category deleted while articles reference it leaves those articles published; the mapper
treats an unresolvable relationship as "no category", the card renders without a badge, and the tab
disappears with the category.

**Rationale**: FR-041 requires it, and the alternative is worse in both directions — cascading
deletes published writing because somebody tidied a taxonomy, while blocking the delete leaves an
editor unable to remove a category without hunting every article by hand.

**Verification note**: this is exactly the kind of behaviour that is asserted and not checked, so it
is an integration test rather than a paragraph — delete a referenced category, re-read the article
through the Local API, assert it is still published and that the mapper yields no badge.

---

## R15 — `PageHeaderBlock` stops being typed against one feature's union

**Decision**: `PageHeaderBlockProps` changes from `Extract<StoryBlock, { type: 'page-header' }>` to a
plain `{ eyebrow?: string; heading: string; headingLevel: 1 | 2 | 3 }`. The story block renderer
passes the same three fields it passes today; nothing about `/about` changes.

**Rationale**: Without this, rendering the blog index's header would import `src/lib/story/types`
into a blog route — one feature's view-model union crossing into another's, which is how two
unrelated features end up coupled through a type. A presentational component should be typed by what
it draws, not by where its data happens to come from.

**Alternatives considered**: copying the eight lines of markup into a `BlogHeader` (Constitution II's
named worst violation); moving `src/lib/story` to a shared `src/lib/blocks` (a broader rename that
touches spec 006's files and tests for no benefit this feature needs).

---

## R16 — Draft articles are unreachable, not merely hidden

**Decision**: `articles` reuses `adminOrPublishedStatus` for `read`, with `isAdmin` on create,
update and delete. `article-categories` is public-read, admin-write. The `blog-page` global is
public-read, admin-write. Every one of these is stated explicitly rather than inherited.

**Rationale**: Constitution IV requires access to be deliberate on every collection, and FR-037
requires a draft to be absent from the content API as well as from the page — which a route-level
check cannot give, because `/api/articles` bypasses the route entirely. Putting the constraint in
the access rule makes it part of the query, which is the same reasoning
`src/collections/questions.ts` records.

**Consequence for the sitemap and `generateStaticParams`**: both read with default access, so both
see published articles only, and an unpublished one is absent from the address list for free.
