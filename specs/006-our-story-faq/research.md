# Phase 0 Research: Our Story — An Editable About Page and a Shared FAQ

**Feature**: `006-our-story-faq` | **Date**: 2026-09-10

Every decision below was checked against the installed packages or the repository, not recalled.
Where a claim comes from a source file, the file is named so the next person can re-check it when a
version moves.

---

## R1 — The story page is a Payload **global** with a blocks body

**Decision**: A global, slug `story-page`, with `versions: { drafts: true }` and a `blocks` field as
its body. Not a collection, not a `pages` collection with one row.

**Rationale**: The spec says a single record, not a list (Key Entities), and Out of Scope rules out a
general `pages` collection. Globals in Payload 3.88 support drafts, versions and preview —
`node_modules/payload/dist/globals/config/types.d.ts` carries `versions?: boolean |
IncomingGlobalVersions` and `preview?: GeneratePreviewURL` — so FR-015 costs nothing extra. The three
existing globals (`shop`, `account-settings`, `contact-settings`) establish the pattern.

**Alternatives considered**:
- *A `pages` collection with a slug field.* Delivers routing for free but is explicitly out of scope,
  and it would need a slug, access rules and a catch-all route for one page.
- *A collection with `maxRows`-style enforcement.* Payload has no single-row collection; enforcing
  "exactly one" in a hook is a worse global.

---

## R2 — Blocks are defined at config level and referenced by slug

**Decision**: Block definitions live in `src/blocks/*.ts`, are registered on `config.blocks`, and the
story global's field uses `blockReferences: ['page-header', …]` with `blocks: []`.

**Rationale**: This is precisely FR-050 ("shared definitions available to any page"), and Payload
3.88 supports it directly. `node_modules/payload/dist/config/types.d.ts:920` declares
`blocks?: Block[]` on the root config, and `dist/fields/config/types.d.ts:1248` declares
`blockReferences?: (Block | BlockSlug)[]` on the blocks field — "allows you to also pass strings that
are slugs of blocks defined in `config.blocks`". Referencing by slug also keeps the generated types
from duplicating every block's shape into every consumer, which matters once `/faq` and the blog
reference the same blocks.

**Gotcha, verified**: `blocks: Block[]` is **required** on the field type, not optional. The field
must therefore be written as `{ type: 'blocks', blockReferences: [...], blocks: [] }`. Omitting
`blocks` is a type error, and passing the definitions in both places would defeat the point.

**Note for the future**: the type carries `@todo blockReferences will be merged with blocks in 4.0`.
This is a Payload-4 migration item, not a reason to avoid the API now.

**Alternatives considered**:
- *Inline block definitions on the field.* Simpler to read, but scopes them to the story page and
  makes FR-050 false the moment a second page wants one.

---

## R3 — Video lives in the existing media library, not a second collection

**Decision**: Widen `Media.mimeTypes` from `['image/*']` to `['image/*', 'video/*']`. No `videos`
collection. Add `upload.limits.fileSize` on the config for FR-021b.

**Rationale**: FR-021a says "the media library MUST accept video uploads", and the user's own words
were "only paste videos from media". The obvious objection — that `imageSizes` and `focalPoint` would
break on a video — does not hold: `node_modules/payload/dist/uploads/generateFileData.js:146` gates
all resizing on `if (fileSupportsResize || isImage(file.mimetype))`, so a video upload skips size
generation entirely and simply stores no `sizes`. The file-size limit is configured at
`config.upload.limits.fileSize` (`dist/config/types.d.ts` — the busboy/express-fileupload options
hang off `config.upload`), which refuses an oversized file at upload time as FR-021b requires.

**Consequences to handle rather than discover**:
- A video document has no `sizes`, so anything that assumes `sizes.md.url` must branch on mimetype.
  The view-model mapper is where that branch lives, once.
- `media.alt` is `required: true`. That is correct for video too — FR-025 wants an accessible
  description either way.
- The admin list view will show no thumbnail for a video row. Acceptable; the filename and alt text
  identify it.

**Alternatives considered**:
- *A separate `videos` upload collection.* Cleanly separates the two shapes, but gives the owner two
  libraries for one mental model and contradicts the brief's wording. Rejected.
- *Accepting a pasted YouTube/Vimeo URL.* Explicitly reversed by the requester in spec iteration 3,
  and out of scope. It would also have cost a third-party player against the JS budget.

---

## R4 — This feature needs its own data tier, `src/lib/story/`

**Decision**: `src/lib/story/{types,mappers,queries}.ts`, mirroring `src/lib/catalog/`. Components
receive view models; only this tier sees Payload documents. `eslint-rules/catalog-boundary.mjs` must
be extended so the rule stops firing on correct code.

