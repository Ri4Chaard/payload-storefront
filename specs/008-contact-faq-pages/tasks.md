---
description: "Task list for 008-contact-faq-pages"
---

# Tasks: Contact Us and FAQ — The Last Two Dead Links

**Input**: Design documents from `/specs/008-contact-faq-pages/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **Included, and not optional here.** The constitution's *Development Workflow & Quality
Gates* makes unit/integration coverage and an automated accessibility scan blocking CI gates, and
*Editorial verification* makes "actually create and preview content in the admin" a merge gate of
its own. Every contract in `contracts/` ends in a **Test obligations** section; each one is a task
below.

**Organization**: Grouped by user story, in the spec's priority order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel **with the other `[P]` tasks in the same phase** — different files, no
  dependency on incomplete work. Tasks in different phases never run together, so a file touched by
  two phases is not a conflict.
- **[Story]**: `[US1]`–`[US6]`, mapping to the spec's user stories. Setup, Foundational and Polish
  carry no story label.

## Path Conventions

Single repo, Payload CMS + Next.js App Router. Source under `src/`, tests under `tests/`.
Every path is kebab-case — `pnpm check:naming` is a blocking gate.

## Three things to know before starting

1. **Phase 2 is heavy, and deliberately so.** It carries five refactors of shipped code — one file
   move, two promotions, one decoupling, one extension — plus the whole content model. All five
   block everything after them: doing them first is the only way each stays a *move* rather than
   becoming a copy, which is the Constitution II failure this feature is most exposed to. The model
   is one migration for the same reason spec 007 gave: splitting it across story phases buys nothing
   but a second migration against the same tables.

2. **`/contact` gains its FAQ band in User Story 4, not before.** That follows the spec's own
   priorities — US4's acceptance scenarios 2 and 3 *are* the question picker — and US3's Independent
   Test says `/faq` ships "with no change to the contact page at all". So the contact page is
   complete and correct at the end of US2 with three bands rather than four. The US2 checkpoint says
   so rather than pretending otherwise.

3. **The one test that must never be allowed to invert** is T057: *a failed notification still
   returns `success`*. It is the whole reason the spec's clarification was worth asking. If it ever
   flips, a mail outage starts telling visitors their message failed while the shop is holding it.

---

## Phase 1: Setup

**Purpose**: The directory skeleton, the lint allowance the whole feature depends on, and every test
file created up front so no later task has to invent one.

- [ ] T001 Create `src/lib/contact/`, `src/lib/questions/` and `src/components/contact/`, each with a placeholder module docstring matching the header style of `src/lib/story/queries.ts`
- [ ] T002 [P] Widen `DOCUMENT_TYPE_READERS` in `eslint-rules/catalog-boundary.mjs` with `/^src\/lib\/contact\//` and `/^src\/lib\/questions\//`, extending the existing docblock to say why each is a modelling tier — per [contracts/contact-loader.md](./contracts/contact-loader.md) §1 the rule fires on correct code without this, exactly as it would have for `src/lib/blog/`
- [ ] T003 [P] Create the empty suites every later task writes into: `tests/unit/contact-mappers.test.ts`, `tests/unit/enquiry-schema.test.ts`, `tests/unit/questions-mappers.test.ts`, `tests/integration/enquiries.test.ts`, `tests/e2e/contact.spec.ts`, `tests/e2e/faq.spec.ts`, `tests/e2e/contact-admin.spec.ts`
- [ ] T004 [P] Add `/contact` and `/faq` to `ROUTES` in `tests/warm-routes.ts`, with a comment naming the specs that open them — a cold compile inside an assertion is the flake this file exists to prevent
- [ ] T005 [P] Export the form photograph from Figma node `312:8650` into `media/`. **Blocks the seed task (T096) and nothing else** — every other task works against an empty photo slot
- [ ] T006 [P] Resolve [research.md](./research.md) R2's open item: call `get_design_context` on `312:8535` and record in that section whether the four channel cards carry hairline separators or rely on gutters, so T037 styles from the drawing rather than from a guess

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The five refactors of shipped code, the content model, and the shared data tiers.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### The move, the two promotions, the decoupling and the extension

