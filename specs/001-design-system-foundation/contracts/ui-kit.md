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
| `href` | `string` | — | Renders `<a>` instead. Absolute hrefs get `rel` and a new tab |
| `as` | `'button' \| 'span'` | `'button'` | `span` draws the button without any interactivity |

Renders `<button>`. A button that navigates is a `Link`, not a `Button` — the distinction is
semantic and matters for keyboard and screen-reader behaviour.

`href` is how that rule is kept when a navigation is DRAWN as a filled button, which the design does
often — `CategoryCard`'s call to action (node 138:492) is one. It renders an `<a>` with the button's
appearance, the same arrangement `IconButton` already uses, rather than a `<button>` with an
`onClick` that calls the router. `loading` and `disabled` have no anchor equivalent: an `<a>` has no
`disabled` attribute and `aria-disabled` leaves it followable, so a control that must be disabled
should not be a link at all.

`as="span"` exists for one shape: a whole tile that is a single link, where the drawn button is the
affordance inside it. A `<button>` or an `<a>` nested in a link is invalid markup and gives a screen
reader two controls where the visitor sees one, and duplicating the variant, size and hover styling
in the consumer is how a design system stops being one. It must never be used for something
clickable — a span has no role, no keyboard activation and no focus.

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

The reveal disc must be at least **224% of a square control's width**. From a centre on the top
edge the far bottom corner is `hypot(w/2, h)` away — 54px on a 48px button — so a narrower disc
leaves the bottom bare. The glyph's inversion is held back by one `duration-base` so it flips as the
disc arrives rather than fading behind it, and the control needs `isolate`: the disc sits at
`-z-10`, and `relative` alone opens no stacking context, so without it the disc paints behind the
nearest ancestor that has one.

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
   placeholder text is text. (`SearchField` keeps the drawn grey under `neutral-placeholder`, at the
   owner's direction and as an accepted exception. This one does not: a form box is not a display-
   sized search line, and the exception was granted for the latter.)

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

### `SearchField`

`label` (required, visually hidden), `onClear`, `placeholder`, plus the native input props.

Node 255:3167 — a display-sized serif line over a 2px rule, with a clear affordance once something
has been typed. Deliberately NOT a `TextInput` variant: it shares no chrome with one, and a `search`
flag on a bordered box would be a second component wearing the first one's props.

Three things in the drawing are descriptions of browser behaviour rather than component parts:

- The 2px maroon bar at x=0 in "default" and x=90 in "active" is the text caret. It is `caret-color`
  here. Reproducing it as an element would put a second bar beside the real one, and it could never
  track the insertion point.
- The placeholder is not the label. It vanishes the moment anyone types, taking the field's only
  description with it, so the label is visually hidden rather than absent.
- The placeholder is `neutral-placeholder` — the light grey the design draws, which is
  `colors.json`'s value for neutral/secondary rather than the `#343231` the rest of the kit uses.
  It is 2.29:1 on the page ground, below even the 3:1 large-text threshold, and is an accepted
  exception of record at the owner's direction. The visually hidden label is what keeps that
  defensible: the placeholder is a hint, not the only description of the control.

The rule is `neutral-primary` at rest and `primary-default` on focus. The drawing shows the same
rule in both frames, which would leave a keyboard visitor nothing but the caret to say where they
are — and the global focus ring is wrong here, because it draws a rectangle around a control whose
entire design is one line. Escape clears the field, and clearing returns focus to the input.

### `QuantityStepper`

`value`, `onChange`, `min`, `max`, `label`, `disabled`.

Node 255:3545 — two 52px squares either side of a count. Drawn only inside the cart, but a
primitive: the product page needs the same control before anything reaches a basket, and a stepper
that lives inside a cart row is one somebody rebuilds.

**Not an `<input type="number">`.** The design draws a plain count, and a number input at 30px wide
brings native spinners to hide, a keyboard that accepts `-1e5`, and a value that can be typed empty.
What it gains — typing 12 rather than pressing plus eleven times — matters for a stock system, not
for jewellery bought one at a time. `max` is what stops the count exceeding what is available, and
both ends are held by disabling the button rather than clamping silently.

The count is a live region: pressing a button that changes a number elsewhere announces nothing on
its own. `label` names what is being counted, because a basket of three rows otherwise offers three
identical "Increase quantity" buttons — unusable by voice or screen reader, and perfect on screen.

