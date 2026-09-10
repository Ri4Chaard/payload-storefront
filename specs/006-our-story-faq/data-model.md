# Phase 1 Data Model: Our Story — An Editable About Page and a Shared FAQ

**Feature**: `006-our-story-faq` | **Date**: 2026-09-10

Constitution IV requires the model to be recorded before implementation, every field labelled and
described, relationships modelled as relationship fields, and access stated explicitly. This is that
record. Field names are chosen so the same concept carries the same name everywhere — `heading`,
`body`, `eyebrow`, `media`, `cta` — because Constitution IV requires that consistency across
collections and blocks alike.

---

## 1. Reusable field configs

Two shapes are used by several blocks. Defined once in `src/fields/`, referenced everywhere, per
FR-018 and Constitution II.

### 1.1 `mediaSlot()` — `src/fields/media-slot.ts`

The photograph-or-video slot. One definition, used by four block types (seven times in the drawn
composition).

| Field | Type | Required | Label / description |
|-------|------|----------|---------------------|
| `kind` | `radio` — `photo` \| `video` | yes, default `photo` | "Show a photograph or a video". Decides what renders (FR-020) |
| `photo` | `upload` → `media` | conditional on `kind === 'photo'` | "Photograph" |
| `video` | `upload` → `media` | conditional on `kind === 'video'` | "Video — choose an uploaded video from the media library" |
| `poster` | `upload` → `media` | conditional on `kind === 'video'`, **required** | "Still image — shown before the video plays, and instead of it for visitors who ask for reduced motion" |
| `background` | `checkbox` | no, default `false` | "Lay text over this media" — set by the block, not the editor, where the block's design fixes it |

**`kind` is explicit rather than inferred** (FR-020): when a slot holds both a photograph and a video
because the editor switched back and forth, `kind` decides, never "whichever is present".

**`poster` is required when `kind === 'video'`** (FR-022). This is field-level validation, so an
invalid slot cannot be published at all — Constitution IV's "invalid content cannot be published in
the first place". FR-027's "report to the editor, naming the slot" is the admin's own field error,
not a bespoke mechanism.

**Alt text is not a field here.** It lives on the `media` document (`media.alt`, already
`required: true`), so one photograph carries one description wherever it is used. FR-025 is satisfied
by the upload collection, not by seven copies of an alt field.

### 1.2 `ctaField()` — `src/fields/cta.ts`

An optional call to action. Used by `banner` and `faq`.

| Field | Type | Required | Label / description |
|-------|------|----------|---------------------|
| `label` | `text` | no | "Button text. Leave empty for no button." |
| `href` | `text` | no | "Where the button goes, e.g. `/all-jewelry`." |

Both empty renders no button (FR-011, FR-013). The destination is editor-controlled, which is why a
CTA pointing at an unbuilt page is an editing mistake to make visible rather than a crash — see the
spec's edge cases.

---

## 2. Blocks — `src/blocks/`

Registered on `config.blocks` and referenced by slug from the story global (research R2). Each is
named for what an editor sees, per Constitution IV.

### 2.1 `page-header`

| Field | Type | Notes |
|-------|------|-------|
| `eyebrow` | `text` | Drawn: `OUR STORY` |
| `heading` | `textarea` | The page title. Drawn: `IMMORTALIZING MEMORIES AND EMOTIONS IN EXTRAORDINARY, TIMELESS CREATIONS` |

Owns the page's `h1` where present (FR-051, research R7).

### 2.2 `media-plate`

| Field | Type | Notes |
|-------|------|-------|
| `media` | `mediaSlot()` | The full-bleed plate. Drawn 1920×530 / 768×400 / 390×240 |

The simplest block, and the one that makes "add a second photograph anywhere" composition rather than
code (FR-049).

### 2.3 `closer-look`

