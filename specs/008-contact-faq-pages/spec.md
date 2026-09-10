# Feature Specification: Contact Us and FAQ — The Last Two Dead Links

**Feature Branch**: `008-contact-faq-pages`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "We should create this 2 pages:
[Figma design]
[Figma design] . Thats Contact
us and FAQ pages. Contact us will have static texts, dynamic will be: socials (first block, we
already have contacts info in admin), Send us a message will always send message to the email, and
faq (same logic as in about us page, we should select which questions to display). Faq page will be
simple faq page, it will display our faqs"

**Source**: Two Figma sections — `312:7498` ("Контакты") and `266:4856` ("FAQ") — each holding its
page at three widths.

This spec closes the last two dead links in the site chrome:

- [src/components/layout/header/header.tsx:71](../../src/components/layout/header/header.tsx) — the
  primary navigation has carried **Contact us → `/contact`** since spec 001.
- [src/components/layout/footer/footer.tsx:81,83](../../src/components/layout/footer/footer.tsx) —
  the footer carries **Contact Us → `/contact`** and **FAQ → `/faq`** under CUSTOMER CARE.
- [src/globals/story-page.ts:117](../../src/globals/story-page.ts) — the `/about` page's FAQ band
  ships with a button reading **CONTACT US → `/contact`**.

Spec 006 named both pages in its Out of Scope and modelled for them anyway: the `questions`
collection exists precisely so "a standalone `/faq` page reads the same rows" with nothing to
re-type ([src/collections/questions.ts:10](../../src/collections/questions.ts)), and spec 005
already holds the shop's messengers, email, phone and address in one record
([src/globals/contact-settings.ts](../../src/globals/contact-settings.ts)). **Neither page invents
content.** Both are, in the main, new views over data the admin already carries — which is why this
feature is two routes and one genuinely new capability: a message form that records what a visitor
writes and tells the shop about it.

## Design Inventory

### Frames in the two sections

| Page    | Frame                | Node        | Size     |
| ------- | -------------------- | ----------- | -------- |
| Contact | Контакты (desktop)   | `312:7499`  | 1920×2670 |
| Contact | contacts-tablet      | `419:10740` | 768×2626 |
| Contact | contacts-mobile      | `419:10831` | 390×3185 |
| FAQ     | FAQ (desktop)        | `266:4468`  | 1920×1197 |
| FAQ     | faq-tablet           | `422:9509`  | 768×1532 |
| FAQ     | faq-mobile           | `422:9881`  | 390×1601 |

### Contact — band-by-band status

| #  | Band                     | Desktop      | Tablet        | Mobile      | Status                                        |
| -- | ------------------------ | ------------ | ------------- | ----------- | --------------------------------------------- |
| —  | Contact banner + header  | `312:7500/1` | `419:11403/4` | `544:13129` | Built — `ContactBanner`, `Header`             |
| 1  | Page header              | `312:7502`   | `419:10761`   | `419:10843` | Built — `PageHeaderBlock`, **needs an intro paragraph it does not have** |
| 2  | Channel cards            | `312:8535`   | `419:10765`   | `419:10847` | **New band** — four cards, all from admin data |
| 3  | Send us a message        | `312:8649`   | `419:10792`   | `419:10872` | **New band** — the form, plus a photograph    |
| 3a | — the three fields       | `312:8662`   | `419:10796`   | `419:10876` | Built — `TextInput`, `Field`                  |
| 3b | — the submit button      | `312:8667`   | `419:10800`   | `419:10880` | Built — `Button`                              |
| 4  | FAQ                      | `312:8689`   | `419:10802`   | `419:10882` | **Centred variant of the `/about` band** — heading only |
| 4a | — a question             | `312:8692`   | `419:10805`   | `419:10885` | Built — `Accordion`                           |
| —  | Footer                   | `312:7564`   | `419:11405`   | `419:11754` | Built — `Footer`                              |

### FAQ — band-by-band status

| #  | Band                     | Desktop      | Tablet        | Mobile      | Status                              |
| -- | ------------------------ | ------------ | ------------- | ----------- | ----------------------------------- |
| —  | Contact banner + header  | `266:4469/70`| `419:12270/1` | `544:13145` | Built — `ContactBanner`, `Header`   |
| 1  | Title                    | `266:4471`   | `422:9560`    | `422:9894`  | `PageHeaderBlock` with no eyebrow   |
| 2  | Questions                | `266:4799`   | `422:9563`    | `422:9897`  | Built — `Accordion`                 |
| —  | Footer                   | `266:4476`   | `419:12272`   | `419:12439` | Built — `Footer`                    |

**The FAQ page is one band over the chrome.** That is the whole page, and it is the reason this spec
treats it as the smaller half of the work despite being one of the two headline deliverables.

### What each band actually contains

**Contact, reading the desktop frame top to bottom:**

