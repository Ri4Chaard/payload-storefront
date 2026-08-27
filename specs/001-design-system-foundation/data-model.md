# Data Model: Design System Foundation

**Feature**: `001-design-system-foundation` | **Date**: 2026-08-25

This spec is deliberately free of domain modelling. Its "data model" is therefore in two parts: the
**token model**, which is the real subject of the feature, and the **inherited collections** that
arrive with the scaffold and the e-commerce plugin and which this spec configures but does not
design.

Domain modelling — products, attributes, diamond options, availability, customers, carts, requests,
posts — belongs to specs 002 through 005 and is defined in [docs/mvp-brief.md](../../docs/mvp-brief.md).

---

## Part 1 — Token model

The token pipeline has three stages and one rule: **each stage has exactly one writer.**

```
design/tokens/colors.json       ─┐
design/tokens/typography.json   ─┤→  design/tokens/mapping.ts  →  scripts/build-tokens.ts
   (Figma; written by the designer)      (written by developers)          ↓
                                                                 src/styles/tokens.css
                                                                  (@theme; written by nobody)
```

### Stage 1 — Source exports

`design/tokens/colors.json`, `design/tokens/typography.json`. Byte-identical Figma output. Replaced
wholesale on re-export, never hand-edited. A diff here is a design change.

### Stage 2 — Mapping module

`design/tokens/mapping.ts` is the only place a human resolves the gap between what the design tool
produced and what the system needs. It carries five kinds of entry, each of which must state its
reason:

| Entry kind | Example | Why it exists |
|---|---|---|
| **Passthrough** | `primary-default` → `--color-primary-default` | Supplied value, valid name |
| **Drop** | `border-#ffffff` → no token | A `#` is not a valid CSS identifier, and Tailwind's `border-white/8` already expresses the value (7.84% white) |
| **Semantic remap** | `h3-medium` → `body-medium` | Export names describe Figma layers, not roles |
| **Usage constraint** | `neutral-secondary` permitted on dark surfaces only | Fails AA on light — but **no value is changed**; the pairing is excluded instead |
| **Derived** | `caption`, `body-base`, radii, motion, breakpoints | Required by FR-015/FR-018/FR-021, absent from the export |

Every derived entry and every usage constraint carries a source comment naming the requirement that
forced it. This is what lets the owner audit exactly what was invented versus supplied.

**No colour value is ever rewritten here.** Where a brand colour cannot meet contrast, the mapping
records *where it may not be used* and the pairing is excluded from the contract — the palette is
input, not something the mapping negotiates with.

### Stage 3 — Generated output

`src/styles/tokens.css`, a Tailwind v4 `@theme` block. Committed so the build never depends on the
generator running, and verified in CI by regenerating and diffing. Hand-editing it is the one thing
that breaks the whole model, so it carries a generated-file header saying so.

### Token entity shape

| Field | Type | Notes |
|---|---|---|
| `name` | string | CSS custom property name, kebab-case, no `#` |
| `value` | string | CSS-valid value; 8-digit hex permitted for alpha |
| `category` | `color \| typography \| spacing \| radius \| border \| shadow \| motion \| breakpoint` | |
| `provenance` | `figma \| supplied \| remapped \| derived \| unverified` | Rendered on the style guide. `figma`/`supplied` are passthroughs; the rest require a `reason`. |
| `reason` | string | Required for every non-`supplied` token |
| `surfaces` | string[] | Colour tokens only — the backgrounds this may legally sit on |

### Validation rules

1. Every `name` matches `^[a-z][a-z0-9-]*$`. **The raw export violates this** — `border-#ffffff` is
   why this rule is stated first.
2. Every token with `provenance ≠ supplied` has a non-empty `reason`.
3. Every colour token's `surfaces` list contains only surfaces it actually passes against (4.5:1
   text, 3:1 icons and borders). A token that passes nowhere for text is text-ineligible by
   construction, not by reviewer memory.
4. Every pairing in `contracts/design-tokens.md` resolves to tokens that exist.
5. Regenerating produces output byte-identical to the committed `tokens.css`.

Rules 1–4 are unit-tested; rule 5 is a CI diff check.

---

## Part 2 — Payload ships empty

The owner's direction is to start from a **mock frontend** and add collections when they are
actually needed. Payload is installed and running, but this spec creates **no content model**:

| Collection | Purpose in this spec | Access |
|---|---|---|
| `admins` | Store staff — the identity Payload's admin panel authenticates against. Named `admins`, not `users`: customers arrive in spec 003 as their own collection and both have passwords, so "users" would read as "everyone" while meaning "staff". | Admin only; explicit, not defaulted (Principle IV) |
| `media` | Uploads. Image sizes are configured here because the `Image` primitive's responsive `sizes` contract depends on them. | Public read, admin write |

That is the whole list. No products, no carts, no orders, no e-commerce plugin.

**Why customers are a separate collection, not a role on this one.** Payload designates exactly one
collection as the admin-panel identity via `admin.user`. If customers lived in it, every customer
account would be a possible admin-panel login, rejected only by an access-control function returning
the right boolean — in every rule, forever. Keeping them apart means a customer has no row here at
all, so the brief's "customer accounts MUST NOT grant any access to the admin area" holds by
construction rather than by correctness. Both have passwords, so this is a privilege-boundary
argument, not an authentication-mechanics one.

This is what makes the Constitution Check pass cleanly on Principle IV: an earlier revision of this
plan installed `@payloadcms/plugin-ecommerce` and had to justify six unwanted collections in
Complexity Tracking. Deferring it removed the deviation outright.

### Mock data contract

The storefront renders from fixtures in `src/mocks/`, shaped as Payload will eventually return them
— arrays of objects with `id`, `slug`, and the fields the brief implies. The rule that makes this
worth doing rather than merely expedient:

> Components receive data as props. Nothing imports from `src/mocks/` except the route-level loader.

That single boundary is what turns spec 002's data-source swap into a change in one file per route
rather than a rewrite of every component. It also means the mock shape is a real design artifact —
getting it wrong now costs rework later, so it is worth matching the brief's entity list.

### What this defers, deliberately

Spec 002 decides whether the catalog is built on `@payloadcms/plugin-ecommerce` or on hand-rolled
collections. Research findings are retained in research.md R9 so that evaluation does not start from
scratch — including the one that matters most:

> ⚠ The plugin's `orders` are created *when transactions succeed*, and `transactions` are payment
> records. The MVP has neither — an order is a **request** handed off to WhatsApp or Telegram. Spec
> 004 either uses the plugin's orders with payment coupling disabled, or models requests separately
> and uses the plugin only for products and variants.

Making that call after real screens exist is better than making it now. Building the mock frontend
first surfaces how "Choose Your Diamond" and "Size" actually behave, which is precisely the evidence
the plugin-versus-hand-rolled decision needs.

## Migrations

No schema is created at all, but the migration path is **configured and proven** here so later specs
inherit working machinery rather than building it under pressure:

- Postgres migrations generate and run from the CLI.
- A migration can be rolled back locally, verified once as part of Story 1's acceptance.
- `payload-types.ts` is generated and committed in the same commit as any schema change, checked in
  CI (Principle I).

The first real migration is spec 002's.
