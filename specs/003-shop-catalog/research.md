# Phase 0 Research: Shop — Catalog Listing and Product Detail

**Feature**: `003-shop-catalog` | **Date**: 2026-08-28

Spec 001 deferred the e-commerce plugin decision to this feature and carried its findings forward
(001/research.md R9). Those findings were read from documentation; the ones below were read from the
published package. Where they disagree, this document is correct and says so.

Findings that change the shape of the work — rather than confirming a default — are marked
**⚠ Finding**.

---

## R1. What the plugin actually generates

**Decision**: Adopt `@payloadcms/plugin-ecommerce@3.88.0`, enabling **products, variants, carts,
inventory and a single currency**; leaving **orders, transactions, addresses and payments** off.

**Rationale**: Read from the published tarball at
`dist/collections/`, `dist/fields/` and `dist/types/index.d.ts`.

| Collection       | Enabled here | Why                                                            |
| ---------------- | ------------ | -------------------------------------------------------------- |
| `products`       | ✅           | The catalogue                                                  |
| `variants`       | ✅           | "Choose Your Diamond" — price and inventory per stone          |
| `variantTypes`   | ✅           | The selector's label; one type, `Diamond`                      |
| `variantOptions` | ✅           | The individual stones                                          |
| `carts`          | ✅           | The other side of the FR-041 seam. Guest carts, no auth needed |
| `orders`         | ❌           | Spec 004. Carries the model mismatch below                     |
| `transactions`   | ❌           | Payment records. The site takes no money                       |
| `addresses`      | ❌           | Nothing on these pages needs one                               |

**⚠ Finding — 001's note said six collections; there are eight.** With `products.variants` enabled
the plugin adds `variantTypes` and `variantOptions` on top of the six named in 001/R9.

**⚠ Finding — there is no `collectionsOverrides` key.** 001/R9 named one. The real extension points
are per-collection: `products.productsCollectionOverride`,
`products.variants.variantsCollectionOverride`, `products.variants.variantTypesCollectionOverride`,
`products.variants.variantOptionsCollectionOverride`, `carts.cartsCollectionOverride`,
`orders.ordersCollectionOverride`, `transactions.transactionsCollectionOverride`,
`addresses.addressesCollectionOverride`. Each takes `({ defaultCollection }) => CollectionConfig`.

**⚠ Finding — the default `products` collection has no content fields at all.** Its complete field
list is `inventory` (number, shown only when variants are off), `enableVariants` (checkbox),
`variantTypes` (relationship, hasMany), `variants` (join on `variants.product`), and one
`priceIn<CODE>` group per configured currency. **No title, no slug, no images, no description, no
category.** Every content field is ours, added through `productsCollectionOverride`.

This reframes the adoption question. We are not inheriting a product shape and bending it; we are
taking money handling, variant resolution, inventory and cart operations, and designing the content
model ourselves. The concern 001/R9 raised — "committing spec 002's catalog to its Products/Variants
model" — turns out to bind only on options and price, which is exactly where we want it to bind.

**⚠ Finding — drafts, trash and published-only public read are defaults.** Both `products` and
`variants` ship with `versions: { drafts: { autosave: true } }`, `trash: true`, and
`access.read: adminOrPublishedStatus`. Spec FR-009 is satisfied by configuration.

**⚠ Finding — two config keys are required, not optional.** `access` (six named access functions)
and `customers: { slug }` must both be supplied. The customers slug is used in relationship fields
on carts, so **the collection must exist at config build time or Payload throws at startup**. That
forces a minimal `customers` collection into this spec; see R5.

