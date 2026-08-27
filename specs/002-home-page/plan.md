# Implementation Plan: Home Page

**Branch**: `002-home-page` | **Date**: 2026-08-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-home-page/spec.md`

## Summary

Compose the marketing home page from the kit built in spec 001. Five bands are drawn; three already
exist as components and are consumed unchanged. The new work is four section components — hero,
category band, jewelry carousel, about band — a route-level mock content source, and the page's
photography.

Three findings from reading the design change the work rather than confirm it.

**The category tile changes shape, not just size.** It is drawn `415×480` at 1920, `478×350` at
1024 and `174×242` at 390 — portrait, then **landscape**, then portrait. `CategoryCard` is fixed to
`aspect-83/96`. The tile's mobile frame also drops to the compact type scale and stretches its call
to action to the full tile width, exactly as `FeatureCard` does. This is a kit change, and it goes
through the contract, stories and the gates.

**The jewelry row is a second carousel.** `ImageCarousel` already implements a scroll-snap track
with wrapping arrows, boundary handling, a focusable region and a `pointer-coarse` reveal — all of
which the product row needs — but it is hard-wired to render `<Image>` children. Building a second
one would be the near-duplicate Principle II forbids, so the mechanism is extracted into a
`Carousel` primitive and `ImageCarousel` is rebuilt on top of it. This is the plan's one piece of
refactoring, and it is cheaper than maintaining two copies of the same scroll-snap logic.

**The photography is the page's weight.** Ten exports, 16MB of PNG, several with transparency that
flattens to black under a naïve conversion. Converted to WebP at the largest size actually rendered
and composited over the surface they are drawn on, the same ten come to 780KB. This is done once,
up front, because the Figma asset URLs expire seven days after export.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode, `any` requires inline justification)

**Primary Dependencies**: Unchanged from spec 001 — Payload 3.88.0, Next.js 16.3.3, React 19,
Tailwind CSS 4.3.3. **No new runtime dependency.** The carousel is scroll-snap and one `scrollTo`
call; a slider library would be 30–60KB on the site's most performance-sensitive route to replace
about forty lines that already exist and are tested.

**Storage**: None. Content comes from `src/mocks/`, per the recorded deviation in the spec. Payload
remains empty of domain collections.

**Testing**: Stories for every new section, added to the existing `tests/a11y/ui-kit.spec.ts` sweep;
geometry and behaviour assertions in `tests/stories/ui-kit.spec.ts`; a route-level
`tests/e2e/home.spec.ts` for the things only a real page can show — heading order, no-JS, 320px,
200% zoom, landmark structure.

**Target Platform**: Modern evergreen browsers, mobile-first. Server-rendered. Only the carousel is
a client component.

**Performance Goals**: The hero photograph is this route's LCP element and is loaded with priority.
Route JavaScript stays under 200KB gzipped; the only client code added is the carousel.

**Constraints**: WCAG 2.2 AA at 1920, 1024 and 390. No horizontal page scroll at 320px or 200%
zoom. Tokens only — no raw hex, no arbitrary spacing or font sizes. Reduced motion suppresses every
transition and every smooth scroll.

**Scale/Scope**: 4 user stories, 30 functional requirements, 4 new section components, 1 new kit
primitive, 1 modified kit primitive, 10 photographs, 1 route.

## Constitution Check

*GATE: evaluated before Phase 0 and re-evaluated after design.*

| Principle | Gate | Pre | Post | Notes |
|---|---|---|---|---|
| **I. Payload Is the Single Source of Truth** | No hardcoded user-visible content | ⚠️ **Deviation** | ⚠️ **Deviation** | Content comes from `src/mocks/`. Staged deliberately in 001/T088, bounded by FR-001–FR-004, measured by SC-008. See Complexity Tracking. |
| **II. Reuse Before Creation** | No duplicate components | ✅ Pass | ✅ Pass | Three bands are existing components consumed unchanged. The one near-duplicate risk — a second carousel — is resolved by extraction rather than by copying. |
| **III. Design Tokens Over Magic Values** | Tokens only | ✅ Pass | ✅ Pass | No new tokens expected. Band heights and tile ratios are layout, not palette. |
| **IV. Content Modeling & Schema Evolution** | Explicit access control; migrations | ✅ Pass | ✅ Pass | No collections created, so nothing to model or migrate. |
| **V. Performance, Accessibility & SEO Budgets** | CWV, WCAG 2.2 AA, SSR, metadata | ✅ Pass | ✅ Pass | The first route where the budgets bind on real photography. FR-007, FR-022–FR-024, FR-027, FR-030. |
| **VI. Commerce Correctness & Data Protection** | No card data; no secrets | ✅ Pass | ✅ Pass | Prices are pre-formatted display strings (FR-004). No commerce logic on this page. |

**Gate result: PASS with one documented deviation**, carried forward from spec 001 rather than newly
incurred.

## Project Structure

### Documentation (this feature)

```
specs/002-home-page/
├── spec.md
├── plan.md          # this file
└── tasks.md
```

No `research.md` — the unknowns were the three questions answered in the spec's Clarifications, and
nothing else in this feature needed investigating. No `contracts/` of its own: the kit contract in
[001/contracts/ui-kit.md](../001-design-system-foundation/contracts/ui-kit.md) is the living
document and the two kit changes are recorded there.

### Source Code (repository root)

```
public/photography/                    # 10 WebP, 780KB total — done
src/
├── app/(frontend)/
│   └── page.tsx                       # route loader: reads mocks, composes sections
├── mocks/
│   ├── index.ts
│   └── home.ts                        # hero, categories, featured products, about
└── components/
    ├── ui/
    │   ├── carousel/                  # NEW — extracted scroll-snap primitive
    │   ├── image-carousel/            # rebuilt on Carousel
    │   └── category-card/             # responsive proportion and compact frame
    └── sections/                      # NEW TIER — page bands
        ├── index.ts
        ├── hero/
        ├── category-band/
        ├── jewelry-carousel/
        └── about-band/
