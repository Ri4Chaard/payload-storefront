# Contract: Design Tokens

**Feature**: `001-design-system-foundation` | **Date**: 2026-08-25

This is the authoritative list of tokens the system exposes. Every value is either **supplied**
(present in the Figma export, unchanged) or **derived** (not in the export; created to fill a gap
the requirements demand). Derived values are marked so the owner can review exactly what was
invented.

**No supplied colour is altered.** Where a brand colour cannot meet contrast on a given surface, the
resolution is to exclude that pairing from the permitted list — never to change the value.

⚠ **Source of truth is the Figma file** (`<figma-file-id>`), not `colors.json`. The export is
stale: it gives `neutral/secondary` as `#a7a5a3` where the live file says `#343231`, and it bakes
applied opacity into the border values. Tokens marked **unverified** below were absent from the three
main-page nodes and are carried from the export pending a re-read.

Generated into `src/styles/tokens.css` as a Tailwind v4 `@theme` block by
`scripts/build-tokens.ts`. **Never hand-edit the generated file.**

---

## Colour

| Token | Value | Provenance | Role |
|---|---|---|---|
| `--color-primary-default` | `#3b171a` | supplied | Primary brand; buttons, links, headings on light |
| `--color-primary-hover` | `#4f2b2e` | supplied ⚠ unverified | Primary hover state |
| `--color-primary-transparent` | `#3b171a33` | supplied ⚠ unverified | 20% primary; focus rings, subtle fills |
| `--color-neutral-primary` | `#050301` | supplied | Body text on light surfaces |
| `--color-neutral-secondary` | `#343231` | supplied (Figma) | Secondary text on light surfaces — 11.92:1 on `background/bg` |
| `--color-neutral-white` | `#ffffff` | supplied | Text and icons on dark surfaces |
| `--color-background-bg` | `#f8f7f6` | supplied | Page background |
| `--color-background-container` | `#ffffff` | supplied | Card and container surfaces |
| `--color-background-subtle` | `#dddddd` | supplied ⚠ unverified | Muted fills, dividers, disabled surfaces |
| `--color-background-base` | `#130000` | supplied | Dark inverse surface |
| ~~`--color-border-default`~~ | — | **not a token** | Figma stores `#000000` with 10% applied at use. Use Tailwind's `border-black/10` |
| `--color-border-subtle` | `#0000000d` | supplied ⚠ unverified | 5% black; hairlines |
| `--color-status-error-default` | `#f75959` | supplied (`colors.json`) | Error icons, borders, background wash, large text — **never body text on light** |
| `--color-status-error-transparent` | `#f759591a` | supplied (`colors.json`) | Error background wash |
| `--color-status-success-default` | `#2a8121` | supplied (`colors.json`) | Success text, icons, borders on light |
| `--color-status-success-transparent` | `#2a81211a` | supplied (`colors.json`) | Success background wash |

### Borders — deliberately not tokens

The export's `"border-#ffffff": "#ffffff14"` has a `#` inside its name, which is not a valid CSS
custom property identifier. **No token is defined.** The value is white at `0x14` = 20/255 =
**7.84% alpha**, which Tailwind expresses natively as **`border-white/8`** (8%) — a 0.16%
difference, imperceptible.

Reading the live file showed *why* this generalises: Figma stores `border/default` as `#000000` and
`border/#FFFFFF` as `#FFFFFF`, applying opacity at the use site. The export baked those opacities
into the values. Tailwind's opacity modifiers are the same mechanism, so both borders are built-ins:

| Design intent | Use |
|---|---|
| Default border — black at 10% | `border-black/10` |
| Inverse border — white at 8% | `border-white/8` |
### Permitted pairings

The CI contrast check validates **these declared pairings**, not every possible combination. A
combination absent from this table is not a failure — it is simply not permitted, and using one is a
review defect.

| Foreground | Background | Ratio | Minimum | Result |
|---|---|---:|---|---|
| `neutral-primary` | `background-bg` | 19.24 | 4.5 | ✅ |
| `neutral-primary` | `background-container` | 20.59 | 4.5 | ✅ |
| `neutral-primary` | `background-subtle` | 15.16 | 4.5 | ✅ |
| `primary-default` | `background-bg` | 14.83 | 4.5 | ✅ |
| `primary-default` | `background-container` | 15.87 | 4.5 | ✅ |
| `primary-default` | `background-subtle` | 11.68 | 4.5 | ✅ |
| `primary-hover` | `background-bg` | 11.43 | 4.5 | ✅ |
| `primary-hover` | `background-container` | 12.23 | 4.5 | ✅ |
| `neutral-white` | `background-base` | 20.43 | 4.5 | ✅ |
| `neutral-white` | `primary-default` | 15.87 | 4.5 | ✅ |
| `neutral-white` | `primary-hover` | 12.23 | 4.5 | ✅ |
| `neutral-secondary` | `background-bg` | 11.92 | 4.5 | ✅ |
| `neutral-secondary` | `background-container` | 12.75 | 4.5 | ✅ |
| `neutral-secondary` | `background-subtle` | 9.39 | 4.5 | ✅ |
| `status-success-default` | `background-bg` | 4.61 | 4.5 | ✅ |
| `status-success-default` | `background-container` | 4.93 | 4.5 | ✅ |
| `status-error-default` | `background-bg` | 3.01 | 3.0 (icons/borders only) | ✅ |
| `neutral-white` at 60% | `background-base` | 7.33 | 4.5 | ✅ |
| `status-error-default` | `background-container` | 3.22 | 3.0 (icons/borders only) | ✅ |
| `status-error-default` | `background-bg` | 3.01 | 3.0 (icons/borders only) | ✅ |

