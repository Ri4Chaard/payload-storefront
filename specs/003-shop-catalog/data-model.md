# Data Model: Shop — Catalog Listing and Product Detail

**Feature**: `003-shop-catalog` | **Date**: 2026-08-28

The catalogue schema. Spec 001 shipped Payload deliberately empty and recorded that this document
would exist; spec 002 rendered a home page from fixtures on the promise that it would. Everything
below is created in one migration.

Three sources contribute fields to a product, and telling them apart matters:

| Source                                    | Marked       | Who owns it                                             |
| ----------------------------------------- | ------------ | ------------------------------------------------------- |
| Payload's own document fields             | _(implicit)_ | `id`, `_status`, `createdAt`, `updatedAt`, `deletedAt`  |
| The e-commerce plugin's defaults          | **P**        | Not ours to design. Changing them means overriding them |
| Added by us through `*CollectionOverride` | **A**        | Designed here                                           |

---

## Plugin configuration

`src/payload.config.ts` gains one plugin call. What it is asked for, and what it is not:

```text
ecommercePlugin({
  access:      { six named functions — see Access below }
  customers:   { slug: 'customers' }              ← required; the collection must exist
  currencies:  { defaultCurrency: 'USD', supportedCurrencies: [USD] }
  inventory:   true
  products:    { productsCollectionOverride, variants: { …three overrides } }
  carts:       { allowGuestCarts: true, cartItemMatcher, cartsCollectionOverride }
  orders:      false        ← spec 004; the request-versus-order mismatch is unresolved
  transactions:false        ← payment records; the site takes no money
  addresses:   false        ← nothing on these pages needs one
  // payments: omitted entirely — no adapter, no Stripe
})
```

Single currency. `supportedCurrencies: [USD]` generates exactly one price group per priced
collection; a second currency would generate a second, and every mapper and formatter would have to
choose between them. When the store needs a second currency it is a schema change made on purpose.

### Access

The plugin requires six access functions and uses them across every collection it generates. All
six are stated explicitly — Constitution IV forbids relying on defaults by omission.

| Function                 | Rule                                                                   |
| ------------------------ | ---------------------------------------------------------------------- |
| `isAdmin`                | `req.user?.collection === 'admins'`                                    |
| `adminOrPublishedStatus` | admin → `true`; anyone else → `{ _status: { equals: 'published' } }`   |
| `isDocumentOwner`        | signed-in → `{ customer: { equals: req.user.id } }`; otherwise `false` |
| `adminOnlyFieldAccess`   | admin only. Guards `inventory` and internal fields from the public API |
| `isCustomer`             | `req.user?.collection === 'customers'`                                 |
| `publicAccess`           | `() => true`                                                           |

`adminOrPublishedStatus` is the whole of spec FR-009: a draft product is not merely hidden from the
listing, it is unreadable by an anonymous request, including a direct URL, because the access rule
is a query constraint rather than a filter applied afterwards.

---

## `products`

The catalogue. `useAsTitle: 'title'`, admin group `Shop`, drafts with autosave **P**, trash **P**.

**The form is tabbed**, and every tab but SEO is **unnamed** — presentation only, so the stored data
stays flat. Verified: `generate:types` produced the same twenty-four fields in a different order, and
`migrate:create` reported _no schema changes_. The one named tab is `seo`, which nests under `seo`
exactly as the group it replaced did.

| Tab                | Holds                                              | Why                                                         |
| ------------------ | -------------------------------------------------- | ----------------------------------------------------------- |
| **Content**        | title, description, gallery                        | Everything above the fold                                   |
| **Details**        | details, attributes                                | The two things that make up the "Product details" accordion |
| **Categorisation** | category, collections, sizes, colour, diamondShape | Every filter the piece answers to                           |
| **Price & stones** | the plugin's price and variant fields              | The two selectors and what they cost                        |
| **SEO**            | seo.*                                              | Named tab; same shape as `seoField()`                       |

The tabs follow the **storefront**, not the schema, because that is what an editor is looking at
while they fill the form in. Three fields stay outside in the sidebar — `slug`, `availability` and
`inventory` — because they are the document's status rather than its content.

### Identity and content