Both buttons are `IconButton variant="bare"` with the drawn box on top. `outline` is closer at a
glance and wrong underneath: it carries a shadow and a lighter hairline that would need overriding
away, and four overrides fighting a variant means it is the wrong variant.

---

## Content

### `CategoryCard`

`title`, `href`, `image`, `cta`, `headingLevel`, `sizes`, `scrim`.

Node 138:509 — a photograph with the collection name at the top and a white call to action at the
bottom. Figma's "Default" and "Hover" frames are one component: the only difference is the crop,
which draws the image at 120% width offset up and left. That is a zoom on the photograph, so it is
`scale` on the image rather than a second layout.

**The tile changes shape, not just size** (added in spec 002, node 255:3353). The home page draws
it at 415x480, then 478x350, then 174x242 — portrait, LANDSCAPE, portrait. So the proportion is
responsive (`aspect-87/121 md:aspect-239/175 xl:aspect-83/96`) rather than fixed, and it lives in
the component rather than in a prop: a prop cannot change at a breakpoint without rendering the card
twice. **A caller who needs a different proportion passes `aspect-*` through `className`**, which
`tailwind-merge` resolves over all three defaults at once — there is a story for it.

The title needed no breakpoint work. The design steps it 30 → 30 → 20 and `text-heading-1` is
already a clamp from 20 to 30, hitting both endpoints exactly. It reads 27px rather than 30px at the
1024 frame, which is the fluid scale doing its job; `md:` overrides on top of a clamp would be two
systems arguing over one number.

**The compact call to action is a recorded deviation from the drawing.** Below `md` it spans the
tile, as drawn — but the drawn 14px does not fit. 174px wide with a 16px inset leaves 142px, and
"VIEW COLLECTION" sets to 140px at 14px in Manrope before any padding at all; the design renders
roughly 127px for the same string, which is why it fits there. `Button` is `whitespace-nowrap`, so
at the drawn size the label leaves the card. The compact frame therefore takes one further type step
down, to `caption`, with a 10px inset — landing the label at 120px inside 142px, which reproduces
the drawing's "label nearly fills the button" proportion. That proportion is the part that carries
intent; the 14px is the part that does not survive contact with the real typeface. Flagged for the
designer.

**The card IS the link.** The drawing shows a button inside a clickable tile, which as markup is a
control inside a control — invalid, and it gives a screen reader two things to announce where the
visitor sees one. The root element is the anchor and the drawn button is a `Button as="span"`: the
same variant, size and hover machinery, none of the interactivity.

An earlier revision inverted that — the CTA was the anchor, stretched over the card with
`after:inset-0`, and the card was an `<article>`. That cannot survive the `slide` hover, because
`slide` makes the button `overflow-hidden`: the stretched overlay is clipped back to the button and
the rest of the tile stops being clickable. (It also required `static` on the CTA, since
`after:inset-0` resolves against the nearest POSITIONED ancestor and `Button` sets `relative` for
its panels.) Making the card the anchor removes both problems at once.

The heading stays a heading inside the anchor — `<a>` may contain flow content, only interactive
content is forbidden — so a page of these still produces a real outline.

**The card's group is NAMED** (`group/card`). `Button` uses the unnamed `group` for its own hover,
and an unnamed group on the card captures it: the fill travels away whenever the pointer enters the
tile anywhere, while the label — which `Button` colours with plain `hover:` — stays dark. Dark text
on a photograph for as long as the pointer is over the card but not the button.

`image.alt` defaults to empty and should usually stay that way. The card is one link, so anything in
`alt` is announced ahead of the title: "a ring on dark velvet, Rings, view the collection" for a
tile whose meaning is "Rings". Inside a link carrying its own text, the picture is decoration.

**The scrim is not in the drawing.** The drawn photograph is a near-black velvet and white text sits
on it comfortably. `src` comes from the CMS, so the next photograph may be a pale one — and
white-on-pale is a 1.4.3 failure no automated check catches, because axe cannot measure text over an
image. `scrim={false}` opts out when the image is known.

It is in the kit rather than in spec 002 despite the exclusion of domain-shaped components below,
because its vocabulary is not domain vocabulary: a title, a link and a picture. A `ProductCard` —
price, availability, a basket action — still belongs to spec 002.

