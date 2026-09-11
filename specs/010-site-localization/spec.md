# Feature Specification: Three Languages — English, Russian and Ukrainian Across the Whole Site

**Feature Branch**: `010-site-localization`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "We have the `src/components/layout/language-selector/language-selector.tsx`. We should add the localization into our website. We will have 3 locales: en, ru & uk. The locales will be selectable from the admin dashboard."

---

## Localization Inventory

### The switcher exists and does nothing

`src/components/layout/language-selector/language-selector.tsx` has been on the site since spec 001.
It is drawn in the header from `md` up and inside the mobile navigation panel below it, it has a
trigger, a panel, keyboard behaviour and an accessible name, and choosing a row changes **nothing**
except which two letters the trigger shows. The header says so in its own comment
(`src/components/layout/header/header.tsx:108`):

> Locale is local state because nothing routes on it yet. When i18n lands this becomes controlled by
> the router; the shape of the prop does not change.

This feature is that landing. Three facts about today's placeholder set the starting point:

- The list of languages is a hardcoded constant, `DEFAULT_LOCALES` at `header.tsx:74`, and it holds
  **two** entries — `EN` and `RU`. Ukrainian does not exist anywhere in the codebase.
- The selection is `React.useState` inside the header. It is lost on every navigation and on every
  reload, and the server never learns of it.
- `src/app/(frontend)/layout.tsx:65` renders `<html lang="en">` as a literal. Every page the site
  serves currently declares itself English to assistive technology and to crawlers, whatever it
  contains.

### Nothing in the content model is localized

`src/payload.config.ts` has no localization configuration. Thirteen collections and eight globals
model their copy as single-valued fields, so there is exactly one Privacy Policy, one product
description and one FAQ answer in the database, in whatever language the owner typed.

This is the largest fact in the document: **turning on three languages changes the shape of every
piece of published content the site has.** The change is a schema migration on live data, it is not
reversible by a redeploy, and the twenty migrations already in `migrations/` are the bar it has to
clear.

### Two bodies of words, and they are not the same problem

**1. Editorial content — roughly a hundred fields, owned by the owner.** Concentrated where the
prose is: `contact-page` (13 text/rich-text fields), `articles` (7), `contact-settings` (7), `shop`
(6), `cookie-settings` (5), `blog-page` (4), `products` (4), then categories, collections, sizes,
attributes, questions, article-categories, policies and the seven block definitions in `src/blocks/`.
Add the shared field configs every one of them composes: `seo.ts` (title, description), `cta.ts`
(label, href), `slug.ts`, `media-slot.ts` (alt text).

**2. Interface chrome — several hundred strings, owned by developers.** 195 component and route files
carry them: "Choose a size", "ADD ADDRESS", "Applied filters", "A new code is on its way.", the cart
count's spoken form `Cart, 2 items`, every form label, every validation sentence, every `aria-label`.
None of them are in Payload and none of them are reachable by an editor.

