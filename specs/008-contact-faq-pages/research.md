# Research: Contact Us and FAQ

**Feature**: `008-contact-faq-pages` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

Fourteen decisions. Six of them are "reuse what is already here, and here is the proof"; four are
genuinely new ground (a public form, its throttle, its retention, its notification); the rest are
the small structural moves those force.

---

## R1 — The contact page is flat fields, not a block composition

**Decision**: `contact-page` is a Payload **global with flat, grouped fields**, mirroring
`src/globals/blog-page.ts`. The four bands are fixed in code and their content comes from the
global. `/faq` gets a second, much smaller global on the same pattern.

**Rationale**: This site now has both patterns and a written rule for choosing between them.
`src/globals/story-page.ts` is `blockReferences` because `/about` is seven bands whose order is
genuinely the editor's — they could sensibly appear in any sequence, and two of them appear twice.
`src/globals/blog-page.ts` is flat because the mosaic **is** the page rather than a band somebody
may move, and it records the reasoning verbatim: a blocks body "would offer an editor the ability to
reorder a header against a grid that is not in the list, which is a worse admin than four labelled
fields."

`/contact` is the `blog-page` case. The channel grid and the message form are the page's purpose.
Modelled as blocks, the admin would offer "delete the contact form from the contact page" and "put
the FAQ above the headline" as first-class actions, and every one of those arrangements is worse
than the drawn one. The requester also described the page as "static texts", which is the same
instinct arriving from the other direction.

**What this does not mean**: nothing becomes hardcoded. Constitution I is satisfied by the global
holding every string (FR-042), and `PageHeaderBlock` is reused as a **component** taking props —
exactly what `src/app/(frontend)/blog/page.tsx:112` already does. Its own doc comment records that
this is why its props were decoupled from `StoryBlock` in spec 007.

**Alternatives considered**:

- *Block-composed like `/about`.* Reuses the `page-header` and `faq` block definitions directly, and
  would let a future second contact page exist. Rejected: the two bands that matter cannot be
  blocks without making the page incoherent, so it would be a blocks field containing two movable
  bands and two immovable ones — the worst of both models.
- *A `pages` collection with routing.* Explicitly out of scope in spec 006 and unchanged here.

---

## R2 — The channel cards are `FeatureCard` with a link, not a new card

**Decision**: Reuse `src/components/ui/feature-card/` for the four channel cards, widening it with
an optional `href`. Write a **new arrangement** component for the grid rather than reusing
`FeatureStrip`.

**Rationale**: The drawn card is the service-promise card. Both are a glyph at the top of a white
panel with a title and a line of text at the bottom; both are four across at desktop and 2×2 at
tablet; the drawn desktop height (290) is `FeatureCard`'s `xl:min-h-72.5` exactly. Constitution II's
"if an existing component is 80% right, extend it with props or variants" is not a close call here.

Two things genuinely differ, and only one is the card's business:

1. **The value is a link.** `+1 (555) 010 20-30` opens WhatsApp; `hello@aurum.example` opens a
   `mailto:`. That is an optional `href` on the card — a prop, not a variant.
2. **The mobile arrangement is a stacked list**, where `FeatureStrip` is a sideways scroller. That
   is not the card, it is the container, and `FeatureStrip`'s own comment explains it is a
   `ScrollArea` because four 250px cards in a 390px frame "can only be read by scrolling sideways".
   The contact cards are 358 wide at 390 — full width, stacked. A different container is the right
   answer; reaching for `FeatureStrip` and adding a "don't scroll" flag would be the wrong one.

**Alternatives considered**:

- *A new `ContactCard`.* Rejected under Constitution II — it would be `FeatureCard` with a link, and
  `ProductCard`/`ProductCardNew` is the named failure mode.
- *Making the whole card the link.* Not drawn — the design underlines the value line only. A card
  that is entirely a link also makes the title and the value one announcement for a screen reader.

**To verify during implementation**: the drawn cards read as panels separated by hairlines at
desktop. `FeatureCard` gets its separation from `bg-background-container` on the page ground plus
gutters. Confirm against `get_design_context` on `312:8535` before styling.

---

## R3 — The form works without JavaScript, which rules out the account-form pattern