1. **Page header** (`312:7502`) — an eyebrow (`CONTACT US`), the page's only `h1`
   (`WE'RE HERE TO HELP`), and an intro paragraph (`Questions, custom requests, or styling advice -
   our team is here for you`). Centred at desktop and tablet, left-aligned at mobile — the same
   treatment `PageHeaderBlock` already implements. The paragraph is the one thing that band cannot
   currently draw.
2. **Channel cards** (`312:8535`) — four cards, each an icon over a name over a value: WhatsApp /
   `+1 (555) 010 20-30`, Telegram / `@aurum`, Instagram / `@aurum`, Email Us /
   `hello@aurum.example`. Four across at 1920 (415 wide each), 2×2 at 768 (336 wide), a stacked list
   at 390. **Every one of these values already exists in the admin**: the first three are the
   `messengers` rows of `contact-settings` — the platform picks the icon and the name, the
   `handle` field is the value — and the fourth is that global's `email`. Each card's value is a
   working link: the messenger profile, or a `mailto:`.
3. **Send us a message** (`312:8649`) — a heading (`SEND US A MESSAGE`), a paragraph (`To make an
   enquiry, please use the contact form below…`), three fields (`Name`, `E-mail`, `Message` — the
   message is a 134-tall textarea), a button reading `SEND MESSAGE`, and a footnote (`We'll get back
   to you ass soon as possible.` — the typo is in the drawing). Name and E-mail sit side by side at
   desktop and stack at both narrower widths. A photograph fills the right half at desktop
   (960×750) and tablet (384×499), and sits below the form at mobile (390×320). The footnote is
   drawn only at desktop.
4. **FAQ** (`312:8689`) — a centred heading (`Frequently Asked Questions` at desktop and tablet,
   shortened to `FAQ` at mobile) over a column of accordion rows centred at 850 wide. Five rows
   drawn at desktop, three at tablet, four at mobile; one is drawn open. **No intro paragraph and
   no button** — which is exactly what distinguishes it from the same band on `/about`, where the
   copy and a `CONTACT US` button sit in a left column beside the questions.

**FAQ page:**

1. **Title** (`266:4471`) — a centred `Frequently Asked Questions` and nothing else. No eyebrow, no
   paragraph, no button.
2. **Questions** (`266:4799`) — the same accordion, 850 wide and centred at desktop, full width less
   a gutter at tablet and mobile. Three rows drawn at desktop, five at tablet and mobile; the first
   is drawn open at every width.

### What is deliberately absent from the drawing

- **The form in any state but empty.** No validation error, no in-flight button, no success message,
  no failure message. All four are settled in Requirements rather than inferred.
- **Any empty state.** No contact page with fewer than four channel cards, no FAQ list with nothing
  in it, no FAQ page with no questions published.
- **Real question text.** The rows read `Название` / `Описание` and `Any question?` repeated. The
  counts — five, three, four, three, five — are layout fill, not a rule about how many exist.
- **A phone card**, although `contact-settings` holds a phone number and the contact banner above
  the header already shows it. The drawing puts the number on the WhatsApp card instead.
- **The desktop footnote at tablet and mobile.** Treated as a reflow of one band, not a different
  content set.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A visitor reaches the shop on the channel they already use (Priority: P1)

A visitor follows "Contact us" from the header and lands on a page that opens with four ways to
reach the shop — WhatsApp, Telegram, Instagram, email. They tap the one they already have open on
their phone and arrive in a conversation with the shop, without typing anything.

**Why this priority**: It is the fastest path from "I have a question" to "I am talking to someone",
it works before any of this feature's new machinery does, and it is the half of the page that needs
no new content at all — the accounts have been in the admin since spec 005. A contact page that
only offers a form is a worse contact page than the chrome the site already has.

**Independent Test**: Set the shop's messengers and email in the admin, open `/contact`, and confirm
each card carries the right icon, name and handle, and that following it opens the right destination.
Delivers a working contact page on its own, with no form and no questions.

**Acceptance Scenarios**:

1. **Given** the shop has three messengers and an email address saved, **When** a visitor opens
   `/contact`, **Then** the page shows a card for each messenger and a card for the email, in the
   order the messengers are arranged in the admin, with the email card last.
2. **Given** a WhatsApp card, **When** the visitor activates it, **Then** a WhatsApp conversation
   with the shop's number opens — the same destination the footer and the checkout modal use.
3. **Given** the owner adds a fourth messenger in the admin, **When** the visitor reloads `/contact`,
   **Then** a fifth card appears with no deployment.
4. **Given** the owner unticks "Offer this messenger", **When** the visitor opens `/contact`,
   **Then** the card is still shown — hiding a messenger from checkout is not the same decision as
   refusing to be contacted on it, which is the rule the footer already follows.
5. **Given** a visitor using a keyboard alone, **When** they tab through the cards, **Then** each
   card's link takes focus with a visible focus ring and announces both the platform and the handle.

---

### User Story 2 - A visitor sends a message and knows it arrived (Priority: P2)