- [ ] T007 Move `src/lib/contact.ts` to `src/lib/contact/defaults.ts` unchanged, and update its two importers — `src/globals/contact-settings.ts` and `src/lib/messengers/settings.ts` — per [research.md](./research.md) R4; a directory beside a same-named module resolves ambiguously and reads as a mistake
- [ ] T008 Move the `Question` view model and its lexical-to-HTML mapper out of `src/lib/story/types.ts` and `src/lib/story/mappers.ts` into `src/lib/questions/types.ts` and `src/lib/questions/mappers.ts`, and have `src/lib/story/` import them — per [contracts/question-list.md](./contracts/question-list.md) §1, three consumers make this the promotion Constitution II requires
- [ ] T009 Move the relationship-driven question loading out of `src/lib/story/queries.ts` into `getSelectedQuestions(ids)` in `src/lib/questions/queries.ts`, keeping the row order of the relationship as the display order; update `src/lib/story/queries.ts` to call it and replace its "when `/faq` is built it adds its own function to this file" comment with a pointer to the new tier, which is where that prediction actually landed
- [ ] T010 Extract the accordion-of-questions out of `src/components/blocks/faq-band/faq-band.tsx` into `src/components/ui/question-list/question-list.tsx` with the props in [contracts/question-list.md](./contracts/question-list.md) §3, carrying across the existing reasoning for `single` off, `icon={null}` and the passed-down heading level; add it to the barrel in `src/components/ui/index.ts`
- [ ] T011 Change `FaqBandBlockProps` in `src/components/blocks/faq-band/faq-band.tsx` from `Extract<StoryBlock, { type: 'faq' }>` to the plain interface in [contracts/question-list.md](./contracts/question-list.md) §4, add `variant?: 'split' | 'centred'` defaulting to `'split'`, have it compose `QuestionList`, and pass the same fields from `src/components/blocks/block-renderer.tsx` — without this, `/contact` imports `src/lib/story/types`
- [ ] T012 [P] Add an optional `href` to `FeatureCardProps` in `src/components/ui/feature-card/feature-card.tsx` so the value line renders as a link, with focus-visible styling and no change to the card's behaviour when it is absent — per [research.md](./research.md) R2 this is the extension Constitution II requires instead of a new card
- [ ] T013 [P] Add an optional `body` to the `page-header` block in `src/blocks/page-header.ts` and to `PageHeaderBlockProps` in `src/components/blocks/page-header/page-header.tsx`, rendering it beneath the headline; optional, so `/about` and `/blog` are unaffected (FR-007, [research.md](./research.md) R10)

### The content model

- [ ] T014 [P] Create `src/collections/enquiries.ts` per [data-model.md](./data-model.md) §1 — `name`, `email` (indexed), `message`, `notification`, `notificationError`, `senderHash` (indexed) — with `useAsTitle`, `defaultColumns`, `defaultSort: '-createdAt'`, admin group `Shop`, every field `admin.readOnly`, and a docstring recording that `createdAt` **is** "when it arrived" so no second timestamp can disagree with it
- [ ] T015 State access on `src/collections/enquiries.ts` explicitly per [data-model.md](./data-model.md) §1: `create: () => false`, `read: isAdmin`, `update: () => false`, `delete: isAdmin`, with a docstring explaining that the action writes with `overrideAccess: true` — the construction `src/collections/verification-codes.ts` uses — and that `read` is admin-only rather than authenticated so a customer cannot read enquiries they sent
- [ ] T016 Add a docstring to `src/collections/enquiries.ts` recording that it deliberately carries **no** `afterChange` revalidation hook, because `src/lib/revalidate.ts` walks every product slug and one here would let a visitor evict the catalogue by submitting the contact form ([research.md](./research.md) R8)
- [ ] T017 [P] Create `src/globals/contact-page.ts` per [data-model.md](./data-model.md) §2 — the three top-level fields, the `form` group, the `faq` group and `seoField()` — with the drawn copy as `defaultValue` on every string, `versions: { drafts: true }`, `read: () => true`, `update: isAdmin`; ship the footnote's default **corrected** (`as soon as`, not the drawing's `ass soon as`) per FR-046
- [ ] T018 [P] Create `src/globals/faq-page.ts` per [data-model.md](./data-model.md) §3 — `heading`, `emptyTitle`, `emptyDescription`, `seoField()` — mirroring `src/globals/blog-page.ts` in shape, with a docstring recording that it deliberately has **no** question-selection field because publishing is the only action `/faq` needs (FR-038)
- [ ] T019 Add the optional `enquiryEmail` field to `src/globals/contact-settings.ts` directly beneath `email`, with the admin description from [data-model.md](./data-model.md) §4 so the fallback is visible in the admin rather than stated only in code
- [ ] T020 Register `Enquiries`, `ContactPage` and `FaqPage` in `src/payload.config.ts`
- [ ] T021 Run `pnpm generate:types` and commit `src/payload-types.ts` in the same change as the schema — a pull request with stale generated types fails review
- [ ] T022 Generate the migration with `pnpm payload migrate:create` (named `contact_and_faq`), review the generated SQL against [data-model.md](./data-model.md) §Migration for all five changes, and verify `down` drops the three new tables and both nullable columns with no data loss for rows that predate it