### `FeatureCard` / `FeatureStrip`

`FeatureCard`: `icon`, `title`, `description`, `as` (`li | div`).
`FeatureStrip`: `items`, `label`.

The service-promise cards from node 440:12774 — a glyph, a heading and a line of copy on a white
panel. Three drawn variants, three breakpoints:

| Figma | | |
|---|---|---|
| Default (355:7774) | four across, 100px gutter | 290px tall, 50px glyph |
| Variant2 (440:12775) | 2x2 grid, 24px gutter | 260px tall, 50px glyph |
| Variant3 (440:13717) | 250px cards that do not shrink, 16px gutter | 190px tall, 30px glyph |

**Variant3 is a horizontal scroller, and the drawing says so without saying so.** Four 250px cards
that do not shrink, in a row inside a 390px frame, can only be read by scrolling sideways. That is
why `FeatureStrip` is built on `ScrollArea` rather than on a stack.

`ScrollArea` brings `tabIndex={0}`, which is what keeps the phone layout reachable — a region that
scrolls and cannot be focused is `scrollable-region-focusable`, and these cards hold nothing
focusable of their own to rescue it. The cost is one tab stop above `md`, where the grid no longer
overflows. That is cheaper than rendering the cards twice to avoid it.

**Heights are `min-h`, not `h`.** The drawn heights are what four short strings happen to need — the
fourth card's copy is already nearly twice the first's — and a fixed height clips the first
translation that runs long. Flex and grid equalise the row anyway, so the drawn height is a floor.

The copy drops from 16px medium to 14px regular below `md` (`H/H` in the drawing), which is the one
place these are not simply the same card at three sizes.

The glyphs are decoration: the heading beside each says the same thing in words, and a named glyph
would make a screen reader say it twice.

### `Accordion` / `AccordionItem`

`Accordion`: `items` (`{ id, title, content, icon, disabled }[]`), `icon`, `single`, `defaultOpen`,
`headingLevel`.
`AccordionItem`: `title`, `icon`, `open` / `onToggle` or `defaultOpen`, `headingLevel`, `disabled`.

Figma calls this "item info" (node 242:2382) — the product page's description, delivery and warranty
stack. Filed under `Accordion` because that is what someone will search for; a kit component under a
name nobody looks up gets rebuilt (Constitution II).

Its three variants are two states and a hover:

| Figma | |
|---|---|
| `off` (242:2380) | collapsed — trailing plus, hairline rule |
| `on` (242:2381) | expanded — trailing minus, description below |
| `Variant3` (301:5400) | identical to `off` except the rule is `primary-default` |

Variant3 differs in one property, so it is the hover rather than a third row. It is applied to focus
as well, so a keyboard visitor gets the signal a pointer does.

**The description is not inside the button.** Figma exports the whole row as one `<button>`, which
would put a paragraph of copy into the control's accessible name. The header is the button; the
panel is a region it owns through `aria-controls`.

The panel stays in the DOM and collapses with a `0fr → 1fr` grid row — height cannot be transitioned
from `auto`, and the alternatives either need JavaScript to be correct or clip long copy. The inner
wrapper is `hidden` when closed, which is what keeps the collapsed copy out of the accessibility
tree rather than merely clipped.

The leading glyph is the `minus` dash in every state, as drawn: decoration, not the expand control.
`icon` swaps it — a row whose subject has a glyph reads better with that glyph than with three
identical dashes — and `icon={null}` drops it. It stays unlabelled whatever it is, because a
meaningful icon beside its own label makes a screen reader say the same thing twice.
The trailing glyph carries no label, because `aria-expanded` already says the state and naming the
icon on top of it makes a screen reader say it twice in two vocabularies.

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

### `Carousel`

`items`, `label`, `prevLabel`, `nextLabel`, `wrap`, `controls` (`always | hover`), `itemClassName`,
`trackClassName`, `arrowClassName`.

Added in spec 002 by extraction, not by invention. `ImageCarousel` owned a scroll-snap track; the
home page's jewelry row needed the same mechanism over cards instead of photographs. Two copies of
that logic is the near-duplicate Constitution II forbids, so the mechanism moved here and
`ImageCarousel` became its first caller.