A visitor who would rather write than open a messenger fills in their name, their email and their
question, presses SEND MESSAGE, and is told plainly that it has been sent. The shop receives it at
the address it has published.

**Why this priority**: It is the one genuinely new capability in this feature, and the only path on
the whole site by which someone who is not ready to open a chat can still reach the shop. It sits
below P1 because it is worth nothing if the page itself does not render.

**Independent Test**: Submit the form on `/contact` with a mail transport that captures rather than
sends, and confirm the enquiry is recorded, one notification arrives at the shop's address carrying
the visitor's name, address and text, and the visitor is shown a confirmation.

**Acceptance Scenarios**:

1. **Given** a visitor has filled in all three fields correctly, **When** they press SEND MESSAGE,
   **Then** the button shows that it is working, and on success the form is replaced by a
   confirmation that the message was received.
2. **Given** a visitor leaves a required field empty or types an address that is not an email
   address, **When** they submit, **Then** nothing is recorded or sent, the specific fields are
   named, and focus moves to the first field at fault.
3. **Given** a submission that passes validation, **When** it is accepted, **Then** it is **recorded
   first** and the shop is notified by email second — the record is the receipt, and the email is
   how the owner finds out about it.
4. **Given** a recorded submission, **When** the shop opens the notification, **Then** it shows the
   visitor's name, their email address and their text, and a reply goes straight back to the
   visitor.
5. **Given** the enquiry was recorded but the mail service is unreachable, **When** the visitor
   submits, **Then** they are still told it was received — because it genuinely was — and the failed
   notification is marked on the record and logged, so the owner can find it in the admin.
6. **Given** the enquiry cannot be recorded at all, **When** the visitor submits, **Then** they are
   told it could not be received, what they wrote is kept in the form, and they are offered the
   messenger channels instead.
7. **Given** an automated script posting the form repeatedly, **When** it exceeds the allowed rate,
   **Then** further submissions are refused without recording or sending anything, and an ordinary
   visitor sending one message is unaffected.
8. **Given** a visitor with JavaScript unavailable, **When** they submit the form, **Then** the
   submission is still processed and answered — the form is not the only thing on the page, but it
   is the reason most people are on it.

---

### User Story 3 - A visitor answers their own question (Priority: P3)

A visitor follows "FAQ" from the footer, lands on a page that is nothing but the shop's questions,
expands the two that apply to them, and leaves without needing to write to anybody.

**Why this priority**: It is the cheapest support the shop has, it is one band over existing chrome,
and every question it answers is a message nobody has to write or reply to. Third because the two
contact paths above are what a visitor who could not find an answer needs next.

**Independent Test**: Publish several questions in the FAQ tab, open `/faq`, and confirm they all
appear in the admin's order with their answers expandable. Delivers the footer's promised page with
no change to the contact page at all.

**Acceptance Scenarios**:

1. **Given** the shop has published questions, **When** a visitor opens `/faq`, **Then** every
   published question is listed, in the order the admin's Order field sets, with the answers
   collapsed.
2. **Given** a visitor expands one question, **When** they expand a second, **Then** the first stays
   open — the same behaviour the `/about` band already has.
3. **Given** a question is unpublished or deleted, **When** a visitor reloads `/faq`, **Then** it is
   gone, with no edit made anywhere else.
4. **Given** the shop has published no questions at all, **When** a visitor opens `/faq`, **Then**
   the page renders its heading and a plain message rather than a heading over nothing — and it is
   not a 404, because the footer of every page links here.
5. **Given** a screen reader user, **When** they move through the list, **Then** each question is a
   control that announces whether it is expanded, and its answer is associated with it.

---

### User Story 4 - The owner writes both pages without a developer (Priority: P4)

The owner opens the admin, changes the contact page's headline and the wording above the form,
chooses which questions the contact page shows and in what order, edits the FAQ page's heading, and
sees all of it live without anyone deploying anything.

**Why this priority**: Constitution I makes this non-negotiable rather than optional, and it is what
turns two pages into two pages the shop can keep current. It sits below the reading scenarios only
because a page nobody can see is not worth editing.

**Independent Test**: Change every visible string on both pages from the admin and confirm each one
changes on the site, with no code touched.

**Acceptance Scenarios**:

1. **Given** the owner edits the contact page's headline, intro, form heading, form paragraph,
   button label, footnote and confirmation message, **When** they publish, **Then** the next visitor
   sees all of them.
2. **Given** the owner picks five questions for the contact page in a chosen order, **When** a
   visitor opens `/contact`, **Then** those five appear in that order — the same relationship-driven
   selection the `/about` band uses.
3. **Given** the owner chooses no questions for the contact page, **When** a visitor opens
   `/contact`, **Then** the FAQ band is absent entirely rather than a heading over an empty column.
4. **Given** the owner replaces the photograph beside the form, **When** a visitor opens `/contact`,
   **Then** the new photograph is shown, correctly sized and with its alternative text.
