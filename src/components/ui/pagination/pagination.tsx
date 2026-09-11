import { Link as NextLink } from '@/i18n/navigation'
import React from 'react'

import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'

/**
 * Numbered pages (003/T255, FR-018).
 *
 * **Nothing is drawn for this.** The listing frames stop at twelve cards with no pagination, no
 * "load more", and a carousel arrow parked in the grid with `hidden` set on it (spec inconsistency
 * 7). So this is built from the kit's existing vocabulary rather than invented: the 50px square
 * outline control the carousels and the viewer already use for previous and next, and the same type
 * styles as everything else.
 *
 * **Numbered, at the owner's direction, and links rather than buttons.** Each page is a real URL —
 * which FR-018 requires for the back button, and which a crawler needs to reach page four of a
 * category at all. A "load more" button reaches neither. It also means the whole control works with
 * JavaScript disabled, without a second implementation.
 *
 * **`hrefFor` keeps this out of the catalogue.** The component never learns how a filter is
 * encoded; the route hands it a function and keeps `filters.ts` the only thing that writes a
 * listing URL. That is also what lets it live in `ui/` rather than in `commerce/`.
 *
 * The window is first, last, the current page and its neighbours, with a gap where numbers were
 * dropped. A hundred pages of rings should not produce a hundred links, and the two ends are what
 * people actually jump to.
 */
export interface PaginationProps extends Omit<React.ComponentProps<'nav'>, 'children'> {
  page: number
  totalPages: number
  /** Builds the address of a page. The caller owns the query string. */
  hrefFor: (page: number) => string
  /** Distinguishes this from any other pagination on the page. */
  label?: string
}

/** An ellipsis is a dropped range, not a page. Marked so it is never mistaken for one. */
const GAP = 'gap' as const

function windowed(page: number, totalPages: number): (number | typeof GAP)[] {
  // Seven or fewer fits without a gap, and a gap that hides one number is worse than the number.
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const pages = new Set([1, totalPages, page, page - 1, page + 1])
  const kept = [...pages].filter((entry) => entry >= 1 && entry <= totalPages).sort((a, b) => a - b)

  return kept.flatMap((entry, index) => {
    const previous = kept[index - 1]
    return previous !== undefined && entry - previous > 1 ? [GAP, entry] : [entry]
  })
}

const BOX = [
  'inline-flex size-12.5 items-center justify-center',
  'text-body-medium text-neutral-primary',
  'border border-black/5 shadow-md',
  'ease-standard transition-colors duration-[var(--duration-fast)]',
  'hover:border-primary-default hover:text-primary-default',
].join(' ')

export function Pagination({
  page,
  totalPages,
  hrefFor,
  label = 'Pagination',
  className,
  ...props
}: PaginationProps) {
  // One page is not a choice, and a control offering none is noise at the foot of every short
  // listing in the shop.
  if (totalPages <= 1) return null

  const step = (target: number, icon: 'chevron-left' | 'chevron-right', name: string) =>
    target < 1 || target > totalPages ? (
      // Present but inert at the ends, so the row does not reflow as it is paged through. Not a
      // link, because a disabled link is a thing that does not exist.
      <span aria-hidden="true" className={cn(BOX, 'opacity-30 hover:border-black/5')}>
        <Icon name={icon} className="size-3.5" />
      </span>
    ) : (
      <NextLink href={hrefFor(target)} rel={icon === 'chevron-left' ? 'prev' : 'next'} aria-label={name} className={BOX}>
        <Icon name={icon} className="size-3.5" />
      </NextLink>
    )

  return (
    <nav aria-label={label} className={cn('flex justify-center', className)} {...props}>
      <ol className="flex items-center gap-2.5">
        <li>{step(page - 1, 'chevron-left', 'Previous page')}</li>

        {windowed(page, totalPages).map((entry, index) =>
          entry === GAP ? (
            <li key={`gap-${index}`} aria-hidden="true" className="text-neutral-placeholder px-1">
              …
            </li>
          ) : (
            <li key={entry}>
              {entry === page ? (
                // The current page is not a link to itself. `aria-current` is what announces it;
                // the border is what shows it.
                <span
                  aria-current="page"
                  className={cn(BOX, 'border-primary-default text-primary-default')}
                >
                  {entry}
                </span>
              ) : (
                <NextLink href={hrefFor(entry)} aria-label={`Page ${entry}`} className={BOX}>
                  {entry}
                </NextLink>
              )}
            </li>
          ),
        )}

        <li>{step(page + 1, 'chevron-right', 'Next page')}</li>
      </ol>
    </nav>
  )
}
