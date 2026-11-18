'use client'

import { Link as NextLink } from '@/i18n/navigation'
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
 * Deliberately NOT `Badge`. A badge is a non-interactive label; this is a toggle. Merging
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
   * required to work without it.
   *
   * `aria-pressed` is dropped on this branch. A link is not a toggle, and a pressed link is a
   * contradiction a screen reader has to resolve on the visitor's behalf. Selection on a link is
   * `aria-current` instead, which is the caller's to set.
   */
  href?: string
  /**
   * `'span'` renders a plain label instead of a control.
   *
   * The detail band on the story page draws these pills as subject labels — "Materials",
   * "Craftsmanship" — and pressing one does nothing. A `<button>` that does nothing is a control a
   * keyboard user has to tab through and a screen reader announces as actionable, which is an
   * accessibility defect rather than a cosmetic one.
   *
   * Extending this component rather than writing a near-identical `Label` beside it is
   * Constitution II: "If an existing component is 80% right, extend it with props or variants."
   * `aria-pressed` is dropped on this branch for the same reason it is dropped on the link branch —
   * a label is not a toggle.
   */
  as?: 'button' | 'span'
}

export function Chip({ selected = false, href, as = 'button', className, children, ...props }: ChipProps) {
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

  if (as === 'span') {
    return (
      <span className={classes} {...(props as React.ComponentProps<'span'>)}>
        {children}
      </span>
    )
  }

  return (
    <button type="button" aria-pressed={selected} className={classes} {...props}>
      {children}
    </button>
  )
}
