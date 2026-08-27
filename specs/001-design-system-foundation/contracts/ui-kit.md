# Contract: UI Kit Primitives

**Feature**: `001-design-system-foundation` | **Date**: 2026-08-25

The eighteen primitives required by FR-022, with their public APIs. This is the vocabulary spec 002
onward must compose from before creating anything new (Principle II).

**Rules that apply to every primitive without exception:**

- Variants are **props on one component**. A near-duplicate sibling component is a review rejection
  (FR-024). There is no `ButtonPrimary` — there is `Button variant="primary"`.
- Every interactive primitive implements **default, hover, focus-visible, active, disabled**, and
  **loading** where it can be pending (FR-023).
- No fixed pixel widths. Every primitive is responsive and fills or shrinks to its container
  (FR-025).
- All styling references tokens. No literal colours, sizes, or spacing (FR-010, FR-016, FR-018).
- Every primitive ships with a `*.stories.tsx` covering every variant and state, in the same change (FR-030, FR-032).
- **No domain concepts.** Nothing here knows about products, diamonds, sizes, carts, requests, or
  posts (FR-028, SC-009).

---

## Actions

### `Button`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'destructive'` | `'primary'` | |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Internal padding uses `--spacing-button` |
| `loading` | `boolean` | `false` | Shows spinner, sets `aria-busy`, blocks activation |
| `disabled` | `boolean` | `false` | |
| `fullWidth` | `boolean` | `false` | |
| `iconStart` / `iconEnd` | `ReactNode` | — | |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | |

Renders `<button>`. A button that navigates is a `Link`, not a `Button` — the distinction is
semantic and matters for keyboard and screen-reader behaviour.

### `Link`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'inline' \| 'standalone' \| 'muted'` | `'inline'` | |
| `href` | `string` | required | |
| `external` | `boolean` | inferred | Adds `rel="noopener noreferrer"` and a visually-hidden "opens in new tab" |

Underlined by default when `inline` — colour alone must never be the only affordance.

---

## Form controls

All form controls share a common wrapper contract: `label` (required — a control without a label is
a defect), `description`, `error`, `required`, `disabled`. The error is wired via
`aria-describedby` and `aria-invalid`.

**Error text renders in `neutral-primary`, not red.** `status-error-default` `#f75959` is 3.01:1 on
light surfaces — compliant for the icon and the border, not for body-size text. The red signals
through the icon, the border, and the `status-error-transparent` wash.

### `TextInput`

`type` (`text | email | tel | url | search | number`), `value`, `defaultValue`, `onChange`,
`placeholder`, `prefix`, `suffix`, plus the shared wrapper props.

Placeholder is never a substitute for a label.

### `Textarea`

`rows`, `maxLength`, `autoResize`, plus the shared wrapper props.

### `Select`

`options: { value, label, disabled? }[]`, `value`, `onChange`, `placeholder`, plus the shared
wrapper props. Native `<select>` — a custom listbox is not justified at this stage and would cost
keyboard and mobile behaviour that comes free.

### `Checkbox` / `Radio`

`checked`, `onChange`, `value`, `name`, `indeterminate` (checkbox only), plus the shared wrapper
props. `RadioGroup` wraps radios with a `fieldset` and `legend`.

---

## Typography

### `Heading`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `level` | `1 \| 2 \| 3 \| 4` | required | Semantic level — the actual `<h1>`–`<h4>` |
| `styleAs` | type token | matches `level` | Visual style, decoupled from semantics |
| `align` | `'start' \| 'center'` | `'start'` | |

Separating `level` from `styleAs` is what keeps heading hierarchy correct (FR-042) without forcing a
visual compromise — a page's `<h1>` can look like `heading-2` when the design calls for it.

### `Text`

`as` (`p | span | div`), `styleAs` (`body-base | body-medium | body-strong | body-small | label |
caption`), `color`, `align`, `truncate`.

`color` accepts `primary | secondary | success` on light surfaces and `inverse` on dark.
`secondary` is `#343231` at 11.92:1 — the live Figma value, not the stale `#a7a5a3` in `colors.json`.
The type signature encodes the permitted-pairings contract, so an inaccessible combination fails to
compile rather than failing in CI.

---

## Media

### `Image`

| Prop | Type | Notes |
|---|---|---|
| `src` | `string` | required |
| `alt` | `string` | **required** — no default, no optional escape. Decorative images pass `alt=""` explicitly |
| `width` / `height` | `number` | required unless `fill` |
| `fill` | `boolean` | |
| `sizes` | `string` | required when `fill` or responsive |
| `priority` | `boolean` | Above-the-fold only |
| `aspectRatio` | `string` | Reserves space; prevents CLS |

**The only way images enter the app** (FR-027). Enforces dimensions, responsive `sizes`, modern
formats, and alt text so CLS and payload budgets cannot be violated one component at a time.

### `Icon`

`name` (from a fixed set), `size` (`sm | md | lg`), `label`. Without `label` the icon renders
`aria-hidden`; with one it becomes an accessible graphic. Icons inherit `currentColor` — never a
hardcoded fill.

---

## Layout

### `Container`

`size` (`narrow | default | wide | full`), `as`. Applies max-width and responsive gutters. The only
place page width is decided.

### `Stack`

`direction` (`row | column`), `gap` (spacing token), `align`, `justify`, `wrap`. Flex layout with
token-only gaps.

### `Grid`

`columns` (responsive: `{ base, sm, md, lg }`), `gap`, `align`. Never a fixed column count without a
mobile value.

### `Divider`

`orientation` (`horizontal | vertical`), `spacing`. Uses `--color-border-default`.

---

## Feedback

### `Badge`

`variant` (`neutral | primary | success | error`), `size`. Non-interactive. If it needs a click, it
is a `Button`.

### `Spinner`

`size`, `label` (default "Loading"). Announces via `role="status"`. Respects reduced motion by
degrading to a static indicator.

### `Skeleton`

`variant` (`text | rect | circle`), `width`, `height`, `lines`. `aria-hidden`; the surrounding
region owns the live announcement. Pulse suppressed under reduced motion.

### `InlineMessage`

`variant` (`info | success | error`), `title`, `children`, `onDismiss`. Uses the `*-transparent`
wash for the background, the status colour for the icon and border, and `neutral-primary` for the
text. Error and success announce via `role="alert"` / `role="status"`.

---

## Deliberately excluded

Recorded so their absence reads as a decision rather than an oversight:

| Not built | Why |
|---|---|
| `Modal`, `Drawer`, `Tooltip`, `Popover` | Focus-trap and layering primitives with real accessibility complexity, and no consumer in this spec. Building them blind is exactly the guessing FR-028 exists to prevent. The mobile nav in Story 4 uses a disclosure pattern, not a drawer abstraction. |
| `Tabs`, `Accordion` | No consumer yet. The product detail page in spec 002 is the first plausible one. |
| `Table` | No tabular data until the admin order queue in spec 004, which lives in the Payload admin and uses Payload's own UI. |
| `Toast` | Requires a portal and a queue. `InlineMessage` covers every need in specs 001–002. |
| Anything domain-shaped | `ProductCard`, `PriceDisplay`, `DiamondSelector`, `CartLine` — all belong to specs 002 and 004, built **from** this kit. |

When spec 002 needs one of these, it adds it to the kit with a real consumer driving its API —
which is the point.