### The shared data tier

- [ ] T023 [P] Create `src/lib/contact/config.ts` holding `ENQUIRY_MAX` (name 100, email 254, message 5000), `ENQUIRY_RATE_LIMIT` (5), `ENQUIRY_RATE_WINDOW_MS` (1 hour) and `ENQUIRY_RETENTION_MS` (365 days), each with a comment giving the reasoning — the file `src/lib/auth/config.ts` is the model for both the shape and the "defined in one place" rule FR-029d requires
- [ ] T024 [P] Create `src/lib/contact/types.ts` with the `ContactPage`, `ContactForm` and `ContactFaq` view models from [contracts/contact-loader.md](./contracts/contact-loader.md) §2, documenting that `faq` is `undefined` rather than an empty list so FR-032 is a property of the model and not something a component must remember
- [ ] T025 Create `src/lib/contact/mappers.ts` turning the global into `ContactPage`, computing `fallbacks` from the page's own heading, intro and photograph, and yielding `faq: undefined` when the selection is empty or every selected question is unpublished
- [ ] T026 Create `src/lib/contact/queries.ts` with `getContactPage()` — `cache()`-wrapped, `depth: 2`, `overrideAccess: false`, `draft: false`, returning `null` only on a connection failure via `isDatabaseUnreachable()` — per [contracts/contact-loader.md](./contracts/contact-loader.md) §3 and §4, with the `depth` choice justified in a comment rather than left as Payload's default arriving by luck
- [ ] T027 [P] Write the unit coverage in `tests/unit/contact-mappers.test.ts` for [contracts/contact-loader.md](./contracts/contact-loader.md) §6: unsaved global maps to the drawn defaults; three selected questions map in the selected order rather than the collection's `order`; an empty selection and an all-unpublished selection both yield `faq: undefined`; `fallbacks` derive correctly and survive absent fields; a deleted photo reference yields `photo: undefined` rather than throwing
- [ ] T028 [P] Write the unit coverage in `tests/unit/questions-mappers.test.ts` for the promoted tier — a question document maps to `{ id, question, answerHtml }`, and an empty set is `[]` — carrying across whatever coverage existed for these in the story-page tests so the promotion is proved to be behaviour-preserving
- [ ] T029 [P] Write `src/components/ui/question-list/question-list.stories.tsx` covering collapsed, one open, several open, a long answer and a single-question list — `pnpm check:stories` is a blocking gate for anything in the UI kit
- [ ] T030 Run the existing `/about` suites (`tests/e2e/about.spec.ts`, `tests/e2e/about-admin.spec.ts`) unchanged and confirm they pass — per [contracts/question-list.md](./contracts/question-list.md) §7 the regression test for a refactor is that the shipped feature's tests do not move

**Checkpoint**: The model, the migration and the shared tiers are in. `/about` still behaves exactly as it did. No route has been added yet.

---

## Phase 3: User Story 1 - A visitor reaches the shop on the channel they already use (Priority: P1) 🎯 MVP

**Goal**: `/contact` exists and opens with four ways to reach the shop, every one of them read from
the admin rather than written in code.

**Independent Test**: Set the shop's messengers and email in the admin, open `/contact`, and confirm
each card carries the right icon, name and handle and leads to the right destination. Delivers a
working contact page with no form and no questions.

### Tests for User Story 1

- [ ] T031 [P] [US1] In `tests/e2e/contact.spec.ts`, assert the page renders one card per saved messenger plus an email card last, in the admin's arrangement, with each value a working link (SC-002)
- [ ] T032 [P] [US1] In `tests/e2e/contact.spec.ts`, assert a messenger with **Offer this messenger** unticked still appears on `/contact` (FR-012) — the check that catches someone "fixing" this into a filter, since hiding from checkout and refusing contact are different decisions
- [ ] T033 [P] [US1] In `tests/e2e/contact.spec.ts`, assert a messenger row saved without a usable destination is omitted (FR-013), and that an empty `email` field falls back to the shipped default rather than rendering a dead `mailto:`

### Implementation for User Story 1