5. **Given** the owner saves a draft of either page, **When** they preview it, **Then** they see the
   change before publishing, and a visitor does not.
6. **Given** a customer account rather than an administrator, **When** they attempt to change either
   page's content, **Then** they are refused.

---

### User Story 5 - Both pages are found and shared correctly (Priority: P5)

Someone searches for how to contact the shop, or pastes `/faq` into a chat. The result carries the
right title, the right description and a sensible picture, and points at one canonical address.

**Why this priority**: A contact page nobody can find is a support cost, and both of these are pages
people arrive at from outside rather than from the navigation. Last because it changes nothing for a
visitor already on the page.

**Independent Test**: Inspect the rendered metadata of both routes with and without editor overrides
set, and confirm the title, description, canonical URL and social image are correct in both cases.

**Acceptance Scenarios**:

1. **Given** the owner sets no metadata, **When** either page is rendered, **Then** its title and
   description fall back to that page's own heading and intro rather than being empty.
2. **Given** the owner sets a meta title, description and social image, **When** the page is shared,
   **Then** the owner's values are used.
3. **Given** either page, **When** it is rendered, **Then** it emits a canonical URL and its content
   is present in the server response rather than assembled in the browser.

---

### User Story 6 - The owner keeps only the enquiries they should (Priority: P6)

The owner opens the admin, sees every enquiry that has arrived with the newest first, spots the one
whose email notification never went out, and answers it. A visitor later writes asking to be
forgotten; the owner finds their enquiries and deletes them. Everything older than the stated
retention period disappears on its own.

**Why this priority**: Constitution VI requires a documented retention period and a working deletion
path for every point at which personal data is collected — storing enquiries creates one, and this
story is what discharges that obligation. It is last because a visitor's message reaching the shop
is worth more than the shop's ability to tidy up afterwards, and because the email notification
already gets the owner what they need on day one.

**Independent Test**: Submit several enquiries, confirm they are listed in the admin newest-first
and readable only by an administrator, delete one, and run the retention purge against a record
older than the cutoff to confirm it goes.

**Acceptance Scenarios**:

1. **Given** several enquiries have arrived, **When** an administrator opens the admin, **Then**
   they are listed newest first, showing who wrote, their address, when it arrived and whether the
   notification was sent.
2. **Given** an enquiry whose email notification failed, **When** the administrator views the list,
   **Then** that enquiry is distinguishable from one whose notification succeeded.
3. **Given** a customer account rather than an administrator, **When** they request enquiries
   through any interface the site exposes, **Then** they get nothing — including enquiries they
   themselves sent.
4. **Given** a visitor asks to be forgotten, **When** the administrator deletes their enquiries,
   **Then** the records are gone and nothing on the site still shows their name, address or text.
5. **Given** an enquiry older than the stated retention period, **When** the scheduled cleanup runs,
   **Then** it is deleted without anyone doing anything.
6. **Given** the enquiry list, **When** an administrator opens one, **Then** they can read it but
   the visitor's own words are not editable — what arrived is what arrived.

---

### Edge Cases

- **The shop has no messengers saved at all.** The channel grid falls back to the email card alone
  rather than rendering an empty row; the band is never a bordered grid with nothing in it.
- **A messenger row is saved with a platform but no destination.** It is dropped from the grid — the
  same rule `getSocialLinks` already applies — because a card that leads nowhere looks like a
  working way to reach the shop.
- **The shop's email field is empty.** The email card falls back to the shipped default address, as
  the footer already does, rather than rendering a dead `mailto:`.
- **A visitor submits the form twice by double-pressing the button.** One message is sent, not two.
- **A visitor pastes several thousand words into the message.** The field has a stated maximum, the
  limit is enforced on the server as well as shown in the form, and the visitor is told rather than
  silently truncated.
- **A visitor's name or message contains characters that mean something in an email.** They arrive
  as text and are never interpreted — nothing a visitor types can alter the structure of the message
  the shop receives.
- **A visitor types an address that is syntactically valid but does not exist.** The enquiry is
  still recorded and delivered to the shop; the shop's reply bounces, which is the shop's problem to
  see rather than something the form pretends to prevent.
- **The mail service accepts the message and drops it.** Out of this feature's control — and the
  reason the enquiry is recorded before it is mailed rather than existing only in an inbox.
- **The enquiry is recorded but the notification fails.** The visitor is told it was received,
  because it was. The record carries the failed outcome, the admin list shows it, and the failure is
  logged; the owner is never left believing every enquiry reached their inbox.
- **The enquiry cannot be recorded.** Nothing is mailed, the visitor is told plainly, and what they
  wrote stays in the form — a confirmation for a message the shop does not have is the one outcome
  this feature must never produce.
- **The retention purge runs while an enquiry is being written.** Only records older than the cutoff
  are removed, so an arriving enquiry can never be caught by the sweep that is running.
- **An administrator deletes an enquiry that has not been answered.** It goes. Deletion is the
  erasure path, and it is not gated on a workflow state this feature does not have.