**Rationale**: `catalog-boundary.mjs` defines `no-document-types`, which forbids importing
`@/payload-types` outside an allowlist. The current allowlist is `src/lib/catalog/`, `src/mocks/`,
`src/collections/`, `src/fields/`, `src/globals/`, `src/hooks/`, `src/app/(payload)/`,
`payload.config.ts`, `scripts/`, `tests/`. **Neither `src/blocks/` nor `src/lib/story/` is on it**,
so both would be reported today. The rule's own docblock says the Payload-side allowances are "listed
ahead of needing them… a rule that fires on correct code is a rule people disable" — so widening it
is the intended maintenance, not a workaround.

The rule exists for a reason that applies directly here: a component holding a document can render a
draft. FR-017 and FR-036 make drafts unreachable through access control, and the view-model boundary
is what stops a block renderer from second-guessing that.

**Two entries to add**: `/^src\/blocks\//` (block definitions are modelling code, like `src/fields/`)
and `/^src\/lib\/story\//` (the data tier, like `src/lib/catalog/`).

---

## R5 — The video slot is a `<video>` element and an observer, not a player

**Decision**: `src/components/ui/media/` — a server component that picks the branch, and one
`'use client'` leaf, `video-media.tsx`, that owns the observer and the reduced-motion check. No
dependency added.

**Rationale**: Everything FR-022 – FR-024a asks for is native. `poster`, `muted`, `loop`,
`playsInline` and `preload` are `<video>` attributes. What is *not* native is the two suppression
rules, and neither can be done in CSS:

- **Reduced motion (FR-024)** cannot stop autoplay from a stylesheet. It needs
  `matchMedia('(prefers-reduced-motion: reduce)')`.
- **Deferred download (FR-024a)** conflicts with `autoPlay`: setting `autoPlay` makes the browser
  fetch immediately regardless of `preload="none"`. So the client leaf withholds the `src` until the
  slot intersects the viewport *and* motion is allowed, and renders the poster until then.

That is a few dozen lines of client JS, mounted only on slots that actually hold a video — a
photograph slot ships none of it. This is the "push `use client` as far down the tree as possible"
Constitution V requires.

**Amended 2026-09-10, by measuring it.** The first implementation set the `<video>` element's
`poster` attribute *as well as* rendering the optimised `next/image` beneath it. That is worse than
either alone: on a throttled mobile profile `/about` measured **LCP 2.59s against a 2.5s budget**,
and the LCP element was the `<video>` painting its raw `poster` attribute — a second, unoptimised
copy of an image already on screen, arriving late enough to become the largest paint. The same page
with all seven slots as photographs measured 1.44s. The attribute is now unset: a `<video>` sits
transparent over the image until its first frame decodes, so the optimised poster covers that gap
anyway. Recorded here because the reasoning that produced the bug — "belt and braces, set both" —
is exactly the reasoning that would reintroduce it.

**Alternatives considered**:
- *A video library.* Rejected on the JS budget and Constitution II — nothing here needs a player.
- *Server-rendered `<video autoplay muted loop>` with no client code.* Simplest, and fails FR-024 and
  FR-024a outright.
- *CSS `@media (prefers-reduced-motion)` to hide the video and show the poster.* The video would
  still autoplay and still download; it would merely be invisible.

---

## R6 — `/about` renders dynamically, for the reason the home page does

**Decision**: `export const dynamic = 'force-dynamic'` on the route. No entry in
`src/lib/revalidate.ts`, and **no revalidation hook on the story global or the questions
collection**.

**Rationale**: This is the repository's already-reasoned answer to a page with no dynamic segment.
`src/lib/catalog/prerender.ts` documents that the production image runs `next build` inside the
container *before* the migrations, so on a first deploy the database is not merely unreachable — its
tables do not exist. Dynamic routes degrade gracefully by prerendering nothing. `src/app/(frontend)/page.tsx`
spells out why a route with no dynamic segment cannot: Next prerenders it at build, so a build with
no database "would bake a home page with no categories and no featured pieces, and it would stay that
way until somebody happened to edit something in the admin. An empty band that never heals is worse
than two queries." `/about` has exactly that shape and exactly that failure mode.

**The revalidation blast radius makes this more attractive, not less.** `revalidateGlobalOnChange`
calls `invalidate()`, which queries every product slug and calls `revalidatePath` on each. Attaching
it to the story global would mean editing a paragraph on the About page evicts every product page in
the shop. Under `force-dynamic` there is nothing to invalidate, so FR-041 and SC-008 are satisfied by
construction and the blast radius never exists.