- [ ] T034 [US1] Create `src/app/(frontend)/contact/page.tsx` with `export const dynamic = 'force-dynamic'` and a docstring recording both reasons from [research.md](./research.md) R8 — a prerendered page would bake empty in a database-less container build and never heal, and the shared `invalidate()` is too blunt to attach here
- [ ] T035 [US1] Render the page-header band on `/contact` using `PageHeaderBlock` with `headingLevel={1}` and the `body` prop added in T013, fed from `getContactPage()` — reused as a component exactly as `src/app/(frontend)/blog/page.tsx:112` already does
- [ ] T036 [US1] Create `src/components/contact/channel-grid/channel-grid.tsx` composing `FeatureCard` with the `href` added in T012, mapping each `SocialLink` to icon, platform name and displayed handle, and appending the email card last (FR-009, FR-011)
- [ ] T037 [US1] Style the grid's four-across / two-by-two / stacked arrangement in the token breakpoints per T006's finding, with a docstring recording why it is **not** built on `FeatureStrip`: that component is a `ScrollArea` because four 250px cards cannot fit a 390px frame, and these cards are full-width and stacked at that width ([research.md](./research.md) R2)
- [ ] T038 [US1] Wire the grid into `/contact` reading `getSocialLinks()` and `getContactDetails()` from `src/lib/messengers/settings.ts` unmodified — FR-008 forbids a second place to write the shop's messengers, and reusing these readers is what makes that structural rather than a convention
- [ ] T039 [P] [US1] Write `src/components/contact/contact.stories.tsx` covering the channel grid at one, three, four and six cards, so the arrangement is proved to hold for any number rather than only the drawn four (FR-014)
- [ ] T040 [P] [US1] Add `/contact` to `ROUTES` in `tests/a11y/routes.spec.ts`
- [ ] T041 [US1] Verify the header's **Contact us** and the footer's **Contact Us** now resolve, and that the `/about` FAQ band's **CONTACT US** button does too (SC-001)

**Checkpoint**: `/contact` renders and is useful. Three of the site's four dead links are closed. No form yet.

---

## Phase 4: User Story 2 - A visitor sends a message and knows it arrived (Priority: P2)

**Goal**: The form records what a visitor writes, notifies the shop, and tells the visitor the truth
about which of those happened — with or without JavaScript.

**Independent Test**: Submit the form with a mail transport that captures rather than sends; confirm
one enquiry is recorded, one notification carries the visitor's details, and the visitor sees a
confirmation.

### Tests for User Story 2

- [ ] T042 [P] [US2] Write `tests/unit/enquiry-schema.test.ts` per [contracts/enquiry-action.md](./contracts/enquiry-action.md) §9 — the maxima, the trimming, the address shape, and that the schema and the field validation agree because both read `ENQUIRY_MAX`
- [ ] T043 [P] [US2] In `tests/integration/enquiries.test.ts`, assert a valid submission writes exactly one row and returns `'success'`
- [ ] T044 [P] [US2] In `tests/integration/enquiries.test.ts`, assert a failing **write** returns `'sendFailed'` and sends nothing
- [ ] T045 [P] [US2] In `tests/integration/enquiries.test.ts`, assert the 6th submission inside the window returns `'throttled'`, writes nothing and sends nothing — proved **separately** for the email key and the `senderHash` key
- [ ] T046 [P] [US2] In `tests/integration/enquiries.test.ts`, assert a filled honeypot returns `'success'` and writes nothing — the shape that tells a bot nothing about which check it failed
- [ ] T047 [P] [US2] In `tests/e2e/contact.spec.ts`, assert the happy path end to end: pending state on the button, then the form replaced by the editor-controlled confirmation (FR-020, FR-021)
- [ ] T048 [P] [US2] In `tests/e2e/contact.spec.ts`, assert a validation failure names the fields at fault, moves focus to the first, announces via the live region, and **keeps what was typed** (FR-019)
- [ ] T049 [P] [US2] In `tests/e2e/contact.spec.ts`, run the whole submit-and-fail-validation flow in a **JavaScript-disabled** browser context and assert both outcomes, including re-populated fields (FR-018) — the requirement most likely to regress silently, because with JS on React preserves the DOM and hides the bug

### Implementation for User Story 2

