'use client'

import React from 'react'

import { cn } from '@/lib/cn'

/**
 * A row in a menu or dropdown, from Figma node 301:5920 — a label on the left and optional trailing
 * metadata ("In stock") on the right, shading on hover.
 *
 * The design draws a single row carrying a rule on BOTH edges. Stacked, that renders every internal
 * boundary at 2px. Here the rule is on the bottom edge with the first row taking a top edge, which
 * is what the drawing looks like once there is more than one of them.
 *
 * The metadata is `neutral-secondary` — #343231, not the #a7a5a3 the drawing uses. That lighter
 * grey is 2.29:1 on white, and "In stock" is information, not decoration.
 *
 * No `role="option"`. That role is only valid inside a `listbox`, and asserting it here would make
 * the markup invalid the moment this is used in a plain menu. The owning container decides the
 * pattern; this component supplies the row.
 */
export interface MenuOptionProps extends Omit<React.ComponentProps<'button'>, 'type'> {
  /** Trailing metadata — stock state, a count, a price. */
  meta?: React.ReactNode
  selected?: boolean
}

export function MenuOption({
  meta,
  selected = false,
  className,
  children,
  ...props
}: MenuOptionProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-12.5 w-full items-center justify-between gap-4 border-b border-black/5 first:border-t',
        'text-body-medium text-neutral-primary px-5 py-3.5 text-left',
        'ease-standard transition-colors duration-[var(--duration-fast)]',
        'hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40',
        selected && 'bg-black/5',
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      {meta ? <span className="text-neutral-secondary shrink-0">{meta}</span> : null}
    </button>
  )
}
