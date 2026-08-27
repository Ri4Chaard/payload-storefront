# Contract: UI Kit Primitives

**Feature**: `001-design-system-foundation` | **Date**: 2026-08-25

The primitives required by FR-022, with their public APIs. This is the vocabulary spec 002
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
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'inverse' \| 'inverse-outline'` | `'primary'` | Last two are for dark surfaces only |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Internal padding uses `--spacing-button` |
| `loading` | `boolean` | `false` | Shows spinner, sets `aria-busy`, blocks activation |
| `disabled` | `boolean` | `false` | |
| `fullWidth` | `boolean` | `false` | |
| `iconStart` / `iconEnd` | `ReactNode` | — | |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | |

Renders `<button>`. A button that navigates is a `Link`, not a `Button` — the distinction is
semantic and matters for keyboard and screen-reader behaviour.

The variant list was revised against Figma node 10:169, which draws five variants and none of them
destructive. `ghost` and `destructive` were speculative when this contract was written: the design
has no border-less button, and no destructive action has been designed. Neither is invented here —
when a destructive action is drawn, it is added as a variant, not as a second component.

`inverse` and `inverse-outline` assume a dark background and are unreadable without one. That is a
property of the design, not a defect, and it is why their stories render on `background-base`.

Only `md` (52px) is drawn. `sm` (44px) and `lg` (60px) are derived on the 4px scale and marked
provisional in the source; `sm` clears the 44x44 touch target rather than landing on 40px.

`hoverEffect` (`fill | slide | reveal`, default `fill`) carries the animated hovers from the
"Ховер эффекты" board (node 196:941). These are motion applied to an existing variant, not new
variants. The two are structurally opposite:

- `slide` (nodes 164:748, 158:708) — the variant's OWN fill travels out to the right, uncovering the
  outline beneath. The button is styled as what it becomes; the fill is re-applied as a moving panel.
- `reveal` (node 312:9907) — a circle in a CONTRASTING colour grows from the top edge until it
  floods the button. The button keeps its normal filled appearance and the circle arrives over it.

Both invert the label, and the label's transition is matched to the panel's so the two land
together. Defined for `primary`, `secondary` and `inverse`; any other pairing falls back to the
plain colour hover rather than inventing a motion nobody has drawn.

The label inversion must be written with `hover:`, never `group-hover:`. The latter compiles to
`.group:hover &` — a descendant selector — so on the element that carries `group` it matches
nothing. An earlier revision had exactly that: the rule was emitted, the class was present, and the
text silently never changed. `tests/stories/ui-kit.spec.ts` asserts the computed colour, which is
the only thing that catches it.

### `Link`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'inline' \| 'standalone' \| 'muted' \| 'inverse'` | `'inline'` | `inverse` is for dark surfaces |
| `href` | `string` | required | |
| `external` | `boolean` | inferred | Adds `rel="noopener noreferrer"` and a visually-hidden "opens in new tab" |

Only `inline` is underlined at rest, and deliberately so. Inside a paragraph, colour alone is not a
sufficient affordance — a link that is only "the maroon words" is invisible to anyone who cannot
separate it from the text around it. In a footer column or a nav row the links are identifiable by
position, so the rule that grows on hover (node 312:8748) is decoration rather than the only signal.

### `Breadcrumbs`

`items: { label, href? }[]`. The trail from the header's breadcrumb bar (nodes 327:7076, 440:12427,
440:13420).

The design draws seven equal `<p>` elements — four labels and three slashes. That is a picture of a
breadcrumb, not a breadcrumb. Here it is an ordered list inside a labelled `nav`, the last item
`aria-current="page"` and unlinked, and the separators `aria-hidden`: a screen reader should hear
the trail, not "text slash text slash text".

### `Menu`

`label`, `trigger`, `align`, plus `MenuOption` children. A trigger and a popover list, from the
language switcher at node 337:8233.

The design draws only the open panel, so the behaviour comes from the WAI-ARIA menu button pattern
rather than from invention: `Escape` closes and returns focus to the trigger, arrows move and wrap,
`Home`/`End` jump, `Tab` closes, a pointer press outside closes. Focus is deliberately NOT trapped —
this is a menu, not a dialog.

`Menu` sets `role="menuitem"` on its children, which is why `MenuOption` asserts no role of its own.
Leaving it to callers is how half of them end up without it.

### `NavLink`

`href`, `current`. The primary navigation item from node 135:204 — 70px tall, uppercase, taking a
2px `primary-default` rule on hover.

The rule exists at rest as a TRANSPARENT border. Adding a border on hover would grow the element and
nudge every sibling sideways; Figma compensates with 2px of top padding on the hover variant, which
is the same fix expressed as a second state.

`current` is separate from hover and sets `aria-current="page"`. They look alike, but a screen
reader has no hover — the current page has to be announced, not merely shaded.

### `IconButton`

