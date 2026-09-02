'use client'

import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import React from 'react'

import { FILTER_PANEL_ID, FilterDrawer } from '@/components/commerce/filter-drawer'
import { Container } from '@/components/ui/container'
import { Icon } from '@/components/ui/icon'
import { Menu } from '@/components/ui/menu'
import { MenuOption } from '@/components/ui/menu-option'
import { RangeSlider } from '@/components/ui/range-slider'
import { Switch } from '@/components/ui/switch'
import {
  DEFAULT_SORT,
  SORT_LABELS,
  applyChange,
  dropIdlePriceEnds,
  toggleFilter,
} from '@/lib/catalog/filters'
import { ALL_JEWELRY, listingHref, type CategoryRoute } from '@/lib/catalog/listing-url'
import { formatPrice } from '@/lib/catalog/price'
import {
  SORT_ORDERS,
  type DiamondShape,
  type FilterFacets,
  type FilterState,
} from '@/lib/catalog/types'
import type { IconName } from '@/lib/icon-registry'
import { cn } from '@/lib/cn'

/**
 * The listing's control strip (003/T271, T275, T280). Nodes `225:1437` / `355:7627` (1920),
 * `412:7738` (1024), `412:7873` with its two triggers (390).
 *
 * **The toolbar commits immediately and the drawer does not** (FR-023 against FR-022). Nothing here
 * is drawn beside an APPLY, so nothing here waits for one: pressing a shape narrows the grid. The
 * two behaviours are not an inconsistency — a quick control that needed confirming would be slower
 * than the panel it is meant to shortcut.
 *
 * **The quick controls are links.** A filter lives in the URL, so applying one is an address; that
 * makes the shape row, the in-stock toggle and the chips work identically with scripting and
 * without it, and it is why `Switch` gained a drawing-only mode rather than this file putting an
 * `<input>` inside an `<a>`.
 *
 * The two that cannot be links are honest about it. **Price** is a slider, so it is a real form
 * with the rest of the state in hidden fields; with scripting it commits when the drag ends, and
 * without it the drawer's own price group and APPLY are the path. **Sort** is a popover that React
 * opens, so it needs scripting to reach at all — filtering does not, which is what FR-029 asks for.
 *
 * **What each width carries is what each width draws.** Everything at `xl`; FILTERS, the shapes and
 * SORT BY at `md`; two triggers on a phone, the left one carrying the count of what is applied
 * (FR-028). The controls the narrow widths drop are all in the drawer, which is the whole reason
 * the drawer carries a group Figma did not draw in it.
 */
export interface FilterToolbarProps {
  /** The effective state, including the category the route seeded from its own path. */
  filters: FilterState
  facets: FilterFacets
  categories: readonly CategoryRoute[]
  /** The bare route — CLEAR, and the "start again" address. */
  clearHref: string
  /** How many applied filters the phone trigger reports. */
  appliedCount: number
}

/** Exhaustive by construction: a new shape in the schema fails to compile until it has a glyph. */
const SHAPE_ICONS: Record<DiamondShape, IconName> = {
  round: 'shape-round',
  oval: 'shape-oval',
  emerald: 'shape-emerald',
  pear: 'shape-pear',
  marquise: 'shape-marquise',
  princess: 'shape-princess',
  baguette: 'shape-baguette',
}

/**
 * The pill that FILTERS and SORT BY are both cut from, and it is drawn as two different controls.
 *
 * At 1920 (nodes 225:1438, 225:1475) it is a 200 × 52 square-cornered box carrying 16px text. At
 * 768 (`412:7740`) and 375 (`412:7874`) it is a rounded 4px pill, half the height, carrying 12–13px
 * — the compact strip those frames draw rather than a shrunken version of the desktop row.
 *
 * **The two triggers are one control, drawn twice.** Figma gives them different heights on the same
 * phone (32px for FILTERS, 36px for SORT) and different weights at both narrow widths (Bold against
 * Medium) — the owner has confirmed that as a mistake in the file rather than a design, so both
 * take one height, one width and one weight at every breakpoint. 36px below `xl` is the larger of
 * the two drawn heights, which is also the kinder one to a thumb; 160px is the drawn width of the
 * wider pill at 768.
 *
 * 36px lands under the 44px the kit's `sm` button clears. The targets are 160px wide or half the
 * screen, so they are well past WCAG 2.5.8's 24px floor, but it is a departure from this project's
 * habit and is recorded as one.
 */