**Alternatives considered**: enabling every collection (rejected: `orders` and `transactions` carry
the mismatch below, and landing a model we already know is wrong is worse than a second additive
migration). Disabling `carts` too (rejected: the customers collection is required regardless, and a
cart document is the concrete thing FR-041's seam hands to — landing the table now costs nothing and
removes it from 004's critical path).

**Carried into spec 004, unchanged from 001/R9**: the plugin's `orders` are created when
_transactions_ succeed, and `transactions` are payment records. An Aurum order is a **request**
handed to WhatsApp or Telegram, with no payment at all. Spec 004 either enables `orders` with the
payment coupling unused, or models requests as its own collection and leaves the plugin at products,
variants and carts.

---

## R2. Plugin versus a hand-rolled catalogue

**Decision**: Take the dependency.

**Rationale**: Constitution II requires every new dependency to be justified against what already
exists. What it supplies that we would otherwise write:

| Supplied                                                                                       | What writing it ourselves would mean                                                     |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `amountField` — integer minor units, per currency                                              | Money handling written by hand, against Principle VI, which names this exact failure     |
| Variant resolution + `validateOptions`                                                         | A hand-rolled option-combination validator, including the admin UI for picking options   |
| `inventory` field and its conditional display                                                  | Small, but it is the field the plugin's own validation hooks read                        |
| Cart operations — `addItem`, `updateItem`, `removeItem`, `clearCart`, `defaultCartItemMatcher` | The line-merging logic spec 004 needs, with the matcher extension point already designed |
| Drafts, autosave, trash, published-only read                                                   | Configuration we would otherwise repeat per collection                                   |
| `useCart`, `useCurrency`, `EcommerceProvider`                                                  | Client state for 004                                                                     |

What it costs: one dependency, version-locked to `payload@3.88.0` — the same lock every
`@payloadcms/*` package already carries, so it upgrades with the set rather than adding a new
upgrade axis. It contributes no client CSS and no UI to the storefront; its React exports are
opt-in.

**Alternatives considered**: hand-rolled collections (rejected: writing money and variant handling
ourselves to avoid a dependency published by the CMS we already run is the wrong trade, and
Principle VI treats monetary correctness as a floor). Adopting the plugin wholesale including orders
and payments (rejected: see R1).

---

## R3. How "Choose Your Diamond" and "Size" are modelled

**Decision**: **Diamond is a variant type. Size is a product field.**

**Rationale**: The plugin's variant model is a matrix — a `variant` is one combination of
`variantOptions`, and it is the row that carries price and inventory. Modelling both selectors as
variant types is the native reading, and it produces |stones| × |sizes| rows per product. A ring with
five stones and fifteen ring sizes is seventy-five variant documents, created by hand, in a Payload
version with no bulk variant generator. For a small jewelry store that is not a schema, it is a
second job.

It is also unnecessary. The brief already settled the semantics:

- _"As they pick a diamond the displayed price updates"_ — the diamond varies price and carries its
  own availability, so it must be the price-bearing row. That is a variant.
- Size never moves the price and, for made-to-order jewelry, carries no independent stock. That is a
  field.

Consequences, both good and bad:

- ✅ Variant count per product equals the number of stones. Five, not seventy-five.
- ✅ The drawer's `SIZE` filter becomes a plain column query on `products`, not a join through the
  variant matrix. Same for `DIAMOND SHAPE` and `COLOR`.
- ✅ A plain band with sizes and no stones needs no variants at all — `enableVariants: false`, price
  and inventory on the product. Spec FR-008's "neither, either, or both" falls out.
- ⚠ **Cost**: the plugin's cart item is `{ product, quantity, variant }`. A chosen size has nowhere
  to ride. Both remedies are documented extension points: `cartsCollectionOverride` adds a `size`
  field to the items array, and `cartItemMatcher` is given a matcher that treats two lines as
  distinct when their sizes differ. The plugin's own type documentation uses exactly this example
  (`deliveryOption`), so this is the intended seam, not a workaround.

**Alternatives considered**: both as variant types (rejected: the combinatorial cost above).
Diamond as a bespoke array field on the product (rejected: it forfeits the plugin's price and
inventory handling on the one axis that actually needs it, and puts money back in our own code).

---

## R4. Owner-definable attributes without a deployment

**Decision**: **Split it.** The six filters the design draws — category, collection, colour, price,
size, diamond shape — are **first-class indexed fields**. Everything else is a **generic
attributes array** on the product: a relationship to an owner-managed `attributes` collection plus a
value. Generic attributes render in the PRODUCT DETAILS accordion and are not filterable at launch.

**Rationale**: The brief's User Story 1 ends with the owner adding a "chain length" attribute and
seeing it on the storefront without a deploy. Taken literally as "any attribute is also a filter",
that is an entity-attribute-value model, and EAV filtering in Postgres means either a join per
active filter or a JSON column with no useful index — on the query that runs on every listing page
view, under a 2.5s LCP budget.

The split keeps the promise where it was made. The owner can define and populate any attribute they
like and it appears on the product page immediately. What they cannot do without a developer is
promote one to a _filter_, because a filter is a query plan, not a field. Promoting one is a small,
bounded change — a field, a filter group, a migration — and it is honest about being one.

**⚠ Finding**: the design draws a `COLOR` filter group with no colour anywhere on the product page.
Modelled here as a first-class field so the drawn filter works, and surfaced in the details
accordion so the page is not filtering on something invisible. Recorded as spec Open Question 5.

**Alternatives considered**: full EAV with filterable attributes (rejected: the query cost above,
for a catalogue whose filters are already drawn and fixed). No generic attributes at all (rejected:
it breaks the brief's User Story 1 outright).

---

## R5. Where customers come from

**Decision**: Create a **minimal `customers` auth collection** in this spec — email, password, name,
explicit access control, nothing else. No registration flow, no verification codes, no profile
screens.

**Rationale**: The plugin's `customers.slug` is required and its carts collection builds a
relationship field against it, so Payload will not boot without the collection existing. The
alternative — pointing it at `admins` — would model every customer as a possible admin-panel login,
which is exactly the privilege boundary spec 001 created a separate collection to avoid, and it
would do so by configuration rather than by construction.

Creating the table now is additive and costs one migration we are already writing. The _flows_ —
registration, verification codes, password reset, sign-in, profile — remain entirely in the customer
accounts spec. This spec creates a door frame, not a door.

**Note on numbering**: 001's `admins.ts` comment says "Customers arrive in spec 003 as their OWN
collection". The brief's `003-customer-accounts` became this feature's number when 002 was taken by
the home page; the accounts spec moves down. The comment's intent holds — its number does not.

**Alternatives considered**: `customers: { slug: 'admins' }` (rejected, above). Disabling carts to
avoid the requirement (rejected: `customers.slug` is required at the top level regardless of which
collections are enabled).

---

## R6. Filter state lives in the URL

**Decision**: The complete filter, sort and paging state is encoded in the query string and decoded
on the server. `src/lib/catalog/filters.ts` owns both directions and is pure.

**Rationale**: Four requirements collapse into this one decision.

- FR-020 and spec Acceptance 4.5 — a filtered listing must be shareable and survive a back button.
- FR-029 — filtering must work with JavaScript disabled. A `<form method="GET">` whose controls are
  named after the query parameters produces the same URL the interactive path produces, so the
  no-JS path is the same path with less scripting, not a second implementation.
- FR-014 — the route renders server-side, which it cannot do if the filter state lives in a client
  store.
- Caching: a URL-addressed listing is cacheable per filter combination; a client-filtered one is not.

Encoding: repeated keys for multi-value groups (`?category=rings&size=6&size=6.5`), scalars for the
rest (`?minPrice=50000&sort=price-asc&page=2`). Prices travel as **minor units**, matching storage,
so no parsing of a formatted string ever happens.

The drawer's APPLY-versus-immediate split (spec FR-022, FR-023) sits on top of this: the drawer
holds a draft in client state and writes the URL once on APPLY; the toolbar's controls write the URL
on change. Both write through the same encoder.

**Alternatives considered**: client-side filtering of a fully-loaded catalogue (rejected: it breaks
no-JS, SSR and the JavaScript budget, and does not scale past a small catalogue). A POST-based
filter form (rejected: not shareable, not cacheable, breaks the back button).

---

## R7. The three primitives the kit does not have

**Decision**: Build all three in `src/components/ui/`. **No new UI dependency.**

| Primitive     | Approach                                                                                                             | Why not a library                                                                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RangeSlider` | Two overlaid native `<input type="range">`, one per handle, with pointer-events managed so the nearer handle wins    | Native range inputs are keyboard-operable, screen-reader-labelled and touch-friendly for free. Every popular slider library reimplements that badly and costs 15–40KB      |
| `Drawer`      | `<dialog>` with a modal open, plus the focus and scroll-lock behaviour already written for `MobileNav` in 002/FR-034 | The behaviour exists in this repository; Principle II says extend it, not import it                                                                                        |
| `Lightbox`    | ~~The same `<dialog>`, with the gallery's existing paging~~ — **superseded by R11**                                  | 002 deferred PhotoSwipe to this spec precisely so it could be judged here. Judged, and then re-judged once zoom entered the brief: see R11                                 |

**⚠ Superseded in part**: the `Lightbox` row above was decided on a brief with no zoom in it, and
that premise did not hold. R11 records the reversal, the measurement that the estimate above got
wrong, and what it cost. `RangeSlider` and `Drawer` stand as written.

**⚠ Finding**: `Drawer` and `Lightbox` share their whole modal behaviour — focus trap, scroll lock,
Escape, focus restoration, `prefers-reduced-motion`. That is one primitive with two skins, not two
primitives. Building them as two would be the near-duplication Principle II forbids, so the modal
behaviour is extracted once and both consume it — the same move 002 made when it extracted
`Carousel` out of `ImageCarousel`.

**Alternatives considered**: Radix or Headless UI for the dialog (rejected: a component library's
worth of dependency to replace behaviour already written and tested in `MobileNav`). `noUiSlider`
(rejected: 30KB, and it is not keyboard-accessible without additional work).

---

## R8. How the mocks stay honest

**Decision**: Fixtures in `src/mocks/catalog.ts` are **typed as the generated collection types** from
`src/payload-types.ts` — `Product[]`, `Variant[]`, `Category[]`, `Collection[]`, `Attribute[]`.
`pnpm typecheck` is the enforcement.

**Rationale**: This is the owner's instruction — mocks now, with the fields the Payload collection
actually has — turned into something a machine checks. Constitution I already requires that
components consume the generated types and forbids hand-written interfaces mirroring a collection;
typing the fixtures the same way extends that rule to the stand-in data. Add a required field to a
collection, regenerate, and every fixture missing it is a build error rather than a surprise in 004.

The layering that makes the swap one file:

```
src/mocks/catalog.ts        fixtures, typed as generated Product / Variant / Category
        │
        ▼
src/lib/catalog/queries.ts  THE SWAP POINT — reads mocks today, payload.find() tomorrow
        │
        ▼
src/lib/catalog/mappers.ts  generated document → view model. Pure. Written once, used by both
        │
        ▼
src/lib/catalog/types.ts    view models — what a component is allowed to see
        │
        ▼
route loader → components (props only)
```

Because `mappers.ts` consumes the generated document type, it is written now against fixtures and
reused unchanged against Payload documents. `queries.ts` is the only file that knows where documents
come from — which is what SC-010 measures.

**⚠ Finding — generated relationship types are unions.** Payload generates
`category: string | Category` and `gallery: (string | Media)[]`, reflecting depth-dependent
population. Fixtures use the populated branch; mappers must narrow explicitly rather than assume it.
That narrowing is the first unit test in the feature, and it is a real bug class caught early.

**Alternatives considered**: hand-written mock interfaces (rejected: forbidden by Constitution I and
it is precisely the drift the owner asked to prevent). Seeding a real database and reading through
the Local API now (rejected: that is the deviation ending, which is 004's move, not this spec's).

---

## R9. Price formatting

**Decision**: Amounts are stored and passed as **integer minor units**. One pure formatter,
`src/lib/catalog/price.ts`, produces the display string at the route boundary. Components receive
strings, as `ProductCard` already requires.

**Rationale**: Constitution VI forbids floating-point money and requires an explicit currency code;
the plugin's `amountField` already stores minor units, so the storage side is settled. The
formatting side is a real decision because the design draws three different formats for the same
number — `$ 24,900`, `$38 320,00` and `$58,320.00` (spec Open Question 3). One formatter means one
place to change it when the designer answers.

The formatter is `Intl.NumberFormat`-based and locale-aware, which the language selector in the
header will need. Default until told otherwise: `$24,900` — the card format, drawn most often.

**Alternatives considered**: formatting inside components (rejected: 002/FR-004 already established
that presentation components receive formatted strings, and it would put currency logic in a dozen
files).

---

## R10. Three defects in the plugin, found while landing it

Recorded here because each cost time to diagnose and each will cost it again on the next upgrade.
All three were verified against `@payloadcms/plugin-ecommerce@3.88.0` as published.

### ⚠ `orders: false` breaks type generation

`dist/utilities/pushTypeScriptProperties.js` pushes a `$ref` into the generated JSON schema for
**every** entry in `CollectionSlugMap`, and `orders` and `transactions` are non-optional in that
type — they are named whether or not the collections exist. Disabling them leaves references to
definitions that were never generated, and `generate:types` dies:

```
MissingPointerError: Missing $ref pointer "#/definitions/orders"
```

**Resolution**: `src/lib/ecommerce-schema.ts` prunes the dangling entries. It has to run _after_ the
plugin's own schema pass, and declaring `typescript.schema` in the config literal runs _before_ it —
the plugin pushes onto that array while it executes. So the plugin call is wrapped
(`withPrunedEcommerceTypes`) and the pruning is appended to whatever the plugin left behind.

**Delete it** the moment spec 004 enables orders and transactions. It is a workaround with an expiry
date.

### ⚠ `addresses: false` is silently ignored

`dist/utilities/sanitizePluginConfig.js` rewrites any non-`true` value for `addresses` into
`{ addressFields: defaultAddressFields() }` — a truthy object — and the plugin then tests
`if (sanitizedPluginConfig.addresses)`. The collection is created no matter what the flag says.

**Resolution**: accepted rather than fought. It is one unused table, additive and harmless, and
stripping the collection back out of the config would risk the relationships the plugin builds
against it. The `addresses: false` line stays in the config to record the intent, with a comment
saying it does nothing. Because the definition _is_ generated, its `$ref` resolves — which is why
R10's pruner leaves `addresses` alone and removes only `orders` and `transactions`.

### ⚠ The generated migration's `down` does not run as emitted

`migrate:create` emits `DROP TABLE "x" CASCADE` — which already removes the foreign-key constraints
on `payload_locked_documents_rels` — and then emits explicit `ALTER TABLE ... DROP CONSTRAINT` for
those same constraints. Postgres refuses, and the rollback aborts halfway:

```
constraint "payload_locked_documents_rels_customers_fk" ... does not exist
```

**Resolution**: every `DROP` in `down` is hand-edited to `IF EXISTS`, with a note at the top of the
migration saying so and saying that regenerating reintroduces it.

This is the argument for Constitution IV's wording. A rollback path that has been _written_ is not a
rollback path; this one failed on its first run, in a way no review of the diff would have caught.

### ⚠ Correction — `inventory` is not admin-only

An earlier draft of [data-model.md](./data-model.md) put `adminOnlyFieldAccess` on the read of
`products.inventory`. That is wrong, and the storefront is what makes it wrong: the same
access-controlled query the listing uses to decide whether a piece is orderable would come back
without the field, leaving the page unable to tell available from not.

A stock count is not personal data, and "unavailable" has to be derived from something. The field is
readable; Constitution VI's concern is customer data and payment instruments, neither of which this
is.

### ⚠ The admin import map is generated, gitignored, and nothing was generating it

Not a plugin defect — a gap in this repository that the plugin exposed. `src/app/(payload)/admin/
importMap.js` is how Payload resolves every admin component that does not live here. It is
gitignored (a decision from spec 001), and **`next build` does not create it**: the build fails
outright with `Module not found: Can't resolve '../importMap.js'`. Verified by deleting the file and
building.

So a clean checkout could not build at all, and the Docker image only worked because `COPY . .`
copied whatever the developer happened to have — which was a map holding one entry, generated before
the rich-text editor was configured. The deployed admin would have thrown
`getFromImportMap: PayloadComponent not found` on every rich-text field, and now on the plugin's
`PriceCell`, `PriceInput` and `VariantOptionsSelector` too.

**Resolution**, three parts, because the artifact has three consumers:

| Where           | Change                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `package.json`  | `pnpm generate:importmap`, beside `generate:types`                                               |
| `Dockerfile`    | Generates it in the build stage, with the same build-only placeholders `pnpm build` already uses |
| `.dockerignore` | **Excludes** it, so the image can never inherit a developer's stale copy                         |
| CI              | A step before the build, so a clean checkout is what gets tested                                 |

**Worth considering, not done here**: a `check:importmap` in the mould of `check:tokens`. The
argument is identical — a generated artifact is only safe to depend on if something proves it
matches its source — but the import map is not committed, so the check would have to compare a fresh
generation against the running config rather than against a commit. Left as a suggestion.

### ⚠ Variants have no front door, and `admin.group` is what closes it

The plugin sets `admin.group: false` on the variants collection. In Payload that is not a styling
choice — `group?: false | string | Record<string, string>`, and `false` means **hide from the
navigation**. It is the plugin's only guard on an invariant it otherwise cannot express: a variant is
creatable _only from inside its product_, through the `variants` join field, because that is what
fills in `product`. The field itself is `readOnly` and sidebar-positioned, so it cannot be set by
hand.

An early revision of `variantsCollectionOverride` here replaced that with `group: 'Shop'`, purely to
file the collection alongside the others. That put "Variants" in the sidebar, which put a "Create
new" button in front of the user, and `VariantOptionsSelector` calls
`findByID({ id: data.product })` unconditionally — so the form threw `NotFound` before it rendered.

**Resolution**: the override no longer touches `admin` at all, and says why in a comment, because the
next person to tidy the admin groups will otherwise reach for the same line. Verified: variants are
absent from the navigation, and the product's edit page renders its "Available variants" join.

**The general lesson for the other overrides**: `defaultCollection.admin` is carrying plugin
behaviour, not just presentation. Spreading it and changing one key is how that behaviour gets lost
quietly. `products` and `carts` keep their `group: 'Shop'` — neither has an invariant riding on it —
but that is now a checked claim rather than an assumption.

---

## R11. PhotoSwipe, after zoom entered the brief

**Decision**: adopt `photoswipe@5.4.4` for the full-screen viewer. **This reverses R7's third row.**

R7 judged PhotoSwipe against a brief that asked for paging, a close control and Escape — all of
which `useOverlay` already provided, and the first implementation of `Lightbox` did exactly that,
in about 160 lines with no dependency. That judgment was correct for the brief it was given.

The brief then changed: the owner wants to look **into** the stone. Zoom is not a variation on
paging — it is pinch with two pointers, panning bounded by the zoomed image's edges, momentum,
double-tap, a wheel that magnifies rather than scrolls, and a pointer that behaves differently
again on a trackpad. That is the class of work where "reuse before creation" points at a library
rather than away from one, and Principle VI's neighbouring instinct applies: hand-rolled
geometry that is subtly wrong on one device is worse than a dependency that is right on all of them.

**The 30KB in R7 was an estimate and it was wrong.** Measured from the installed package:

| Artefact                            | Gzipped | When it loads                    |
| ----------------------------------- | ------- | -------------------------------- |
| `photoswipe-lightbox.esm.min.js`    | 4.5KB   | With the route                   |
| `photoswipe.esm.min.js`             | 16.4KB  | On first open, via `pswpModule`  |
| `photoswipe.css`                    | 2.4KB   | With the route                   |

So a product page that is never opened full screen carries 6.9KB, and the 16.4KB core arrives only
when someone asks for it. Against Constitution V's 200KB per route that is comfortable, and it is
the reason the dynamic `pswpModule` import is used rather than a static one.

**What it cost, honestly:**

- **The chrome is themed, not adopted.** PhotoSwipe ships a dark viewer; node 308:6392 draws a white
  one. `lightbox.css` translates it. The glyphs come from our own registry through `closeSVG` and
  friends, so the icon set stays single-sourced, but the arrow's hairline and shadow are restated
  there and also live in `IconButton`'s `outline` variant. Recorded at the top of that file.
- **Its root is an unnamed `role="dialog"` with no `aria-modal`.** That is an axe violation on a
  gate this repository enforces, so both attributes are set on `afterInit`.
- **A control the frame does not draw was added and then removed again.** A magnifier beside the
  close button was the first answer to "how does a keyboard zoom". The owner rejected it — the frame
  draws two controls and should draw two — so `zoom: false`, and `+`/`-` are bound in the wrapper
  instead. Same coverage of SC-006, nothing added to the drawing. The controls take no hover state
  either, for the same reason: the frame draws none.
- **Two indices instead of one.** The component stays controlled so the thumbnail rail can follow;
  PhotoSwipe owns its index internally. The `change` event and a `goTo` in the other direction are
  what keep them in step, and that is the only real work in the wrapper.
- **`usePrefersReducedMotion` lost its consumer** and was deleted. PhotoSwipe disables its own
  animations under `prefers-reduced-motion`, and the storefront's global rule in
  `app/(frontend)/styles.css` already covers CSS transitions.

**Two defects it introduced, both found by eye and not by the tests.** Every glyph rendered blank,
because the library sets `color` on the icon to the tint of a halo our icons do not have and ours
paint themselves with `currentColor`; the magnifier rendered as a black disc, because the library's
own `fill` flooded a stroked outline. And the "next" arrow pointed left, because the library draws
one arrow and mirrors it. All three passed a suite that measured the button and never the mark
inside it — the lesson being that a themed third-party control needs an assertion about what is
drawn, not only about where it sits. There are now three.

**What it bought beyond zoom**: touch swipe with momentum — which the hand-rolled viewer did not
have, and which the mobile gallery beneath it (FR-033) does, so the interaction no longer changes
when a visitor goes full screen. And an opening transition that grows out of the pressed thumbnail,
wired through the optional `thumbnailFor` prop.

**Alternatives considered**: `react-photoswipe-gallery` (rejected: a third-party wrapper over the
thing we actually want, and its `<Gallery><Item>` render-prop shape would dictate the product
gallery's markup). Keeping the hand-rolled viewer and adding only pinch-zoom (rejected: pinch
without bounded pan and momentum is the half that feels broken). `medium-zoom` (rejected: it zooms
an image in place; it is not a full-screen viewer and does not page).

---

## R12. Opening the filter drawer without JavaScript

**Decision**: The FILTERS control is a link to the panel's own id, and one unlayered CSS rule —
`.filter-drawer:target { display: flex; translate: none }` — is what opens it. With scripting the
press is cancelled before the fragment is ever set and React opens the panel exactly as before.

**Why it came up**: R6 settled that the drawer would be a `<form method="GET">` so that FR-029 is
the same code path with less scripting. T242 then built `Drawer` to stay in the document with
`display` toggled, which makes the form *render* for a visitor with no scripting. Neither decision
made the panel **openable** for them: `open` is React state and the trigger was a click handler that
would never run. The form was server-rendered, correct, and unreachable.

**Why `:target`**: the fragment is the only piece of state a browser will change on its own, and
`:target` is how that state reaches CSS. Everything else was worse:

- `<details>`/`<summary>` opens natively and would have worked — but it replaces `Drawer` rather
  than using it, discarding the focus trap, the scroll lock and the drawn transition, and leaving
  the kit with a primitive built for this and used by nothing.
- A `<noscript>` copy of the form is a second implementation of the thing R6 exists to avoid, and
  it duplicates every control name in the document.
- A checkbox-and-sibling-selector toggle is the same trick with worse semantics: an unlabelled
  control that is not a disclosure, announced as a checkbox.

**What it costs**, recorded rather than hidden. Without scripting there is no scrim — `Drawer` draws
that as a sibling with no id, so no fragment can reach it — and the panel's close control has to be
a link, which is what `closeHref` is for. Both are acceptable: the panel is opaque, it covers the
viewport on a phone, and CLEAR, APPLY, the close link and the Back button are all routes out of it.

**The other half of the same problem**: a `<form method="GET">` posts to a fixed `action` and cannot
choose a path from what is ticked inside it, so the drawer always submits to `/all-jewelry` with the
category as a parameter — and with both ends of the price slider attached whether or not anyone
moved them. `canonicalListing` sends that request on to the address a scripted visitor would have
produced, which is what makes FR-029's "the same URL" literally true rather than approximately. It
refuses to move any request that had a value to report (FR-030), because the redirect rewrites the
query from the parsed state and that is exactly where the reported value would vanish.
