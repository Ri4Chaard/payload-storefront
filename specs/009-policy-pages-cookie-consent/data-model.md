# Phase 1 Data Model: Policy Pages and Cookie Consent

**Feature**: `specs/009-policy-pages-cookie-consent` | **Date**: 2026-09-11

Two Payload additions and one client-side record. Nothing else is stored, and in particular **no
per-visitor consent row exists anywhere on the server** — see `contracts/consent-record.md`.

---

## 1. Collection: `policies`

**Admin**: group *Content*, labels `Policy` / `Policies`, `useAsTitle: 'title'`,
`defaultColumns: ['title', 'slug', 'footerPlacement', 'effectiveDate', '_status']`,
`defaultSort: 'footerOrder'`.

**Versions**: `{ drafts: true }` — FR-011.

**Access**:

| Operation | Rule | Why |
| --- | --- | --- |
| `read` | `adminOrPublishedStatus` | FR-014, and a draft must be *unreachable* rather than hidden — an unpublished policy must not be readable through `/api/policies` either. Same reasoning as `articles`. |
| `create` / `update` / `delete` | `isAdmin` | FR-014. |

**Hooks**: none. `/legal/[slug]` is `force-dynamic` (research R1a), so no page is cached and there
is nothing to invalidate. Attaching the shared `revalidateOnChange` would evict the entire catalogue
because someone fixed a typo in a policy — the trap `questions.ts` and `articles.ts` both document.

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `slug` | `text` | yes | Shared `slugField({ from: 'title' })`. Unique, indexed, sidebar. Derived from the title on create only, so a rename cannot silently break links. Additional validation in §1.1. |
| `title` | `text` | yes | The page's heading, drawn centred and uppercased by CSS. Also the metadata fallback. |
| `subtitle` | `text` | no | FR-007. Free text, **not a formatted date** — three pages use it for `Last Updated: August 2026` and Shipping & Returns uses it for `Enjoy complimentary shipping and returns on all orders`. |
| `effectiveDate` | `date` | no | FR-008. `dayOnly` picker, sidebar. The owner sets it; saving a correction does not touch it. Not rendered directly — `subtitle` is what the design draws — but it is the machine-readable answer to "when did this last materially change", and what the owner reads before deciding whether to bump `consentVersion`. |
| `body` | `richText` | no | FR-003, FR-006. Default lexical features **including headings** (research R8). Optional so FR-006's placeholder case is reachable. |
| `footerPlacement` | `select` | yes | `legal` \| `customer-care` \| `hidden`. Default `legal`. FR-015b, FR-015c, research R7. |
| `footerOrder` | `number` | yes | Default `0`, lowest first. FR-015b — the owner controls the order. |
| `seo` | group | no | Shared `seoField()`. FR-052. |

### 1.1 Slug validation (FR-015a, spec Edge Cases)

A `beforeValidate` hook rejects a slug already held by another policy, with a message naming that
policy — "`privacy` is already used by Privacy Policy" — rather than the database-index error the
`unique` constraint alone would produce. Constitution IV: invalid content must be impossible to save,
and the message must be one an editor can act on.

**That is the entire rule, and the `/legal/` prefix is why.** An earlier draft also had to reject any
slug matching a category and any of sixteen reserved top-level routes, because policies were to be
served at bare root addresses where they would shadow or be shadowed by the catalogue. Under a prefix
this collection owns the namespace outright: a policy slugged `rings` is `/legal/rings` and collides
with nothing. The reserved-route list is gone, along with the certainty that it would rot the first
time somebody added a page and forgot to update it.

### 1.2 Seeded rows (FR-001, FR-016)

Four, created idempotently by slug:

| `slug` | Address | `title` | `footerPlacement` | `footerOrder` |
| --- | --- | --- | --- | --- |
| `privacy` | `/legal/privacy` | Privacy Policy | `legal` | 10 |
| `terms` | `/legal/terms` | Terms & Conditions | `legal` | 20 |
| `cookies` | `/legal/cookies` | Cookie Policy | `legal` | 30 |
| `shipping` | `/legal/shipping` | Shipping & Returns | `customer-care` | 10 |

`title` matches the footer's existing labels, not the Figma page headings — the design draws
`TERMS OF USE` as the page title while the footer says *Terms & Conditions*. The footer label is the
one visitors navigate by, and one field now feeds both; the owner can change it in either direction.

The seeded `body` for `cookies` describes the three cookies this site actually sets and states that
no analytics, advertising, or third-party tracking cookies are used. The Figma placeholder copy
about Google services and advertising is **not** seeded — FR-016.