| Field         | Type                      | Req | Src | Notes                                                                                                                                                 |
| ------------- | ------------------------- | :-: | :-: | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | text                      | ✅  |  A  | The name. Drawn clamped to one line on the card; stored whole                                                                                         |
| `slug`        | text                      | ✅  |  A  | Unique, indexed, sidebar. Shared config from `src/fields/slug.ts`; derived from `title` on first save, editable after, stable across renames (FR-013) |
| `description` | textarea                  |  —  |  A  | The paragraph beneath the price. May be empty — the layout closes over it (spec Acceptance 3.6)                                                       |
| `gallery`     | upload → `media`, hasMany | ✅  |  A  | Ordered. **The first is the listing image and the gallery's opening frame** (FR-004). Alternative text lives on `media`, authored once per asset      |
| `details`     | richText                  |  —  |  A  | The PRODUCT DETAILS accordion. Per-product; the warranty and delivery accordions are not (see Shared content)                                         |

### Taxonomy — the drawn filters, first-class

Every field here is indexed, because every one of them is a `where` clause on a page that runs
under an LCP budget. R4 explains why these six are fields and everything else is an attribute row.

| Field          | Type                                  | Req | Src | Notes                                                                                                                                                                       |
| -------------- | ------------------------------------- | :-: | :-: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `category`     | relationship → `categories`           | ✅  |  A  | Exactly one. Drives `/rings`, the eyebrow above the product name, and the CATEGORY filter group                                                                             |
| `collections`  | relationship → `collections`, hasMany |  —  |  A  | Zero or more. Drives the COLLECTION group and _Complete the Collection_                                                                                                     |
| `sizes`        | relationship → `sizes`, hasMany       |  —  |  A  | The values offered by the "Size:" selector and matched by the SIZE group. Empty means the product has no size choice (FR-008)                                               |
| `colour`       | select, hasMany                       |  —  |  A  | `black`, `clear`, `green`, `multicolor`. The COLOR group. Also rendered in the details accordion so the page is not filtering on something invisible — spec Open Question 5 |
| `diamondShape` | select, hasMany                       |  —  |  A  | The shape row in the toolbar and the DIAMOND SHAPE group. Option list is spec Open Question 4 — seven are drawn in the toolbar, three in the drawer                         |
| `attributes`   | array                                 |  —  |  A  | Generic descriptive attributes. Each row: `attribute` (relationship → `attributes`) + `value` (text). Rendered in the details accordion. **Not filterable at launch** — R4  |

`colour` and `diamondShape` are `select` rather than relationships because they are closed
vocabularies, not merchandising. That is a deliberate limit: adding a diamond cut is a field change
and a migration, not an admin action. Recorded here so nobody discovers it in a hurry.

### Availability

| Field          | Type          | Req | Src | Notes                                                                                                                                             |
| -------------- | ------------- | :-: | :-: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `availability` | select        | ✅  |  A  | `made-to-order` \| `stock-tracked`. Default `made-to-order`                                                                                       |
| `inventory`    | number, min 0 |  —  |  P  | Shown only when `availability === 'stock-tracked'` **and** variants are off. Overridden `admin.condition`. **Publicly readable** — see below |

A made-to-order product is always available regardless of `inventory` (FR-021 of the brief). A
stock-tracked product at zero is **visible and clearly unavailable**, never hidden — the owner still
wants it seen (spec Edge Cases).

`inventory` is **not** guarded by `adminOnlyFieldAccess`, which an earlier draft of this document
said it was. The storefront derives "unavailable" from the same access-controlled read a visitor
gets, so hiding the number hides the answer: every stock-tracked piece would render as available.
The count never reaches a component either way — `mappers.ts` turns it into a boolean at the
boundary (contract §2), which is where that concern actually belongs.

### Options and price

| Field               | Type                                   | Req | Src | Notes                                                                                                                            |
| ------------------- | -------------------------------------- | :-: | :-: | -------------------------------------------------------------------------------------------------------------------------------- |
| `enableVariants`    | checkbox                               |  —  |  P  | On for a product with stones, off for one without                                                                                |
| `variantTypes`      | relationship → `variantTypes`, hasMany |  —  |  P  | In practice always the single `diamond` type — R3                                                                                |
| `variants`          | join on `variants.product`             |  —  |  P  | Read-only view of the stones                                                                                                     |
| `priceInUSDEnabled` | checkbox                               |  —  |  P  |                                                                                                                                  |
| `priceInUSD`        | number (**integer minor units**)       |  —  |  P  | The product price. When variants are on, the _variant's_ price is what is displayed and carried (FR-039); this is the from-price |

### SEO

| Field | Type  | Req | Src | Notes                                                                                                                                                                                    |
| ----- | ----- | :-: | :-: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `seo` | group |  —  |  A  | `title`, `description`, `image`. Shared config from `src/fields/seo.ts`. Falls back to `title`/`description`/first gallery image when empty (Constitution V: editor-controlled metadata) |

