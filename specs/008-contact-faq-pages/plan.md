# Implementation Plan: Contact Us and FAQ — The Last Two Dead Links

**Branch**: `008-contact-faq-pages` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-contact-faq-pages/spec.md`

## Summary

Build `/contact` and `/faq`, closing the last dead links in the site chrome, and give the shop its
first inbound message form: a public, no-JavaScript-required form whose submissions are recorded in
Payload and notified by email.

Four facts about the existing codebase decide most of the technical answer, and three of them mean
this feature writes considerably less code than two pages suggests:

1. **Almost nothing on these pages is new content.** The four channel cards are the `messengers`
   rows and the `email` of `contact-settings`, already read by `getSocialLinks()` and
   `getContactDetails()` for the footer and the checkout modal. The questions are the `questions`
   collection, which `src/collections/questions.ts:10` says was built as a shared collection
   *because* "a standalone `/faq` page is coming". Both pages are new views over data the admin
   already carries.
2. **The one genuinely new capability — the form — cannot follow the account-form pattern.** FR-018
   requires it to work without JavaScript, and `src/lib/auth/` is react-hook-form with typed server
   actions, which cannot progressively enhance. This form is `<form action>` + `useActionState` +
   `FormData`, per Next 16's own forms guide. The divergence is deliberate and recorded in
   [research.md](./research.md) R3 so nobody "fixes" it later.
3. **Three Constitution II moves fall out, and all three are the rule working rather than fighting
   it.** `FeatureCard` gains an optional `href` and becomes the channel card (R2). `QuestionList` is
   promoted to the UI kit on its third consumer (R9). `src/lib/questions/` is promoted out of
   `src/lib/story/` for the same reason — `src/lib/story/queries.ts:19` predicted a `/faq` page and
   guessed the wrong home for it.
4. **Storing enquiries brings obligations the rest of this site has already solved once.** The
   throttle is a `count` over stored rows rather than a new table (R5), and the retention purge
   joins the `nightly` job queue that already drains `purgeAccountsTask` and `expireCartsTask` (R7).
   Neither needs new infrastructure.

The load-bearing ordering decision is in the server action: **the enquiry is written first and
notified second**, so the record is the receipt and a mail outage never tells a visitor their
message failed when the shop is holding it (FR-021, FR-024a). That is the whole reason the spec's
open question was worth asking.

## Technical Context

**Language/Version**: TypeScript 5.9, strict mode. Node ≥ 22.

**Primary Dependencies**: Payload 3.88.0 (`@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`,
`@payloadcms/email-resend`), Next 16.3.3 (App Router), React 19.2, zod 4. **No new third-party
dependencies.** The form is React's own `useActionState`; the throttle is a Payload `count` query;
the purge is a Payload job. Nothing here needed a library.

**Storage**: PostgreSQL via `@payloadcms/db-postgres`. One migration — the `enquiries` collection,
the `contact-page` and `faq-page` globals with their version tables, and two additive nullable
columns (`contact_settings.enquiry_email`, and `body` on the `page-header` block).

**Testing**: Vitest (unit + integration against a real database), Playwright (`e2e`, `a11y`,
`stories` projects), Storybook 10 for the UI kit.

**Target Platform**: Server-rendered web, deployed as a container image built without a database.

**Project Type**: Web application — Payload CMS admin and a Next.js App Router storefront in one
Next app (`src/app/(payload)` and `src/app/(frontend)`).

**Performance Goals**: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at p75 mobile. Route JS ≤ 300KB gzipped
total and ≤ 100KB gzipped above the 181KB framework baseline measured on 2026-09-03. `/contact`
carries two client leaves (the form and the accordion); `/faq` carries one.

**Constraints**: WCAG 2.2 AA. No hardcoded user-visible copy. No raw colour/spacing/type values.
kebab-case paths (`pnpm check:naming`). UI-kit components require stories (`pnpm check:stories`).
Components may not import `@/payload-types` (`catalog/no-document-types`). The form must function
with JavaScript disabled.

**Scale/Scope**: Two routes, one collection, two globals, one scheduled job, one new arrangement
component, three promotions/extensions, two additive schema columns. Marketing traffic; enquiries
arrive at human rates, and the throttle and retention query are sized for that and say so.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Verdict |
|---|-----------|------|---------|
| I | Payload is the single source of truth | Every string on both pages in `contact-page`/`faq-page`; channel cards read `contact-settings`; questions read the shared collection; Local API in server components | **PASS.** Same nuance as `/blog`, deliberately: neither page is block-composed. Their bands are the page's purpose rather than an arrangement an editor would choose, so flat grouped fields on a global, with `PageHeaderBlock` reused as a component. [research.md](./research.md) R1 records the alternative and why it was dropped. |
| II | Reuse before creation | Reuse `Header`, `ContactBanner`, `Footer`, `Container`, `Button`, `TextInput`, `Field`, `Accordion`, `RichText`, `Media`, `Icon`, `seoField`, `getSocialLinks`, `getContactDetails`, `escapeHtml`; extend `FeatureCard` with `href`; promote `QuestionList` and `src/lib/questions/` | **PASS**, with two promotions, one extension and one decoupling. Exactly **one** genuinely new storefront component — the channel grid's arrangement — plus the form, which is single-consumer by nature. `FaqBandBlockProps` is decoupled from `StoryBlock`, the same move spec 007 made on `PageHeaderBlock` and for the same reason. R2, R9. |
| III | Design tokens over magic values | All colour/spacing/type from tokens; the grid's four/two/one arrangement in the token breakpoints; every control gets default, hover, focus-visible, active, disabled and — on submit — loading | **PASS** — enforced by `design-tokens/*` ESLint rules, `pnpm check:styles` and `pnpm check:contrast`. `Field` already resolves the error-colour contrast problem (`status-error-text` at 5.66:1); the form inherits it rather than re-deciding it. |
| IV | Content modelling & schema evolution | Collection, globals and fields modelled in [data-model.md](./data-model.md) before implementation; every field labelled and described; the FAQ selection is a relationship field; validation at field level; access stated explicitly on all three; drafts on both globals; one migration with a tested rollback | **PASS.** Two naming decisions worth stating: the collection is `enquiries` (plural, per the convention), and its FAQ relationship field is named `questions` to match the `faq` block's field for the same concept. |
| V | Performance, accessibility & SEO budgets | Server components by default, two client leaves total; the form photograph through the image pipeline with reserved space; WCAG 2.2 AA including the no-JS path; editor-controlled metadata, canonical URLs, `schema.org/FAQPage` on `/faq`; caching explicit per route; both routes added to the sitemap | **PASS.** The accessibility work here is larger than usual because a form has states the rest of this site does not: error, pending, success, and all three again with JavaScript off. R3 lists what that forces. |
| VI | Commerce correctness & data protection | No money, no inventory. **But this feature creates the site's first public data-collection point**: enquiries are admin-read-only, never created by a direct browser request, never joined to a customer account, throttled, purged on a stated schedule, and deletable as the erasure path. Logs carry the outcome and a correlation id but never the message text or the address | **PASS** — and this is the principle doing the most work in this feature. The IP used for throttling is stored only as a keyed HMAC and dies with the row it is on. R5, R7. |

**Post-Phase-1 re-check**: **PASS, unchanged.** The design added no dependency, no service and no
data store beyond the one collection the spec requires. It added one scheduled job to an existing
queue and two rows to an existing sitemap. One item moved into Complexity Tracking below — the move
of `src/lib/contact.ts` — because it touches files outside this feature.

## Project Structure

### Documentation (this feature)

```text
specs/008-contact-faq-pages/
├── plan.md                      # This file
├── research.md                  # Phase 0 output — R1–R14
├── data-model.md                # Phase 1 output — collection, globals, field-by-field
├── quickstart.md                # Phase 1 output — how to verify the feature end to end
├── contracts/
│   ├── enquiry-action.md        #   the server action: input, outcomes, ordering, throttle
│   ├── contact-loader.md        #   what /contact may ask for and what comes back
│   └── question-list.md         #   the promoted question tier and component
├── checklists/
│   └── requirements.md          # Spec quality checklist (16/16)
└── tasks.md                     # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── collections/
│   └── enquiries.ts                        # NEW — admin-read-only, never browser-created
├── globals/
│   ├── contact-page.ts                     # NEW — the page's copy, photo and question picks
│   ├── faq-page.ts                         # NEW — heading, empty message, SEO
│   └── contact-settings.ts                 # CHANGED — + optional enquiryEmail
├── blocks/
│   └── page-header.ts                      # CHANGED — + optional body (intro paragraph)
├── jobs/
│   └── purge-enquiries.ts                  # NEW — nightly, joins the existing queue
├── lib/
│   ├── contact/                            # NEW tier — absorbs the old src/lib/contact.ts
│   │   ├── defaults.ts                     #   MOVED from src/lib/contact.ts
│   │   ├── config.ts                       #   retention, rate limit, field maxima
│   │   ├── types.ts                        #   ContactPage view model
│   │   ├── mappers.ts                      #   document → view model
│   │   ├── queries.ts                      #   loader, request-deduped, DB-unreachable tolerant
│   │   ├── enquiry-schema.ts               #   zod; the one shape both sides agree on
│   │   ├── throttle.ts                     #   count over stored rows; the keyed IP hash
│   │   └── actions.ts                      #   'use server' — write, notify, record outcome
│   ├── questions/                          # NEW tier — promoted out of src/lib/story/
│   │   ├── types.ts                        #   Question view model
│   │   ├── mappers.ts                      #   MOVED from src/lib/story/mappers.ts
│   │   └── queries.ts                      #   getSelectedQuestions, getAllPublished, getFaqPage
│   ├── story/                              # CHANGED — consumes @/lib/questions
│   ├── messengers/settings.ts              # unchanged — read for the channel cards
│   └── email/
│       └── enquiry.ts                      # NEW — builds and sends the notification, replyTo
├── components/
│   ├── contact/                            # NEW — single-consumer
│   │   ├── channel-grid/                   #   the four/two/one arrangement (NOT FeatureStrip)
│   │   ├── contact-form/                   #   'use client' leaf — useActionState
│   │   └── contact.stories.tsx
│   ├── blocks/
│   │   ├── page-header/                    # CHANGED — optional body
│   │   └── faq-band/                       # CHANGED — variant, decoupled props, composes QuestionList
│   └── ui/
│       ├── feature-card/                   # CHANGED — optional href on the value line
│       └── question-list/                  # NEW (promoted) — + story
├── app/
│   ├── (frontend)/
│   │   ├── contact/page.tsx                # NEW — force-dynamic
│   │   └── faq/page.tsx                    # NEW — force-dynamic, + FAQPage JSON-LD
│   └── sitemap.ts                          # CHANGED — + /contact, /faq
└── payload.config.ts                       # CHANGED — register collection, globals, job

eslint-rules/catalog-boundary.mjs           # CHANGED — allowlist the two new tiers
migrations/<ts>_contact_and_faq.ts          # NEW — one migration, tested rollback

tests/
├── unit/
│   ├── contact-mappers.test.ts             # NEW
│   ├── enquiry-schema.test.ts              # NEW
│   └── questions-mappers.test.ts           # NEW (moved coverage)
├── integration/
│   └── enquiries.test.ts                   # NEW — ordering, throttle, access, purge
├── e2e/
│   ├── contact.spec.ts                     # NEW — incl. the JavaScript-disabled path
│   ├── faq.spec.ts                         # NEW
│   └── contact-admin.spec.ts               # NEW — editorial verification
└── a11y/routes.spec.ts                     # CHANGED — + /contact, /faq
```

**Structure Decision**: The existing shape is kept exactly. Payload modelling stays in
`collections/`, `globals/`, `blocks/` and `jobs/`; each feature's document-to-view-model tier stays
in `src/lib/<subject>/`, which is why this feature adds two of them and widens the lint rule that
enforces the boundary; single-consumer components stay in `src/components/<feature>/` and anything
with a second consumer moves to `src/components/ui/`. The one departure from "add only" is moving
`src/lib/contact.ts` into the new tier, justified in R4 and tracked below.

## Complexity Tracking

> Filled because two items reach outside this feature's own files.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Moving `src/lib/contact.ts` → `src/lib/contact/defaults.ts` (touches 2 importers outside this feature) | The new data tier must be `src/lib/contact/`, and a directory sitting beside a same-named module resolves ambiguously and reads as a mistake | Naming the tier `src/lib/contact-page/` leaves two modules called "contact" and puts the shop's phone formatter outside the contact tier. The move is two import edits, both mechanical |
| Promoting questions out of `src/lib/story/` into `src/lib/questions/` (edits a shipped feature's tier) | Questions now have three consumers; `/faq` reading its content from a module named `story` is the coupling spec 007 had to undo on `PageHeaderBlock` | Leaving them and importing `@/lib/story` from `/contact` and `/faq` is one line cheaper today and makes the story page's tier a dependency of two unrelated routes |
| A form that diverges from the account-form pattern (`FormData` + `useActionState`, not react-hook-form) | FR-018 requires the form to work with JavaScript unavailable; the account pattern structurally cannot | Matching `src/lib/auth/` for consistency would fail the requirement. Consistency with a pattern that cannot meet the requirement is not a virtue — recorded in R3 so it is not "corrected" later |

**Not** in this table, and deliberately: the `enquiries` collection. It is required by FR-029 rather
than chosen, and it introduces no new store — it is a table in the database Payload already owns.
