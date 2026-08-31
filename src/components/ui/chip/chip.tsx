'use client'

import NextLink from 'next/link'
import React from 'react'

import { cn } from '@/lib/cn'

/**
 * A small selectable pill, from Figma node 255:2983 ("Popular searches").
 *
 * Figma draws the unselected state as a frame and the selected state as a button. That is a
 * drafting artefact, not a design: both are the same control and both must be reachable and
 * operable, so both render `<button>` here.
 *
 * Selection is exposed with `aria-pressed` rather than a class alone. The two states differ only by
 * fill and text colour, which is exactly the kind of distinction that does not survive a screen
 * reader or a monochrome display.
 *
 * Deliberately NOT `Badge` (T062). A badge is a non-interactive label; this is a toggle. Merging
 * them would give the kit one component with a `clickable` prop, which is how a primitive stops
 * being one.
 */
export interface ChipProps extends Omit<React.ComponentProps<'button'>, 'type'> {
  selected?: boolean
  /**
   * Renders a link instead of a toggle, matching the door `Button` and `IconButton` already opened.
   *
   * The listing's applied filters are drawn as this pill and they NAVIGATE — every filter lives in
   * the URL, so removing one is a different address rather than a state change. A button would have
   * been a control that needs scripting to do anything, on a page whose whole filtering path is
   * required to work without it (FR-029).
   *
   * `aria-pressed` is dropped on this branch. A link is not a toggle, and a pressed link is a
   * contradiction a screen reader has to resolve on the visitor's behalf. Selection on a link is
   * `aria-current` instead, which is the caller's to set.
   */
  href?: string
}

export function Chip({ selected = false, href, className, children, ...props }: ChipProps) {
  const classes = cn(
    'text-body-small inline-flex items-center rounded-full p-2.5',
    'ease-standard transition-colors duration-[var(--duration-fast)]',
    'disabled:cursor-not-allowed disabled:opacity-40',
    selected
      ? 'bg-primary-transparent text-primary-default'
      : 'bg-background-subtle text-neutral-primary hover:bg-primary-transparent',
    className,
  )

  if (href) {
    // `next/link`, not a bare anchor: a filter row is pressed repeatedly, and a full document load
    // per dismissed chip is the difference between a filter panel and a form. `Pagination` made the
    // same call for the same reason.
    return (
      <NextLink href={href} className={classes} {...(props as React.ComponentProps<'a'>)}>
        {children}
      </NextLink>
    )
  }

  return (
    <button type="button" aria-pressed={selected} className={classes} {...props}>
      {children}
    </button>
  )
}