### Lifecycle

```text
created ──▶ draft ──publish──▶ published ──unpublish──▶ draft
                                    │
                                    └──delete──▶ trashed ──restore──▶ (previous status)
```

Autosave drafts are the plugin's default and are kept. Public read is constrained to `published` by
`adminOrPublishedStatus`; the owner previews drafts through Payload's own preview.

---

## `variants` — the stones

One row per diamond offered on a product. This is the price-bearing row (R3).

| Field        | Type                                     | Req | Src | Notes                                                                                                                   |
| ------------ | ---------------------------------------- | :-: | :-: | ----------------------------------------------------------------------------------------------------------------------- |
| `title`      | text                                     |  —  |  P  | Administrative only; auto-populated                                                                                     |
| `product`    | relationship → `products`                | ✅  |  P  | Sidebar, read-only                                                                                                      |
| `options`    | relationship → `variantOptions`, hasMany | ✅  |  P  | Validated against the product's enabled `variantTypes`. With one type, exactly one option                               |
| `inventory`  | number                                   |  —  |  P  | **This is a stone's own availability** — brief FR-023. Zero means taken: shown as unavailable and unselectable (FR-040) |
| `priceInUSD` | number (minor units)                     |  —  |  P  | What the selector's price display reflects                                                                              |
| `image`      | upload → `media`                         |  —  |  A  | Brief FR-013's "optionally its own image"                                                                               |

Drafts and trash are plugin defaults here too, and public read is `adminOrPublishedStatus`.

---

## `variantTypes` and `variantOptions`

| Collection       | Field         | Type         | Src | Notes                                                            |
| ---------------- | ------------- | ------------ | :-: | ---------------------------------------------------------------- |
| `variantTypes`   | `name`        | text         |  P  | `diamond`                                                        |
|                  | `label`       | text         |  P  | **`Choose Your Diamond:`** — the string the product page renders |
|                  | `options`     | join         |  P  |                                                                  |
| `variantOptions` | `variantType` | relationship |  P  |                                                                  |
|                  | `label`       | text         |  P  | The drawn stone text, e.g. `Lab 1.5 ct each D VS1 With Halo`     |
|                  | `value`       | text         |  P  | Machine value                                                    |

Seeded with **one** variant type. Options are global to the type, so two rings can offer the same
stone specification — which is what happens in practice.

**Size is deliberately not a variant type.** R3 has the reasoning and the cost.

---

## `carts` — the far side of the FR-041 seam

Enabled here, unused by these pages. Spec 004 builds what reads it.

| Field          | Type                       |  Src  | Notes                                                                                                  |
| -------------- | -------------------------- | :---: | ------------------------------------------------------------------------------------------------------ |
| `customer`     | relationship → `customers` |   P   | Null for a guest cart — `allowGuestCarts: true`                                                        |
| `currency`     | text                       |   P   |                                                                                                        |
| `subtotal`     | number (minor units)       |   P   |                                                                                                        |
| `items`        | array                      |   P   | Each: `product`, `quantity`, `variant`                                                                 |
| `items[].size` | relationship → `sizes`     | **A** | The chosen size. The plugin's cart item has nowhere for a non-variant selection, so this is added — R3 |

`cartItemMatcher` is overridden to match on **product, variant and size**. Without it, the same ring
in two sizes merges into one line with quantity 2.

---

## Our own collections

### `categories`

Four rows: rings, bracelets, earrings, necklaces. **`all-jewelry` is not a row** — it is the listing
with no category filter, which is also what the drawer's "All jewelry" checkbox means.

| Field      | Type             | Req | Notes                                        |
| ---------- | ---------------- | :-: | -------------------------------------------- |
| `title`    | text             | ✅  | `Diamond Rings` — the listing's title block  |
| `slug`     | text             | ✅  | Unique, indexed. The route segment           |
| `subtitle` | text             |  —  | `Timeless brilliance, made for every moment` |
| `image`    | upload → `media` |  —  | Used by the home page's category band (002)  |
| `order`    | number           |  —  | Navigation and drawer order                  |
| `seo`      | group            |  —  | Shared config                                |

Access: `read` public, `create`/`update`/`delete` admin.

### `collections`

Four rows: Deia, Marvel, Molten, Spartan. Same access.

| Field         | Type     | Req | Notes           |
| ------------- | -------- | :-: | --------------- |
| `title`       | text     | ✅  |                 |
| `slug`        | text     | ✅  | Unique, indexed |
| `description` | textarea |  —  |                 |
| `order`       | number   |  —  | Drawer order    |