- **A question chosen by the contact page is later unpublished.** It disappears from `/contact` with
  no edit to the page, exactly as it does from `/about`; if it was the last one, the band goes.
- **The same question is shown on `/about`, `/contact` and `/faq`.** It is one row, edited once, and
  all three follow.
- **A question's answer is long enough to run past the fold when expanded.** It expands in place;
  nothing on the page below it is obscured, and no other row closes.
- **A visitor with reduced-motion preferences expands a question.** It opens without animation.
- **The database is unreachable during a container build.** Both routes render their chrome and
  their shipped defaults rather than failing the build — the condition
  `src/lib/catalog/prerender.ts` already documents, and which spec 005 hit by putting a Payload read
  in the root layout.

## Requirements *(mandatory)*

### Functional Requirements

**The contact page**

- **FR-001**: The site MUST serve a contact page at `/contact`, the destination the header, the
  footer and the `/about` page's FAQ button already point at.
- **FR-002**: The page MUST render four bands in a fixed order — page header, channel cards, message
  form, questions — and MUST NOT offer that order as an editorial choice. The form and the channel
  grid are the page's purpose rather than bands somebody may reorder or delete.
- **FR-003**: The page MUST render meaningful content server-side and MUST NOT require client-side
  data fetching to show its channels, its copy or its questions.
- **FR-004**: The page MUST carry exactly one top-level heading, and every band heading MUST sit one
  level below it with no level skipped.
- **FR-005**: The page MUST render correctly at the three drawn widths and at every width between
  and beyond them, with no horizontal scrolling.
- **FR-006**: The page MUST meet WCAG 2.2 Level AA and MUST be fully operable by keyboard alone and
  with a screen reader.
- **FR-007**: The page header band MUST be able to draw an **intro paragraph** beneath its headline.
  This MUST be an addition to the existing page-header band used by `/about` and `/blog`, not a
  second band that draws the same thing.

**The channel cards**

- **FR-008**: The channel grid MUST be built from the shop's existing contact record. It MUST NOT
  introduce a second place to write the shop's messengers, handles or email address.
- **FR-009**: Each messenger card MUST show the platform's icon, the platform's name and the
  **displayed handle** the owner set — never the raw destination, which may differ.
- **FR-010**: Each messenger card MUST link to that messenger's profile, built by the same rules the
  footer and the checkout modal already use.
- **FR-011**: The grid MUST show one card per saved messenger, in the order the admin arranges them,
  followed by a single email card linking to the shop's email address.
- **FR-012**: The grid MUST include messengers that are not offered at checkout. Hiding a messenger
  from the order handoff and refusing contact on it are different decisions.
- **FR-013**: A messenger row without a usable destination MUST be omitted from the grid.
- **FR-014**: The grid MUST lay out as four across, two-by-two and a single stacked column at the
  three drawn widths, and MUST remain coherent for any number of cards from one upward.

**The message form**

- **FR-015**: The page MUST offer a form with a **name**, an **email address** and a **message**, and
  MUST send a completed submission to the shop by email.
- **FR-016**: All three fields MUST be required. The email address MUST be validated for shape, and
  each field MUST have a stated maximum length.
- **FR-017**: Every field MUST be validated **on the server**. Client-side validation is a
  convenience and MUST NOT be the only check.
- **FR-018**: The form MUST work without client-side JavaScript.
- **FR-019**: Validation failure MUST name the specific fields at fault, keep what the visitor
  typed, move focus to the first field at fault, and announce the failure to assistive technology.
- **FR-020**: The submit control MUST show that it is working while a submission is in flight and
  MUST NOT be able to send the same submission twice.
- **FR-021**: A successful submission MUST be acknowledged on the page with an editor-controlled
  message, and MUST NOT be acknowledged unless the enquiry was **durably recorded**. The record is
  the receipt; the email in FR-024 is a notification, and its failure MUST NOT retract an
  acknowledgement the shop can honour.
- **FR-022**: A submission that could not be recorded MUST say so, MUST NOT discard what the visitor
  wrote, and MUST point the visitor at the channel cards as an alternative.
- **FR-023**: The band MUST show an editor-chosen photograph beside the form at desktop and tablet
  and beneath it at mobile, with alternative text and reserved space so nothing shifts as it loads.

**Delivery, abuse and data**

- **FR-024**: The notification MUST be delivered to the shop's own email address as held in the
  contact record, with an optional override field for a different enquiries address. It MUST NOT be
  sent to an address written in code.
- **FR-024a**: The notification MUST be sent **after** the enquiry has been recorded, and its
  success or failure MUST be stored on that record. A notification that fails MUST NOT discard,
  roll back or alter the enquiry it was announcing.
- **FR-025**: The delivered notification MUST carry the visitor's name, email address and text, and
  MUST be composed so that a reply reaches the visitor directly.
- **FR-026**: Visitor-supplied text MUST be treated as text throughout. Nothing a visitor types MUST
  be able to alter the structure of the delivered message or of any page that displays it.
