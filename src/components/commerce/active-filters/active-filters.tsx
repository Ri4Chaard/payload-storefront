import { useTranslations } from 'next-intl'
import React from 'react'

import { Chip } from '@/components/ui/chip'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'

/**
 * The row of applied filters beneath the toolbar (003/T272, FR-025). Nodes `225:1482` and
 * `I355:7627;355:7602` — `Rings ×`, `Up to $7,300 ×`, `Best selling ×`.
 *
 * **Every chip is a link, and the whole pill is the control.** A filter lives in the URL, so
 * removing one is an address rather than a state change — which is what lets the chip row work
 * with scripting off, and why `Chip` gained an `href` rather than this component reaching for a
 * bare anchor. Making the pill the target instead of the 12px cross also gives a phone something
 * it can actually hit; the cross stays as the affordance that says what pressing it does.
 *
 * **It knows nothing about filters.** Each chip arrives with a label and the address that drops it,
 * both computed at the route from `removeFilter` and `listingHref`. That keeps the arithmetic —
 * which filter to strip, and whether the result is a path or a query — in the one place that owns
 * it, and leaves this component as the drawing.
 *
 * **It wraps rather than scrolls.** Six applied filters at 390 is four lines of pills, and a row
 * that scrolled sideways would hide the last of them behind an edge with nothing to say so.
 */
export interface RemovableFilter {
  /** Stable across a re-render — `${key}:${value}`, built by the route. */
  id: string
  label: string
  /** Where dismissing this one goes. */
  href: string
}

export interface ActiveFiltersProps extends Omit<React.ComponentProps<'ul'>, 'children'> {
  filters: readonly RemovableFilter[]
  /** Names the row for a screen reader reaching it out of context. */
  label?: string
}

export function ActiveFilters({
  filters,
  label: labelProp,
  className,
  ...props
}: ActiveFiltersProps) {
  const t_catalog = useTranslations('catalog')
  /*
    Resolved in the body, not as a default parameter or a module constant: `useTranslations` is a
    hook. The prop stays overridable, so a caller with its own words still wins — what changed is
    that the fallback is translated instead of being an English literal.
  */
  const label = labelProp ?? t_catalog('appliedFilters')
  // Nothing applied is nothing drawn — an empty rule-bounded strip above the grid reads as a
  // component that failed to load.
  if (filters.length === 0) return null

  return (
    // The list IS the row. An inner `<ul className="contents">` inside a flex wrapper would have
    // read the same on screen and dropped the list semantics in browsers that still lose them to
    // `display: contents`.
    <ul
      aria-label={label}
      className={cn('flex flex-wrap items-center gap-2.5', className)}
      {...props}
    >
      {filters.map((filter) => (
        <li key={filter.id}>
          <Chip
            href={filter.href}
            // The visible word is inside the accessible name, so a visitor who says "Rings" to a
            // voice control still reaches this chip (WCAG 2.5.3).
            aria-label={`Remove ${filter.label} filter`}
            className="gap-2"
          >
            {filter.label}
            <Icon name="close" size="xs" className="size-3" />
          </Chip>
        </li>
      ))}
    </ul>
  )
}
