'use client'

import { useRouter } from 'next/navigation'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Drawer } from '@/components/ui/drawer'
import { RangeSlider } from '@/components/ui/range-slider'
import { Switch } from '@/components/ui/switch'
import { TextInput } from '@/components/ui/text-input'
import { DEFAULT_SORT, applyChange, dropIdlePriceEnds, toggleFilter } from '@/lib/catalog/filters'
import { ALL_JEWELRY, listingHref, type CategoryRoute } from '@/lib/catalog/listing-url'
import { formatPrice, minorUnitDigits } from '@/lib/catalog/price'
import type { FacetOption, FilterFacets, FilterState } from '@/lib/catalog/types'
import { cn } from '@/lib/cn'

import './filter-drawer.css'

/**
 * The filter panel (003/T270, T274, T275). Node `532:12507`, in context at `225:1431`, footer at
 * `231:2322`.
 *
 * **It edits a draft** (FR-022). Ticking a box changes nothing that is on screen behind it; APPLY
 * commits the draft to the URL and closes; dismissing discards it. That is the drawn arrangement —
 * a footer with two buttons is a footer that is meant to be pressed — and it is also the only one
 * that works, because a panel that applied on every tick would re-render the grid underneath five
 * times while a visitor made one decision.
 *
 * **CLEAR is a link, not a reset.** US4's third scenario asks for "every filter dropped and the
 * listing back to the category it started from", which is an address rather than an empty draft.
 * The contract says the same. So it points at the bare route and the draft is rebuilt from the URL
 * the next time the panel opens.
 *
 * **The seventh group is not drawn.** Figma draws six — CATEGORY, COLOR, PRICE, SIZE, COLLECTION,
 * DIAMOND SHAPE — and puts IN-STOCK ONLY in the toolbar instead. But the toolbar only carries it at
 * `xl`; below that width the drawing drops it, and a filter that exists on a desktop and nowhere
 * else is a filter a phone cannot turn off. It is here, hidden at `xl` where the toolbar owns it.
 * `display: none` still submits, so the state survives either way.
 *
 * **Every control is named for its query key**, so the browser's own submit produces the URL
 * `toSearchParams` would have written. That is what makes FR-029 the same code path with less
 * scripting rather than a second implementation. Two consequences are worth naming:
 *
 * - The form posts to `/all-jewelry`, because a `<form method="GET">` cannot choose its own path
 *   from what is ticked inside it. `canonicalListing` turns `?category=rings` back into `/rings` on
 *   arrival, so both paths end at the same address.
 * - The MIN and MAX boxes carry no `name`. They are a second view of the slider, which submits the
 *   real integers; without scripting they show the range and the slider is what changes it.
 */
export const FILTER_PANEL_ID = 'filters'

/** $100 in minor units. 244 steps across a $500–$24,900 catalogue — coarse enough to arrow. */
const PRICE_STEP = 10_000

const floorTo = (amount: number, step: number) => Math.floor(amount / step) * step
const ceilTo = (amount: number, step: number) => Math.ceil(amount / step) * step

export interface FilterDrawerProps {
  open: boolean
  onClose: () => void
  /** The committed state. The draft is rebuilt from it every time the panel opens. */
  filters: FilterState
  facets: FilterFacets
  categories: readonly CategoryRoute[]
  /** The bare route — where CLEAR goes, and what the close link falls back to without scripting. */
  clearHref: string
  /** The address the listing is on now. Followed only when there is no scripting. */
  currentHref: string
  triggerRef?: React.RefObject<HTMLElement | null>
}