---

## 2. Global: `cookie-settings`

**Admin**: group *Cookies*, label *Cookie banner*. Its description names the Cookie Policy document
as the place the wording of the policy lives, and the policy's own description points back — this is
how FR-050 is honoured across two admin screens (research R6).

**Versions**: `{ drafts: true }`, matching every other global here.

**Access**: `read: () => true`, `update: isAdmin`.

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `enabled` | `checkbox` | yes | Default `true`. FR-026. Off means no banner **and** no optional category treated as consented. |
| `consentVersion` | `number` | yes | Default `1`. FR-042. Advancing it invalidates every stored decision. Description spells out that this re-asks every visitor and should follow a material policy change, not a typo. |
| `policy` | `relationship` → `policies` | no | FR-022. What the banner links to. Optional, and the banner must stay usable when it is unset or points at an unpublished document. |
| `categories` | `array` | yes, min 1 | §2.1. Row order is display order — the same convention `contact-settings.messengers` uses, so nothing can disagree with what the admin shows. |

**No copy fields.** FR-025: the banner's heading, body, and three button labels are fixed in code.
The global is deliberately small, and its smallness is the record of that decision.

### 2.1 `categories` row

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `key` | `text` | yes | Stable identifier stored in the consent record. Validated as lowercase kebab-case, unique within the array. **Never re-used for a different purpose** — the record is keyed on it. |
| `name` | `text` | yes | What the chooser displays, e.g. *Strictly necessary*. |
| `purpose` | `textarea` | yes | FR-045. Plain language, written for a visitor. |
| `necessary` | `checkbox` | yes | Default `false`. A necessary category renders as permanently on and explained (FR-029); an optional one renders as a switch, off by default (FR-030). |

**Seeded with exactly one row** (FR-047): `key: 'necessary'`, `name: 'Strictly necessary'`,
`necessary: true`, with a purpose naming the session cookie, the cart cookie, and the cart count.
That is the whole truth about this site, and FR-048 forbids adding a field that would let a script or
measurement ID be attached to a row.

**Validation**: at least one row, and at least one row with `necessary: true`. A configuration with
no necessary category would make the chooser claim the site's own session cookie is optional.

---

## 3. Consent record (client-side only)

Stored in a non-`httpOnly` cookie named `aurum-consent`, written and read entirely in the browser
(research R3). Full shape, encoding, parsing rules, and the staleness comparison are specified in
**`contracts/consent-record.md`** and not duplicated here.

Summary of what it holds, and why each part exists:

| Part | Why it exists |
| --- | --- |
| Per-category answers, keyed by `key` | FR-034. Not a boolean — see below. |
| The set of category keys that existed when the decision was made | **FR-027a and FR-040.** With one category configured, *Agree* and *Allow Technical Cookies* have identical effect. The only thing preventing a future analytics category from inheriting an old *Agree* is this list. |
| `consentVersion` at the time of the decision | FR-042. Lower than the current value ⇒ ask again. |
| Decision timestamp | FR-034, and what the 180-day expiry is reasoned about against. |

**Lifetime**: 180 days (`max-age`), browser-enforced. FR-035.

**This is the only record.** There is no server-side consent log, no visitor id, and nothing in
Payload — creating a row about someone who has not yet agreed to a row being created is the failure
the mechanism exists to prevent.

---

## 4. Relationships

```
policies ──────────────┐
  (Cookie Policy doc)  │ referenced by
                       ▼
             cookie-settings.policy      (what the banner links to — FR-022)

cookie-settings.categories[].key
                       │ keys
                       ▼
             aurum-consent cookie      (client-side, per visitor — FR-034)

policies.footerPlacement / footerOrder
                       │ drives
                       ▼
             Footer legal row + Customer Care injection   (FR-015b, FR-015c)
```

No policy references another. No consent data references a customer.

---

## 5. Migration

One Payload migration, generated and committed with `payload-types.ts` regenerated in the same commit
(Constitution "Types"):

- create `policies` and its `_policies_v` versions table;
- create `cookie_settings` and its versions table, with the `categories` array table.

**Rollback**: both are new tables holding no pre-existing content, so the down migration drops them.
The four seeded policies and the one seeded category are re-creatable by re-running the seed, which
is idempotent by slug and by `key`. Nothing in this feature alters an existing table, so no existing
content is at risk — which is why the rollback path is honestly this short rather than merely
asserted.