const TRIGGER = [
  'text-caption font-medium text-neutral-primary inline-flex h-9 items-center justify-center',
  'border border-black/10 px-4 uppercase',
  'xl:text-body-medium xl:h-13 xl:px-5',
  'ease-standard transition-colors duration-[var(--duration-fast)]',
  'hover:border-neutral-primary',
].join(' ')

/**
 * The word over the shape row and the price slider. 14px at 1920, 11px at 768 — the nearest steps
 * on the scale are `body-small` and `caption`, and the 1px is not worth a token nobody else needs.
 *
 * Figma paints it `#343231` at 60% opacity, which mixes to roughly 3.5:1 on white and fails AA for
 * text this size. It is the token at full strength here, the same call `MenuOption` already made
 * about the same grey.
 */
const GROUP_LABEL = 'text-caption text-neutral-secondary xl:text-body-small'

const PRICE_STEP = 10_000

const floorTo = (amount: number, step: number) => Math.floor(amount / step) * step
const ceilTo = (amount: number, step: number) => Math.ceil(amount / step) * step

export function FilterToolbar({
  filters,
  facets,
  categories,
  clearHref,
  appliedCount,
}: FilterToolbarProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLAnchorElement>(null)

  const hrefFor = (next: FilterState) => listingHref(next, categories)
  const currentHref = hrefFor(filters)

  const bounds = {
    min: floorTo(facets.price.min, PRICE_STEP),
    max: ceilTo(facets.price.max, PRICE_STEP),
  }
  const hasPrice = bounds.max > bounds.min

  return (
    /*
      A white strip below `xl`, and the page's own ground above it.
      
      Both narrow frames (`412:7738`, `412:7873`) paint the bar `#FFFFFF` between two hairlines, so
      the controls read as a band laid over the listing. The 1920 frame (`225:1437`) paints no fill
      at all and carries the bottom hairline alone. Following each is one line of classes and gets
      three drawings right; picking one would have got two of them wrong.
    */
    <Container
      as="section"
      aria-label="Filter and sort"
      className={cn(
        'bg-background-container border-y border-black/10 py-3 md:py-4',
        'xl:border-t-0 xl:bg-transparent xl:pt-0 xl:pb-5',
      )}
    >
      {/*
        Two clusters, and the row wraps between them rather than overflowing.

        The drawn 1920 row measures about 1570px of content, which needs a viewport near 1800 —
        every desktop narrower than that had the controls running off the gutter, because a fixed
        row of five fixed groups has no responsive behaviour at all. It wraps now.

        The clusters are what make wrapping safe. The rules are hairlines BETWEEN groups, and a flex
        line cannot know it is the first on its line, so a wrapping row of loose items eventually
        starts a line with a stray vertical mark. Keeping each rule inside the cluster it divides
        means a break only ever happens where there is no rule to strand.
      */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-3 gap-y-4 md:gap-x-6 xl:gap-x-7.5',
          // The 768 frame pushes its sort pill to the right edge; the 1920 frame packs everything
          // left with the row simply ending where it ends. Each width gets what it draws.
          'justify-between xl:justify-start',
        )}
      >
        <div className="flex flex-1 items-center gap-3 md:flex-none md:gap-6 xl:gap-7.5">
          {/*
          A link, not a button, and the one place in this file where that is about scripting rather
          than about addresses: `Drawer` renders its panel at all times but React is what opens it,
          so without this fragment there is no way in. `filter-drawer.css` turns `#filters` into an
          open panel; with scripting the press is cancelled before the fragment is ever set.
        */}
          <NextLink
            ref={triggerRef}
            href={`#${FILTER_PANEL_ID}`}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={FILTER_PANEL_ID}
            onClick={(event) => {
              event.preventDefault()
              setOpen(true)
            }}
            className={cn(TRIGGER, 'flex-1 md:w-40 md:flex-none xl:w-50')}
          >
            Filters
            {/*
            The count is drawn on the phone and nowhere else (node 412:7875, FR-028). Above `md`
            the chip row beneath this control names every one of them, and a number that repeats
            the list directly below it is a second answer to a question already answered.
          */}
            {appliedCount > 0 ? <span className="md:hidden">&nbsp;({appliedCount})</span> : null}
            {/* Drawn at 1920 only — the 768 and 375 frames carry the word alone. */}
            <Icon name="filter" size="sm" className="ml-2.5 hidden size-5 xl:block" />
          </NextLink>

          {/* Drawn at 1920 only. The 768 frame separates its two groups with a 24px gap and nothing. */}
          <Rule className="hidden xl:block" />

          <div role="group" aria-label="Diamond shape" className="hidden md:block">
            <p className={GROUP_LABEL}>Shape</p>
            <div className="mt-1 flex items-center gap-1.5 xl:mt-1.5 xl:gap-2.5">
              {facets.shapes.map((shape) => {
                const selected = filters.shape.some((entry) => entry === shape.value)
                return (
                  <NextLink
                    key={shape.value}
                    href={hrefFor(toggleFilter(filters, 'shape', shape.value))}
                    aria-label={shape.label}
                    // `aria-current` rather than `aria-pressed`: this is a link, and the applied
                    // state IS the address it points away from.
                    aria-current={selected ? 'true' : undefined}
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-full xl:size-9',
                      'ease-standard transition-colors duration-[var(--duration-fast)]',
                      selected
                        ? 'bg-primary-transparent text-primary-default'
                        : 'text-neutral-primary hover:bg-black/5',
                    )}
                  >
                    {/*
                    The cast is sound in the direction it matters: `getFilterFacets` builds this
                    list from the same closed set `SHAPE_ICONS` is keyed by, and the record fails
                    to compile the moment the schema gains a shape without a glyph.
                  */}
                    <Icon
                      name={SHAPE_ICONS[shape.value as DiamondShape]}
                      className="size-5 xl:size-6.5"
                    />
                  </NextLink>
                )
              })}
            </div>
          </div>

          {hasPrice ? (
            <>
              <Rule className="hidden xl:block" />
              <PriceQuickFilter
                filters={filters}
                bounds={bounds}
                onCommit={(next) => router.push(hrefFor(next))}
                className="hidden xl:flex"
              />
            </>
          ) : null}
        </div>

        <div className="flex flex-1 items-center gap-3 md:flex-none md:gap-6 xl:gap-7.5">
          <Menu
            label="Sort by"
            align="end"
            className="flex-1 md:flex-none"
            triggerClassName={cn(TRIGGER, 'w-full md:w-40 xl:w-50')}
            trigger={
              <>
                Sort by
                <Icon name="chevron-down" size="sm" className="ml-2 size-5 xl:ml-2.5 xl:size-4" />
              </>
            }
          >
            {SORT_ORDERS.map((order) => (
              <MenuOption
                key={order}
                divider={false}
                selected={filters.sort === order}
                // The tick is the non-colour half of "current". A selected row that differed only by
                // its fill would be invisible to anyone who cannot separate the two shades.
                meta={
                  filters.sort === order ? (
                    <Icon name="check" size="xs" label="Current ordering" className="size-4" />
                  ) : undefined
                }
                onClick={() => router.push(hrefFor(applyChange(filters, { sort: order })))}
              >
                {SORT_LABELS[order]}
              </MenuOption>
            ))}
          </Menu>

          <Rule className="hidden xl:block" />

          <NextLink
            href={hrefFor(applyChange(filters, { inStock: !filters.inStock }))}
            aria-current={filters.inStock ? 'true' : undefined}
            className="text-neutral-primary hidden shrink-0 items-center xl:inline-flex"
          >
            <Switch
              as="span"
              checked={filters.inStock}
              label="In-stock only"
              // Label first, toggle second, as drawn. `Switch` puts them the other way round because
              // that is the order every other control in the kit uses.
              className="flex-row-reverse gap-3.5 uppercase"
            />
          </NextLink>
        </div>
      </div>

      <FilterDrawer
        open={open}
        onClose={() => setOpen(false)}
        filters={filters}
        facets={facets}
        categories={categories}
        clearHref={clearHref}
        currentHref={currentHref}
        triggerRef={triggerRef}
      />
    </Container>
  )
}