| Field | Type | Notes |
|-------|------|-------|
| `body` | `textarea` | The paragraph |
| `chips` | `array` of `{ label: text }` | Any length including none (FR-010). Drawn: six |
| `figures` | `array` of `{ word: text, caption: text }` | Drawn: three. `CERTIFIED` / `selected diamonds` etc. |
| `media` | `mediaSlot()` | The side panel |

### 2.4 `banner` — one block, two uses (FR-048, research R10)

| Field | Type | Notes |
|-------|------|-------|
| `eyebrow` | `text` | Optional. Present on the Standard banner, absent on Crafted to last |
| `heading` | `textarea` | |
| `body` | `textarea` | |
| `cta` | `ctaField()` | Present on the Standard banner, absent on Crafted to last |
| `media` | `mediaSlot()` | The background plate |
| `textSide` | `select` — `left` \| `right` | Default `left`. **Desktop only** — both tablet and mobile frames put text left regardless |

### 2.5 `process-steps`

| Field | Type | Notes |
|-------|------|-------|
| `heading` | `text` | Drawn: `FROM DIAMOND TO JEWEL` |
| `steps` | `array` of `{ media: mediaSlot(), title: text, caption: text }` | Reorderable. Drawn: three |

**No ordinal field.** The `01` / `02` / `03` shown on each step is the row's position (FR-012), so an
editor cannot produce a list numbered 1, 2, 2.

### 2.6 `faq`

| Field | Type | Notes |
|-------|------|-------|
| `heading` | `text` | Drawn: `EVERY DETAIL, ANSWERED` |
| `body` | `textarea` | The intro paragraph |
| `cta` | `ctaField()` | Drawn: `CONTACT US` |
| `questions` | `relationship` → `questions`, `hasMany: true` | The selection. **Array order is display order** (FR-032, research R8) |

A relationship field, never a stored id in a text field — Constitution IV.

---

## 3. Collection: `questions` — `src/collections/questions.ts`

Admin label **FAQ** (research R13). Group `Content`.

| Field | Type | Required | Label / description |
|-------|------|----------|---------------------|
| `question` | `text` | **yes** | "The question, as a visitor would ask it." |
| `answer` | `richText` (lexical) | **yes** | "The answer. Links and lists are supported." |
| `order` | `number` | no, default `0` | Sidebar. "Lowest first, in the admin list and on the FAQ page." |

**Config**

```
slug:     'questions'
labels:   { singular: 'Question', plural: 'FAQ' }
admin:    { useAsTitle: 'question', defaultColumns: ['question', 'order', '_status'], group: 'Content' }
versions: { drafts: true }
access:   read:   adminOrPublishedStatus
          create: isAdmin
          update: isAdmin
          delete: isAdmin
hooks:    none — see below
```

**Why `adminOrPublishedStatus` and not `() => true`.** FR-033 requires an unpublished question to
disappear from the story page with no further edit, and FR-036 restricts changes to admins. The
existing helper returns a `Where` constraining `_status` for non-admins, which makes a draft
*unreachable* rather than merely hidden — the mechanism `src/lib/access.ts` documents. Publishing
state does the filtering; the loader passes `overrideAccess: false` and never writes a status filter
of its own.

**Why `required: true` on both fields.** FR-030 — a question with an empty answer cannot be
usefully opened, so the model prevents it rather than the renderer coping with it.

**Why no revalidation hook.** `/about` is `force-dynamic` (research R6), so there is nothing cached to
invalidate. Attaching `revalidateOnChange` would evict every product page in the shop because
somebody fixed a typo in an answer.

---

## 4. Global: `story-page` — `src/globals/story-page.ts`

```
slug:     'story-page'
label:    'Story page'
admin:    { group: 'Content', description: 'The /about page. Compose it from the blocks below.' }
versions: { drafts: true }
access:   read:   () => true      — the page is public
          update: isAdmin         — FR-017, stated, not inherited
hooks:    none — see §3
```