**Cost, stated plainly**: two small Local API reads per request — one global, one question list —
both deduped within a render by `cache()`. The photographs, which is what the visitor waits for, are
unaffected. `revalidate.ts`'s docblock explicitly invites the reverse decision later: "If any of
these is ever made cacheable, its path belongs in `invalidate()`." If the deployment ever builds with
a reachable database, `/about` becomes cacheable and gets a **targeted** `revalidatePath('/about')`
hook — not the catalogue-wide one.

**Caching model note**: `next.config.mjs` does not set `cacheComponents`, so this project is on Next
16's *previous* caching model — `generateStaticParams`, `export const dynamic`, `revalidatePath`.
`use cache` / `cacheLife` / `cacheTag` are the Cache Components API and must not be introduced here;
mixing models in one app is not a change this feature should make.

---

## R7 — Heading ownership is decided in the mapper, not in the components

**Decision**: `src/lib/story/mappers.ts` walks the ordered block list, marks the first block able to
own the page title, and stamps a `headingLevel` on every block's view model. Components render the
level they are given.

**Rationale**: FR-051 exists only because reordering made the arrangement unknown in advance. Putting
the rule in a component means each component guessing about its neighbours; putting it in the mapper
makes it one function over an array, unit-testable without rendering, and impossible for a component
to contradict. `Accordion` already accepts `headingLevel?: 2 | 3 | 4`, so the FAQ band needs no
change to comply.

**The rule**: the first `page-header` block owns `h1`. If the composition has no `page-header`, the
first block with a heading of any kind owns it. Every other block heading is `h2`, and headings
nested inside a block (a step title, a question) are `h3`. This satisfies FR-006 in every
arrangement, including zero page-headers and two.

---

## R8 — Question ordering: an `order` field, not Payload's experimental `orderable`

**Decision**: `questions` gets a plain `order` number field in the sidebar, matching
`src/collections/categories.ts`. The story page's FAQ block selects questions through a
`relationship … hasMany` field whose **array order is the display order**.

**Rationale**: Payload 3.88 has `orderable?: boolean` on collections
(`dist/collections/config/types.d.ts:598`) which gives drag handles in the list view via fractional
indexing — but it is annotated `@experimental There may be frequent breaking changes to this API`.
That is not a foundation to put an editor workflow on when the house pattern (`categories.order`)
already exists and works.