- [ ] T050 [US2] Create `src/lib/contact/enquiry-schema.ts` — the one zod shape for name, email, message and the `website` honeypot, reading its maxima from `src/lib/contact/config.ts` per [contracts/enquiry-action.md](./contracts/enquiry-action.md) §3
- [ ] T051 [US2] Create `src/lib/contact/throttle.ts` with the keyed `senderHash` (HMAC under `PAYLOAD_SECRET`) and two `count` queries against `enquiries`, per [contracts/enquiry-action.md](./contracts/enquiry-action.md) §4; document why it is a hash and not the IP, why counting **accepted** rows satisfies both "survives a redeploy" and "a refused submission is not recorded", and that the cap is on rate rather than total
- [ ] T052 [US2] Create `src/lib/email/enquiry.ts` building and sending the notification per [contracts/enquiry-action.md](./contracts/enquiry-action.md) §6 — `to` resolved at send time from `enquiryEmail` → `email` → `DEFAULT_CONTACT.email`, `replyTo` the visitor's address, a fixed subject carrying no visitor text, and all three values through the `escapeHtml` already in `src/lib/email/transactional.ts`
- [ ] T053 [US2] Create `src/lib/contact/actions.ts` (`'use server'`) with `submitEnquiry(prevState, formData)` and the `EnquiryState` union from [contracts/enquiry-action.md](./contracts/enquiry-action.md) §2, returning message **keys** rather than sentences and carrying `values` on the error branch so the no-JavaScript path can re-populate the form
- [ ] T054 [US2] Implement the five-step ordering in `src/lib/contact/actions.ts` exactly as [contracts/enquiry-action.md](./contracts/enquiry-action.md) §5 states — validate, throttle, **create**, notify, record outcome — with a docstring stating that the return value is decided by the create and never by the send, and that `'success'` must be unreachable without a written row
- [ ] T055 [US2] Add the structured logging in `src/lib/contact/actions.ts` per [contracts/enquiry-action.md](./contracts/enquiry-action.md) §7 — outcome plus a correlation id through `payload.logger`, and **never** the message text or the email address, because a log line is not access-controlled and is frequently shipped elsewhere
- [ ] T056 [US2] Assert in `src/lib/contact/actions.ts` the four prohibitions of [contracts/enquiry-action.md](./contracts/enquiry-action.md) §8 — no session read or write, no cookie, no customer lookup by address (FR-029f), and no `revalidatePath` — each as a comment naming the requirement, since all four are things a later change would add without thinking
- [ ] T057 [US2] In `tests/integration/enquiries.test.ts`, assert that **a failing notification still returns `'success'`** and leaves the row `notification: 'failed'` with a reason. **The regression test for the whole design**; if this ever inverts, a mail outage tells visitors their message failed while the shop is holding it
- [ ] T058 [US2] Create `src/components/contact/contact-form/contact-form.tsx` as a `'use client'` leaf using `useActionState`, per [research.md](./research.md) R3 and Next 16's `01-app/02-guides/forms.md`; document that it deliberately does **not** follow `src/lib/auth/`'s react-hook-form pattern, which cannot progressively enhance, so nobody "corrects" it later
- [ ] T059 [US2] Build the form's controls from `TextInput` and `Field`, reading their labels from `contact-page.form` (FR-042), with `defaultValue` fed from `EnquiryState.values` so a re-render from scratch keeps what the visitor typed
- [ ] T060 [US2] Add the honeypot control to `src/components/contact/contact-form/contact-form.tsx` — off-screen rather than `display: none`, `tabIndex={-1}`, `aria-hidden` and `autoComplete="off"` — with a comment on why `display: none` is the wrong tool here
- [ ] T061 [US2] Wire the form's states: `pending` disables the submit control, the error region is `aria-live="polite"`, per-field errors bind through `aria-describedby`, and focus moves to the first failing control on the enhanced path only (FR-019, FR-020)
- [ ] T062 [US2] Render the message band on `/contact` — heading, body, the form, the footnote, and the photograph beside it at desktop and tablet and beneath it at mobile, through the image pipeline with explicit dimensions so nothing shifts as it loads (FR-023)
- [ ] T063 [US2] Verify every one of the form's interactive elements implements the full state set — default, hover, focus-visible, active, disabled, and loading on the submit control (FR-057, Constitution III)
- [ ] T064 [P] [US2] Extend `src/components/contact/contact.stories.tsx` with the form's four states — empty, field errors, pending, and the success confirmation

**Checkpoint**: The contact page is complete and correct with **three** bands. The FAQ band arrives in User Story 4, which is where the spec puts the question picker.

---

## Phase 5: User Story 3 - A visitor answers their own question (Priority: P3)

**Goal**: `/faq` lists every published question, in the collection's own order, and says something
sensible when there are none.

**Independent Test**: Publish several questions in the FAQ tab, open `/faq`, and confirm they all
appear in the admin's Order with their answers expandable — with no change to `/contact` at all.

### Tests for User Story 3

- [ ] T065 [P] [US3] In `tests/e2e/faq.spec.ts`, assert every published question appears in the collection's `order`, and that this differs from any relationship-driven selection (FR-037)
- [ ] T066 [P] [US3] In `tests/e2e/faq.spec.ts`, assert expanding a second question leaves the first open (FR-035), and that unpublishing one removes it from `/faq`, `/contact` and `/about` with no other edit (SC-006)
- [ ] T067 [P] [US3] In `tests/e2e/faq.spec.ts`, assert that with **no** published questions the page renders its heading and the editor's empty message and returns 200, not 404 (FR-039)

### Implementation for User Story 3