| Field | Type | Notes |
|-------|------|-------|
| `body` | `blocks` — `blockReferences: ['page-header','media-plate','closer-look','banner','process-steps','faq']`, `blocks: []` | The composition (FR-046). Reorderable; `admin.isSortable` left at its default of sortable |
| `seo` | `seoField()` | Reused unchanged from `src/fields/seo.ts` (FR-039) |

`body` carries a `defaultValue` holding the seven drawn bands with their drawn copy (FR-052,
research R11). Media slots in the default are empty until the photographs are seeded.

**`read: () => true`** is stated deliberately, matching `shop` and `contact-settings`. Draft
protection comes from the loader passing `overrideAccess: false` together with `draft: false`, not
from the read rule — a global's drafts are a version query, not a row filter.

---

## 5. Changes to existing model

| File | Change | Migration? |
|------|--------|-----------|
| `src/collections/media.ts` | `mimeTypes: ['image/*', 'video/*']` | No — config only, no columns (research R3) |
| `src/payload.config.ts` | register `blocks`, `Questions`, `StoryPage`; add `upload.limits.fileSize` | No columns from the limit; yes for the collection and global |
| `eslint-rules/catalog-boundary.mjs` | add `/^src\/blocks\//` and `/^src\/lib\/story\//` to `DOCUMENT_TYPE_READERS` | N/A (research R4) |

One migration via `payload migrate:create`, with a tested rollback, covering the `questions` table,
the `story_page` global table and the block tables. `pnpm generate:types` in the same commit.

---

## 6. View models — `src/lib/story/types.ts`

What components are allowed to see. Deliberately narrower than the documents: no `_status`, no
unresolved relationships, no lexical trees. Derived from the generated types rather than restated, so
a schema change surfaces as a type error — the rule `src/lib/catalog/types.ts` sets.

```
StoryMedia
  kind: 'photo' | 'video'
  src, width, height        the photograph, or the video's poster — always present, so a
                            box can be reserved before anything loads (FR-024b)
  alt?                      absent where the media is decoration beside text that names it
  videoSrc?                 present only when kind === 'video'
  background: boolean

Cta                         { label, href } — the whole object absent when unset

StoryBlock                  a discriminated union on `type`:
  { type: 'page-header',   headingLevel, eyebrow?, heading }
  { type: 'media-plate',   media }
  { type: 'closer-look',   headingLevel, body, chips[], figures[], media? }
  { type: 'banner',        headingLevel, eyebrow?, heading, body, cta?, media?, textSide }
  { type: 'process-steps', headingLevel, heading, steps[] }
  { type: 'faq',           headingLevel, heading, body, cta?, questions[] }

StoryQuestion               { id, question, answerHtml }   answerHtml already serialised
StoryPage                   { blocks: StoryBlock[], seo }
```

**`headingLevel` is assigned by the mapper**, never chosen by a component (FR-051, research R7).

**`answerHtml` is a string, not a lexical document.** Serialisation happens once in the mapper using
the `convertLexicalToHTML` path `src/lib/catalog/mappers.ts` already established, returning `null`
for an empty document so callers can close the layout over it.

**A block whose content is absent is dropped by the mapper**, not rendered as an empty frame
(FR-004). The route therefore never has to ask "is this band worth showing".

---

## 7. Validation rules, gathered

| Rule | Where enforced | Requirement |
|------|----------------|-------------|
| A video slot must have a poster | Field-level `required` conditional on `kind` | FR-022, FR-027 |
| A question needs a question and an answer | Field-level `required` | FR-030 |
| Video uploads bounded by size and format | `config.upload.limits.fileSize`, `media.mimeTypes` | FR-021b |
| A question chosen twice appears once | Mapper de-duplicates by id | FR-032 |
| Unpublished questions never reach the page | Access rule `adminOrPublishedStatus` + `overrideAccess: false` | FR-033, FR-036 |
| Exactly one `h1` in any arrangement | Mapper assigns heading levels | FR-006, FR-051 |
| An empty block is omitted | Mapper drops it | FR-004 |
| An empty composition renders a coherent page | Route renders chrome with no body | FR-053 |