- **FR-027**: The form MUST be protected against automated abuse by at least a **server-enforced
  rate limit** that survives a redeploy and holds across instances, and a submission refused by it
  MUST NOT be recorded and MUST NOT send mail — a throttle that fills the enquiry list with the
  traffic it was meant to stop is not a throttle. The protection MUST NOT require a visitor to solve
  a puzzle, and MUST NOT depend on client-side JavaScript for its enforcement.
- **FR-028**: The outcome of every submission — accepted, rejected, throttled or failed to send —
  MUST be recorded in structured logs with a correlation identifier, and those logs MUST NOT contain
  the visitor's message text or email address.
- **FR-029**: Every accepted submission MUST be stored as an **enquiry record** holding the
  visitor's name, email address and message, the time it arrived, and the outcome of its
  notification. Email MUST NOT be the only place an enquiry ever lands.
- **FR-029a**: Enquiry records MUST be readable **only by administrators**. No customer session and
  no anonymous request may read any enquiry through any interface the site exposes — including a
  customer reading an enquiry they sent themselves. Creating an enquiry MUST be possible only
  through the contact form's own submission path, never by a direct request from a browser.
- **FR-029b**: An enquiry's visitor-supplied content MUST NOT be editable after it arrives. What
  the visitor wrote is a record of what they wrote.
- **FR-029c**: The enquiry list MUST show, without opening a record, who wrote, their address, when
  it arrived and whether the notification was sent, ordered newest first — so an owner can see at a
  glance which enquiries they were never told about.
- **FR-029d**: Enquiries MUST have a **stated retention period**, after which they MUST be deleted
  automatically by a scheduled cleanup that requires no human action. The period MUST be defined in
  one place rather than written into the cleanup's logic.
- **FR-029e**: An administrator MUST be able to delete any enquiry on request, and that deletion
  MUST be the working erasure path for the personal data a visitor supplied — after it, nothing on
  the site retains that visitor's name, address or text.
- **FR-029f**: The enquiry record MUST NOT be joined to a customer account, even where the address
  matches one. An enquiry is correspondence, not profile data, and linking the two would widen who
  can see it.
- **FR-030**: The form MUST NOT require an account, MUST NOT read or write the visitor's session,
  and MUST NOT set a cookie.

**Questions on the contact page**

- **FR-031**: The contact page MUST show a subset of questions **chosen by the editor**, in an order
  the editor controls, using the same shared `questions` collection `/about` reads. It MUST NOT hold
  a copy of any question's text.
- **FR-032**: The band MUST be absent entirely when no question it would show is published.
- **FR-033**: An unpublished or deleted question MUST disappear from the contact page with no edit
  to the page.
- **FR-034**: The band MUST be drawn **centred, with a heading and the questions only** — no intro
  paragraph and no button. This MUST be a **variant of the band `/about` already uses**, not a
  second component that draws questions.
- **FR-035**: Opening a question MUST NOT close another, and each row MUST expose its expanded state
  to assistive technology.

**The FAQ page**

- **FR-036**: The site MUST serve an FAQ page at `/faq`, the destination the footer already points
  at.
- **FR-037**: The page MUST list **every published question**, in the order the collection's own
  Order field sets — the field `src/collections/questions.ts` reserved for this page.
- **FR-038**: The page MUST NOT require a second selection step. "Publish a question" is the only
  action needed for it to appear here.
- **FR-039**: The page MUST render its heading and a plain message when no question is published,
  and MUST NOT return "not found" — every page on the site links here.
- **FR-040**: The page's heading, and its empty message, MUST be editable in the admin.
- **FR-041**: The page MUST use the same question component, expansion behaviour and accessibility
  semantics as the bands on `/about` and `/contact`.

**Editorial control**

- **FR-042**: Every user-visible string on both pages MUST be editable in the admin without a
  deployment — headline, eyebrow, intro, form heading, form paragraph, field labels, button label,
  footnote, confirmation and failure messages, FAQ headings and the empty message.
- **FR-043**: Both pages' content MUST support drafts and versions, so a change can be previewed and
  reverted without a deploy.
- **FR-044**: Publishing a change to either page, or to a question either page shows, MUST make it
  visible to the next visitor. A stale page after publish is a defect.
- **FR-045**: Reading both pages' content MUST be public; changing it MUST be restricted to
  administrators.
- **FR-046**: The drawn copy MUST be the shipped default, so an untouched install renders the drawn
  pages rather than blank ones. The typo in the drawn footnote (`ass soon as possible`) MUST be
  corrected in the shipped default.
- **FR-047**: Every new field MUST carry an editor-facing label and, where its purpose is not
  self-evident, a description. Both pages MUST be verified in the admin by actually editing and
  previewing them before merge.

**Metadata and delivery**

- **FR-048**: Both pages MUST emit an editor-controlled title, description and social image, falling
  back to their own heading and intro when the editor sets none.