- [ ] T068 [US3] Add `getAllPublishedQuestions()` to `src/lib/questions/queries.ts` sorting by the collection's `order` ascending, with a docstring contrasting it against `getSelectedQuestions` per [contracts/question-list.md](./contracts/question-list.md) §2 — the two loaders are the `order` field's own admin description made executable
- [ ] T069 [US3] Add `getFaqPage()` to `src/lib/questions/queries.ts`, `cache()`-wrapped and database-unreachable tolerant, recording in a comment why it lives in this tier rather than a two-field tier of its own: the FAQ page **is** the questions
- [ ] T070 [US3] Create `src/app/(frontend)/faq/page.tsx` with `force-dynamic`, composing `PageHeaderBlock` (`headingLevel={1}`, no eyebrow) above `QuestionList` (`headingLevel={2}`) per [contracts/question-list.md](./contracts/question-list.md) §5
- [ ] T071 [US3] Render the empty case on `/faq` using the kit's `EmptyState` with `emptyTitle` and `emptyDescription` from the global — never a 404, because every page on the site links here
- [ ] T072 [P] [US3] Emit `schema.org/FAQPage` JSON-LD on `/faq` built from the view models rather than documents (FR-052), with a comment recording that `/contact` deliberately does **not** get it because its questions are an editor-chosen fourth band ([research.md](./research.md) R12)
- [ ] T073 [P] [US3] Add `/faq` to `ROUTES` in `tests/a11y/routes.spec.ts`
- [ ] T074 [US3] Verify the footer's **FAQ** link now resolves — the last of the four dead links (SC-001)

**Checkpoint**: Both routes exist. Every link in the site chrome resolves.

---

## Phase 6: User Story 4 - The owner writes both pages without a developer (Priority: P4)

**Goal**: Every visible word on both pages, the question selection and the photograph are the
owner's, with drafts and preview.

**Independent Test**: Change every visible string on both pages from the admin and confirm each one
changes on the site, with no code touched.

### Tests for User Story 4

- [ ] T075 [P] [US4] In `tests/e2e/contact-admin.spec.ts`, change every string on `contact-page` — eyebrow, headline, intro, form heading, body, three labels, button, footnote, both messages — and assert each appears on `/contact` (SC-005)
- [ ] T076 [P] [US4] In `tests/e2e/contact-admin.spec.ts`, select three questions in a chosen order and assert `/contact` shows exactly those, in that order (FR-031)
- [ ] T077 [P] [US4] In `tests/e2e/contact-admin.spec.ts`, clear the selection and assert the **whole band disappears** rather than leaving a heading over an empty column (FR-032)
- [ ] T078 [P] [US4] In `tests/e2e/faq.spec.ts`, change the FAQ page heading and empty message and assert both appear (FR-040)
- [ ] T079 [P] [US4] In `tests/e2e/contact-admin.spec.ts`, assert a customer session cannot change either global, and that a saved draft is visible in preview but not to a visitor (FR-043, FR-045)

### Implementation for User Story 4

- [ ] T080 [US4] Render the FAQ band on `/contact` using `FaqBandBlock` with `variant="centred"` and `headingLevel={2}`, fed from the global's `faq` group — the centred, heading-only arrangement of the band `/about` already uses, never a second component (FR-034)
- [ ] T081 [US4] Confirm the band is omitted entirely when `ContactPage.faq` is `undefined`, which the mapper already decides (T025) — the component must not re-derive it
- [ ] T082 [US4] Wire the form photograph on `/contact` to the global's `photo` field and confirm swapping it in the admin changes the page, with its alternative text coming from the media document rather than a per-slot copy
- [ ] T083 [US4] Walk both globals in the Payload admin and fix any control whose label reads as a developer's word rather than an editor's — the failure spec 006 found when its "Add Band" button said "Add Body". A block that renders correctly and is unusable in the admin is a defect (Constitution, Editorial verification)

**Checkpoint**: Both pages are fully the owner's. `/contact` now has all four bands.

---

## Phase 7: User Story 5 - Both pages are found and shared correctly (Priority: P5)

**Goal**: Correct titles, descriptions, social images and canonical URLs on both routes, with
sensible fallbacks.

**Independent Test**: Inspect the rendered metadata of both routes with and without editor overrides
and confirm both cases are correct.

### Tests for User Story 5

- [ ] T084 [P] [US5] In `tests/e2e/contact.spec.ts` and `tests/e2e/faq.spec.ts`, assert that with no editor metadata the title and description fall back to each page's own heading and intro, and that with overrides set the owner's values win (FR-048)
- [ ] T085 [P] [US5] Assert both routes emit a canonical URL and that their content is present in the server response rather than assembled in the browser (FR-003, FR-049)

### Implementation for User Story 5