**Two paging modes, because the callers mean different things by "the end".**

- **`wrap`** — three photographs of one product. Stopping dead on the third reads as broken, and the
  arrows are the only affordance saying there are more. Both arrows are always present.
- **clamped** (the default) — a row of products. Wrapping from the last piece back to the first
  leaves a visitor unable to tell whether they have seen everything. The arrows stop, and each one
  is **absent** — not disabled — when there is nothing on its side.

The clamped mode is also the answer to "an arrow that pages to nothing": with four cards in a row
that fits four, neither arrow ever renders. That is precisely what the home page draws, where the
desktop frame parks its scroll control at `hidden`.

**Reach is measured, not assumed** — whether a track overflows depends on the viewport, the item
count and the font, none of them known at build time. A `scroll` listener and a `ResizeObserver`
keep it current. The consequence is that clamped arrows are absent until the effect runs, which is
also the correct no-JavaScript behaviour: an arrow that cannot page is worse than no arrow.

Reduced motion is honoured in both places it can be expressed — `motion-reduce:scroll-auto` on the
track, and a `matchMedia` check before `scrollTo`, because a JS `behavior` overrides the CSS
declaration and would otherwise animate anyway.

The track is a labelled `<ul>`, so it takes the `list` role rather than `region`. `ScrollArea` is
the component that exposes `region`; a test looking for one here will not find it.

### `ImageCarousel`

`images`, `label`, `controls` (`always | hover`), `sizes`, `priority`.

The image strip inside a product card (node 144:948) — arrows at the edges of the photograph,
appearing on hover.

**No carousel library.** The brief proposed PhotoSwipe, with Swiper as the fallback. Neither fits:

- **PhotoSwipe is a fullscreen lightbox.** Its whole design is taking over the viewport — it sets
  body styles, traps focus, and brings its own chrome. Driving it inline means fighting every one of
  those. It is the right tool for the product page's zoom and should be added there; this is not
  that.
- **Swiper is a real carousel**, but it is ~150KB of JavaScript to move between three photographs,
  and a listing grid renders twenty of these at once.

A scroll-snap track gives native touch swipe, native momentum and native keyboard scrolling, and
still works with JavaScript disabled — the arrows stop, the strip still scrolls. `scrollTo` is the
entire runtime cost.

Since spec 002 this is a thin caller of `Carousel`, and it no longer carries `'use client'`: it is
pure markup, and the interactivity lives in the primitive. What stayed here is everything specific
to photographs of one product — `wrap`, square cells, and control names built from the product, so
that one card's arrows are distinguishable from the next card's in a listing of twenty.

The rules about `tabIndex`, the stacking context and positional keys moved to `Carousel` with the
mechanism. They still apply.

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
| `Tabs` | No consumer yet. `Accordion` was on this list for the same reason and came off it when node 242:2382 turned up — a drawn design is a consumer. |
| `Table` | No tabular data until the admin order queue in spec 004, which lives in the Payload admin and uses Payload's own UI. |
| `Toast` | Requires a portal and a queue. `InlineMessage` covers every need in specs 001–002. |
| Anything domain-shaped | `PriceDisplay`, `DiamondSelector` — belong to specs 002 and 004, built **from** this kit. `ProductCard` and `CartItem` were on this list until their designs arrived (nodes 144:947, 255:3556); they are built, and they live in `src/components/commerce/` rather than in the kit, for the reason the row gives. |

When spec 002 needs one of these, it adds it to the kit with a real consumer driving its API —
which is the point.


---

## Commerce

Commerce compositions live in `src/components/commerce/`. Like the shell below, they are consumers
of the kit rather than part of it: they know about products, prices and baskets, and the kit does
not.

### `ProductCard`

`name`, `price`, `href`, `images`, `size` (`default | compact`), `cta`, `onCtaClick`, `sizes`,
`priority`.

Node 144:947. Figma draws three variants; they are two sizes and a hover:

| Figma | |
|---|---|
| Default (144:946) | 415px wide, CTA drawn at `opacity: 0` |
| Variant2 (144:948) | the same card with the CTA visible and the carousel arrows showing |
| Variant3 (440:13588) | 174px wide, tighter gap, no CTA |

Default and Variant2 differ only in what is revealed, so they are one card and a hover. Variant3 is
a genuinely different size, so it is `size`.