### `sizes`

The values a product can be offered in. A collection rather than a `select` because the vocabulary
differs by category — ring sizes are not bracelet lengths — and because the drawer's SIZE group must
list real, typo-free values.

| Field      | Type                        | Req | Notes                                               |
| ---------- | --------------------------- | :-: | --------------------------------------------------- |
| `label`    | text                        | ✅  | `2.25`                                              |
| `value`    | text                        | ✅  | Unique within a category                            |
| `category` | relationship → `categories` |  —  | Scopes the value. Empty means it applies everywhere |
| `order`    | number                      |  —  | Sort order in the selector and the drawer           |

### `attributes`

Owner-defined descriptive attributes — the brief's "chain length" case. The definition lives here;
the value lives on the product's `attributes` array (R4).

| Field     | Type          | Req | Notes                                    |
| --------- | ------------- | :-: | ---------------------------------------- |
| `label`   | text          | ✅  | Shown in the details accordion           |
| `name`    | text          | ✅  | Unique, machine key                      |
| `type`    | select        | ✅  | `text` \| `number` \| `select`           |
| `options` | array of text |  —  | Allowed values, when `type === 'select'` |
| `order`   | number        |  —  | Display order within the accordion       |

### `customers`

A minimal auth collection. Created here because the plugin's `customers.slug` is required and its
carts collection builds a relationship against it — R5. **No registration flow, no verification
codes, no profile screens**: those belong to the customer accounts spec.

| Field              | Type | Req | Notes                |
| ------------------ | ---- | :-: | -------------------- |
| `email` / password | —    | ✅  | Payload `auth: true` |
| `name`             | text |  —  |                      |

Access, stated explicitly: `create` admin only _for now_ — the accounts spec opens public
registration; `read`/`update` self or admin; `delete` admin. `admin.hidden` is **not** set — the
owner should see their customers. This collection is never `admin.user`; that stays `admins`, which
is the privilege boundary 001 built.

---

## Shared content that is not per-product

The product page draws three accordions. One is per-product (`details`); two are the same text on
every product — **3 YEAR WARRANTY + FREE RETURNS** and **DELIVERY** — as is the service-promise
strip beneath. Hardcoding them in a component violates Constitution I.

**Decision**: a `shop` **global** with `warranty` (richText), `delivery` (richText), and the
listing's fallback title-block copy. One global, editable without a deploy, read by the same loader
layer as everything else (FR-036).

---

## Indexes

Every one of these is on the hot path of a listing page.

| Collection                  | Indexed                  | Why                                             |
| --------------------------- | ------------------------ | ----------------------------------------------- |
| `products`                  | `slug` (unique)          | The product route's only lookup                 |
| `products`                  | `category`               | Every category listing                          |
| `products`                  | `_status`                | Every public read, via `adminOrPublishedStatus` |
| `products`                  | `priceInUSD`             | Price range filter and both price sorts         |
| `products`                  | `createdAt`              | The "Newest" sort                               |
| `products`                  | `colour`, `diamondShape` | Two filter groups                               |
| `categories`, `collections` | `slug` (unique)          | Route and filter lookups                        |
| `variants`                  | `product`                | The join that populates the selector            |

The many-to-many joins Payload generates for `collections` and `sizes` carry their own indexes.

---

## Migration

One migration, generated with `pnpm payload migrate:create catalog`, committed, with a `down` that
is **run and verified** before merge — Constitution IV requires a tested rollback path, and the
existing `20260827_101931_initial` migration is the only precedent in the repository.

⚠️ **The generated `down` does not run as emitted.** It drops each table `CASCADE` and then drops the
foreign-key constraints that `CASCADE` has already removed, and Postgres aborts the rollback. Every
`DROP` in `down` is hand-edited to `IF EXISTS`, and re-generating the migration reintroduces the
problem. See research R10.

It is purely additive: new tables and new enums, no change to `admins` or `media`, no existing rows
to rewrite. Enabling `orders`, `transactions` and `addresses` in spec 004 is likewise additive, which
is what makes deferring them free.

---

## What this model does _not_ do

- **No orders, no requests.** Spec 004, along with the plugin's payment-coupled orders question
  carried from 001/R9.
- **No filterable generic attributes.** R4. Promoting one to a filter is a bounded developer change,
  and the model says so rather than implying otherwise.
- **No second currency.** Adding one generates a second price field everywhere and forces a choice
  in every formatter.
- **No search index.** The header draws search; it needs its own spec.