- **FR-049**: Both pages MUST emit a canonical URL.
- **FR-050**: Both pages' caching and revalidation strategy MUST be stated explicitly, and MUST NOT
  invalidate unrelated pages — in particular, publishing a question MUST NOT evict the product
  catalogue.
- **FR-051**: Both pages MUST stay within the site's performance budgets: initial JavaScript no more
  than 300KB gzipped for the route, and no more than 100KB gzipped above the measured framework
  baseline.
- **FR-052**: The FAQ page SHOULD emit structured data marking its content as a set of questions and
  answers, so a search result can show them.

**Reuse and tokens**

- **FR-053**: Both pages MUST reuse the existing header, contact banner, footer, container, button,
  text input, field, accordion, rich text, icon and media components. A near-copy of any of them is
  a defect.
- **FR-054**: The messenger link-building, contact-detail reading and question-loading already in
  the codebase MUST be reused rather than reimplemented.
- **FR-055**: A component built for these pages that gains a second consumer MUST live in the shared
  UI kit rather than being copied.
- **FR-056**: All colour, spacing, typography, radius and motion values MUST reference existing
  design tokens. No raw hex, no arbitrary pixel spacing, no one-off font sizes.
- **FR-057**: Every interactive element MUST implement its full state set: default, hover,
  focus-visible, active, disabled and — for the submit control — loading.

### Key Entities

- **Contact page** — one record holding the contact page's copy and its choices: the header's
  eyebrow, headline and intro; the form band's heading, paragraph, button label, footnote,
  confirmation and failure messages, and its photograph; the FAQ band's heading and its chosen
  questions; an optional enquiries address; and search metadata. One record, not a list: nothing in
  the design or the brief suggests a second page of this shape.
- **FAQ page** — one record holding the FAQ page's heading, its empty message and its search
  metadata. Deliberately tiny; the page's content is the questions themselves.
- **Question** — **unchanged**. The existing shared collection: a question, a rich-text answer, an
  order and a published state. This feature adds no field to it and re-types none of its content.
- **Contact record** — **unchanged**. The existing global holding the shop's email, phone, address,
  opening hours and messenger accounts. This feature reads it; it does not extend it beyond the
  optional enquiries address in FR-024.
- **Enquiry** — **the one new collection this feature adds.** A visitor's name, email address and
  message, the time it arrived, and whether the shop's notification was sent. Administrator-readable
  only, never editable in its visitor-supplied parts, never joined to a customer account, and
  deleted automatically once past the retention period. It is deliberately not an inbox: there is no
  reply, no assignee, no status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every link in the site chrome resolves. `/contact` and `/faq` return a page, and no
  navigation item, footer link or call to action anywhere on the site leads to a 404.
- **SC-002**: A visitor arriving at `/contact` can open a conversation with the shop on the channel
  of their choice in **one action** and with no typing.
- **SC-003**: A visitor can send a written enquiry in **under 90 seconds** from landing on the page,
  and is told within **5 seconds of submitting** whether it was sent.
- **SC-004**: **100% of accepted submissions** are recorded and notified to the shop's published
  address with the visitor's name, address and text intact, and **no submission is ever acknowledged
  as received when no record of it exists**.
- **SC-004a**: A mail outage costs **zero enquiries**. Every message submitted while mail is
  unavailable is still in the admin afterwards, and each one is identifiable as un-notified without
  reading the logs.
- **SC-005**: The owner can change **every visible word** on both pages, and choose which questions
  the contact page shows, from the admin alone — verified by changing all of them with no code
  change and no deployment.
- **SC-006**: A question written once appears on `/about`, `/contact` and `/faq` with **no text
  typed twice**, and unpublishing it removes it from all three with no other edit.
- **SC-007**: Both pages pass an automated WCAG 2.2 AA scan with **zero violations**, and the whole
  of the contact page — cards, form and questions — is operable by keyboard alone.
- **SC-008**: Both pages render meaningful content in the server response, and both stay within
  300KB gzipped of initial JavaScript and 100KB above the framework baseline.
- **SC-009**: Both pages render without horizontal scrolling at every width from 320px upward.
- **SC-010**: An automated script cannot cause the shop to be sent more than the allowed number of
  messages per hour, and a genuine visitor sending one message is never refused.
- **SC-011**: A published change to either page, or to a question either shows, is visible to the
  next visitor, and publishing a question does not evict any product page.
- **SC-012**: **No enquiry is readable by anyone but an administrator**, verified by attempting to
  read one as an anonymous visitor and as a signed-in customer through every interface the site
  exposes.
- **SC-013**: An erasure request is satisfied **completely by deleting the records**, and no enquiry
  older than the stated retention period exists in the system after the cleanup has run.

## Assumptions

- **Both pages are fixed compositions, not block-composed like `/about`.** The contact page's four
  bands each exist once and none is optional in a way an editor would want; the FAQ page is a
  heading over a list. `src/globals/blog-page.ts` set exactly this precedent and recorded the
  reasoning: a blocks body would offer an editor the ability to reorder a header against a grid that
  is not in the list. The plan should record the alternative rather than treat this as settled by
  default.
