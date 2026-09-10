# Data Model: Contact Us and FAQ

**Feature**: `008-contact-faq-pages` | **Date**: 2026-09-10 | **Plan**: [plan.md](./plan.md)

One new collection, two new globals, two additive columns on existing schema. Nothing existing is
renamed or removed, so the migration's `down` is a clean drop in every case (R14).

---

## 1. `enquiries` — collection (NEW)

The site's first inbound message store, and its first public data-collection point.

**Slug**: `enquiries` · **Labels**: Enquiry / Enquiries · **Admin group**: `Shop` (beside Contact
settings, which holds the address these are sent to) · **Drafts**: no · **Default sort**:
`-createdAt`

### Access — stated explicitly, and unusually tight

| Operation | Rule | Why |
| --- | --- | --- |
| `create` | `() => false` | FR-029a. Nothing may create an enquiry by requesting it. The server action writes with `overrideAccess: true`, the same construction `src/collections/verification-codes.ts` uses and documents |
| `read` | `isAdmin` | FR-029a. Not "authenticated" — a customer must not read enquiries, including ones they sent |
| `update` | `() => false` | FR-029b. What the visitor wrote is a record of what they wrote. The action sets the notification outcome with `overrideAccess: true` immediately after creating the row |
| `delete` | `isAdmin` | FR-029e. Deletion is the erasure path, so it must be reachable by a person, not only by the job |

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | `text` | yes | Max 100 (`ENQUIRY_MAX.name`). As the visitor typed it |
| `email` | `email` | yes | Max 254. Indexed — the throttle counts on it (R5) |
| `message` | `textarea` | yes | Max 5000. Plain text, never rich text: nothing a visitor sends should be able to carry markup (FR-026) |
| `notification` | `select` | yes | `pending` \| `sent` \| `failed`. Written by the action, never by a person |
| `notificationError` | `text` | no | Why the send failed, for the owner. Absent when `sent` |
| `senderHash` | `text` | no | Keyed HMAC of the client IP. Indexed. The throttle's second key (R5). Never displayed |

`createdAt` and `updatedAt` are Payload's own and are not re-declared. `createdAt` **is** "when it
arrived" (FR-029) and is what the retention purge cuts on — a second `receivedAt` would be a value
that can disagree with it.

### Admin presentation

- `useAsTitle: 'name'`
- `defaultColumns: ['name', 'email', 'notification', 'createdAt']` — FR-029c's "see at a glance
  which enquiries they were never told about" without opening a record.
- `admin.description` states the retention period in words, so an owner reads the policy where the
  data is rather than in a document.
- Every field carries `admin.readOnly: true`. `access.update` already refuses the write; `readOnly`
  is what stops the admin drawing editable inputs that then fail to save.

### Validation

Field-level maxima (Constitution IV: invalid content cannot be published in the first place), and
the same maxima in `enquiry-schema.ts` so the server action rejects before it ever reaches Payload.
Two checks of one rule, from one constant in `src/lib/contact/config.ts`.

### Lifecycle

```text
(form submit)
  → validate (zod)          → reject: nothing written, nothing sent
  → honeypot / throttle     → reject: nothing written, nothing sent   (FR-027)
  → CREATE  notification=pending                                      (FR-029)
  → send notification
      ok   → UPDATE notification=sent
      fail → UPDATE notification=failed, notificationError=<reason>   (FR-024a)
  → acknowledge the visitor on the strength of the CREATE, not the send  (FR-021)
```

`pending` exists so that a crash between the write and the outcome update is legible afterwards, and
so the outcome field is never nullable.

**No `afterChange` revalidation hook.** Called out because every other content collection here has
one: `src/lib/revalidate.ts` invalidates by walking every product slug, so a hook here would let a
visitor evict the entire catalogue by submitting the contact form (R8).

### Retention

`purgeEnquiriesTask` deletes rows where `createdAt < now - ENQUIRY_RETENTION_MS` (365 days), nightly
on the existing `nightly` queue. Hard delete — nothing references an enquiry, and a soft-deleted row
still holding a visitor's message is not an erasure path (FR-029e). The `senderHash` dies with its
row, so the throttle's pseudonymous key inherits the policy rather than needing one.

---

## 2. `contact-page` — global (NEW)

The `/contact` page's copy, its photograph and its question picks. Flat grouped fields rather than a
blocks body (R1).

**Slug**: `contact-page` · **Label**: Contact page · **Admin group**: `Content` · **Drafts**: yes ·
**Access**: `read: () => true`, `update: isAdmin`

Every field ships a `defaultValue` taken from the drawing, so an untouched install renders the drawn
page (FR-046) and every string stays editable rather than being a developer's placeholder — the
mechanism `story-page` and `blog-page` both use.

### Top level

| Field | Type | Default (from the drawing) |
| --- | --- | --- |
| `eyebrow` | `text` | `CONTACT US` |
| `heading` | `textarea`, required | `WE'RE HERE TO HELP` |
| `intro` | `textarea` | `Questions, custom requests, or styling advice — our team is here for you` |

Drawn at `312:7502`. There is **no** field for the channel cards: they are read from
`contact-settings` and are not a second list to maintain (FR-008).

### `form` — group

| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `heading` | `text` | yes | `SEND US A MESSAGE` |
| `body` | `textarea` | no | `To make an enquiry, please use the contact form below…` |
| `nameLabel` | `text` | yes | `Name` |
| `emailLabel` | `text` | yes | `E-mail` |
| `messageLabel` | `text` | yes | `Message` |
| `submitLabel` | `text` | yes | `SEND MESSAGE` |
| `footnote` | `text` | no | `We'll get back to you as soon as possible.` |
| `successMessage` | `textarea` | yes | `Thank you — your message has reached us. We'll be in touch shortly.` |
| `errorMessage` | `textarea` | yes | `We couldn't send your message just now. Please try again, or reach us on WhatsApp, Telegram or Instagram.` |
| `photo` | `upload` → `media` | no | — (seeded, not defaulted) |

The labels are fields because FR-042 names them. The footnote's drawn text carries a typo
(`ass soon as possible`) which ships corrected (FR-046).

`photo` is a plain upload rather than `mediaSlot` — R11. Uploads cannot be defaulted (a media slot
references a document that must exist first), so it arrives through the seed and the band renders
without it until then.

### `faq` — group

| Field | Type | Notes |
| --- | --- | --- |
| `heading` | `text`, required | Default `Frequently Asked Questions` |
| `questions` | `relationship` → `questions`, `hasMany` | The editor's own selection, in the editor's own order |

Named `questions` to match `src/blocks/faq.ts`'s field for the same concept — Constitution IV asks
that one concept keep one field name.

**Row order is display order.** A `hasMany` relationship preserves the arrangement, so there is no
position number two rows could share and nothing that can disagree with the admin (FR-031). This is
the identical mechanism the `faq` block uses and the same reasoning `contact-settings.messengers`
records.

Selecting nothing removes the band entirely (FR-032) rather than drawing a heading over an empty
column — so the shipped default selects **no** questions, and the band appears once somebody writes
some.

### `seo`

`seoField()`, reused unchanged. Falls back to `heading` and `intro` (FR-048).

---

## 3. `faq-page` — global (NEW)

Deliberately tiny. The page's content is the questions; this holds only what wraps them.

**Slug**: `faq-page` · **Label**: FAQ page · **Admin group**: `Content` · **Drafts**: yes ·
**Access**: `read: () => true`, `update: isAdmin`

| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `heading` | `textarea` | yes | `Frequently Asked Questions` |
| `emptyTitle` | `text` | yes | `Nothing here yet` |
| `emptyDescription` | `textarea` | yes | `We're writing the answers to the questions we're asked most. In the meantime, our team is a message away.` |
| `seo` | `seoField()` | — | — |

Mirrors `blog-page` field-for-field in shape and purpose, including the empty pair — FR-039 requires
`/faq` to render a heading and a plain message rather than a 404 when nothing is published, because
every page on the site links here.

There is **no** question-selection field, and that is the requirement rather than an omission
(FR-038): publishing a question is the only action needed for it to appear.

---

## 4. `contact-settings` — global (CHANGED)

One additive field.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `enquiryEmail` | `email` | no | FR-024's override. Placed directly beneath `email`. Description: "Where the contact form's messages go. Leave empty and they go to the email address above." |

Here rather than on `contact-page` because it is an address the shop uses, and this global is where
the shop's addresses live. Keeping it beside `email` means the fallback is visible in the admin
rather than being a rule stated only in code.

Nullable, so `down` drops it with no data loss.

---

## 5. `page-header` block — CHANGED

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `body` | `textarea` | no | The intro paragraph under the headline (FR-007) |

Optional, so `/about` and `/blog` are unaffected. Added to the block as well as to
`PageHeaderBlockProps` so there is one definition of what a page header is, and so `/about` can use
it without a second change (R10).

Schema consequence: a nullable column on the `story_page` blocks table and its versions table.

---

## 6. `questions` — collection (UNCHANGED)

Stated explicitly because it is the centre of this feature and gains **nothing**.

`src/collections/questions.ts` was written in spec 006 anticipating this page — its `order` field's
description already reads "Lowest first, in this list and on the FAQ page", and its doc comment
explains the collection exists precisely so a standalone `/faq` "reads the same rows" with nothing
re-typed. `/faq` sorts by `order` (FR-037); `/about` and `/contact` each use their own relationship
order.

Its access rule is what makes drafts unreachable rather than filtered, so no page in this feature
contains a status check (FR-033).

---

## View models

Components may not import `@/payload-types` (`catalog/no-document-types`), so every document becomes
a view model in `src/lib/contact/` or `src/lib/questions/`. Both directories are added to
`DOCUMENT_TYPE_READERS`.

```text
Question          { id, question, answerHtml }          # promoted from src/lib/story/
ContactPage       { eyebrow?, heading, intro?, form, faq, seo, fallbacks }
ContactForm       { heading, body?, labels, submitLabel, footnote?, messages, photo? }
ContactFaq        { heading, questions: Question[] }    # absent when questions is empty
FaqPage           { heading, empty: { title, description }, seo, fallbacks }
```

`answerHtml` is lexical converted once in the mapper, exactly as the FAQ band already does — the
conversion moves with the mapper rather than being rewritten (R9).

`ContactFaq` is `undefined` rather than `{ questions: [] }` when nothing is selected or nothing
selected is still published, so FR-032's "the band is absent" is a property of the view model and
not a condition a component has to remember.

---

## Migration

One migration, `migrations/<ts>_contact_and_faq.ts`, with a tested `down`.

| Change | `down` |
| --- | --- |
| `enquiries` table | drop |
| `contact_page` + versions tables | drop |
| `faq_page` + versions tables | drop |
| `contact_settings.enquiry_email` (nullable) | drop column |
| `story_page` blocks + versions: `page-header.body` (nullable) | drop column |

Both column additions are nullable, so nothing that existed before the migration loses data on
rollback. `pnpm generate:types` runs in the same commit — a stale `payload-types.ts` fails review.
