# Phase 1 — Data Model

**Feature**: 007-blog-articles · **Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md)

Constitution IV requires collections, globals and blocks to be modelled before implementation, every
field to carry an editor-facing label and a description where its purpose is not self-evident,
relationships to be relationship fields, validation to live at field level, and access to be stated
explicitly rather than inherited. This document is that model. Field names are chosen to match what
the rest of the codebase already calls the same concept.

## Overview

```
article-categories ──┐
                     │  (relationship, required, hasMany: false)
                     ▼
                  articles ──── chapters[]  (array, ordered)
                     │
                     └──── hero  (mediaSlot → media)

blog-page (global) ── the index's own copy and metadata
```

Three new database surfaces: two collections and one global. No existing table changes shape.

---

## Collection: `article-categories`

**Labels**: singular *Article category*, plural *Article categories*. **Admin group**: Content.
**`useAsTitle`**: `title`. **Default columns**: `title`, `slug`, `order`. **Default sort**: `order`.

Distinct from the shop's `categories` for the reasons in [research R1](./research.md#r1--blog-categories-are-their-own-collection-not-the-shops).

| Field   | Type   | Required | Label      | Notes |
| ------- | ------ | -------- | ---------- | ----- |
| `title` | text   | yes      | Title      | The tab label, e.g. *Guides*. Rendered uppercase in CSS, so it is typed in sentence case — a screen reader given `GUIDES` may spell it out |
| `slug`  | text   | yes      | Slug       | `slugField({ from: 'title' })` — derived on create, unique, indexed, sidebar. The value in `?category=` |
| `order` | number | no (0)   | Order      | Sidebar. Lowest first, in the admin list and in the tab strip. Same field and same reasoning as `categories.order` and `questions.order` |

**Access**: `read: () => true`; `create`/`update`/`delete`: `isAdmin`. Public read because the tab
strip is drawn for anonymous visitors.

**Versions**: none. A taxonomy row has nothing to draft.

**Hooks**: none. The only page that draws these is `/blog`, which is never cached (research R6).