`icon` (an `IconName`), `label` (**required**), `variant` (`filled | outline | bare | social`),
`size`, `hoverEffect` (`none | slide`).

Drawn across four nodes: `filled` 144:908, `outline` 144:1045, `bare` 258:3981, `social` 312:9301.

`label` has no visually-hidden escape hatch. An icon-only control with no accessible name is the
most common way a keyboard or screen-reader user hits a dead end, and it is invisible in review
because the button looks fine.

`hoverEffect` accepts `none | slide | reveal`. `slide` reproduces node 144:1045: two glyphs on a
track, one leaving as the other arrives, because the design shows both on screen at once
mid-transition. `reveal` is the `Button` mechanic on a round control — a disc grows from the top
edge and floods it while the glyph inverts — and is what the footer's social marks use.

`social` carries a `white/30` hairline ring at rest. That value was measured off the design rather
than guessed: the exported mark composites to `rgb(89, 76, 76)` over `background-base`, which is
white at 30% — the same value as the newsletter field beside it.

`badge` and an animated `hoverEffect` do not combine: the clipping that keeps the fill inside the
control also cuts the corner off the badge.

`badge` pins a count to the top-right corner (node 355:6868). It renders `aria-hidden`, so the count
MUST also appear in `label` — "Cart, 2 items", not "Cart". A badge left in the accessibility tree
announces as a bare number after the button's name, which says nothing about what is being counted.

The design draws `filled` at 48px and both `outline` and `social` at 50px. Two pixels between three
sibling controls reads as drift, so they are normalised onto one scale — worth confirming.

### `Chip`

`selected`, plus the native button props. A small selectable pill (node 255:2983).

Figma draws the unselected state as a frame and the selected state as a button; both render
`<button>` here, because both must be reachable and operable. Selection is exposed with
`aria-pressed` — the two states differ only by fill and text colour, which is exactly the kind of
distinction that does not survive a screen reader.

Deliberately NOT `Badge`. A badge is a non-interactive label; this is a toggle. Merging them would
give the kit one component with a `clickable` prop, which is how a primitive stops being one.

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
`placeholder`, `iconStart`, `iconEnd`, `trailing`, plus the shared wrapper props.

Six states are drawn at node 196:1344: normal, hover, focus, filled, error, error-with-message. Two
departures from the drawing, both deliberate:

1. **It has a label.** Every drawn state is placeholder-only. A placeholder is not a label: it
   vanishes the moment someone types, it is not announced as a name by every screen reader, and it
   leaves a half-filled form with no way to tell what any box was for. `hideLabel` exists where the
   surrounding layout genuinely supplies the name.
2. **The placeholder is `neutral-secondary` #343231, not the #a7a5a3 in the drawing.** That lighter
   grey is 2.29:1 on white — the stale colours.json value the token module already corrects, and
   placeholder text is text.

The focus ring is on the BOX, not the input, so the indicator traces the control a person sees.

The drawn 341px width is dropped per FR-025.

### `Textarea`

`rows`, `maxLength`, `autoResize`, plus the shared wrapper props.

### `Select`

`options: { value, label, disabled? }[]`, `value`, `onChange`, `placeholder`, plus the shared
wrapper props. Native `<select>` — a custom listbox is not justified at this stage and would cost
keyboard and mobile behaviour that comes free.

### `Checkbox` / `Radio`

`checked`, `onChange`, `value`, `name`, `shape` (`square | round`, checkbox only), `indeterminate`
(checkbox only), plus the shared wrapper props. `RadioGroup` wraps radios with a `fieldset` and
`legend`.

`shape="round"` IS the component the design calls "Multiselectable" (Figma node 10:198). It differs
from the square checkbox (node 10:194) only in border radius and border opacity, so it is a prop
rather than a sibling component — a near-duplicate here would be exactly the Principle II violation
this contract exists to prevent. Semantics are unchanged: both are checkboxes, because
"multiselectable" describes checkbox behaviour.

Two open design questions, raised rather than silently resolved: a round control that permits
multiple selection reads as "pick one" to most people, and it will be visually near-identical to
`Radio`. `indeterminate` is deferred until a visual for it exists — the design draws two states.

### `MenuOption`

`meta`, `selected`, plus the native button props. A row in a menu or dropdown (node 301:5920) — a
label with optional trailing metadata, shading on hover.

The design draws one row with a rule on both edges; stacked, that renders every internal boundary at
2px. Here the rule is on the bottom edge with the first row taking a top edge, which is what the
drawing looks like once there is more than one.

No `role="option"`: that role is only valid inside a `listbox`, and asserting it here would make the
markup invalid the moment this is used in a plain menu. The owning container decides the pattern.

### `ScrollArea`

`orientation`, `label`, plus the native div props. A scroll container with the brand scrollbar
(node 301:5934).