**A hidden CTA is a trap in three directions, and each needs its own answer.** `opacity: 0` leaves a
control that is invisible, clickable and focusable:

| | |
|---|---|
| pointer | `group-hover`. A pointer over the button is a pointer over the card, so it can never be clicked while invisible. |
| keyboard | `group-focus-within`, or tabbing lands on something nobody can see. |
| touch | `pointer-coarse`, where there is no hover to reveal it at all — the one that would have shipped as "the button does not exist on phones". |

**The card is one link with two escape hatches.** The title anchor stretches over the whole tile with
`after:inset-0`; the carousel arrows and the CTA lift above it with `z-10`. That is what lets the
photograph be clickable without nesting the arrows and the button inside an anchor, which would be
invalid markup and would give a screen reader three controls for one tile.

The title is a plain anchor rather than `Link`, which is `relative` for the rule it grows on hover —
a positioned title would capture `after:inset-0` and the overlay would cover the title and nothing
else. The design draws no rule under it, and no hover colour either: the link's hit area is the whole
card, so a colour change would fire on any hover over the tile. The CTA arriving is the feedback.

The name is clamped to one line as drawn. That is a real loss on a name like the drawn one, which is
why the full name stays in the anchor's accessible name rather than being truncated there too.

### `CartItem`

`name`, `price`, `image`, `quantity`, `onQuantityChange`, `onRemove`, `href`, `max`, `as`.

Node 255:3556. A `<li>` by default — a basket is a list of things, and a screen reader saying "list,
3 items" before reading them is the difference between knowing how much is in the basket and finding
out by arrowing to the end. `as="div"` covers the layouts where it is not in a list.

Everything interactive already exists: `QuantityStepper` (node 255:3545) and an `IconButton` for the
bin (node 258:3980). What is new is the arrangement.

The name carries the accessible context for both controls — "Decrease quantity of BUTTERFLY DIAMOND
PENDANT", "Remove BUTTERFLY DIAMOND PENDANT". The photograph is `alt=""`: it sits beside a name that
says what it is, and the row's link is that name.

`min-w-0` on the text column is load-bearing. A flex child defaults to `min-width: auto` and refuses
to shrink below its content, so a long product name pushes the quantity control off the row instead
of truncating.

---

## Shell

Layout components live in `src/components/layout/` and are NOT part of the kit. They are its first
consumer — the composition test Storybook cannot perform.

### `ContactBanner`

`email`, `phone`, `phoneHref`, `social`.

The contact strip above the header, node 367:6428. Two drawn variants and no third:

| | height | gutter | contact glyph | social glyph |
|---|---|---|---|---|
| `< md` | — | — | — | — |
| `md–xl` | 60px | 24px | 24px | 24px |
| `xl+` | 70px | 100px | 32px | 30px |

**There is no phone variant because the strip does not exist on a phone.** 16px of gutter cannot
hold an address, a number and three marks, and every item on it is repeated in the footer. It is
`hidden` below `md`, which takes it out of the accessibility tree as well as off the screen —
acceptable only because of that duplication.

The two drawn widths land on the header's own breakpoints, so the strip and the header step
together rather than at different widths.

Reproduced as drawn but worth noting:

- Email and phone are links, though the design sets them as plain text — the same reasoning as the
  footer's. The displayed number carries spaces and brackets, so `tel:` gets a stripped copy.
- The WhatsApp glyph beside the number is kept as drawn, but the link dials. `phoneHref` points it
  at `wa.me` if that is what it is meant to be.
- Text is pure white here rather than the footer's 80%: the drawing sets `#FFFFFF`, and the hover
  affordance is the white rule, not a shift in opacity.
- The drawn address reads `hello@aurum.exampIe` — the same capital-I typo the footer has. Corrected.
- The social glyphs are the tap target, with no padding around them, so 24px at tablet is exactly
  the WCAG 2.2 minimum (2.5.8) rather than comfortably over it.

The surface is `background-base`, NOT `background-bg`. Those two token names differ by three
characters and one is a near-black and the other a near-white; the wrong one here produced white
text on `#f8f7f6`, caught by the axe sweep rather than by reading the diff.

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

The certification marks share a row on a phone and stack into a column from tablet width up —
below `md` there is no room for a column.

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
