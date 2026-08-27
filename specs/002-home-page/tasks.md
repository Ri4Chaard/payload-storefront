# Tasks: Home Page

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)

**Design source**: Figma node `255:3353` — three page frames at 1920, 1024 and 390.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete work)
- **[Story]**: US1–US4, mapping to the spec's user stories

## Path Conventions

Storefront under `src/app/(frontend)/`, kit under `src/components/ui/`, page bands under
`src/components/sections/`, content fixtures under `src/mocks/`, photography under
`public/photography/`.

Every new component lands **with its stories in the same change**, and every new story title is
added to `tests/a11y/ui-kit.spec.ts` in the same change. That is what keeps the accessibility sweep
honest as the page grows.

---

## Carried decisions and open items

Read before starting.

| Item | State | Affects |
|---|---|---|
| Content comes from `src/mocks/`, not Payload | **Recorded deviation** from Principle I, staged in 001/T088, bounded by FR-001–FR-004 | T101, T118 |
| Figma asset URLs expire 7 days after export | **Resolved** — all ten exported, converted and committed up front | T100 |
| Desktop product action drawn in Russian ("ВЫБРАТЬ РАЗМЕР") | English "Select size" ships; discrepancy flagged to the designer | T114 |
| Tablet hero drawn 1226px tall — taller than most tablet viewports | Built as drawn; awaiting designer confirmation | T105 |
| Routes the calls to action point at do not exist yet | Real paths written; they resolve to the branded 404 until later specs land | T101 |
| `Button`'s reveal disc is `w-[175%]`, geometrically too small for buttons narrower than ~1.5× their height | Known latent bug carried from spec 001 | T113 — the category tile's mobile call to action is full-width and short, so verify before assuming |
| Four featured products: editorial selection or query? | Modelled as an ordered list, which either becomes | T101 |

---

## Phase 1: Foundations

Everything else needs these two.

- [X] T100 Export, convert and commit the page's photography to `public/photography/` — ten WebP,
      sized to the largest dimension actually rendered, transparency composited over the surface it
      is drawn on rather than flattened to black (FR-022, FR-023, FR-024, SC-007)
- [X] T101 Establish `src/mocks/home.ts` and `src/mocks/index.ts` — hero copy, four categories, the
      featured product list and the about band, each photograph recorded as `src`/`width`/`height`/
      `alt` so the shape matches what Payload's media collection will return (FR-001, FR-002, FR-004)
- [X] T102 [P] Create the `src/components/sections/` tier with a barrel and a docstring stating what
      belongs there and what does not — page-level composition with copy-shaped props, not kit
      primitives and not domain components

**Checkpoint**: content and photography exist; no section consumes them yet.

---

## Phase 2: User Story 1 — A Visitor Lands and Learns What Aurum Sells (P1)

**Goal**: A publishable home page — hero, about, the existing service promises, in the real shell.

**Independent test**: Load `/` at 1920, 1024 and 390; confirm the headline, sentence and call to
action are real text over the photograph, that the about band renders and routes onward, and that
the page carries its own title and description.

- [X] T103 [US1] Build `Hero` in `src/components/sections/hero/` — full-bleed photograph, bottom
      aligned headline, lede and call to action; drawn heights 950/1226/754; type steps 36/36/24 for
      the headline and 16/16/14 for the lede (FR-005, FR-006)
- [X] T104 [US1] Give `Hero` a default gradient scrim behind its text, switchable off for a
      photograph known to be dark — the same rule already recorded on `CategoryCard`, and for the
      same reason: contrast over a photograph cannot be checked automatically (FR-008)
- [X] T105 [US1] Load the hero photograph with `priority`, explicit dimensions and responsive
      `sizes`; it is this route's LCP element (FR-007)
- [X] T106 [P] [US1] Build `AboutBand` in `src/components/sections/about-band/` — photograph beside
      copy at 1920 (`1211`/`709`) and 1024 (`512`/`512`), stacked at 390; the two-tone heading must
      not fragment its accessible name (FR-020, FR-021)
- [X] T107 [P] [US1] Build `SectionHeading` — the centred band heading used by three sections, at
      the drawn 36/36/24 steps, rendering the correct level for its position rather than a fixed one
- [X] T108 [US1] Compose `src/app/(frontend)/page.tsx` as a route-level loader: read the mocks, pass
      them to the sections, render hero → about → existing `FeatureStrip`; the loader is the only
      thing that imports from `src/mocks/` (FR-003, FR-026)