- **"Static texts" means "not a list", not "hardcoded".** Constitution I does not permit user-visible
  copy in a component, and spec 006 already converted the same instinct into an editable record. The
  copy is fixed in *structure* and editable in *content*.
- **The channel grid is derived, not a second list to maintain.** The brief says "we already have
  contacts info in admin", and `getSocialLinks` and `getContactDetails` already read it. There is no
  new editable list of socials.
- **The email card is always last and always present**, since the shop always has an email address —
  falling back to the shipped default when the field is empty, as the footer already does.
- **No phone card.** The drawing does not show one, and the contact banner directly above the page
  header already carries the number.
- **The FAQ page lists questions flat, ordered by the collection's Order field.** Spec 006's FR-038
  required only that grouping be *possible* later without re-typing; the drawing shows a flat list,
  so grouping is not built now.
- **The contact page's FAQ selection is its own**, independent of the `/about` band's selection. The
  brief asks to "select which questions to display" on this page specifically.
- **No auto-reply to the sender.** The drawing's footnote — "we'll get back to you as soon as
  possible" — sets the expectation on the page instead, and a second automated email is a decision
  the owner should make deliberately.
- **Enquiries are recorded as well as emailed** (FR-029), which is a deliberate addition to the
  brief's "always send message to the email" rather than a reading of it. The brief fixes email as
  how the owner *finds out*; storing is what stops a mail outage from silently losing a customer's
  message, and it is what makes an erasure request answerable at all.
- **Twelve months is the proposed retention period**, matching how long an enquiry might plausibly
  relate to a purchase being considered. It is a starting figure for the owner to confirm, not a
  legal determination — the requirement is that a period is stated, defined in one place and
  enforced automatically (FR-029d).
- **The retention cleanup joins the scheduled work that already exists** rather than introducing a
  scheduler. The site already drains a nightly queue holding an account purge and a cart expiry, and
  those two established both the mechanism and the reasoning for it.
- **The admin surface for enquiries is a list and a read-only detail view**, which Payload gives for
  a collection without bespoke screens. Anything resembling a helpdesk is out of scope below.
- **The form sends one message per submission to one address.** No routing by subject, no
  department picker, no attachments — none appear in the drawing.
- **Both routes render per request**, following `/about` and `/blog`, because the production image is
  built with no database and a prerendered page would bake empty and never heal.
- **The existing mail transport is reused.** The site already sends mail and already has a
  `log` transport for tests; this feature does not introduce a second sending path.
- **The abuse protection follows the pattern already in the codebase** — the auth codes are
  throttled with database-backed per-address limits precisely because in-process counters do not
  survive a redeploy or hold across instances.
- **Five enquiries per hour from one sender is the proposed allowance**, generous enough that no
  genuine visitor meets it and tight enough that the enquiry list cannot be flooded. Like the
  retention period, it is a starting figure for the owner to confirm; what the spec requires is that
  a limit exists, is enforced server-side and is defined in one place.
- **One language.** The header's language selector is unchanged and neither page attempts a
  translation layer.

## Out of Scope

- **A general `pages` collection.** Two named pages, as `/about` and `/blog` are. Arbitrary
  editor-created pages with routing of their own remain a later change.
- **Grouping questions under category headings** on `/faq`, and **search over the questions**. Both
  were left possible by spec 006's model; neither is drawn.
- **A helpdesk.** Enquiries are stored (FR-029) and an administrator can list, read and delete them
  — and that is all. No replying from inside the admin, no assignee, no open/closed status, no
  threading of a visitor's second message onto their first, no notes, no search or filtering beyond
  what a collection list gives for free, and no export.
- **Retrying a failed notification.** A failure is recorded and visible (FR-024a, FR-029c) so the
  owner can act on it; automatically re-sending it later is a queue and a backoff policy this
  feature does not build.
- **Alerting the owner when notifications start failing.** The outcome is logged and stored; wiring
  it to a monitor is the observability change, not this one.
- **A self-service erasure request form.** FR-029e's deletion path is an administrator acting on a
  request, not a visitor deleting their own records.
- **An auto-reply, a ticket number, or a delivery receipt to the visitor.**
- **File attachments on the enquiry form.**
- **Live chat, a chat widget, or any third-party support tool.**
- **A CAPTCHA or any challenge the visitor must solve.** FR-027 requires protection that does not
  make an ordinary visitor prove anything.
- **Routing enquiries to different addresses by subject or department.**
- **The Shipping & Returns page**, also linked from the footer, also unbuilt, and not this feature.
- **Changing the contact banner, header, footer or checkout handoff modal**, all of which already
  read the same contact record this page reads.
- **Reworking the home page's hero and about band onto the content model.** They still read
  `src/mocks/home.ts`; closing that deviation remains its own change.
- **Translations.**