### Forbidden pairings — recorded so they are not rediscovered

| Foreground | Background | Ratio | Why |
|---|---|---:|---|
| `neutral-secondary` | `background-base` | 1.60 | Dark on dark. Use `neutral-white` on dark surfaces. |
| `status-error-default` `#f75959` | any light surface, body text | 2.37–3.22 | Fails AA body. Icons, borders, and wash only. |
| `status-success-default` `#2a8121` | `background-subtle` | 3.63 | Fails AA body; large text only. |
| `status-success-default` `#2a8121` | `background-base` | 4.15 | Fails AA body on dark; large text only. |
| `neutral-white` at 20% | `background-base` | 1.71 | **A failure present in the current design** — see research.md R5. |

### Accepted accessibility exceptions

Two pairings in the design fall below WCAG 2.2 AA and are **kept as designed** by owner decision.
They are allowlisted in `scripts/check-contrast.ts`, each with a written reason, so the gate still
blocks any *new* undeclared failure. They are exceptions of record, not silent violations — the
Governance section's documented-deviation requirement.

| Pairing | Ratio | Required | Reason accepted |
|---|---:|---:|---|
| `status-success-default` `#2a8121` on `background-base` | 4.15 | 4.5 | Footer newsletter success text. Owner elected to keep the palette and the design as drawn. |
| `neutral-white` at 20% on `background-base` | 1.71 | 4.5 | Footer unsubscribe note. Decorative-weight text; owner elected to keep the design as drawn. |

Both are in the footer. Revisiting either is an opacity or colour change, not a redesign.

### Status colours — owner decision to keep the `colors.json` values

The live Figma file uses different status colours (`#ff3b30` error, `#4cd964` success, wash at 20%).
**These are recorded but deliberately not adopted** — the owner has chosen to keep the export's
values. Recorded here so the divergence is a known decision rather than a discrepancy someone
rediscovers later.

Two consequences of the retained values:

- **Error text cannot be red on light surfaces.** `#f75959` is 3.01:1 on the page background — fine
  for an icon or a border, failing for body-size text. `InlineMessage variant="error"` and every
  form error render their **text in `neutral-primary`**, with the red carried by the icon, the
  border, and the `status-error-transparent` wash. The red still signals; it is simply not the thing
  being read.
- **Success text cannot be body-size on the dark footer.** `#2a8121` is 4.15:1 on `background/base`
  — large text only. The footer newsletter success block will need large text, a lighter green, or
  text in `neutral-white` with green confined to the wash and icon. Resolve when the footer is
  built in Story 4.

---

## Typography

Two families. `TT Ramillas` carries the uppercase display and heading scale; `Manrope` carries all
body, label, and caption text.

**Family tokens**: `--font-display` and `--font-body`. No component ever names a family directly,
which is what makes the licensed-font swap a one-line change.

| Token | Family | Size (mobile → desktop) | Line height | Weight | Transform | Provenance |
|---|---|---|---:|---:|---|---|
| `display` | `--font-display` | 28px → 36px | 1.4 | 500 | uppercase | supplied as `h1`; fluid range derived |
| `heading-1` | `--font-display` | 24px → 30px | 1.4 | 500 | uppercase | supplied as `h2`; fluid range derived |
| `heading-2` | `--font-display` | 20px → 24px | 1.4 | 500 | uppercase | supplied as `h3`; fluid range derived |
| `heading-3` | `--font-display` | 18px → 20px | 1.4 | 500 | uppercase | supplied as `h4`; fluid range derived |
| `heading-4` | `--font-display` | 16px → 18px | 1.4 | 500 | uppercase | **derived** — serif scale stopped at 20px |
| `body-base` | `--font-body` | 16px | 1.6 | 400 | — | **derived** — export has 500 and 700 at 16px but no regular; this is the most-used style on the site |
| `body-medium` | `--font-body` | 16px | 1.6 | 500 | — | supplied as `h3-medium` |
| `body-strong` | `--font-body` | 16px | 1.6 | 700 | — | supplied as `h3-bold` |
| `body-small` | `--font-body` | 14px | 1.38 | 400 | — | supplied as `h-h` |
| `label` | `--font-body` | 14px | 1.38 | 600 | — | supplied as `h-2` |
| `caption` | `--font-body` | 12px | 1.4 | 400 | — | **derived** — required by FR-015, absent from export |
| `eyebrow` | `--font-body` | 18px | 1.3 | 700 | uppercase | **derived from usage** — the footer section title; approved addition |
| `heading-sans` | `--font-body` | 22px | 1.25 | 700 | — | **derived from usage** — sans heading; approved addition |

