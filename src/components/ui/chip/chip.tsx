'use client'

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
}

export function Chip({ selected = false, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'text-body-small inline-flex items-center rounded-full p-2.5',
        'ease-standard transition-colors duration-[var(--duration-fast)]',
        'disabled:cursor-not-allowed disabled:opacity-40',
        selected
          ? 'bg-primary-transparent text-primary-default'
          : 'bg-background-subtle text-neutral-primary hover:bg-primary-transparent',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