- [ ] T086 [P] [US5] Add `generateMetadata()` to `src/app/(frontend)/contact/page.tsx` — title, description, canonical and Open Graph, falling back to `ContactPage.fallbacks`, and calling `getContactPage()` a second time at no cost because the loader is `cache()`-wrapped
- [ ] T087 [P] [US5] Add `generateMetadata()` to `src/app/(frontend)/faq/page.tsx` on the same terms, falling back to the FAQ page's own heading
- [ ] T088 [US5] Add `/contact` and `/faq` to `STATIC_ROUTES` in `src/app/sitemap.ts` at `monthly` / 0.6, matching `/about` — the sitemap is a claim about what exists, and omitting two live pages makes it wrong ([research.md](./research.md) R13)

**Checkpoint**: Both pages are discoverable and shareable.

---

## Phase 8: User Story 6 - The owner keeps only the enquiries they should (Priority: P6)

**Goal**: The stored enquiries are readable by administrators alone, legible at a glance, deletable
on request, and gone once past the retention period.

**Independent Test**: Submit several enquiries, confirm they list newest-first for an administrator
and are invisible to everyone else, delete one, and run the purge against a row past the cutoff.

### Tests for User Story 6

- [ ] T089 [P] [US6] In `tests/integration/enquiries.test.ts`, assert `create` and `update` are refused to an admin session, a customer session and an anonymous request through REST, and that `read` is refused to a customer and to anonymous (SC-012, FR-029a)
- [ ] T090 [P] [US6] In `tests/integration/enquiries.test.ts`, assert the purge deletes a row past the cutoff and leaves one inside it (SC-013)
- [ ] T091 [P] [US6] In `tests/e2e/contact-admin.spec.ts`, assert an administrator sees enquiries newest-first with name, address, notification outcome and arrival time **without opening a record**, and that one whose notification failed is distinguishable (FR-029c)

### Implementation for User Story 6

- [ ] T092 [US6] Create `src/jobs/purge-enquiries.ts` deleting rows where `createdAt` is older than `ENQUIRY_RETENTION_MS`, scheduled at `0 30 3 * * *` on the existing `nightly` queue so it does not contend with `purgeAccountsTask` at `0 15 3 * * *`; document that it is a hard delete because a "deleted" row still holding a visitor's message is not an erasure path ([research.md](./research.md) R7)
- [ ] T093 [US6] Register `purgeEnquiriesTask` in the `jobs.tasks` array in `src/payload.config.ts`, alongside `purgeAccountsTask` and `expireCartsTask`
- [ ] T094 [US6] State the retention period in words in `src/collections/enquiries.ts`'s `admin.description`, so an owner reads the policy where the data is rather than in a document nobody opens
- [ ] T095 [US6] Verify by hand that deleting a visitor's enquiries in the admin leaves nothing on the site carrying their name, address or text — the erasure path FR-029e requires, including the `senderHash` that dies with the row

**Checkpoint**: All six stories complete. The feature's data-protection obligations are discharged.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T096 [P] Extend `scripts/seed-catalog.ts` to attach the T005 photograph to `contact-page.form.photo`, so a seeded install renders the drawn page rather than a band with an empty frame
- [ ] T097 [P] Verify both routes at the three drawn widths against `312:7499` / `419:10740` / `419:10831` and `266:4468` / `422:9509` / `422:9881`, watching the channel grid's four → 2×2 → stacked transition and the photograph moving from beside the form to beneath it
- [ ] T098 [P] Confirm no horizontal scrolling at any width from 320px upward on either route (SC-009), extending `tests/e2e/responsive.spec.ts`
- [ ] T099 Measure gzipped initial JS for both routes against a **production server** (`pnpm build && pnpm start`), not the build log — `/contact` ≤ 300KB total and ≤ 100KB over the 181KB baseline. If it is tight, the form is the leaf to look at; the accordion is already carried by `/about`
- [ ] T100 [P] Run `pnpm check:tokens`, `pnpm check:styles` and `pnpm check:contrast` over the new components, confirming the form's error styling inherits `Field`'s already-resolved `status-error-text` contrast rather than re-deciding it
- [ ] T101 [P] Run `pnpm test:a11y` and confirm zero violations on both new routes (SC-007)
- [ ] T102 Walk the form by keyboard and with a screen reader: tab through it, submit it empty, and confirm the error is **announced** rather than only rendered — an automated scan does not catch an error that never reaches a live region
- [ ] T103 Run the full gate set from [quickstart.md](./quickstart.md): `pnpm lint`, `typecheck`, `check:naming`, `check:stories`, `test`, `test:integration`, `test:e2e`, `test:a11y`
- [ ] T104 Work through [quickstart.md](./quickstart.md)'s eight-step walkthrough end to end, including the JavaScript-disabled pass and the deliberate mail outage in step 5
- [ ] T105 Send the designer a note that the drawn footnote reads `We'll get back to you ass soon as possible.` and ships corrected, so the Figma and the site stop disagreeing

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: no dependencies.
- **Phase 2 (Foundational)**: depends on Phase 1. **Blocks every story.** Its five refactors must
  land before any story phase imports anything, or a move becomes a copy.
