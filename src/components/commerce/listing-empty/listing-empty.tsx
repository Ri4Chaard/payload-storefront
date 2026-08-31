import React from 'react'

import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { cn } from '@/lib/cn'

/**
 * A listing that matches nothing (003/T252, FR-019).
 *
 * **Nothing is drawn for this** (spec inconsistency 8), which is the usual fate of the empty state
 * and the reason it is worth building deliberately: a filter combination that matches nothing is
 * the moment a visitor is most likely to leave, and an empty grid with a toolbar above it reads as
 * a broken page rather than as an answer.
 *
 * So it says three things, in the order they are useful: that there is nothing, what was asked for,
 * and how to widen it. The middle one is `children` — the active-filter chips arrive in US4 and
 * slot in here without this component changing.
 *
 * The heading is an `h2`. The listing's `h1` is the category name in `ListingHeader` above, and
 * this is a message inside that page rather than a page of its own.
 */
export interface ListingEmptyProps extends React.ComponentProps<'div'> {
  /** Where "clear the filters" goes — the bare route, per `filters.ts`. */
  clearHref: string
  title?: string
  description?: string
  clearLabel?: string
}

export function ListingEmpty({
  clearHref,
  title = 'Nothing matches those filters',
  description = 'Every piece is made in small numbers, so a narrow search can come up empty. Widening it usually helps.',
  clearLabel = 'Clear all filters',
  children,
  className,
  ...props
}: ListingEmptyProps) {
  return (
    <Container
      as="section"
      aria-labelledby="listing-empty-title"
      className={cn(
        'text-neutral-primary flex flex-col items-center gap-5 py-15 text-center xl:py-25',
        className,
      )}
      {...props}
    >
      <h2 id="listing-empty-title" className="text-heading-1">
        {title}
      </h2>

      {/* The chips that produced this, when there are any. US4 fills it. */}
      {children}

      <p className="text-body-base text-neutral-secondary max-w-150">{description}</p>

      <Button variant="outline" href={clearHref}>
        {clearLabel}
      </Button>
    </Container>
  )
}