export function FilterDrawer({
  open,
  onClose,
  filters,
  facets,
  categories,
  clearHref,
  currentHref,
  triggerRef,
}: FilterDrawerProps) {
  const router = useRouter()
  const [draft, setDraft] = React.useState<FilterState>(filters)

  /**
   * The committed state, read rather than depended on.
   *
   * `filters` is a fresh object on every render of the route above, so an effect that listed it
   * would rebuild the draft mid-edit — every tick would undo itself. The panel opening is the only
   * moment the draft should be replaced, so that is the only thing the effect watches. (The same
   * shape, and the same reason, as the lightbox's instance effect.)
   */
  const committed = React.useRef(filters)
  React.useEffect(() => {
    committed.current = filters
  })

  React.useEffect(() => {
    if (open) setDraft(committed.current)
  }, [open])

  /**
   * A visitor can arrive with `#filters` already in the address — a shared link, or their own Back
   * button after the no-JavaScript path set it. The CSS would show the panel while React believed
   * it was closed, which is a panel with no working close control. Adopting the fragment as state
   * and then removing it puts the two back in agreement.
   */
  React.useEffect(() => {
    if (window.location.hash !== `#${FILTER_PANEL_ID}`) return
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [])

  const bounds = {
    min: floorTo(facets.price.min, PRICE_STEP),
    max: ceilTo(facets.price.max, PRICE_STEP),
  }
  // One price, or none at all, is not a range. A slider whose ends meet is a control that cannot be
  // moved and a filter that cannot narrow anything.
  const hasPrice = bounds.max > bounds.min

  const lower = draft.minPrice ?? bounds.min
  const upper = draft.maxPrice ?? bounds.max

  function setPrice([min, max]: [number, number]) {
    setDraft((current) => applyChange(current, { minPrice: min, maxPrice: max }))
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // The same rule the route applies to what arrives in the URL, applied to what leaves: a handle
    // still sitting on the catalogue's own end is the slider where it started, and writing it would
    // hang a price chip above a grid that nothing was removed from.
    router.push(listingHref(dropIdlePriceEnds(draft, bounds), categories))
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="FILTERS"
      id={FILTER_PANEL_ID}
      // `Drawer` is drawn at 350px, which leaves a 40px strip of listing beside it on a phone.
      // FR-027 asks the filter panel to COVER the viewport below `md`, so this one widens.
      className="filter-drawer max-md:w-full"
      closeHref={currentHref}
      triggerRef={triggerRef}
      asForm
      formProps={{ method: 'get', action: ALL_JEWELRY, onSubmit }}
      footer={
        <>
          <Button variant="outline" href={clearHref} className="flex-1">
            CLEAR
          </Button>
          <Button variant="primary" type="submit" className="flex-1">
            APPLY
          </Button>
        </>
      }
    >
      {/*
        The ordering has no control here — it is drawn in the toolbar — but it is part of the state
        this form submits, and a filter change that silently reset a visitor's sort would be a bug
        they could not explain.
      */}
      {draft.sort !== DEFAULT_SORT ? (
        <input type="hidden" name="sort" value={draft.sort} />
      ) : null}

      <Group legend="CATEGORY:">
        {/*
          "All jewelry" is the absence of a category rather than one of them, so it carries no name
          and submits nothing: without scripting, unticking the others is what widens the listing.
          Drawn as a checkbox beside its siblings, and left that way — a radio group would have said
          "exactly one", which is wrong for a filter that combines.
        */}
        <Checkbox
          label="All jewelry"
          checked={draft.category.length === 0}
          onChange={() => setDraft((current) => applyChange(current, { category: [] }))}
        />
        <Options
          name="category"
          options={facets.categories}
          selected={draft.category}
          onToggle={(value) => setDraft((current) => toggleFilter(current, 'category', value))}
        />
      </Group>

      <Group legend="COLOR:">
        <Options
          name="colour"
          options={facets.colours}
          selected={draft.colour}
          onToggle={(value) => setDraft((current) => toggleFilter(current, 'colour', value))}
        />
      </Group>

      {hasPrice ? (
        <Group legend="PRICE:">
          <div className="flex items-end gap-3.5">
            <PriceField
              label="MIN"
              amount={lower}
              onCommit={(amount) => setPrice([Math.min(amount, upper), upper])}
            />
            <span aria-hidden="true" className="bg-neutral-primary mb-6 h-0.5 w-3.5 rounded-xs" />
            <PriceField
              label="MAX"
              amount={upper}
              onCommit={(amount) => setPrice([lower, Math.max(amount, lower)])}
            />
          </div>

          <RangeSlider
            className="mt-6"
            label="price"
            min={bounds.min}
            max={bounds.max}
            step={PRICE_STEP}
            value={[lower, upper]}
            onChange={setPrice}
            formatValue={(amount) => formatPrice(amount)}
            nameMin="minPrice"
            nameMax="maxPrice"
          />
        </Group>
      ) : null}

      <Group legend="SIZE:">
        <Options
          name="size"
          options={facets.sizes}
          selected={draft.size}
          onToggle={(value) => setDraft((current) => toggleFilter(current, 'size', value))}
        />
      </Group>

      <Group legend="COLLECTION:">
        <Options
          name="collection"
          options={facets.collections}
          selected={draft.collection}
          onToggle={(value) => setDraft((current) => toggleFilter(current, 'collection', value))}
        />
      </Group>

      <Group legend="DIAMOND SHAPE:">
        <Options
          name="shape"
          options={facets.shapes}
          selected={draft.shape}
          onToggle={(value) => setDraft((current) => toggleFilter(current, 'shape', value))}
        />
      </Group>

      {/* Hidden where the toolbar draws it, and the only copy of it below that width. */}
      <Group legend="AVAILABILITY:" className="xl:hidden">
        <Switch
          name="inStock"
          value="1"
          label="In-stock only"
          checked={draft.inStock}
          onChange={(event) =>
            setDraft((current) => applyChange(current, { inStock: event.target.checked }))
          }
        />
      </Group>
    </Drawer>
  )
}

/**
 * One drawn group — a heading, a hairline beneath the one before it, and a column of controls.
 *
 * A `<fieldset>` rather than a `<div>` with a heading: these are groups of controls, and the group
 * name is what a screen reader repeats for each box inside it. "Rings" alone in a panel with four
 * such lists is not an answer to "rings of what".
 */
function Group({
  legend,
  className,
  children,
}: {
  legend: string
  className?: string
  children: React.ReactNode
}) {
  return (
    // `min-w-0` is load-bearing: a `<fieldset>` defaults to `min-inline-size: min-content`, so the
    // price row refused to shrink and pushed the MAX box and the slider past the panel's 350px.
    <fieldset className={cn('min-w-0 border-b border-black/10 py-5 last:border-b-0', className)}>
      <legend className="text-body-strong text-neutral-primary pt-4">{legend}</legend>
      <div className="flex flex-col gap-2.5">{children}</div>
    </fieldset>
  )
}

/**
 * A facet's options as checkboxes named for their query key.
 *
 * Zero-count options are drawn and enabled, which is `getFilterFacets`' decision and this only
 * honours it: a panel that dropped options as a visitor narrowed would move the row they were
 * reaching for, and "we have none of those" is a more useful answer than an option that vanished.
 */
function Options({
  name,
  options,
  selected,
  onToggle,
}: {
  name: string
  options: readonly FacetOption[]
  selected: readonly string[]
  onToggle: (value: string) => void
}) {
  return (
    <>
      {options.map((option) => (
        <Checkbox
          key={option.value}
          name={name}
          value={option.value}
          checked={selected.includes(option.value)}
          onChange={() => onToggle(option.value)}
          label={option.label}
        />
      ))}
    </>
  )
}

/**
 * One end of the price range, as a box a visitor can type in (FR-026).
 *
 * It holds its own text while it is being edited, because a controlled field that reformatted on
 * every keystroke would fight the person typing — `$5` becoming `$5.00` before they reach the
 * hundreds. The number is read back out on blur and on Enter, and anything unreadable snaps to the
 * value the slider still holds.
 */
function PriceField({
  label,
  amount,
  onCommit,
}: {
  label: string
  amount: number
  onCommit: (amount: number) => void
}) {
  const factor = 10 ** minorUnitDigits()
  const [text, setText] = React.useState(() => formatPrice(amount))
  const [editing, setEditing] = React.useState(false)

  // While the slider is moving, the box follows it. While the box is being typed in, it does not.
  const shown = editing ? text : formatPrice(amount)

  function commit() {
    setEditing(false)
    const cleaned = shown.replace(/[^\d.]/g, '')
    const value = Number(cleaned)
    if (cleaned === '' || !Number.isFinite(value)) return
    onCommit(Math.round(value * factor))
  }

  return (
    <TextInput
      label={label}
      inputMode="decimal"
      autoComplete="off"
      value={shown}
      onChange={(event) => {
        setEditing(true)
        setText(event.target.value)
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return
        // The panel's own submit is APPLY. Enter in a price box means "I have finished this
        // number", not "apply everything".
        event.preventDefault()
        commit()
      }}
      className="min-w-0 flex-1 [&_input]:text-center"
    />
  )
}