There is one foothold already built. `src/lib/auth/form-errors.ts` has the server actions return
**message keys** — `changePasswordMismatch`, `changePasswordTooWeak` — which the screen turns into a
sentence through a dictionary it is handed. That indirection is exactly the shape localization needs,
and its own comment currently argues against a shared copy module ("these strings are part of the
screen, not content somebody edits"). That reasoning holds for *who owns* the words and stops holding
for *how many languages* they exist in.

### Three things that are words but are not copy

- **Country names.** `src/lib/countries.ts` backs the address forms and the `supportedCountries` list
  handed to the ecommerce plugin. A Ukrainian address form offering English country names is a defect
  a translator cannot fix.
- **Money.** One currency, `USD`, decided deliberately in `payload.config.ts` — "a second would
  generate a second price field on every priced collection". Localization does **not** reopen that.
  What changes is how a price is written: the grouping, the decimal mark and the symbol's position
  differ between the three languages even when the currency does not.
- **Dates.** Article publication dates, "Last Updated: August 2026" on the policy pages.

### The slug generator cannot spell Russian

`src/fields/slug.ts` derives a slug with `.replace(/[^a-z0-9]+/g, '-')`. Given "Каблучка з діамантом"
it produces the empty string, and `slug` is `required: true` and `unique: true`. Whatever this feature
decides about per-language addresses, it cannot decide it by accident — the current generator turns a
Cyrillic title into a save error.

### Every address on the site is in scope

`/`, `/all-jewelry`, `/[category]`, `/products/[slug]`, `/cart`, `/about`, `/blog`, `/blog/[slug]`,
`/contact`, `/faq`, `/legal/[slug]`, and the six account routes under `(account)`. `src/app/sitemap.ts`
enumerates the lot and emits exactly one address per document today.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A visitor reads the site in their own language (Priority: P1)

A Ukrainian-speaking visitor lands on a product page, opens the language selector in the header, and
picks `UK`. The page reloads in Ukrainian at an address that identifies the language. Every link they
follow from there stays Ukrainian. They close the tab, come back tomorrow, and the site is still
Ukrainian without them asking twice.

**Why this priority**: This is the feature. Nothing else in this document is worth building if the
switcher still does nothing.

**Independent Test**: With Russian and Ukrainian content entered for one category and its products,
switch language from the header on desktop and from the mobile panel, navigate three pages deep, and
reload — the language holds throughout and the page's declared language attribute matches what is on
screen.

**Acceptance Scenarios**:

1. **Given** a visitor on an English product page, **When** they choose `RU` from the header selector,
   **Then** the same product is shown in Russian at that language's address, with the selector reading
   `RU`.
2. **Given** a visitor who has chosen Ukrainian, **When** they navigate to the blog and then to an
   article, **Then** both pages are Ukrainian without a further choice.
3. **Given** a visitor who chose Russian yesterday, **When** they return to the site's root address,
   **Then** they are served Russian.
4. **Given** a visitor whose browser is configured for Russian and who has never chosen a language,
   **When** they open the site, **Then** it is English and the selector reads `EN` — the browser's
   preference is never acted on by itself.
5. **Given** a visitor on a narrow screen, **When** they open the mobile navigation panel, **Then** the
   same three languages are offered and choosing one closes the panel and reloads in that language.
6. **Given** any page in Ukrainian, **When** its markup is inspected, **Then** the document's language
   attribute reads `uk` rather than `en`.

---

### User Story 2 - The owner writes the site three times (Priority: P1)

The owner opens the admin, edits the Privacy Policy, switches the editing language from English to
Russian, and types the Russian text. The English original is untouched and still live. They save,
publish, and the Russian policy page shows the Russian text while the English one is unchanged.

**Why this priority**: Equal first with US1, and the reason: a switcher that routes to empty pages is
worse than no switcher. Content entry and content display have to arrive together.

**Independent Test**: In the admin, enter Russian text for one global, one collection document and one
block inside a page, publish, and confirm each appears on the matching Russian address while the
English versions are unaffected.

**Acceptance Scenarios**:

1. **Given** a published English article, **When** the owner switches the admin editing language to
   Ukrainian and saves a Ukrainian title and body, **Then** the English article is unchanged and the
   Ukrainian one is available.
2. **Given** a document being edited, **When** the owner switches editing language, **Then** the fields
   that hold words show that language's values and the fields that hold images, prices, stock and
   dates show the same single value regardless of language.
3. **Given** a rich-text policy body, **When** it is translated, **Then** the Russian version keeps its
   own headings, lists, bold run-ins and links rather than inheriting the English structure.
4. **Given** a draft translation, **When** it is saved but not published, **Then** visitors do not see
   it in any language.

---

### User Story 3 - The owner decides which languages the site offers (Priority: P2)

Ukrainian is half-translated and the owner does not want visitors to find it yet. In the admin they
turn Ukrainian off. The header selector drops to two entries; the Ukrainian addresses stop being
offered. When the translation is finished they turn it back on and everything they typed is still
there.

**Why this priority**: The user asked for it explicitly ("selectable from the admin dashboard"), and
it is what makes shipping a language a decision rather than a deploy. It is P2 only because the site
can launch with all three on.

**Independent Test**: Toggle a language off in the admin, confirm the storefront selector and the
sitemap no longer offer it and its addresses no longer serve; toggle it back on and confirm the
previously entered content returns intact.

**Acceptance Scenarios**:

1. **Given** three languages configured, **When** the owner disables Ukrainian, **Then** the header and
   mobile selectors offer two and the Ukrainian content is preserved but unreachable to visitors.
2. **Given** a visitor whose remembered language has just been disabled, **When** they return, **Then**
   they are served the default language rather than an error.
3. **Given** a disabled language, **When** the owner edits content, **Then** they can still enter and
   save that language's text so a translation can be finished before it goes live.
4. **Given** the owner attempts to disable the default language, **When** they save, **Then** the
   change is refused with an explanation — the site must always have one language to fall back to.
5. **Given** the admin's language control, **When** the owner opens it, **Then** it offers exactly the
   three languages the site knows, with no control that appears to add a fourth.

---

### User Story 4 - The interface speaks the visitor's language too (Priority: P2)

A Russian visitor adds a piece to their cart. The button said "ДОБАВИТЬ В КОРЗИНУ", the size control
said "Выберите размер", the toast said the piece was added, and when they mistype an email the
validation sentence is Russian. Nothing on the screen is a leftover English word.

**Why this priority**: A page whose prose is Russian and whose buttons are English is not a translated
site. It is separated from US1 because it is a different body of words with a different owner, and it
can be delivered language by language without blocking the content work.

**Independent Test**: Walk the catalogue → product → cart → checkout-handoff path and the sign-in →
registration → verification path in each language, and confirm no English string appears on screen or
in the accessible names.

**Acceptance Scenarios**:

1. **Given** the site in Russian, **When** a visitor opens any page in the catalogue or account flows,
   **Then** every button, label, placeholder, empty state and error sentence is Russian.
2. **Given** the site in Ukrainian, **When** a screen reader announces the cart trigger, **Then** the
   count and its noun are announced in Ukrainian with the correct plural form for that count.
3. **Given** the site in any language, **When** a price is displayed, **Then** it is written with that
   language's number formatting while remaining the same currency and the same amount.
4. **Given** an address form in Ukrainian, **When** the country list is opened, **Then** the country
   names are in Ukrainian.

---

### User Story 5 - Search engines index three sites, not one (Priority: P3)

Each page exists at three addresses. Each declares which language it is, points at its own canonical
address, and names its two siblings so a crawler indexes all three instead of treating two of them as
duplicates.

**Why this priority**: Constitution V makes discoverability a budgeted outcome, and a multilingual
site without these signals is actively penalised. It is P3 because it is invisible to a human tester
and worthless before US1 and US2 exist.

**Independent Test**: Fetch one product, one article and one policy page in each language and confirm
the language declaration, canonical address and cross-language links are present and consistent, and
that the site's address list contains every enabled language's addresses.

**Acceptance Scenarios**:

1. **Given** a product page in three languages, **When** any one of them is fetched, **Then** it names
   itself canonical and names the other two as its alternates, and each alternate names it back.
2. **Given** a language that is disabled, **When** the site's address list is generated, **Then** none
   of its addresses appear.
3. **Given** a page whose metadata has been translated, **When** it is shared, **Then** the title,
   description and social preview are in that page's language.

---

### User Story 6 - Mail and messenger handoffs arrive in the right language (Priority: P3)

Someone registers in Ukrainian. Their verification code arrives in Ukrainian. Someone sends an enquiry
in Russian; the message that reaches the shop's WhatsApp identifies the language it came in.

**Why this priority**: It closes the gap between the site and everything the site sends. P3 because a
translated site with English mail is embarrassing, not broken.

**Independent Test**: Register, request a password reset and submit an enquiry in each language, and
confirm the sent mail and the composed messenger text match.

**Acceptance Scenarios**:

1. **Given** a visitor registering in Russian, **When** the verification mail is sent, **Then** its
   subject and body are Russian.
2. **Given** a customer who registered in Ukrainian, **When** they later request a password reset from
   a page in English, **Then** the mail follows the language of the page they asked from.
3. **Given** an enquiry submitted in Ukrainian, **When** it is handed to the shop's messenger, **Then**
   the composed message carries the enquiry's language so the shop can answer in it.

---

### User Story 7 - A missing translation degrades instead of breaking (Priority: P3)

The owner has translated the policies but not yet the fifty product descriptions. A Ukrainian visitor
browsing a product sees the page intact, with the untranslated description in the default language,
rather than a blank block or a 404.

**Why this priority**: It is the normal state of a three-language site for months at a time.

**Independent Test**: With a document translated in one language only, request it in the other two and
confirm the page renders completely.

**Acceptance Scenarios**:

1. **Given** a product with no Russian description, **When** it is viewed in Russian, **Then** the page
   renders with the default language's description and no empty region.
2. **Given** a document with no translation at all in a language, **When** it is requested in that
   language, **Then** it is served rather than 404, in the default language's words.
3. **Given** an editor in the admin, **When** they open a document in a language it has no text for,
   **Then** the admin makes clear the fields are untranslated rather than presenting fallback text as
   if it had been entered.

---

### Edge Cases

- **A language is disabled while someone is reading it.** Their remembered choice now names a language
  the site does not offer — they are moved to the default language rather than shown an error.
- **A slug that cannot be spelled.** A Russian or Ukrainian title run through the current slug
  generator produces an empty string, and the field is required and unique. FR-014 settles what a
  document's address is in each language; whatever it settles, saving a Cyrillic-titled document must
  not fail.
- **Two languages colliding on one address.** If addresses are per-language, two documents must not be
  able to claim the same one.
- **An address in a language that does not exist.** A request for a fourth language prefix, or for a
  disabled one, resolves to something real rather than a server error.
- **An unpublished translation of a published document.** The published language stays live; the draft
  one does not leak.
- **Plural forms.** Russian and Ukrainian have three plural categories where English has two. "1 item
  / 2 items" cannot be expressed as a singular and a plural string.
- **Text that grows.** German-length is not a risk here, but Russian runs roughly 15% longer than
  English and the site's buttons and navigation are drawn to fixed widths in several places.
- **The cart survives a language switch.** Switching language mid-session must not drop the cart, the
  session, or a half-filled form.
- **Old addresses stay alive.** Every address the site serves today is indexed and linked. Whatever
  address shape this feature adopts, today's addresses must keep resolving.
- **A language switch on a page that only exists in one language.** The visitor lands somewhere real —
  the equivalent page in the chosen language, or the default language's version of it — not a 404.
- **Search and filters.** Catalogue filtering by size, shape and attribute must match on the language
  being viewed, not on the English values.

---

## Requirements *(mandatory)*

### The languages themselves

- **FR-001**: The site MUST support exactly three languages — English (`en`), Russian (`ru`) and
  Ukrainian (`uk`) — and MUST NOT require a code change to add a fourth beyond declaring it.
- **FR-002**: English MUST be the default language: the one a visitor with no stated preference gets,
  the one untranslated content falls back to, and the one that cannot be disabled.
- **FR-003**: Each language MUST have a two-letter code shown in the selector (`EN`, `RU`, `UK`) and a
  spoken name in its own language (`English`, `Русский`, `Українська`) used for its accessible name
  and for the admin.
- **FR-004**: The set of languages the site offers MUST be readable by the storefront at request time,
  so that enabling or disabling one changes the site without a deploy.

### Choosing a language

- **FR-005**: The header's language selector MUST list every enabled language and MUST show the
  language currently being viewed. The existing component is reused as-is; its props do not change.
- **FR-006**: Choosing a language MUST take the visitor to the equivalent page in that language —
  the same product, article or policy — not to the site's root.
- **FR-007**: Where the current page has no equivalent in the chosen language, the visitor MUST be
  taken to the nearest existing page in that language rather than shown a 404.
- **FR-008**: The chosen language MUST persist across navigation, across a reload and across a return
  visit on the same device, for at least 12 months.
- **FR-009**: The mobile navigation panel MUST offer the same choice with the same effect, and MUST
  close on selection.
- **FR-010**: A visitor arriving with no stored preference MUST be served the default language. The
  browser's declared languages MUST NOT trigger an automatic redirect or an automatic switch — every
  visitor starts in English and stays there until they choose otherwise. This keeps the site's root
  address the same page for every visitor and every crawler, which is what lets it stay prerendered.
- **FR-011**: Language selection MUST NOT clear the cart, sign the customer out, or discard a
  partially-filled form.

### Addresses and discoverability

- **FR-012**: Every public page MUST be reachable at an address that identifies its language, and the
  language MUST be determinable from the address alone without a cookie.
- **FR-013**: Today's addresses MUST continue to resolve. No currently-published address may 404 or
  redirect to the site root as a result of this feature.
- **FR-014**: A document's address segment in each language MUST be defined by the model rather than
  by accident, and entering a Russian or Ukrainian title MUST NOT make a document unsaveable.
- **FR-015**: Every page MUST declare its own language in its markup, replacing the fixed `en`
  declaration at `src/app/(frontend)/layout.tsx:65`.
- **FR-016**: Every page MUST name its own address as canonical and MUST list its equivalents in the
  other enabled languages, including a default-language fallback entry for crawlers.
- **FR-017**: The site's address list MUST contain every page in every **enabled** language and MUST
  omit disabled ones.
- **FR-018**: Page titles, meta descriptions and social preview metadata MUST be translatable per
  language, through the existing shared metadata field group rather than a parallel one.

### Content in the admin

- **FR-019**: Every field holding words an editor writes MUST be translatable per language: titles,
  headings, body prose, labels, button text, alt text, metadata and the text inside every block.
- **FR-020**: Fields that do not hold words — images, prices, stock, dates, relationships, ordering,
  flags — MUST remain single-valued and shared across languages, so a price or a photograph is
  changed once.
- **FR-021**: The admin MUST let the owner switch which language they are editing from any document or
  global, and MUST make the current editing language obvious at all times.
- **FR-022**: Existing published content MUST become the English version of itself when the change
  ships, with no editorial re-entry and no content loss.
- **FR-023**: Drafts, versions and publication MUST continue to work per the existing model; an
  unpublished translation MUST NOT reach visitors in any language.
- **FR-024**: The admin MUST distinguish a field that has been translated from one that is showing the
  default language as a fallback, so an editor can see what is left to do.
- **FR-025**: Translating content MUST NOT require the owner to understand addresses, codes or
  fallbacks — switching a control and typing is the whole workflow.

### Turning languages on and off

- **FR-026**: The admin MUST offer a single place where the owner controls which languages the site
  offers visitors, with each language independently switchable.
- **FR-027**: Disabling a language MUST remove it from the storefront's selector, from the site's
  address list and from the cross-language metadata, and its addresses MUST stop serving content.
- **FR-028**: Disabling a language MUST NOT delete or alter its content, and re-enabling MUST restore
  it exactly.
- **FR-029**: The default language MUST NOT be disableable, and the attempt MUST be refused with an
  explanation rather than silently ignored.
- **FR-030**: A language that is disabled for visitors MUST remain editable in the admin, so a
  translation can be completed before it is published.
- **FR-031**: A change to which languages are offered MUST reach visitors without a deploy and MUST
  invalidate whatever cached pages the change affects.
- **FR-032**: The set of three languages is fixed in the codebase. What the admin controls is which of
  them visitors are offered — nothing more. The admin MUST NOT present adding or removing a language
  as something it can do, because a fourth language is a schema change: every translated field gains a
  column, so it needs a deploy and a migration however the list is stored.

### The interface's own words

- **FR-033**: Every user-visible string in the interface — buttons, labels, placeholders, empty states,
  validation sentences, toasts, accessible names and page-level headings not drawn from content — MUST
  render in the language being viewed.
- **FR-034**: Interface strings MUST live in one place per language rather than beside each component,
  so a translator receives one file per language rather than a code tour.
- **FR-035**: Interface strings are maintained by developers in the codebase — one complete set per
  language, versioned with the code that renders them — not modelled as admin-editable fields.
  Constitution I's "user-visible copy MUST come from Payload" is read here as governing **editorial
  content**: the prose, headings, calls to action and metadata an editor writes. A validation sentence,
  a form label and an accessible name are the non-content UI affordances the same clause exempts.
  Because that reading is a judgement rather than a plain reading, the plan MUST record it in its
  Complexity Tracking section, with the boundary stated explicitly: **any string an editor would
  reasonably want to reword — a call to action, a band heading, an empty-state sentence — belongs in
  Payload and is FR-019's business, not this requirement's.**
- **FR-036**: Counted phrases MUST use the plural rules of the language being viewed, including the
  three-form rules of Russian and Ukrainian.
- **FR-037**: A missing interface string MUST render the default language's string rather than a blank
  space or a raw key.
- **FR-038**: Prices MUST be formatted for the language being viewed while remaining a single currency
  and an unchanged amount. Constitution VI's integer-minor-unit rule is untouched.
- **FR-039**: Dates MUST be formatted for the language being viewed.
- **FR-040**: Country names in the address forms and the country chooser MUST be presented in the
  language being viewed.
- **FR-041**: Catalogue filtering and sorting MUST operate on the language being viewed, so a filter
  label and the option it matches are never in different languages.

### Everything the site sends

- **FR-042**: Verification and password-reset mail MUST be sent in the language of the page the request
  was made from.
- **FR-043**: The enquiry acknowledgement and the composed messenger handoff MUST carry the language
  the enquiry was submitted in, so the shop can reply in it.
- **FR-044**: Marketing list membership MUST record the subscriber's language so future campaigns can
  be segmented by it.
- **FR-045**: A missing mail translation MUST fall back to the default language rather than fail to
  send. Nothing in this feature may make a verification code undeliverable.

### Fallback and integrity

- **FR-046**: Any content field with no value in the requested language MUST render the default
  language's value.
- **FR-047**: A page MUST NOT render a partially-empty layout because of a missing translation — no
  blank headings, no empty blocks, no collapsed sections.
- **FR-048**: A document that exists in no language other than the default MUST still be reachable in
  every enabled language.
- **FR-049**: The schema change MUST ship with a tested migration and a rollback path verified against
  a production-sized content set, per Constitution IV.
- **FR-050**: Access control MUST be unchanged by language: a customer MUST NOT be able to reach
  another customer's data, drafts or admin-only fields through a different language's address.

### Not regressing what exists

- **FR-051**: Per-route caching and revalidation MUST remain explicit and MUST account for language —
  a visitor MUST never be served another language's cached page.
- **FR-052**: Publishing or translating content MUST invalidate the affected pages in the affected
  languages.
- **FR-053**: The measured JavaScript budget MUST hold: 300KB gzipped per route in total and 100KB
  above the framework baseline. Translation data for languages the visitor is not reading MUST NOT be
  downloaded.
- **FR-054**: The accessibility standard MUST hold in all three languages, including correct language
  declaration, focus order, and accessible names that contain their visible text.
- **FR-055**: No new component may be created where the existing kit already draws the pattern; the
  language selector, menu and menu-option primitives are reused unchanged.

### Key Entities

- **Language**: One of the three the site knows. Has a code (`en`, `ru`, `uk`), a display code for the
  selector (`EN`, `RU`, `UK`), a name in its own language, a flag for whether visitors are offered it,
  and exactly one of the three is the default.
- **Translatable field**: A field on a collection, global or block that holds one value per language.
  Its untranslated languages resolve to the default language's value.
- **Shared field**: A field that holds one value for all languages — images, prices, stock, dates,
  relationships, order.
- **Language preference**: A visitor's remembered choice, held per device, superseded by the language
  in the address they request, and reset to the default if it names a language no longer offered.
- **Interface dictionary**: The set of interface strings for one language, keyed identically across
  languages, with the default language's set complete by definition.
- **Language availability setting**: The admin-held record of which languages visitors are offered —
  what US3 toggles and what the storefront reads at request time.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can switch language and reach the same page in that language in one action and
  under two seconds, from both the header and the mobile panel, on every page of the site.
- **SC-002**: 100% of public pages — home, catalogue, category, product, cart, about, blog, article,
  contact, FAQ, each policy and each account screen — render completely in all three languages, with
  no English text remaining when Russian or Ukrainian is selected and all content translated.
- **SC-003**: The owner can translate any page of the site without help, without leaving the admin, and
  without a deploy; translating one policy page end-to-end takes under 10 minutes once the text exists.
- **SC-004**: The owner can turn a language off and see it disappear from the storefront within one
  minute, and turn it back on with every translation intact.
- **SC-005**: 100% of pages declare their own language and carry consistent canonical and
  cross-language links; a crawl finds three indexable versions of every page and reports zero duplicate
  content warnings between languages.
- **SC-006**: Zero published addresses break. Every address served before the change still resolves
  after it.
- **SC-007**: No page exceeds 300KB gzipped of initial JavaScript, or 100KB above the framework
  baseline, in any language — the same numbers that held before the change.
- **SC-008**: Automated accessibility checks pass on every changed page in all three languages.
- **SC-009**: A document translated in only one language renders a complete page in all three, with
  zero blank regions.
- **SC-010**: Transactional mail arrives in the requesting visitor's language in 100% of sends, and no
  send fails because a translation is missing.
- **SC-011**: The content migration completes against a production-sized copy with zero rows of content
  lost and a rollback demonstrated on the same copy.
- **SC-012**: Counted phrases are correct for every plural category in Russian and Ukrainian —
  verified at counts 1, 2, 5 and 21.

---

## Assumptions

- **The three languages are fixed at `en`, `ru` and `uk`**, as stated. English is the default because
  it is the language the existing content is written in and the only one the site currently declares.
- **Addresses carry the language as a path prefix**, with the default language's pages staying at the
  addresses they already have (`/legal/privacy`, `/ru/legal/privacy`, `/uk/legal/privacy`). This is the
  only shape that satisfies FR-012 and FR-013 together: a prefix on every language would move every
  existing address, and a cookie-only scheme would give a crawler one address for three languages.
- **A document's address segment is shared across languages** — the same slug under each language's
  prefix. Per-language slugs would need a slug generator that handles Cyrillic and a uniqueness rule
  scoped per language, for an SEO gain that is second-order to actually having the translations. This
  is the assumption most worth revisiting in planning, and FR-014 is written so it can be.
- **One currency stays one currency.** Localization changes how a price is written, never what it is
  denominated in. The deliberate single-currency decision in `payload.config.ts` stands.
- **Content is translated by people.** No machine translation, no translation service integration, no
  translation-status workflow beyond FR-024's visible distinction between translated and fallback.
- **The three languages are a code-level fact and the admin toggles visibility only** (FR-032,
  answered). The admin's job is "is Ukrainian ready for visitors yet", not "what languages does this
  site have".
- **Interface strings stay in the codebase, one set per language** (FR-035, answered), with the
  Constitution I reading recorded in the plan's Complexity Tracking. The existing message-key
  indirection in `src/lib/auth/form-errors.ts` is the pattern this generalises.
- **No automatic language detection** (FR-010, answered). Browser languages and IP addresses are never
  read to choose a language; the header selector is the only way in.
- **The admin interface itself may stay in English.** The owner switching their own admin chrome into
  Russian or Ukrainian is a separate, cheap setting and is not required by this feature.
- **Every existing row becomes its English self.** The migration assigns current content to `en`; no
  Russian or Ukrainian content exists on the day it ships.
- **Rendering stays server-side.** Language is resolved on the server; no client-side translation
  swapping, so a page's first paint is already in the right language.
- **The existing language selector component is reused unchanged**, and the `Locale` shape it already
  exports (`code`, `label`) is the shape the site supplies.
- **Ukrainian is new everywhere.** The hardcoded `DEFAULT_LOCALES` pair in `header.tsx` is replaced by
  a live list, not extended.

---

## Out of Scope

- A fourth language, and region variants (`ru-KZ`, `en-GB`).
- Right-to-left layout support.
- Multi-currency pricing, per-language pricing, or per-region tax.
- Machine translation, translation-memory tooling, or an external translator workflow.
- Per-language product catalogues — every language shows the same products, stock and prices.
- Translating customer-entered data: enquiry bodies, addresses and names are stored as typed.
- Automatic language detection of any kind — browser-declared languages, IP geolocation, or
  country-based redirection. FR-010 settles this: the selector is the only thing that changes language.
- Localized imagery — one photograph per product in all three languages (FR-020); alt text is
  translated, the file is not.

---

## Dependencies

- The content model and migrations shipped by specs 003 through 009: every collection, global and block
  named in the Localization Inventory is a prerequisite, and all of them change shape here.
- A database migration against live content, with the rollback path Constitution IV requires.
- Russian and Ukrainian copy for the interface dictionary and for the transactional mail — this
  feature provides the places the words go, and cannot invent the words.