```

**Why a third tier.** `ui/` is the kit and is contract-bound: `check:stories` enforces a stories
file for everything in it, and it may contain no domain concept. `commerce/` holds components with
domain meaning built from the kit. Sections are neither — they are page-level compositions with
copy-shaped props. Putting them in `ui/` would put page layout under the kit contract; putting them
in `commerce/` would call the hero a commerce concept. They get their own directory, and they get
stories anyway so the accessibility sweep can reach them.

## Key Decisions

**The category tile's breakpoints live in the card, not the grid.** `FeatureCard` already sets this
precedent: responsive classes inside the component, because a prop cannot change at a breakpoint
without rendering the component twice. The card carries
`aspect-87/121 md:aspect-239/175 xl:aspect-83/96`, `p-4 md:p-7.5`, a title that steps from
`heading-4` to `heading-2`, and a call to action that is full-width below `md`. A caller that needs
a different proportion overrides the aspect through `className`, which `tailwind-merge` resolves
correctly — that is the escape hatch FR-010 asks for, and it gets its own story.

**`Carousel` owns the mechanism; its callers own the content.** The extracted primitive keeps what
`ImageCarousel` already proved: a snap track with the scrollbar hidden, `tabIndex={0}` and a label
so the region is reachable and announced, arrows that page by one viewport width, and reveals gated
on `group-hover`, `group-focus-within` **and** `pointer-coarse`. Two behaviours change on the way
out. Paging becomes boundary-aware rather than wrapping, because wrapping past the last of four
products is disorienting where wrapping through three photographs of one product is not; and the
arrows hide when there is nowhere to page, which is what FR-017 requires and what makes the drawn
hidden arrow at `x=1650` meaningful.

**The hero's scrim is not optional, its default is.** Same reasoning already recorded on
`CategoryCard`: white text over a CMS-supplied photograph cannot be checked automatically, so the
gradient is on by default and switched off for a photograph known to be dark.

**Photography carries its own dimensions.** Mock entries record `src`, `width`, `height` and `alt`
— the shape Payload's media collection returns — so the swap in spec 003 is a change of source
rather than a change of every call site.

**The desktop product action is drawn in Russian.** Every other frame in the file is English. The
English "Select size" ships; the discrepancy is flagged to the designer rather than silently
translated in one direction without saying so.

## Complexity Tracking

| Deviation | Why needed | Simpler alternative rejected because |
|---|---|---|
| Content from `src/mocks/` instead of Payload (Principle I) | Modelling the catalogue schema — variants, stones, metals, pricing, inventory — to render four tiles and a row of four cards inverts the order of the work and would produce the wrong schema. | Building the collections first was rejected in spec 001, which created `src/mocks/` for exactly this purpose. The deviation is bounded by FR-001–FR-004, measured by SC-008 at one file per route, and ends when the catalogue spec lands. |
| Refactoring `ImageCarousel` onto a new `Carousel` primitive | The product row needs the same scroll-snap mechanism over different children. | Copying the mechanism into a second component is the near-duplicate Principle II forbids. Leaving `ImageCarousel` alone and building `Carousel` beside it is the same duplication with extra steps. |

## Build Order

Photography and mocks first, because every section needs both. Then the hero and about band, which
are independent of each other and of the kit changes. The category band is gated on the
`CategoryCard` change; the jewelry carousel is gated on the `Carousel` extraction. Assembly and
route-level verification last, because that is the only point at which heading order, landmarks,
no-JS and zoom can be measured.

## Still Unverified

- Whether the tablet hero's drawn height of `1226px` — taller than most tablet viewports — is
  intentional or an artefact of the frame. Built as drawn; worth a designer's confirmation.
- Whether the four featured products are a fixed editorial selection or a query. Modelled as an
  ordered list, which either becomes.
- Whether the category photographs need per-breakpoint art direction. The design's tablet and mobile
  frames crop the same source differently; one source with `object-cover` is assumed sufficient, and
  `object-position` is the cheap fix if a crop reads badly.