- **Phase 3–8 (Stories)**: all depend on Phase 2, and are then largely independent — see below.
- **Phase 9 (Polish)**: depends on the stories you intend to ship.

### Story dependencies

| Story | Depends on | Why |
| --- | --- | --- |
| US1 (P1) | Phase 2 | None beyond the foundation |
| US2 (P2) | Phase 2, **T034** | The form is a band on the route US1 creates |
| US3 (P3) | Phase 2 | Independent of `/contact` entirely — its own route |
| US4 (P4) | Phase 2, **T034**, **T080** | Edits the pages the earlier stories render |
| US5 (P5) | Phase 2, **T034**, **T070** | Metadata needs both routes to exist |
| US6 (P6) | Phase 2, **T053** | Nothing to retain until enquiries are written |

US3 is the only story that can be built entirely in parallel with US1 and US2 — it shares nothing
with `/contact` but the promoted tier, which is already in Phase 2.

### Within a story

Tests are written before the implementation they cover and must fail first. Loaders before
components; components before the route wires them; the route before its metadata.

### Parallel opportunities

- Phase 1: T002–T006 all together.
- Phase 2: T012 and T013 together; then T014/T017/T018 together (three separate model files); then
  T023/T024 together; then T027/T028/T029 together. T007–T011 are sequential — each touches files
  the next one reads.
- Phase 3: T031–T033 together, then T039/T040 together.
- Phase 4: T042–T049 together (eight test files/blocks), then T064 alongside the implementation.
- Phase 5: T065–T067 together, then T072/T073 together.
- Phase 6: T075–T079 all together.
- Phase 7: T084/T085 together, then T086/T087 together.
- Phase 8: T089–T091 together.
- Phase 9: T096–T098, T100–T101 together.

---

## Parallel Example: User Story 2

```bash
# The eight tests first — different files and different blocks, no shared state:
Task: "T042 unit: enquiry schema maxima and trimming"
Task: "T043 integration: a valid submission writes one row"
Task: "T044 integration: a failing write returns sendFailed"
Task: "T045 integration: the 6th submission is throttled, on both keys"
Task: "T046 integration: a filled honeypot returns success and writes nothing"
Task: "T047 e2e: the happy path, pending then confirmation"
Task: "T048 e2e: validation names fields, moves focus, keeps input"
Task: "T049 e2e: the same two flows with JavaScript disabled"

# Then the server side, in order — each reads the last:
#   T050 schema → T051 throttle → T052 email → T053 action → T054 ordering → T055 logging
```

---

## Implementation Strategy

### MVP (User Story 1)

1. Phase 1 → Phase 2 → Phase 3.
2. **Stop and validate**: `/contact` renders, four cards, every value from the admin.
3. Three of four dead links closed. Shippable on its own — the page is useful with no form.

### Incremental delivery

1. **+ US2** → the form works, with and without JavaScript. The feature's centre of gravity.
2. **+ US3** → `/faq` ships; the last dead link closes. Buildable in parallel with US1/US2.
3. **+ US4** → both pages become fully editorial, and `/contact` gains its fourth band.
4. **+ US5** → discoverable and shareable.
5. **+ US6** → retention and erasure discharged.

**The earliest sensible release is US1 + US2 + US3**: every chrome link resolves, a visitor can
reach the shop three ways, and enquiries are being recorded. US4–US6 are then improvements to a
working feature rather than gaps in a broken one — with one caveat worth stating: **US6 should not
lag far behind US2 in a production deployment**, because enquiries begin accumulating personal data
the moment the form is live, and the retention policy is what bounds it.

### Parallel team strategy

After Phase 2: developer A takes US1 → US2 (the contact route and its form), developer B takes US3
(the FAQ route) and then US6 (the job and its tests). US4, US5 and Phase 9 need both routes and are
best done once they meet.

---

## Notes

- `[P]` = different files, no dependency on incomplete work, within the same phase.
- Every task names a file. A task that does not is not ready to execute.
- Verify tests fail before implementing.
- Commit after each task or logical group.
- The five Phase-2 refactors are the highest-risk work in this feature: each touches shipped code
  whose tests must keep passing unchanged (T030 is the check).
- Avoid: a second copy of the shop's contact details, a second question list, a second question
  loader, and any revalidation hook on `enquiries`.
