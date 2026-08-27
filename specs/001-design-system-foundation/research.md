# Phase 0 Research: Design System Foundation

**Feature**: `001-design-system-foundation` | **Date**: 2026-08-25

All Technical Context unknowns are resolved below. Findings that change the shape of the work —
rather than merely confirming a default — are marked **⚠ Finding**.

---

## R1. Runtime stack and version compatibility

**Decision**: Payload 3.88.0 + Next.js 16.3.3 + React 19 + TypeScript 5 (strict) + Tailwind CSS
4.3.3, single Next application with Payload mounted inside it.

**Rationale**: Payload 3 is Next-native — the admin panel and the storefront are routes in one app,
which is what the constitution's Technology Stack section already assumes. Verified compatibility
from published peer ranges:

| Package | Version | Constraint checked |
|---|---|---|
| `payload` | 3.88.0 | — |
| `@payloadcms/next` | 3.88.0 | peer `next: >=16.2.6 <17.0.0` → 16.3.3 ✅ |
| `@payloadcms/plugin-ecommerce` | 3.88.0 | peer `react: ^19.2.1`, `payload: 3.88.0` ✅ |
| `next` | 16.3.3 | ✅ inside range |
| `tailwindcss` | 4.3.3 | ✅ |

Payload pins its own packages to an exact matching version — every `@payloadcms/*` package must be
upgraded together, never independently.

**Alternatives considered**: Separate Payload API + separate Next frontend (rejected: two deploy
targets, no Local API, contradicts the constitution's single-app structure). Next 15 (rejected: no
reason to start a new project a major version behind when 16 is supported).

---

## R2. Database adapter

**Decision**: PostgreSQL via `@payloadcms/db-postgres`, running locally in Docker.

**Rationale**: Constitution Principle VI requires atomic order/inventory behaviour and an
append-only order history with an audit trail. Those are relational obligations, and the
e-commerce plugin's orders/transactions model is relational in shape. Postgres also gives real
migrations with a rollback path, which Principle IV mandates for any schema change touching
existing content.