**Decision**: `<form action={formAction}>` with `useActionState`, a server action taking
`(prevState, formData)`, and zod parsing the `FormData` on the server. The form is one `'use client'`
leaf. **It deliberately does not follow `src/lib/auth/`'s react-hook-form pattern.**

**Rationale**: FR-018 requires the form to work with JavaScript unavailable. The account forms use
react-hook-form with an `onSubmit` handler and server actions that take **typed values, not
`FormData`** — `src/lib/auth/actions.ts` records why ("Passing typed values rather than `FormData` is
what lets one schema serve both sides"). That design cannot progressively enhance: with no JS there
is no handler to run.

Next 16's own guide (`node_modules/next/dist/docs/01-app/02-guides/forms.md`) documents the
alternative precisely: React extends `<form>` so the action receives `FormData`, `useActionState`
changes the signature to `(initialState, formData)`, and the returned state drives error rendering
and the `pending` flag. With no JS the browser posts the form and the server re-renders the page
with that state.

**Consequences that must be built deliberately, not assumed**:

- **Re-populating the form on error.** With JS, React preserves the DOM. Without it, the page is
  re-rendered from scratch, so the action must return the submitted values and the inputs must read
  them as `defaultValue` — otherwise FR-019 and FR-022's "keep what the visitor wrote" silently
  fails in exactly the mode nobody tests.
- **Focus and announcement.** `aria-live="polite"` on the status region and `aria-describedby` on
  each failing control. Moving focus to the first invalid field (FR-019) is the enhanced path only;
  without JS the browser lands at the top of the re-rendered page, which is acceptable because the
  error summary is there.
- **Double submission.** `pending` disables the button on the enhanced path (FR-020). Without JS the
  browser's own navigation blocks it.

**Alternatives considered**:

- *react-hook-form, matching the account forms.* Consistent, and rejected: it cannot satisfy FR-018,
  and consistency with a pattern that cannot meet the requirement is not a virtue. The divergence is
  recorded here so the next reader does not "fix" it.
- *A route handler and a plain HTML form.* Works without JS, but gives up `pending`, the typed
  result, and single-round-trip rendering, and adds a public endpoint to secure separately.

---

## R4 — Two data tiers: `src/lib/contact/` absorbs the old file, `src/lib/questions/` is promoted

**Decision**:

- **Move** `src/lib/contact.ts` → `src/lib/contact/defaults.ts`, and build the contact page's tier
  around it in `src/lib/contact/`.
- **Promote** the question view model, mapper and loaders out of `src/lib/story/` into a new
  `src/lib/questions/` tier, and have `src/lib/story/` consume it.
- Add both directories to `DOCUMENT_TYPE_READERS` in `eslint-rules/catalog-boundary.mjs`.

**Rationale**: `catalog/no-document-types` forbids components from importing `@/payload-types`, so
every feature needs a tier where documents become view models. `src/lib/catalog/`, `src/lib/story/`
and `src/lib/blog/` are the three that exist; this feature needs a fourth, and the rule's allowlist
must be widened in the same change or it fires on correct code the moment the file is written —
`catalog-boundary.mjs:82-87` says exactly that about the blog.

**Why the move rather than a new name**: `src/lib/contact.ts` already owns the name. A sibling
`src/lib/contact/` beside it resolves ambiguously and reads as a mistake. The file has **two**
importers (`src/globals/contact-settings.ts`, `src/lib/messengers/settings.ts`), so the move is two
import edits, and it puts the shop's contact defaults inside the tier that is about contact.

**Why questions get promoted**: `src/lib/story/queries.ts:19` predicted this and got it half right —
"When `/faq` is built it adds its own function to this file, reading the same collection." That was
written when questions had one consumer. They now have three (`/about`, `/contact`, `/faq`), and a
`/faq` page reading its questions out of a module named `story` is the coupling spec 007 had to undo
on `PageHeaderBlock`. Constitution II's "a component belongs in the shared kit the moment it has a
second consumer" applies to data tiers too, and this is the third.

`src/lib/questions/` exports two loaders — `getSelectedQuestions(ids)` for a relationship-driven
band and `getAllPublishedQuestions()` for `/faq` — plus the one mapper that turns a question
document into `{ id, question, answerHtml }`. The FAQ page's global is read here too, because the
FAQ page **is** the questions and a separate two-field tier would be ceremony.

**Alternatives considered**:

- *Leave questions in `src/lib/story/` and import it from `/contact` and `/faq`.* One import line
  cheaper today, and it makes "the story page's tier" a dependency of two pages that have nothing to
  do with the story page. Rejected for the reason 007 recorded when it hit the same shape.
- *Name the new tier `src/lib/contact-page/` to avoid the move.* Leaves two modules called contact
  and puts the shop's phone-number formatter outside the contact tier.

---

## R5 — The throttle counts stored enquiries; no new table

**Decision**: Refuse a submission when either the **email address** or a **keyed hash of the client
IP** already has 5 accepted enquiries inside the trailing hour. Both are counted with a `count`
query against `enquiries` itself. The hash is stored on the enquiry row and dies with it.
`ENQUIRY_RATE_LIMIT` and `ENQUIRY_RATE_WINDOW_MS` live in `src/lib/contact/config.ts`.

**Rationale**: FR-027 requires a limit that "survives a redeploy and holds across instances", which
rules out an in-process counter — `src/lib/auth/codes.ts:81-84` already rejected exactly that for
the auth codes, in those words. It also requires that a refused submission **not be recorded**, so
the counter cannot be "rows written including rejected ones". Counting accepted rows in the window
satisfies both with no second table and no second thing to purge.

**Why a hash and not the IP**: an address alone is a weak key — a script varies it trivially. An IP
is the useful second key and is personal data, so it is reduced to a keyed HMAC under
`PAYLOAD_SECRET` before storage, the same construction and for a related reason to
`src/lib/auth/codes.ts:44-50`: what protects the value is that computing candidates requires a
secret that is not in the database. It is purged with the enquiry (R7), so it inherits the retention
policy rather than needing one.

**A property worth stating plainly**: because only accepted enquiries are counted, an attacker who
hits the limit can send another 5 an hour later. That is the intended behaviour — the limit caps the
rate, not the total — and it is what SC-010 measures.

**Second layer**: a honeypot field, hidden from sight and from assistive technology
(`tabindex="-1"`, `aria-hidden="true"`, positioned off-screen rather than `display:none`, which some
bots skip), and refused on the server when filled. Cheap, needs no JavaScript, and asks the visitor
nothing — FR-027 forbids a puzzle.

**Alternatives considered**:

- *A dedicated throttle table with a TTL.* Cleaner separation and one more table to migrate, purge
  and reason about. Rejected as unearned for a form on one page.
- *A CAPTCHA.* Explicitly out of scope in the spec and forbidden by FR-027.
- *Storing the raw IP.* Rejected: it widens what an erasure request has to cover for no gain the
  hash does not give.

---

## R6 — The record is the receipt; the email is a notification that may fail

**Decision**: write the enquiry, then send the notification, then store the send's outcome on the
row. A failed send **never** rolls back the enquiry and never turns a confirmation into an error.
Compose the mail in a new `src/lib/email/enquiry.ts` following `src/lib/email/transactional.ts`,
with `replyTo` set to the visitor's address.

**Rationale**: This is the shape option B bought (see the spec's checklist). If the mail were the
receipt, a mail outage would tell a visitor their message failed when the shop is holding it. FR-021
and FR-024a make the ordering normative rather than incidental.

`replyTo` is supported end to end: `@payloadcms/email-resend/dist/index.js:51` maps
`message.replyTo` onto Resend's `reply_to`. FR-025's "a reply reaches the visitor directly" is
therefore a header, not a convention about the body — though the address appears in the body too,
so the mail is still useful if a client ignores it.

`sendPasswordChangedNotice` in `transactional.ts` is the precedent for the failure handling and says
why in its own comment: the state change has already happened, so "reporting failure to the customer
who just changed it would be a lie." Same reasoning, same shape.

**Escaping**: `transactional.ts` already carries `escapeHtml` and explains it is kept for "the day
somebody interpolates a customer's name into a subject line". That day is this feature — every one
of name, address and message is visitor-supplied (FR-026). The new module reuses it.

**Alternatives considered**:

- *Send first, record second.* Loses the message when the write fails after a successful send, and
  makes the visitor's confirmation depend on the less reliable of the two systems.
- *One transaction over both.* A mail send is not transactional; rolling back a stored enquiry
  because a third party was briefly unreachable destroys the thing worth keeping.
- *Retry queue for failed notifications.* Out of scope by the spec. The outcome is stored and shown
  (FR-029c) so the failure is visible rather than silent.

---

## R7 — Retention is a nightly job, and it already has somewhere to live

**Decision**: `src/jobs/purge-enquiries.ts`, scheduled on the existing `nightly` queue, deleting
enquiries older than `ENQUIRY_RETENTION_MS` (365 days) defined once in `src/lib/contact/config.ts`.

**Rationale**: The site already runs scheduled cleanup. `src/payload.config.ts:248-254` registers
`purgeAccountsTask` and `expireCartsTask` on a `nightly` queue drained every fifteen minutes, and
its comment explains the two-clock design: the runner is frequent, the task's own `schedule` decides
when it is enqueued. `src/jobs/purge-accounts.ts:75` is at `0 15 3 * * *`; this joins at
`0 30 3 * * *` so the two do not contend.

`src/lib/auth/config.ts` is the precedent for the constant living apart from the job
(`UNVERIFIED_ACCOUNT_TTL_MS`, `CODE_RETENTION_MS`), which is what FR-029d's "defined in one place
rather than written into the cleanup's logic" asks for.

Deletion is a hard delete. Enquiries have no drafts and nothing references them, so there is nothing
for a soft delete to protect and a "deleted" row that still holds a visitor's message is not an
erasure path (FR-029e).

**Twelve months**: long enough that an enquiry about a piece someone is still considering survives,
short enough to be defensible. Flagged in the spec's Assumptions as the owner's to confirm; changing
it is one constant.

---

## R8 — Both routes are `force-dynamic`, and neither global gets a revalidation hook

**Decision**: `export const dynamic = 'force-dynamic'` on `/contact` and `/faq`. No
`revalidateGlobalOnChange` on `contact-page` or `faq-page`, and no hook on `enquiries`.

**Rationale**: Three routes have already made this decision for two reasons that both apply
unchanged.

1. **A prerendered page would bake empty and never heal.** The production image runs `next build`
   inside the container before the migrations, with no database reachable —
   `src/lib/catalog/prerender.ts` records the chicken-and-egg, and `src/lib/messengers/settings.ts`
   records spec 005 hitting it by putting a Payload read in the root layout. A statically generated
   `/contact` would ship with no channel cards and stay that way until somebody edited something.
2. **The shared invalidation is too blunt to attach here.** `src/lib/revalidate.ts` invalidates by
   walking every product slug, so a hook on these globals would evict the whole catalogue because
   somebody fixed a typo in the form's footnote. `src/collections/questions.ts` refused the same
   hook for the same reason and says so at length.

Nothing is cached, so a publish is visible to the next visitor with no invalidation at all (FR-044).
The cost is two small global reads plus one questions query per request, deduplicated within a
render by `cache()`.

**One thing to watch**: `enquiries` must have **no** `afterChange` revalidation hook. A visitor
submitting the contact form would otherwise invalidate the product catalogue.

---

## R9 — `QuestionList` is promoted; the FAQ band gains a centred variant

**Decision**: extract the accordion-of-questions into `src/components/ui/question-list/`.
`FaqBandBlock` composes it and gains `variant?: 'split' | 'centred'`. `/faq` composes it directly
under a `PageHeaderBlock`. `FaqBandBlockProps` is decoupled from `StoryBlock` into a plain interface.

**Rationale**: Three consumers, one behaviour. The rules that make a question list correct are not
obvious and must not be written three times: `single` off so opening one does not close another
(FR-035), `icon={null}` because a dash in front of every sentence is decoration, `headingLevel`
passed down rather than guessed, and one row open on first render as the design draws. All of that
is currently inside `FaqBandBlock` with a paragraph of reasoning attached. Constitution II says the
second consumer is the trigger to promote; this is the third.

**The centred variant is a variant, not a component** (FR-034). `/about` draws copy and a `CONTACT
US` button in a left column beside the questions; `/contact` draws a centred heading over an 850-wide
column with no body and no button. Same band, different arrangement — the `banner` block already
established that two drawn arrangements of one construction are a variant set (spec 006, FR-048).

**The decoupling is the same move spec 007 made.** `FaqBandBlockProps` is currently
`Extract<StoryBlock, { type: 'faq' }>`, so rendering it from `/contact` would drag `src/lib/story`
into a route that has nothing to do with the story page. `PageHeaderBlock`'s doc comment records
that exact problem and its fix; this applies it to the second block that needs it.

**Cost**: `question-list` enters the UI kit, so `pnpm check:stories` requires a story for it.

---

## R10 — `page-header` gains an optional intro paragraph

**Decision**: add an optional `body` to both the `page-header` **block** definition and
`PageHeaderBlockProps`. `/about` and `/blog` are unaffected because it is optional.

**Rationale**: FR-007. The contact page draws a paragraph under its headline that the band cannot
currently render, and the spec requires this to be an addition to the existing band rather than a
second one that draws the same thing. Adding it to the block as well as the component means `/about`
can use it without a second change, and keeps one definition of "what a page header is".

**Schema consequence**: a new column on the `story_page` blocks table and its versions table. Folded
into this feature's single migration (R14).

---

## R11 — The form's photograph is a plain upload, not a `mediaSlot`

**Decision**: `type: 'upload'` to `media`, rendered through the kit's `Media`.

**Rationale**: `src/fields/media-slot.ts` is the shared photo-or-video config, and its own comment
explains that a video slot **requires** a poster still — four jobs are named for it. Using it here
would ask the editor for two assets to place one photograph, and would put video decoding, autoplay
and reduced-motion handling on a page that draws none of it. `seoField` already establishes the
plain `upload` for a single image.

This is not a Constitution II violation: a plain upload is not a near-copy of `mediaSlot`, it is the
simpler field `mediaSlot` is built on top of.

**Recorded limitation**: an owner who later wants a video beside the form needs a field change. That
is a deliberate trade and the drawing shows no video.

---

## R12 — `/faq` emits `schema.org/FAQPage`

**Decision**: a JSON-LD block on `/faq` only, built from the same view models the page renders.

**Rationale**: FR-052 (a SHOULD) and Constitution V's requirement for valid structured data. `/faq`
is the page whose entire content is a question-and-answer set, so it is the one that can claim the
type honestly. `/contact` does **not** get it: its FAQ band is an editor-chosen subset, and marking
a page as an FAQ when questions are its fourth band overstates what the page is.

Built from the mapped view models rather than from documents, so it cannot disagree with what is
drawn and cannot leak a draft.

---

## R13 — Two lines in the sitemap

**Decision**: add `/contact` and `/faq` to `STATIC_ROUTES` in `src/app/sitemap.ts`.

**Rationale**: The sitemap exists — spec 007 built it — and its `STATIC_ROUTES` list is where
addresses that exist regardless of published content go. `/about` is already there at `monthly` /
0.6; `/contact` and `/faq` are the same kind of page. Leaving them out would make the sitemap a
claim that is now wrong.

---

## R14 — One migration, and what is in it

**Decision**: a single migration covering everything, with a tested `down`.

**Contents**:

| Change | Kind |
| --- | --- |
| `enquiries` table | new collection |
| `contact_page` global + its versions tables | new global with drafts |
| `faq_page` global + its versions tables | new global with drafts |
| `contact_settings.enquiry_email` | new nullable column |
| `page-header` block `body` on `story_page` blocks + versions tables | new nullable column |

**Rationale**: Constitution IV requires a tested migration and a rollback path for any schema change
touching existing content. Two of the five changes do — `contact_settings` and the `story_page`
block table — and both are additive nullable columns, so `down` drops them without data loss for
anything that existed before. The three new tables drop wholesale.

`pnpm generate:types` runs in the same commit; a stale `payload-types.ts` fails review.

**Naming**: `migrations/<timestamp>_contact_and_faq.ts`, following
`20260910_135959_blog_articles.ts`.

---

## Open items carried into implementation

Neither blocks the plan; both are verifications rather than decisions.

1. **Card chrome at desktop** (R2) — confirm the hairline separation between the four cards against
   `get_design_context` on `312:8535` before styling.
2. **The drawn footnote's typo** — `We'll get back to you ass soon as possible.` ships corrected
   (FR-046). Worth a note to the designer so the drawing and the site do not disagree.
