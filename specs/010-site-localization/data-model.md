# Data Model: Three Languages Across the Whole Site

**Feature**: `010-site-localization` | **Date**: 2026-09-11

Three stores hold state in this feature: **Payload** (content, one value per language), **the message
files** (interface strings, in the repository), and **one cookie** (the visitor's remembered choice).
Nothing else persists.

---

## 1. The rule that decides every field

> **Words are localized. Everything else is shared.**

A field gets `localized: true` when a translator would need to retype it. A field stays single-valued
when the same value is correct in all three languages — an image, a price, a stock count, a date, a
relationship, a sort order, a flag, a slug, an ISO code, an email address, a URL.

Consequences worth stating before the tables:

- **A price is entered once**, a photograph is uploaded once, and an ordering is arranged once
  (FR-020). Localizing them would let three languages disagree about what a thing costs.
- **Generated types do not change shape.** Payload's generated interfaces describe a single-locale API
  response, so `title: string` stays `title: string`. `payload-types.ts` is regenerated in the same
  commit (Constitution, Technology Stack) but the ~50 presentational components consuming it are
  untouched.
- **Arrays and blocks are not localized; the words inside them are.** `story-page.body` (blocks),
  `articles.chapters`, `closer-look.chips`, `process-steps.steps` and `cookie-settings.categories`
  keep one shared structure across languages, with each row's text fields translated. The alternative
  — a localized array — would make an editor rebuild the page layout once per language and let the
  three drift apart.

---

## 2. Collections

Localized fields are marked **L**. Unmarked fields are shared across all three languages.

### `articles`

| Field | Type | | Why |
| --- | --- | --- | --- |
| `title` | text | **L** | |
| `standfirst` | textarea | **L** | |
| `slug` | text | | English, shared — R7 |
| `publishedOn` | date | | A date is a date |
| `category` | relationship | | The category itself is translated |
| `hero` | media slot | | Image shared; its alt text is translated on `media` |
| `chapters[]` | array | | Structure shared |
| `chapters[].heading` | text | **L** | |
| `chapters[].tocLabel` | text | **L** | |
| `chapters[].lede` | text | **L** | |
| `chapters[].body` | richText | **L** | |
| `chapters[].pullQuote` | textarea | **L** | |
| `seo.*` | group | **L** | Via the shared field config — §4 |

### `policies`

| Field | | Why |
| --- | --- | --- |
| `title`, `subtitle`, `body` | **L** | The four legal pages, whole |
| `slug`, `effectiveDate`, `footerPlacement`, `footerOrder` | | Address, date, position |

### `products`

| Field | | Why |
| --- | --- | --- |
| `title`, `description`, `details` | **L** | |
| `attributes[].value` | **L** | The written value an attribute row carries |
| `gallery`, `sizes`, `category`, `collections`, `colour`, `diamondShape`, `availability`, prices, stock | | Merchandising facts, not prose. `colour` and `diamondShape` are `select` fields whose **option labels** are translated in the message files, not per document |

### `categories`, `collections`, `article-categories`, `sizes`, `attributes`, `questions`

| Collection | Localized | Shared |
| --- | --- | --- |
| `categories` | `title`, `subtitle` | `slug`, `image`, `order` |
| `collections` | `title`, `description` | `slug`, `order` |
| `article-categories` | `title` | `slug`, `order` |
| `sizes` | `label` | `value`, `category`, `order` — `value` is the size itself (`52`), not a word |
| `attributes` | `label`, `options[].label` | `name`, `type`, `order`, `options[].value` — `name` and `value` are the machine keys the catalogue filters on (FR-041) |
| `questions` | `question`, `answer` | `order` |

### `media`

| Field | | Why |
| --- | --- | --- |
| `alt` | **L** | FR-019 names alt text explicitly. One upload, three descriptions |
| the file, its sizes, its dimensions | | One image |

### `enquiries` — one new field

| Field | Type | | Why |
| --- | --- | --- | --- |
| `locale` | select (`en`/`ru`/`uk`) | | **New.** The language the enquiry was submitted in, so the acknowledgement and the messenger handoff can match it (FR-043). Not localized — it is a fact about one submission |
| `name`, `email`, `message` | | | Customer-entered. Stored exactly as typed, never translated (spec, Out of Scope) |

### Untouched collections

`admins`, `customers`, `verification-codes`, `carts`, `variants`, and the plugin's `addresses`. They
hold people's own data, system state, or machine values. A customer's surname is not a translation.

---

## 3. Globals

| Global | Localized | Shared |
| --- | --- | --- |
| `shop` | `detailsTitle`, `warrantyTitle`, `deliveryTitle`, `warranty`, `delivery`, `listingSubtitle` | — |
| `contact-page` | `eyebrow`, `heading`, `intro`, `form.heading`, `form.body`, `form.nameLabel`, `form.emailLabel`, `form.messageLabel`, `form.submitLabel`, `form.footnote`, `form.successMessage`, `form.errorMessage`, `faq.heading` | `form.photo`, `faq.questions` |
| `contact-settings` | `address`, `openingHours`, `messageTemplate` | `email`, `enquiryEmail`, `phone`, `mapsUrl`, `messengers[]` |
| `blog-page` | `eyebrow`, `heading`, `emptyTitle`, `emptyDescription` | — |
| `faq-page` | `heading`, `emptyTitle`, `emptyDescription` | — |
| `cookie-settings` | `bannerBody`, `categories[].name`, `categories[].purpose` | `enabled`, `consentVersion`, `policy`, `categories[].key`, `categories[].necessary` |
| `story-page` | inside its blocks — §4 | `body` (the block arrangement) |
| `account-settings` | — | `defaultCountry`, `shippingCountries` are ISO codes; their names come from `Intl.DisplayNames` (R14) |

`contact-settings.messageTemplate` is the text handed to WhatsApp or Telegram. It is localized because
FR-043 requires the handoff to carry the enquiry's language.

`cookie-settings.categories[].key` stays shared and is load-bearing: it is the identifier written into
the consent cookie by spec 009. Translating it would invalidate every stored consent record.

---

## 4. Shared field configs and blocks — where the leverage is

Three files are composed by most collections and all seven blocks. Localizing them localizes
metadata, button labels and alt text everywhere at once.

| Config | Localized | Shared |
| --- | --- | --- |
| `src/fields/seo.ts` | `title`, `description` | `image` |
| `src/fields/cta.ts` | `label` | `href` |
| `src/fields/media-slot.ts` | — | `kind`, `photo`, `video`, `poster` — alt text lives on `media` |
| `src/fields/slug.ts` | — | English, shared, transliterated — §6 |

| Block | Localized | Shared |
| --- | --- | --- |
| `banner` | `eyebrow`, `heading`, `body` | `textSide`, media, cta href |
| `page-header` | `eyebrow`, `heading`, `body` | media |
| `closer-look` | `body`, `chips[].label`, `figures[].caption` | the arrays, the media |
| `process-steps` | `heading`, `steps[].title`, `steps[].body` | the array, the media |
| `faq` | `heading`, `body` | `questions` (the relationship) |
| `media-plate` | — | media only |

---

## 5. New global: `language-settings`

Which languages visitors are offered. **Configuration, not content — this global is not localized.**

```
src/globals/language-settings.ts
slug: 'language-settings'   label: 'Languages'   admin.group: 'Settings'

  ruEnabled   checkbox   "Offer Russian to visitors"     default: true
  ukEnabled   checkbox   "Offer Ukrainian to visitors"   default: true
```

| Property | Value | Why |
| --- | --- | --- |
| Fields | one checkbox per **non-default** locale | English has no field, so FR-029 holds by construction rather than by validation. The global's admin description says English is always offered and why |
| Access | `read: () => true`, `update: isAdmin` | Matches every other global; stated explicitly, never by omission (Constitution IV) |
| Hooks | `afterChange: [revalidateGlobalOnChange]` | FR-031 — a toggle reaches prerendered pages without a deploy |
| Not localized | — | It configures the site; it is not content |

**Field naming follows the locale codes** (`ruEnabled`, `ukEnabled`) and is generated from the locale
constant in `src/i18n/routing.ts`, so the list of languages has exactly one definition.

**Read by**: the storefront layout (to build the selector and gate the route), `generateMetadata` (to
filter `hreflang`), and `src/app/sitemap.ts`. Never read by `src/proxy.ts` — R3 and R6 explain why.

**Not read by Payload's own localization config.** Payload always knows all three locales, so a
language switched off for visitors stays fully editable in the admin (FR-030). The two lists are
deliberately different lists.

---

## 6. Slugs

`src/fields/slug.ts` stays **non-localized**: one address segment per document, reached under each
language's prefix (`/legal/privacy`, `/ru/legal/privacy`, `/uk/legal/privacy`).

It gains a transliteration pass. Today `.replace(/[^a-z0-9]+/g, '-')` turns "Каблучка з діамантом"
into the empty string, against a field that is `required` and `unique` — an unsaveable document, which
FR-014 forbids. After the change:

| Title typed | Slug derived |
| --- | --- |
| `Paragon Ring` | `paragon-ring` |
| `Каблучка з діамантом` | `kabluchka-z-diamantom` |
| `Кольцо «Парагон»` | `kolco-paragon` |

Both alphabets are covered, including the letters that differ between them (`ї`, `є`, `і`, `ґ`, `ы`,
`э`, `ъ`). Output stays `[a-z0-9-]`. Derivation still happens **on create only** — the existing rule
that a slug survives a rename is unchanged.

---

## 7. The interface dictionary

`src/i18n/messages/{en,ru,uk}.json` — one file per language, the same keys in each.

```
common     buttons, generic labels, the words that appear on every screen
header     navigation, cart, the language selector's own accessible names
nav        footer columns and links that are not Payload-managed
catalog    filters, sorting, applied-filter chips, empty states, pagination
product    size chooser, availability, the add-to-cart affordances
cart       lines, totals, the handoff modal
account    sign-in, registration, verification, addresses, password
forms      field labels, placeholders, helper text
errors     validation sentences and server-action failure messages
contact    the parts of the contact screen not held in `contact-page`
blog       listing chrome
legal      the parts of a policy page that are not the policy
email      subjects and bodies for transactional mail (FR-042)
```

- `en.json` is the **type source**: `Messages = typeof import('./messages/en.json')`, declared in a
  `global.d.ts` augmentation, so a key missing from English is a compile error.
- **Fallback**: `src/i18n/request.ts` deep-merges `en` beneath the requested locale, so an untranslated
  key renders the English sentence rather than the raw key (FR-037).
- **Plurals** use ICU `plural` with `one/few/many/other`, because Russian and Ukrainian have three
  plural categories where English has two (FR-036).
- Strings an editor would reasonably want to reword — calls to action, band headings, empty-state prose
  — do **not** belong here. They belong in Payload (FR-019, and the boundary FR-035 draws).

---

## 8. The visitor's remembered choice

| | |
| --- | --- |
| Name | `NEXT_LOCALE` |
| Written by | next-intl's middleware (`syncCookie`), on document navigations only |
| Read by | `src/proxy.ts`, on unprefixed paths only |
| Values | `en`, `ru`, `uk` |
| Lifetime | 12 months (`maxAge: 60 * 60 * 24 * 365`) — FR-008 |
| Attributes | `sameSite: 'lax'`, path `/` |
| Cleared by | `/language/reset`, when the remembered language has been switched off (R6) |

It is a preference, not personal data: no identifier, no profile, nothing to consent to. It is
strictly necessary for the page to render in the language the visitor asked for, so it sits outside
spec 009's consent categories — worth stating, because every cookie on this site now has to justify
itself.

---

## 9. Entity relationships this feature introduces

```
language-settings (global, 1)
  └── decides which of  Locale {en, ru, uk}  the storefront offers
                          │
                          ├── a path prefix        →  /…, /ru/…, /uk/…
                          ├── a Payload locale     →  every localized field above
                          ├── a message file       →  src/i18n/messages/<locale>.json
                          ├── a BCP 47 tag         →  en-US, ru-RU, uk-UA  (money, dates, countries)
                          └── an html lang value   →  <html lang="…">

enquiries.locale ──────── records which Locale a submission arrived in
NEXT_LOCALE cookie ────── remembers which Locale a visitor chose
```

Payload's locale list and the storefront's offered list are **not** the same list, and the difference
is the feature: three locales always exist in the admin, and the owner decides how many of them
visitors can see.

---

## 10. Migration

One migration, generated with `payload migrate:create` and then hand-edited. Every table below gains a
`_locales` sibling (`localesSuffix` defaults to `'_locales'`, confirmed in the adapter source), and
every collection with versions gains one for its `_v` table too.

| Table family | Carries |
| --- | --- |
| `articles`, `articles_v` + `chapters` arrays | title, standfirst, chapter text |
| `policies`, `policies_v` | title, subtitle, body |
| `products`, `products_v` + attribute arrays | title, description, details |
| `categories`, `collections`, `article_categories`, `sizes`, `attributes` | titles, labels, descriptions |
| `questions` | question, answer |
| `media` | alt |
| globals: `shop`, `contact_page`, `contact_settings`, `blog_page`, `faq_page`, `cookie_settings`, `story_page` blocks | all text listed in §3 |

**The generated SQL creates the new tables and drops the old columns. It does not carry the rows.**
Each table needs an insert between the two, of the shape:

```sql
INSERT INTO articles_locales (_locale, _parent_id, title, standfirst)
SELECT 'en', id, title, standfirst FROM articles;
```

`down()` reverses it — copy `_locale = 'en'` rows back into the parent table, then drop the locales
tables — and both directions are rehearsed against a production-sized restore before the change ships
(FR-022, FR-049, SC-011). An empty development database cannot fail this test, which is why the
rehearsal specifies a restore.

New in the same migration: `enquiries.locale`, and the `language_settings` global table.