**Alternatives considered**: MongoDB (rejected: the transactional guarantees the constitution
demands are harder to hold, and the plugin's relational model fits Postgres better). SQLite
(rejected: fine locally, wrong for the hosted environment, and divergence between local and
production contradicts the constitution's "environments configured identically apart from
credentials").

---

## R3. Tailwind v4 as the token layer

**Decision**: Tailwind v4's CSS-first `@theme` block **is** the token definition. Design tokens are
declared once as CSS custom properties inside `@theme`; Tailwind derives utilities from them
automatically.

**Rationale**: This is the single most useful thing v4 changed for this spec. In v4, `@theme
{ --color-primary-default: #3b171a; }` simultaneously defines the CSS variable and generates
`bg-primary-default`, `text-primary-default`, `border-primary-default`. There is exactly one
definition site, which is precisely what FR-011 and SC-001 require — change one declaration, the
whole site follows, no other file edited. A JS config file would split the definition in two.

**Alternatives considered**: Tailwind v3 with a JS theme config (rejected: two sources of truth for
every token, and v3 is legacy). CSS modules with hand-written variables (rejected: loses utility
generation, and the constitution mandates one styling approach).

---

## R4. ⚠ Finding — Tailwind preflight breaks the Payload admin panel

**Decision**: Two entry stylesheets. The storefront imports Tailwind fully. The admin panel imports
Tailwind **with preflight excluded**, and the two never share a stylesheet.

**Rationale**: Tailwind's preflight is a global element reset. Payload's admin panel ships its own
complete styling, and a global reset loaded into it visibly breaks the admin UI — this is the most
commonly reported Payload + Tailwind integration failure. In v4, `@import "tailwindcss"` can be
split so preflight is omitted:

```
/* storefront — full Tailwind */
@import "tailwindcss";

/* admin — everything except preflight */
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
```

The admin sheet still gets the brand tokens and utilities, so any custom admin component can be
styled on-brand, but Payload's own chrome is untouched.

**Impact on the plan**: adds a distinct setup task and a validation step — the admin panel must be
visually inspected after Tailwind is wired, not assumed working.

**Alternatives considered**: `tailwindcss-scoped-preflight` with `.twp` / `.no-twp` opt-in classes
(rejected: a third-party plugin and a class-discipline rule on every element, to solve a problem
that splitting the entry sheets solves outright). Not using Tailwind in the admin at all (rejected:
custom admin components later would have no styling vocabulary).

---

## R5. ⚠ Finding — `colors.json` is stale; the live Figma file is authoritative

**Decision**: **The Figma file is the source of truth.** `colors.json` disagrees with it on the one
token that mattered most, and the disagreement inverts the entire accessibility analysis.

**Rationale**: Read from the live file (`<figma-file-id>`, desktop/tablet/mobile main page):

| Token | `colors.json` | Figma | Consequence |
|---|---|---|---|
| `neutral/secondary` | `#a7a5a3` | **`#343231`** | Near-inverse. The export is a *light* grey; the live value is a *dark* warm grey. |
| `border/default` | `#0000001a` | `#000000` | The export baked the applied 10% opacity into the value. |
| `border/#FFFFFF` | `#ffffff14` | `#FFFFFF` | Same — the export baked in ~8% opacity. |

Contrast for `neutral/secondary`, computed both ways:

| Background | Figma `#343231` | `colors.json` `#a7a5a3` |
|---|---:|---:|
| `background/bg` #f8f7f6 | **11.92 ✅** | 2.29 ❌ |
| `background/container` #ffffff | **12.75 ✅** | 2.45 ❌ |
| `background/subtle` #dddddd | **9.39 ✅** | 1.81 ❌ |
| `background/base` #130000 | 1.60 ❌ | 8.32 ✅ |

**This removes the constraint entirely.** The previous revision of this plan concluded there was no
usable muted text colour on light surfaces, and that error text could not be red — both consequences
of the stale export. With `#343231`, secondary text on light surfaces passes at 11.92:1 with room to
spare, which is exactly what a secondary text colour should do. All three main-page breakpoints use
`background/bg` as their canvas, confirming light surfaces are the design's default and a dark
secondary is the coherent reading.

**Still unchanged**: no colour value is invented or altered. The correction is to read the *right*
value, not to derive a new one.

**Consequence for the border tokens**: Figma stores raw colours and applies opacity at the use site,
which is precisely how Tailwind's opacity modifiers work. `border/#FFFFFF` at 8% is `border-white/8`
(already decided). By the same logic `border/default` at 10% is **`border-black/10`** — also a
built-in, also needing no token. Recommended for consistency; flagged as the owner's call since only
the white one was discussed.

**⚠ The status colours diverge from Figma — owner decision to keep the export's values.** The
newsletter success (`581:16616`) and error (`614:13575`) states returned **no status variable**: the
colours are raw fills, invisible to `get_variable_defs`. Read from the design context directly, they
are `#ff3b30` (error) and `#4cd964` (success), with the success wash at 20% rather than 10%. **The
owner has chosen to keep the `colors.json` values**, so `#f75959` and `#2a8121` stand. Recorded so
the divergence is a known decision, not a discrepancy to rediscover.

Two consequences of the retained values, both carried into the contract:

| Retained colour | On light `#f8f7f6` | On dark `#130000` |
|---|---|---|
| `#f75959` error | 3.01 — icons/borders only | 6.35 ✅ |
| `#2a8121` success | 4.61 ✅ | **4.15 — large text only** |

So error text is not red on light surfaces (text in `neutral-primary`, red on icon/border/wash), and
success text is not body-size on the dark footer. The second one bites when Story 4 builds the
footer, since the design's success block is body text on dark.

**Still unverified**: `primary-hover`, `primary-transparent`, `background-subtle`, `border-subtle`.

**⚠ A genuine accessibility failure in the design**, found while measuring: the unsubscribe note
("Вы можете отписаться в любой момент") is `rgba(255,255,255,0.2)` on the dark footer — **1.71:1**,
far below the 4.5:1 body minimum and below even the 3:1 interface threshold. It will fail the CI
contrast gate. The sibling subtitle at `white/60` measures 7.33:1 and is fine, so the fix is an
opacity change, not a redesign. Needs a design decision before the footer is built.

**Alternatives considered**: Treating `colors.json` as authoritative (rejected: it is a dated export
and demonstrably wrong on the token we could check). Reconciling by asking which is intended
(unnecessary — the live file is the design, and the contrast maths corroborates it).

---

## R6. ⚠ Finding — the token export contains an invalid identifier and a non-scale

**Decision**: Keep the Figma exports byte-identical as the design source, and generate `tokens.css`
from them through a mapping module that repairs names and fills gaps.

**Rationale**: Three defects in the raw exports:

1. **`"border-#ffffff": "#ffffff14"`** — a `#` inside a token name is not a valid CSS custom
   property identifier or a Tailwind utility suffix. **No token is defined for it.** The value is
   white at `0x14` = 20/255 = **7.84% alpha**, which Tailwind already expresses natively as
   `border-white/8` (8%) — a 0.16% alpha difference, imperceptible. Using the built-in utility is
   strictly better than inventing a token that duplicates it.
2. **`spacing` is not a scale** — `{"18": "18px", "button": "16px", "default": "0px", "number":
   "0px"}`. Two entries are zero-valued Figma artefacts with no meaning; two isolated values are not
   the scale FR-018 requires. Resolution: adopt Tailwind v4's default 4px-based scale as the system
   scale, carry `18` and `button: 16px` forward as named brand exceptions, and drop the two zeroes
   — a zero-valued named spacing token carries no information and `0` is already expressible.
3. **Alpha baked into 8-digit hex** — `#3b171a33`, `#0000001a`. Kept as-is (valid CSS), with the
   mapping recording what each represents so nobody re-derives them by eye.

**Architecture**:

```
design/tokens/colors.json        ← Figma export, never hand-edited
design/tokens/typography.json    ← Figma export, never hand-edited
design/tokens/mapping.ts         ← semantic roles, renames, gaps, permitted pairings
scripts/build-tokens.ts          ← generates → src/styles/tokens.css  (@theme block)
```

Regenerating is one command; the output is committed so the build never depends on the generator,
and a CI check regenerates and fails on any diff — the same guarantee Payload's generated types get
under Principle I.

**Alternatives considered**: Hand-transcribing into `@theme` (rejected: the export becomes
decorative and the next Figma update silently diverges). Defining a `border-inverse` token anyway
(rejected by the owner: Tailwind's `border-white/8` already covers it).

---

## R7. ⚠ Finding — typography confirmed, and the mobile scale is a two-step drop

**Decision**: Map the eight exported styles onto a semantic scale, derive the four missing steps,
and express the responsive scale as `clamp()` between the values Figma actually uses at each
breakpoint.

**Rationale**: The live file confirms all eight styles exactly as exported — same families, sizes,
weights, and line heights — so the typography export is accurate where the colour export was not.
The names still describe Figma layer organisation rather than typographic role (`h3-medium` is 16px
Manrope *body* text; `h-h` and `h-2` are 14px), so the semantic remap stands:

| Export token | Actual | Semantic name |
|---|---|---|
| `h1` | 36/1.4, 500, uppercase | `display` |
| `h2` | 30/1.4, 500, uppercase | `heading-1` |
| `h3` | 24/1.4, 500, uppercase | `heading-2` |
| `h4` | 20/1.4, 500, uppercase | `heading-3` |
| `h3-medium` | Manrope 16/1.6, 500 | `body-medium` |
| `h3-bold` | Manrope 16/1.6, 700 | `body-strong` |
| `h-h` | Manrope 14/1.38, 400 | `body-small` |
| `h-2` | Manrope 14/1.38, 600 | `label` |

**The responsive scale is now evidenced rather than invented.** Which type variables appear in each
breakpoint's subtree:

| Breakpoint | Node | Heading styles present |
|---|---|---|
| Desktop 1920 | `127:449` | H1 (36), H2 (30) |
| Tablet | `440:11713` | H1 (36), H2 (30) |
| Mobile 390 | `440:13391` | **H3 (24), H4 (20)** |

Desktop and tablet share the scale; mobile drops **two steps**. Body styles are identical at every
breakpoint. Expressed as `clamp()` between the observed endpoints, which reproduces the design
exactly at both ends and needs no per-component override (FR-017):

| Style | Mobile | Desktop |
|---|---:|---:|
| `display` | 24px | 36px |
| `heading-1` | 20px | 30px |
| `heading-2` | 18px | 24px |
| `heading-3` | 16px | 20px |
| all body styles | unchanged | unchanged |

**⚠ One inference stated plainly**: the mobile page contains only H3/H4 and the desktop page only
H1/H2, so the pairing desktop-H1→mobile-H3 and desktop-H2→mobile-H4 is inferred from token presence,
not from confirming the same element steps down. It is consistent across all three breakpoints and
matches a clean two-step drop. `heading-2` and `heading-3` mobile values are extrapolated from that
pattern since the mobile page does not use those levels. Cheap to correct if a real screen disagrees.

**Gaps against FR-015**, unchanged by the Figma read — these are genuinely absent from the design
system, not just from the export:

- **`body-base`** at 400/16px — only 500 and 700 exist at 16px. Derived: Manrope 16/1.6, 400. The
  most-used style on a content-heavy site; its absence reads as an omission.
- **`caption`** — derived: Manrope 12/1.4, 400.
- **`heading-4`** — the serif scale stops at 20px. Derived: 18/1.4, 500, uppercase.

All derived values are marked as derived in `contracts/design-tokens.md`.

### ⚠ The type tokens do not cover actual design usage

Reading two real components surfaced **six font sizes with no token**, in the footer alone:

| Size / weight | Where | Tokenised? |
|---|---|---|
| Manrope Bold 18, lh 1.3, uppercase | "NEWSLETTER" heading | ❌ |
| Manrope Bold 22, lh 1.25 | "Subscription Confirmed" | ❌ |
| Manrope SemiBold 15, lh 1.5 | Success headline | ❌ |
| Manrope Regular 13, lh 1.6 | Success body | ❌ |
| Manrope Medium 12, lh normal | Error message | ❌ |
| Manrope Regular 11, lh 1.5 | Unsubscribe note | ❌ |
| Manrope Medium 16, lh 1.6 | Input and button text | ✅ `body-medium` |
| Manrope Regular 14, lh 1.38 | Subtitle | ✅ `body-small` |

The eight exported styles cover 36/30/24/20 serif and 16/14 Manrope. Everything between 11 and 22 is
ad-hoc. **This directly conflicts with FR-016**, which forbids arbitrary font sizes in component
code — if the design uses six untokenised sizes, either they become tokens or the design conforms to
the scale.

**Needs an owner decision.** Two coherent answers:

1. **Expand the scale** to cover real usage — adds roughly six styles, and the token set then
   describes the design as it is.
2. **Snap to the existing scale** — the footer sizes round to 16/14/12, treating the current values
   as drift rather than intent.

Recommendation: option 2 for anything within ~1px of an existing token (13→14, 15→16, 12→`caption`),
and tokenise only 18 and 22, which are genuinely distinct steps the serif scale does not cover.
That keeps the scale small without forcing visible redesign. Not applied — flagged for decision.

**Related**: secondary text on the dark footer is expressed as `white/60`, not a colour token. That
measures 7.33:1 and is fine, and it matches the border pattern (raw colour, opacity at use site), so
the system should express dark-surface muted text the same way rather than inventing a token.

---

## R8. Fonts — placeholder serif now, licensed face later

**Decision**: **Manrope** for all body text, self-hosted from its Open Font Licence release —
this is the real brand face and needs no substitute. For the display serif, ship **Playfair
Display** as an explicit placeholder until the TT Ramillas licence is purchased.

**Rationale**: The export names `TT Ramillas Trl` — a *trial* face. Trial licences prohibit
production and commercial use, so it cannot ship, and this surfaces as a legal notice rather than a
bug. The owner has confirmed the licence will be bought later and any face is acceptable for now.

Playfair Display is the closest freely-licensed stand-in: a high-contrast display serif with a 500
weight, which is what the scale calls for, and it holds up at the uppercase display sizes the brand
uses. It is a **placeholder, not a choice** — swapping in the licensed face is one `@font-face`
block and one token value, with no component touched, because nothing references a family name
directly.

**Loading strategy** (FR-014 — readable during load, no layout shift): self-host `woff2`, preload
the two faces used above the fold, `font-display: swap`, and metric-adjusted fallbacks via
`size-adjust` / `ascent-override` so the swap does not reflow. Fallbacks: display → Georgia, serif;
`Manrope` → system-ui, sans-serif.

**Follow-up**: the metric adjustments are tuned to Playfair Display and **must be re-tuned when TT
Ramillas lands**, or the swap will reintroduce the layout shift FR-014 forbids. Recorded so it is
not forgotten at the moment the real font arrives.

---

## R9. E-commerce plugin deferred — mock-frontend first

**Decision**: **Do not install `@payloadcms/plugin-ecommerce` in this spec.** Payload ships empty:
the scaffold's own collections only. The storefront renders from local mock fixtures.

**Rationale**: The owner's direction is to start from a mock frontend and set up collections when
they are actually needed. This restores the spec's original scope exactly as written — its
out-of-scope list already excluded "every content model and collection beyond what the scaffold
itself requires" — and it **removes the Principle IV deviation** that an earlier revision of this
plan had to justify in Complexity Tracking. One fewer deviation is a better plan.

It also avoids a decision made too early. Choosing the plugin now would commit spec 002's catalog to
its Products/Variants model before anything is known about how "Choose Your Diamond" and "Size"
actually behave on screen. Building the mock frontend first surfaces that shape, and the plugin
evaluation happens in spec 002 with real screens to judge against.

**Carried into spec 002 as a live decision** — findings retained from the plugin's documentation so
the research is not repeated:

- The plugin generates six collections: Products, Variants, Carts, Orders, Transactions, Addresses.
- A **payments adapter is optional**; the package can be used piecemeal for just Products and
  Variants — which matters because the MVP takes no payments.
- `collectionsOverrides` adds fields, access control, and hooks to any generated collection — the
  extension point diamond options and availability mode would use.
- Multi-currency creates one price field per currency; the MVP is single-currency.
- ⚠ **Model mismatch to resolve in spec 004**: the plugin's Orders are created *when transactions
  succeed*, and Transactions are payment records. The MVP has neither — an order is a *request*
  handed to WhatsApp or Telegram. Either the plugin's Orders are used with payment coupling
  disabled, or requests are a separate collection and the plugin covers only Products/Variants.

**Mock data contract**: fixtures live in `src/mocks/` behind the same shape the storefront will
eventually receive from Payload, so swapping the data source in spec 002 is a fetch-layer change
rather than a component rewrite.

**Alternatives considered**: Installing the plugin now (rejected by the owner, and it would
reintroduce a constitution deviation for no benefit while the frontend is mock-driven).

---

## R10. Storybook as the component workshop *(reverses an earlier decision)*

**Decision**: **Storybook** is the living style guide. There is no `/style-guide` route.

**Rationale**: An earlier revision of this research rejected Storybook — "a second build system, a
second component rendering context, and its own dependency surface, to render components the app can
already render" — and chose a route instead. The owner has since specified Storybook, and the
reasoning that changes the answer is the *workflow*, which the earlier analysis did not account for:
components arrive **one at a time**, each built and reviewed in isolation before anything consumes
it. That is the workflow Storybook is built for and the one a route serves worst — a route renders
finished components on a page; Storybook is a bench for building an unfinished one, with per-prop
controls, isolated viewports, and a story per state.

The complexity objection was not wrong, it was outweighed. Recorded rather than quietly reversed,
because the cost is real and is now accepted deliberately: a second build, a second config to keep on
brand, and a dependency surface that must be kept off the production bundle.

**How it satisfies the requirements**, which are written against a "living style guide" and not
against any particular mechanism:

| Requirement | Storybook implementation |
|---|---|
| FR-029 — render the full token set | A `Foundations` story group: palette, type scale, spacing, radii, shadows, breakpoints, each labelled with its token name |
| FR-030 — every primitive, every variant and state | One story per variant, plus explicit `disabled`, `loading`, and `focus-visible` stories. Controls cover the prop matrix |
| FR-031 — measured contrast per pairing | A `Foundations/Contrast` story rendering the permitted-pairings table with computed ratios |
| FR-032 — adding a primitive requires adding it to the guide | CI check: every file in `src/components/ui/` has a matching `*.stories.tsx` |
| FR-033 — not publicly discoverable | Storybook is not part of the Next build and is never deployed to the production domain. Stronger than the route's env-flag, which still shipped code |

**Additions to the plan**: Storybook config with the storefront's token stylesheet imported so
components render on-brand; the a11y addon wired so `pnpm test:a11y` covers stories, giving
per-component accessibility coverage the route approach could not; a viewport addon configured to
the project breakpoints. Storybook's own dependencies must stay in `devDependencies` and out of the
app bundle — verified by the existing bundle-size gate.

**Consequence for Story 4**: the layout shell is now the kit's *first* consumer in the app itself,
which sharpens rather than weakens it — Storybook proves components work in isolation, the shell
proves they compose.

---

## R11. Enforcement of the "no magic values" rules

**Decision**: Three CI checks, each mapping to a numbered requirement, each proven by a deliberate
violation before the spec is accepted (SC-010).

| Check | Enforces | Mechanism |
|---|---|---|
| No raw colour literals, no arbitrary font sizes, no arbitrary spacing | FR-010, FR-016, FR-018, SC-002 | Custom lint rule over `src/**`, allowlisting only the generated `tokens.css` |
| Every permitted pairing meets AA | FR-012, SC-003 | Script reading the pairings contract, computing ratios, non-zero exit on failure |
| Token output matches its source | R6 | Regenerate and diff against the committed `tokens.css` |

Tailwind v4 makes the first check tractable: because tokens generate utilities, correct code reads
`text-text-secondary`, and a raw `text-[#a7a5a3]` arbitrary-value bracket is a lint-visible pattern.

**Alternatives considered**: Review-only enforcement (rejected: Principle III says consistency is
enforced by the system, not by discipline, and reviewers miss hex codes).

---

## Resolved unknowns summary

| Unknown | Resolution |
|---|---|
| Database adapter | Postgres (R2) |
| Token definition mechanism | Tailwind v4 `@theme`, generated from Figma exports (R3, R6) |
| Admin/storefront CSS conflict | Split entry sheets, preflight excluded from admin (R4) |
| Palette accessibility | **`colors.json` is stale** — Figma is authoritative; `neutral/secondary` is `#343231`, and the constraint disappears (R5) |
| Missing type styles and mobile scale | Confirmed against Figma; mobile drops two steps, `clamp()` between observed endpoints (R7) |
| Fonts | Manrope (OFL, real); Playfair Display as placeholder serif until TT Ramillas is licensed (R8) |
| E-commerce plugin | **Deferred to spec 002.** Payload ships empty; storefront runs on mock fixtures (R9) |
| Style guide mechanism | **Storybook** (reverses an earlier decision), never deployed to production (R10) |
| Magic-value enforcement | Three CI checks, each proven by a deliberate violation (R11) |