**Styles the native scrollbar rather than reimplementing one.** The 6px thumb and its colour are
reproducible in CSS; the two 5px carets are not portably. Rebuilding the scrollbar in JavaScript to
recover them would cost keyboard scrolling, trackpad momentum, the platform's overlay-scrollbar
behaviour, and every assistive technology that understands a native scroll container. The carets are
dropped and the trade recorded rather than made silently.

### `Switch`

`checked`, `onChange`, `name`, `label` (required), `hideLabel`, `disabled`.

Renders `<input type="checkbox" role="switch">` — on/off to a screen reader, with native form
participation and Space-key handling that a `<div role="switch">` would have to reimplement.

Not in the original eighteen; added from Figma node 10:202. A `Switch` sets a state immediately, a
`Checkbox` marks an intention to be submitted — they are not interchangeable and the design uses
both.

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

The name union is generated from `src/assets/icons` by `pnpm build:icons`, so a typo is a type error
rather than a blank square in production, and adding an icon is dropping in an SVG and re-running.

The set is not optically uniform: viewBoxes are 14, 20 and 24 across six source libraries, so two
icons at one `size` will not read at one weight. The wrapper normalises the box; matching the
strokes needs a designer.

There is no warning or alert glyph, which is why the error state in `Field` currently has no icon to
put the red on.

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


---

## Shell

Layout components live in `src/components/layout/` and are NOT part of the kit. They are its first
consumer — the composition test Storybook cannot perform.

### `Header`

`navItems`, `breadcrumbs`, `cartCount`, `locales`.

**The five Figma variants at node 327:7956 are three breakpoints, not five components.** Figma has
to draw a frame per width; CSS does not, and five headers would guarantee drift:

| | height | gutter | contents |
|---|---|---|---|
| `< md` | 60px | 16px | hamburger, centred wordmark, cart, account |
| `md–xl` | 70px | 24px | as above plus the language switcher |
| `xl+` | 70px | 100px | wordmark left, navigation inline, no hamburger |

Variant3 (node 367:6506) is superseded. It drops the hamburger and the cart, keeps the language
switcher, and left-aligns the wordmark — so on a phone there is no route to the navigation or the
basket at all. The page reference at node 440:13435 shows the intended mobile header, and that is
what is built.

The wordmark is absolutely centred below `xl` and returns to the flow above it, which is what lets
one element sit centred between two unequal flanks at small widths and flush-left at large ones
without being rendered twice.

### `Footer`

`groups`, `legalLinks`, `social`, `year`.

**The three Figma variants at node 440:12864 are breakpoints, not components** — the same reasoning
as the header. A three-column grid with the brand spanning two rows produces the tablet layout
exactly; widening to five columns produces the desktop one.

Almost nothing in it is new. The column links are `Link variant="inverse"` — node 312:8748, built
for the header. SUBSCRIBE is `Button variant="inverse" hoverEffect="reveal"`, node 312:9907. The
social marks are `IconButton variant="social"`, node 312:9300. What looked like a large new surface
was mostly assembly, which is the outcome Principle II is for.

Reproduced as drawn but worth a designer's eye:

- The divider above the legal bar is `border-black/10` on a near-black surface, so it renders
  invisible. Everything else on that surface uses white-based hairlines. Left as drawn, because the
  rendered design shows no line either — "fixing" it would ADD something nobody approved.

The hover rule under footer links is WHITE, not the `primary-default` Figma draws (node 312:8748).
On `background-base` the maroon is barely distinguishable from the surface behind it, so the
affordance was invisible. Changed at the owner's direction.
- "CUSTOMER CARE" is set at 16px against 18px for the other three headings. Normalised to `eyebrow`.
- The drawn email address reads `hello@aurum.exampIe` — a capital I where "example" has an l. Corrected.
- Phone and email are links here, though the design sets them as plain text. A phone number a
  visitor cannot tap, on a shop's mobile site, is a lost enquiry. `inverse` keeps them looking
  exactly as drawn.

The GIA and IGI marks are third-party trademarks: they are NOT normalised to `currentColor` the way
our own icons are, and at 96KB between them they are served from `/public` rather than inlined.
`next/image` is deliberately not used — it has nothing to offer a fixed-size SVG and would require
opening `dangerouslyAllowSVG`.

### `Logo`, `MobileNav`, `LanguageSelector`

`Logo` writes the wordmark in sentence case and uppercases it in CSS — a screen reader given
"AURUM" may spell it out; given "Aurum" it says the name.

`MobileNav`'s open panel is **not designed**. Every header variant draws the closed state only, so
the panel is the plainest thing that works and should be replaced once there is a drawer to build.
Its behaviour is not improvised: `aria-expanded`/`aria-controls`, `Escape` closes and returns focus,
focus moves to the first link on open, outside press closes. Focus is not trapped — this is a
disclosure, not a dialog.

`LanguageSelector` composes `Menu` and `MenuOption` and is not wired to routing; locale is local
state until i18n lands.