**Deletion**: not cascading. See [research R14](./research.md#r14--a-deleted-category-must-not-take-its-articles-with-it).

---

## Collection: `articles`

**Labels**: singular *Article*, plural *Blog*. The admin tab reads **Blog**, which is the word the
requester used; the slug stays `articles` because Constitution IV requires plural collection slugs
and because `/api/articles` reads like an address. This is the same split `questions` /
*FAQ* already makes.

**Admin group**: Content. **`useAsTitle`**: `title`. **Default columns**: `title`, `category`,
`publishedOn`, `_status`. **Default sort**: `-publishedOn`.

**Form layout**: tabs — *Article* (everything below except `seo`) and *SEO* (`seoTab()`). `slug` and
`publishedOn` sit in the sidebar. The form is long enough that a single column would bury the
chapters.

### Fields

| Field         | Type         | Required | Label          | Validation / notes |
| ------------- | ------------ | -------- | -------------- | ------------------ |
| `title`       | text         | yes      | Title          | The `h1` and the card's title |
| `slug`        | text         | yes      | Slug           | `slugField({ from: 'title' })`. Unique and indexed — a collision is refused at save (FR-036), never suffixed. Derived once on create, so a rename does not move the article (FR-035) |
| `standfirst`  | textarea     | yes      | Standfirst     | The sentence under the title, and the fallback meta description and card summary. `textarea` because it is drawn over two lines |
| `category`    | relationship | yes      | Category       | → `article-categories`, `hasMany: false`. Never a text field (Constitution IV) |
| `publishedOn` | date         | yes      | Published on   | Sidebar, date only (no time picker). Sorts the index and fills `<time datetime>` and `datePublished`. Content, not a schedule — see Assumptions in the spec |
| `hero`        | group        | no       | Hero media     | `mediaSlot({ label: 'Hero media', description: 'The wide photograph or video under the standfirst. Leave empty to open on the first chapter.' })`. Unchanged from spec 006, including its conditional poster validation |
| `chapters`    | array        | no       | Chapters       | Ordered; the order is the reading order and the contents order (FR-038). Row label is the chapter heading |
| `seo`         | tab          | no       | SEO            | `seoTab()` — meta title, meta description, social image, all optional |

### `chapters[]`

| Field       | Type     | Required | Label            | Notes |
| ----------- | -------- | -------- | ---------------- | ----- |
| `heading`   | text     | yes      | Heading          | The chapter's `h2`. Its slug is the jump target, deduplicated per article (research R10) |
| `tocLabel`  | text     | no       | Contents label   | *Optional. A shorter version for the contents list, when the heading is too long for the rail.* Explains and absorbs design inconsistency 2 |
| `lede`      | text     | no       | Lede             | *The chapter's one summary line, e.g. "What defines a diamond". Further emphasis belongs in the body as bold text.* The boundary is in the description on purpose (research R3) |
| `body`      | richText | yes      | Body             | Lexical with **headings removed** from the feature set. Paragraphs, bold, italic, links, ordered and unordered lists. Serialised to HTML in the mapper and rendered by the kit's `RichText` |
| `pullQuote` | textarea | no       | Pull quote       | *A line to set apart from the surrounding text.* Rendered as a `<blockquote>` with a rule, as drawn at `312:8506` |

**Why headings are removed from `body`**: the outline is a contract — `h1` is the title, `h2` is the
chapter. A heading inserted inside a body creates a section the contents rail cannot see and an
outline a screen reader reads as broken. Field-level restriction is Constitution IV's "invalid
content cannot be published in the first place" applied to structure.

**Access**: `read: adminOrPublishedStatus`; `create`/`update`/`delete`: `isAdmin`. The read rule is
what makes a draft *unreachable* rather than hidden, through the REST API as well as the page
(FR-037, research R16).

**Versions**: `{ drafts: true }`.

**Hooks**: `afterChange: [revalidateArticleOnChange]`, `afterDelete: [revalidateArticleOnDelete]` —
the narrow pair introduced by this feature, which mark `/blog/<slug>` and the address a renamed
article has just left, and nothing else. Deliberately **not** the shared `revalidateOnChange`, which
walks every product slug (research R6).

---

## Global: `blog-page`

**Label**: *Blog page*. **Admin group**: Content. One record: the index's own copy.

| Field              | Type     | Required | Label            | Default (drawn copy) |
| ------------------ | -------- | -------- | ---------------- | -------------------- |
| `eyebrow`          | text     | no       | Eyebrow          | `OUR BLOG` |
| `heading`          | textarea | yes      | Headline         | `Stories of diamonds, craftsmanship, and timeless beauty` |
| `emptyTitle`       | text     | yes      | Empty heading    | `Nothing published yet` |
| `emptyDescription` | textarea | yes      | Empty message    | `The first stories are being written. Check back soon.` |
| `seo`              | group    | no       | SEO              | `seoField()` |

**Defaults are content, not code.** A `defaultValue` applies until the global is first saved, so a
fresh install renders the drawn page rather than a blank one, and every string remains something an
editor can change. This is the mechanism 006 used and the reason FR-053 is satisfiable without a
hardcoded fallback in a component.

**Access**: `read: () => true`; `update`: `isAdmin`.

**Versions**: `{ drafts: true }`, consistent with `story-page`.

**Hooks**: none — `/blog` is `force-dynamic`, so there is nothing cached to invalidate.

---

## View models (`src/lib/blog/types.ts`)

What a component is allowed to see. Narrower than the documents by design: no `_status`, no
unresolved relationships, no lexical trees. Derived from the generated types rather than restated
beside them, so a schema change surfaces as a type error.

```
ArticleCard      { title, href, publishedOn, publishedLabel, category?, media? }
BlogCategory     { title, slug, href }
BlogIndexView    { eyebrow?, heading, empty, categories, tabs, cards, shown, total, moreHref }
Chapter          { anchor, heading, tocLabel, lede?, bodyHtml, pullQuote? }
ArticleView      { title, href, standfirst, publishedOn, publishedLabel, category?,
                   hero?, chapters, contents, seo, fallbacks }
```

- `category` is optional on both card and article because a category can be deleted out from under a
  published article (research R14). Optionality here *is* FR-041.
- `media` on a card is `StoryMedia`-shaped and reuses that type: `src`, `width` and `height` are
  always a still, so the card reserves its box before anything loads and layout shift is
  structurally impossible rather than carefully avoided.
- `contents` is derived from `chapters` in the mapper, never stored, and is empty when the article
  has fewer than two chapters (FR-028).
- `publishedOn` is ISO for `<time datetime>` and structured data; `publishedLabel` is the one display
  string (research R12).
- `fallbacks` mirrors the story page's shape — the title, description and image used when the editor
  filled in no SEO override.

## Migration

One migration creating `article_categories`, `articles`, `articles_chapters`, the `_articles_v`
version tables and `blog_page`, generated with `payload migrate:create` and shipping a tested `down`.
No existing column changes type, so the rollback is a drop. `payload-types.ts` is regenerated in the
same commit — a pull request with stale generated types fails review.