**Sizes that snap to the scale.** The design uses six sizes with no token. Two became tokens above;
the rest round to the nearest existing step rather than expanding the scale further:

| Design usage | Snaps to |
|---|---|
| Manrope SemiBold 15 / 1.5 | `body-medium` (16 / 1.6 / 500) |
| Manrope Regular 13 / 1.6 | `body-small` (14 / 1.38 / 400) |
| Manrope Medium 12 / normal | `caption` |
| Manrope Regular 11 / 1.5 | `caption` |

Weights snap along with sizes. This keeps the scale small at the cost of sub-pixel fidelity to the
current comps — a deliberate trade, approved by the owner.

**Renaming rationale**: the export's names describe Figma layer organisation, not typographic role
— `h3-medium` is 16px Manrope body text, and `h-h` / `h-2` are 14px. Carrying those names into code
would put `text-h3-medium` on paragraphs. The mapping is recorded in `design/tokens/mapping.ts`.

**Fluidity**: sizes interpolate with `clamp()` between the 375px and 1280px viewports, so FR-017 is
satisfied with no per-component breakpoint overrides anywhere.

**Families**: `--font-display` is **Playfair Display**, an explicit placeholder until the TT
Ramillas licence is purchased. `--font-body` is **Manrope** — the real brand face, OFL-licensed.

**Fallbacks** (FR-014): display → Georgia, serif. `Manrope` → system-ui, sans-serif. Both declared
with `size-adjust` and `ascent-override` so the swap does not shift layout. ⚠ **These adjustments
are tuned to Playfair Display and must be re-tuned when TT Ramillas lands**, or the swap
reintroduces the layout shift FR-014 forbids.

---

## Spacing

The export's `spacing` block is `{"18": "18px", "button": "16px", "default": "0px", "number":
"0px"}` — two zero-valued Figma artefacts and two isolated values, which is not the scale FR-018
requires.

**Decision**: adopt Tailwind v4's default 4px-based scale as the system scale (`--spacing: 0.25rem`,
yielding `p-1` = 4px through `p-24` = 96px), and carry the two meaningful brand values forward as
named exceptions.

| Token | Value | Provenance |
|---|---|---|
| system scale | 4px base | **derived** — Tailwind v4 default |
| `--spacing-brand-18` | `18px` | supplied |
| `--spacing-button` | `16px` | supplied — button internal padding |

The two zero-valued entries (`default`, `number`) are dropped: a zero-valued named spacing token
carries no meaning, and `0` is already expressible.

---

## Radii, borders, elevation, motion

Not present in either export. All **derived**, and flagged for owner review — these are the tokens
most likely to need adjustment once real screens exist.

| Token | Value | Notes |
|---|---|---|
| `--radius-none` / `-sm` / `-md` / `-lg` / `-full` | `0` / `2px` / `4px` / `8px` / `9999px` | Restrained, appropriate to the serif brand |
| `--border-width-hairline` / `-default` | `1px` / `2px` | |
| `--shadow-sm` / `-md` / `-lg` | low-opacity neutral | Deliberately subtle; the palette is warm and low-contrast |
| `--duration-fast` / `-base` / `-slow` | `120ms` / `200ms` / `320ms` | |
| `--ease-standard` / `-emphasized` | `cubic-bezier(.2,0,0,1)` / `cubic-bezier(.3,0,0,1)` | |

All motion is suppressed under `prefers-reduced-motion: reduce` globally (FR-021).

---

## Breakpoints

**Derived** — absent from the exports.

| Token | Value |
|---|---|
| `--breakpoint-sm` | `640px` |
| `--breakpoint-md` | `768px` |
| `--breakpoint-lg` | `1024px` |
| `--breakpoint-xl` | `1280px` |

Page container: fluid with gutters below `lg`, capped at `1280px` above. No page scrolls
horizontally at any width from 320px up (FR-020).

---

## Contract guarantees

1. **No supplied colour value is ever altered.** Accessibility is enforced by the permitted-pairings
   list, not by adjusting the brand.
2. `src/styles/tokens.css` is **generated**. A CI check regenerates it and fails if the committed
   output differs from the source plus mapping.
3. Every token in this contract appears in Storybook's `Foundations` stories with its name and
   value (FR-029).
4. Every permitted pairing above is verified in CI on every pull request (FR-012, SC-003).
5. No colour literal, font size, or spacing value appears anywhere in `src/**` outside
   `tokens.css` — enforced by lint (FR-010, FR-016, FR-018, SC-002).
6. Changing one value in `colors.json` or `mapping.ts` and regenerating propagates everywhere, with
   no other file edited (FR-011, SC-001).