/** The 2 × 52 hairline between groups (nodes 225:1441 and its four twins). */
function Rule({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('h-13 w-0.5 shrink-0 rounded-xs bg-black/10', className)}
    />
  )
}

/**
 * The toolbar's price control — a slider and the two boxes that read it back (node 225:1457).
 *
 * A real `<form method="GET">`, because a slider cannot be a link. Everything the toolbar does not
 * draw travels in hidden fields, so a submit produces the whole state rather than a listing with
 * five filters silently dropped. With scripting the submit never happens: the drag ends, the URL is
 * built and pushed, and the form is inert scaffolding. Without it, the submit button is reachable
 * from the keyboard and the drawer is the fuller path.
 *
 * The boxes are `aria-hidden` output, not inputs. The slider already announces both ends through
 * `aria-valuetext`, and a second pair of fields saying the same numbers would be two controls for
 * one value. The drawer's boxes ARE typeable — that is where a visitor goes to enter a number.
 */
function PriceQuickFilter({
  filters,
  bounds,
  onCommit,
  className,
}: {
  filters: FilterState
  bounds: { min: number; max: number }
  onCommit: (next: FilterState) => void
  className?: string
}) {
  const [range, setRange] = React.useState<[number, number]>([
    filters.minPrice ?? bounds.min,
    filters.maxPrice ?? bounds.max,
  ])

  // Re-sync when a navigation lands with different numbers — a chip dismissed, or the drawer
  // applied. Every dependency is a primitive, so this settles rather than looping.
  React.useEffect(() => {
    setRange([filters.minPrice ?? bounds.min, filters.maxPrice ?? bounds.max])
  }, [filters.minPrice, filters.maxPrice, bounds.min, bounds.max])

  const [lower, upper] = range

  function commit() {
    const next = dropIdlePriceEnds(
      applyChange(filters, { minPrice: lower, maxPrice: upper }),
      bounds,
    )
    // Pointer-up fires on a press that moved nothing. Navigating to the address already showing
    // would reload the grid for no reason and put a duplicate in the visitor's history.
    if (next.minPrice === filters.minPrice && next.maxPrice === filters.maxPrice) return
    onCommit(next)
  }

  return (
    <form
      method="get"
      action={ALL_JEWELRY}
      onSubmit={(event) => {
        event.preventDefault()
        commit()
      }}
      className={cn('items-end gap-2.5', className)}
    >
      <HiddenState filters={filters} />

      <div className="w-50">
        <p className={GROUP_LABEL}>Price</p>
        {/*
          The commit hangs off the wrapper rather than the slider. `RangeSlider` spreads its props
          last and would overwrite its own `onPointerUp`, which is what tracks a live drag — the
          handles would stop swapping places correctly. Pointer events bubble; this costs nothing.
        */}
        <div
          className="mt-1.5"
          onPointerUp={commit}
          onKeyUp={(event) => {
            if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End')
              commit()
          }}
        >
          <RangeSlider
            label="price"
            min={bounds.min}
            max={bounds.max}
            step={PRICE_STEP}
            value={range}
            onChange={setRange}
            formatValue={(amount) => formatPrice(amount)}
            nameMin="minPrice"
            nameMax="maxPrice"
          />
        </div>
      </div>

      <div aria-hidden="true" className="flex items-center gap-2.5">
        <PriceReadout amount={lower} />
        <PriceReadout amount={upper} />
      </div>

      <button type="submit" className="sr-only">
        Apply price range
      </button>
    </form>
  )
}

function PriceReadout({ amount }: { amount: number }) {
  return (
    <span className="text-body-small text-neutral-primary grid h-13 w-22.5 place-items-center border border-black/10">
      {formatPrice(amount)}
    </span>
  )
}

/**
 * Everything the surrounding form does not draw, as fields, so a submit carries the whole state.
 *
 * Price is the omission and it is deliberate: the slider inside the form owns those two keys, and a
 * hidden field of the same name would submit twice.
 */
function HiddenState({ filters }: { filters: FilterState }) {
  const lists: [string, readonly string[]][] = [
    ['category', filters.category],
    ['collection', filters.collection],
    ['size', filters.size],
    ['colour', filters.colour],
    ['shape', filters.shape],
  ]

  return (
    <>
      {lists.map(([name, values]) =>
        values.map((value) => (
          <input key={`${name}:${value}`} type="hidden" name={name} value={value} />
        )),
      )}
      {filters.inStock ? <input type="hidden" name="inStock" value="1" /> : null}
      {filters.sort !== DEFAULT_SORT ? (
        <input type="hidden" name="sort" value={filters.sort} />
      ) : null}
    </>
  )
}