The two orderings serve different consumers and cannot disagree in a way that matters: FR-032 says
the story page shows questions "in an order the editor controls", and the relationship array is that
control — the same reasoning `contact-settings.ts` records for the messenger array ("Row order *is*
display order — there is no `position` number two rows could share"). The collection's `order` field
is the default sort for the admin list and for the future `/faq` page, which is what FR-029's
"position" is for.

**FR-038 (grouping later)**: satisfied without a field today. Adding a nullable `group` field in the
`/faq` spec changes nothing already written — every existing question keeps its question and answer
untouched and simply has no group. Adding it speculatively now would be a field no editor can
interpret, which Constitution IV forbids.

---

## R9 — `RichText` is promoted to the UI kit, not copied

**Decision**: Move the `RichText` component and its `PROSE` class list out of
`src/components/commerce/product-details/product-details.tsx` into `src/components/ui/rich-text/`,
with stories. The product page imports it from there.

**Rationale**: Constitution II — "A component belongs in the shared UI kit the moment it has a second
consumer. The second usage is the trigger to promote it, not to duplicate it." FAQ answers are rich
text (FR-029) and need exactly this rendering. The serialisation path is already established:
`src/lib/catalog/mappers.ts` uses `convertLexicalToHTML` from `@payloadcms/richtext-lexical/html`
with `disableContainer: true`, returning `null` for an empty document so callers can close the layout
over it. `src/lib/story/mappers.ts` reuses that helper's shape.

`pnpm check:stories` enforces that anything in `src/components/ui/` has a stories file, so the
promotion carries that obligation.

---

## R10 — Both banner bands are one block and one component

**Decision**: One block `banner`, one component, with variants for text side, eyebrow presence and
call-to-action presence.

**Rationale**: FR-048 requires it, and the design supports it — reading the Figma frames, "The
Aurum Standard" (`312:6926`) and "Crafted to last" (`312:6967`) differ in exactly three properties:
which side the text column sits on, whether an eyebrow renders, and whether the band ends in a
button. Three optional properties is a variant set. Constitution II's `ProductCard` /
`ProductCardNew` clause applies to blocks as directly as to components.

Note the tablet and mobile frames collapse the side choice: at 768 and 390 both banners put text on
the left. So `textSide` is a desktop-only property, which the component honours by applying it above
the `lg` breakpoint only.

---

## R11 — The drawn composition ships as field defaults, plus a seed step for photographs

**Decision**: The blocks field carries a `defaultValue` holding the seven drawn bands with their
drawn copy. The photographs are added by a step in the existing seed script.

**Rationale**: FR-052 says an untouched install renders the drawn arrangement. A global's
`defaultValue` applies until the global is first saved, which is exactly "untouched". Copy can be a
default; an upload cannot — a media slot references a document that must exist first.

**Honest limitation**: until the seven photographs are exported from Figma and seeded, a fresh
install renders seven bands with collapsed media slots. That is correct behaviour under FR-024b, but
it is not yet FR-052's shipped default, and Phase 6 of the plan names it as an external dependency
rather than pretending it is done.

---

## R12 — Migration shape

**Decision**: One migration created with `payload migrate:create`, covering the `questions` table,
the `story_page` global table and the block tables Payload generates for the blocks field. Rollback
tested against a database with content in it.

**Rationale**: Constitution IV requires a tested rollback and verification against a
production-sized content set; the workflow section makes it a merge gate. Two things are *not* in the
migration and are worth stating so nobody looks for them: widening `media.mimeTypes` is a config-only
change with no column impact, and `config.upload.limits.fileSize` likewise.

`pnpm generate:types` must run in the same commit — a stale `payload-types.ts` fails review under
the Technology Stack section.

---

## R13 — Where the FAQ tab appears in the admin

**Decision**: A new admin group `Content`, holding the `Story page` global and the `FAQ` collection.
The collection's slug is `questions`; its labels are `{ singular: 'Question', plural: 'FAQ' }`.

**Rationale**: The brief asked for "faq as separate tab in the admin panel", and the admin nav
renders a collection's plural label — so `plural: 'FAQ'` produces literally that tab. The slug stays
`questions` because Constitution IV requires plural collection slugs and consistent field naming, and
because `/api/questions` reads better than `/api/faq-entries`. The existing globals all sit under
`admin.group: 'Shop'`; editorial content is not shop configuration, so it gets its own group rather
than being filed under one that already means something else — the same reasoning
`contact-settings.ts` records for not adding its fields to `Shop`.

---

## R14 — What is reused, verified against the tree

Checked by reading each component, not by assuming:

| Need | Existing | Fit |
|------|----------|-----|
| FAQ accordion | `src/components/ui/accordion` | **Exact.** Defaults to `single: false`, so multiple rows open at once — FR-035 with no change. Accepts `headingLevel`, which R7 needs. Already `'use client'`. |
| Subject chips | `src/components/ui/chip` | Fit. Non-interactive labels; the `href` branch is unused here. |
| Calls to action | `src/components/ui/button` | Fit — has an `href` branch that renders an `<a>` styled as a button, which is what both drawn CTAs are. |
| Band gutters | `src/components/ui/container` | Fit — `as` accepts `'section'`, and `ref` is widened to `HTMLElement` for exactly this. |
| Chrome | `Header`, `ContactBanner`, `Footer` | Unchanged; already on every route. |
| Photographs | `next/image` | House pattern — there is **no** `Image` primitive despite `src/collections/media.ts` referring to one. That docblock reference is stale; components import `next/image` directly. |

**Not reused**: `src/components/sections/about-band` looks superficially close to the "closer look"
band but is a fixed home-page section reading `src/mocks/home.ts`. Reworking it onto this content
model is explicitly out of scope.

---

## R15 — Verification surfaces that already exist

- `tests/a11y/routes.spec.ts` — add `/about`; the Playwright `a11y` project runs axe over it.
- `tests/e2e/responsive.spec.ts` — add `/about` at the three widths.
- `tests/integration/` — the pattern for exercising Payload access rules against a real database is
  established by `contact-settings.test.ts` and `account-access.test.ts`.
- `pnpm check:naming`, `check:styles`, `check:tokens`, `check:stories` — all four gate this work.

---

## R16 — Measuring the JS budget

**Decision**: Measure `/about` against a running production server, gzipped as served, and record the
figure with the framework baseline it is compared against.

**Rationale**: Constitution V is explicit that the measurement is taken from "a **production
server**, not a build log", because Next 16 with Turbopack no longer prints per-route JS. The
baseline is 181KB measured on 2026-09-03, giving a 100KB delta allowance; the worst route today
spends 84KB of it. This page's own client code is two leaves — the accordion (already shipped and
counted elsewhere) and the video slot — so it should land well inside, but "should" is not a
measurement and the budget is a merge gate.