- [X] T109 [US1] Add the page's title and description (FR-027)
- [X] T110 [P] [US1] Stories for `Hero`, `AboutBand` and `SectionHeading`; add all three to the
      accessibility sweep's component list

**Checkpoint**: `/` is a real, publishable page. US2 and US3 add to it without changing it.

---

## Phase 3: User Story 2 — A Visitor Browses by Category (P2)

**Goal**: Four collection tiles in the drawn arrangement at every width.

**Independent test**: Load `/` at all three widths; confirm four tiles in the drawn arrangement,
each exactly one link named for its collection, all four reachable by keyboard in reading order.

- [ ] T111 [US2] Make `CategoryCard`'s proportion responsive —
      `aspect-87/121 md:aspect-239/175 xl:aspect-83/96`, matching the drawn `174×242`, `478×350`
      and `415×480`. The tablet frame is **landscape**; a card that stays portrait there is the
      failure this task exists to prevent (FR-010)
- [ ] T112 [US2] Add `CategoryCard`'s compact frame below `md` — `p-4` inset, `heading-4` title, and
      a call to action spanning the tile width — stepping to the desktop treatment at `md` and
      above, which the tablet and desktop frames share exactly (FR-011)
- [ ] T113 [US2] Verify the full-width mobile call to action still reveals correctly: `Button`'s
      slide disc is `w-[175%]`, and the geometric minimum is `sqrt(1 + 4h²/w²)`. Fix `Button` if the
      short, wide mobile button exposes it — this is the same class of bug already fixed on
      `IconButton`
- [ ] T114 [P] [US2] Record both `CategoryCard` changes in
      [001/contracts/ui-kit.md](../001-design-system-foundation/contracts/ui-kit.md), including the
      `className` override path for a caller that needs a different proportion (FR-013)
- [ ] T115 [US2] Build `CategoryBand` in `src/components/sections/category-band/` — heading plus
      four tiles, four-across at 1920 and two-by-two below (FR-009)
- [ ] T116 [US2] Add `CategoryBand` to the page between hero and about, in the drawn order
- [ ] T117 [P] [US2] Stories for `CategoryBand` and for `CategoryCard`'s new frames, including one
      proving the `className` proportion override; add to the accessibility sweep
- [ ] T118 [P] [US2] Story tests: four tiles at the drawn proportions per breakpoint, one link per
      tile, and the accessible name is the collection and not the photograph (FR-012)

**Checkpoint**: the page's primary navigation path into the catalogue works.

---

## Phase 4: User Story 3 — A Visitor Browses Featured Pieces (P3)

**Goal**: A working carousel of real pieces, operable by pointer, keyboard and touch.

**Independent test**: Load `/` at all three widths, page forwards and back with the control and the
keyboard, and confirm every card stays reachable and openable with no hover available.

- [ ] T119 [US3] Extract the scroll-snap mechanism from `ImageCarousel` into a `Carousel` primitive
      in `src/components/ui/carousel/` — snap track with the scrollbar hidden, focusable labelled
      region, arrows that page by one viewport width, and reveals gated on `group-hover`,
      `group-focus-within` **and** `pointer-coarse` (FR-015, FR-018)
- [ ] T120 [US3] Make `Carousel`'s paging boundary-aware rather than wrapping, and hide the arrows
      when there is nowhere to page — three photographs of one product may wrap, a row of products
      may not, and an arrow that pages to nothing is what FR-017 forbids
- [ ] T121 [US3] Rebuild `ImageCarousel` on `Carousel`, keeping its current behaviour and its
      existing tests green. A behavioural change here is a regression in `ProductCard`, which is
      already shipped
- [ ] T122 [P] [US3] Record `Carousel` in the kit contract and note `ImageCarousel`'s new basis
- [ ] T123 [US3] Build `JewelryCarousel` in `src/components/sections/jewelry-carousel/` — heading,
      the row of `ProductCard`s, and the band's own call to action; four across the content width at
      1920, drawn card widths with sideways scroll at 1024 and 390 (FR-014, FR-016)
- [ ] T124 [US3] Consume `ProductCard` **unchanged**. If the row cannot be built without modifying
      it, the card is wrong and the card is what gets fixed — not the section (FR-019)
- [ ] T125 [US3] Add `JewelryCarousel` to the page between the category band and the about band
- [ ] T126 [P] [US3] Stories for `Carousel` and `JewelryCarousel`; add both to the accessibility
      sweep
- [ ] T127 [P] [US3] Story tests: card count and overflow per breakpoint, paging forwards and back,
      behaviour at both boundaries, arrows absent when there is nowhere to page, and a real touch
      context proving the controls are visible without hover

**Checkpoint**: every drawn band is on the page.

---

## Phase 5: User Story 4 — The Page Works However a Visitor Arrives (P4)

**Goal**: Prove the properties that make the other three stories real.

**Independent test**: Run the sweeps and the measurements.

- [ ] T128 [US4] Add `tests/e2e/home.spec.ts` — heading hierarchy descends without skipping, one
      `h1`, landmarks and labelled regions present, every call to action routes (FR-026, FR-028)
- [ ] T129 [P] [US4] Verify the page renders and every link works with JavaScript disabled; the
      carousel must degrade to a plain scroller rather than disappear (FR-029, SC-004)
- [ ] T130 [P] [US4] Verify no horizontal page scroll at 320px and at 200% zoom (SC-005)
- [ ] T131 [P] [US4] Verify reduced motion suppresses every transition and every smooth scroll,
      including the carousel's paging
- [ ] T132 [US4] Run the accessibility sweep at 1920, 1024 and 390 with zero violations (SC-002)
- [ ] T133 [P] [US4] Measure LCP against the 2.5s budget and the route's JavaScript against 200KB
      gzipped (FR-030, SC-006)
- [ ] T134 [P] [US4] Verify every band grows rather than clips with copy longer than drawn — a
      product name past one line, a category name that wraps, a lede a translator made longer

---

## Phase 6: Close-out

- [ ] T135 Verify the mock-to-Payload swap costs one file: no component imports from `src/mocks/`
      (SC-008)
- [ ] T136 [P] Confirm the kit was touched exactly twice — `CategoryCard` and the `Carousel`
      extraction. A third change means a band was built wrong (SC-009)
- [ ] T137 Full gate run: naming, stories, styles, contrast, tokens, lint, types, unit, story,
      accessibility, build (SC-010)
- [ ] T138 [P] Measure the built page against the design at all three widths — section padding,
      band heights, tile proportions, gaps (SC-001)

---

## Dependencies

```
Phase 1 Foundations ──────────── blocks everything
    ↓
Phase 2 US1 (P1)  ── hero + about + page      ← publishable on its own
    ↓
    ├── Phase 3 US2 (P2)  ── category band     [needs T111–T112, the kit change]
    └── Phase 4 US3 (P3)  ── jewelry carousel  [needs T119–T121, the extraction]
    ↓
Phase 5 US4 (P4)  ── verification              ← needs every band present
    ↓
Phase 6 Close-out
```

Phases 3 and 4 are genuinely independent of each other and can run in either order or together.
Both depend on Phase 2 only for a page to sit in.

## Parallel Opportunities

| Phase | Parallel tasks | Notes |
|---|---|---|
| 1 | T102 alongside T101 | Different files |
| 2 | T106, T107, T110 | About band, section heading and stories are independent of the hero |
| 3 | T114, T117, T118 | Contract and tests once the card change lands |
| 4 | T122, T126, T127 | Contract and tests once the extraction lands |
| 5 | T129, T130, T131, T133, T134 | All independent measurements |
| 6 | T136, T138 | Independent checks |

## Implementation Strategy

**MVP is Phase 1 + Phase 2.** Hero, about band and the existing service promises in the real shell
is already a publishable home page. If work stopped there, nothing would be broken — the two
browsing bands add to the page rather than complete it.

**Sequence the kit changes early inside their phases.** T111–T112 and T119–T121 are the only tasks
that can break something already shipped, and `ProductCard` depends on `ImageCarousel`. Discovering
a regression there while assembling the page is expensive; discovering it against the existing story
tests is cheap.

**T113 is a checkpoint, not a task to code through.** `Button`'s reveal disc has a known geometric
flaw that the full-width mobile call to action may be the first thing to expose. Verify before
assuming it works.

## Task Count

| Phase | Tasks |
|---|---|
| 1 Foundations | 3 |
| 2 US1 — landing | 8 |
| 3 US2 — categories | 8 |
| 4 US3 — jewelry | 9 |
| 5 US4 — however they arrive | 7 |
| 6 Close-out | 4 |
| **Total** | **39** |
