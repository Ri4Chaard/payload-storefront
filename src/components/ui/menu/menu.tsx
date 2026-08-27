'use client'

import React from 'react'

import { cn } from '@/lib/cn'

/**
 * A disclosure menu — a trigger and a popover list. The language switcher (node 337:8233) is its
 * first consumer; the size list (node 301:5920) is the next.
 *
 * The design draws only the open panel, so everything about how it opens, closes and is traversed
 * is implemented from the WAI-ARIA menu button pattern rather than invented:
 *
 * - `Escape` closes and returns focus to the trigger, so keyboard focus is never stranded in a
 *   panel that has just disappeared.
 * - `ArrowDown` / `ArrowUp` move between items and wrap; `Home` / `End` jump to the ends.
 * - `Tab` closes rather than trapping — this is a menu, not a dialog, and trapping focus in it
 *   would be a worse bug than the one it prevents.
 * - A pointer press outside closes it.
 *
 * Items are given `role="menuitem"` and taken out of the tab order here rather than at the call
 * site. `MenuOption` deliberately asserts no role of its own precisely so the container can decide,
 * and requiring every caller to remember it is how half of them end up without it.
 */
export interface MenuProps {
  /** Accessible name for the trigger. */
  label: string
  /** Trigger content — text, an icon, or both. */
  trigger: React.ReactNode
  /** Which edge of the trigger the panel lines up with. */
  align?: 'start' | 'end'
  className?: string
  triggerClassName?: string
  children: React.ReactNode
}

export function Menu({
  label,
  trigger,
  align = 'start',
  className,
  triggerClassName,
  children,
}: MenuProps) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  const items = React.useCallback(
    () => Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
    [],
  )

  const close = React.useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  React.useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close(true)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  // Opening with the keyboard has to land focus somewhere inside, or the panel is unreachable.
  React.useEffect(() => {
    if (open) items()[0]?.focus()
  }, [open, items])

  function moveFocus(delta: number) {
    const all = items()
    if (all.length === 0) return
    const current = all.indexOf(document.activeElement as HTMLElement)
    const next = (current + delta + all.length) % all.length
    all[next]?.focus()
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className={cn(
          'ease-standard inline-flex cursor-pointer items-center gap-1.5 transition-colors duration-[var(--duration-fast)]',
          triggerClassName,
        )}
      >
        {trigger}
      </button>

      {open ? (
        <div
          ref={listRef}
          role="menu"
          aria-label={label}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              moveFocus(1)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              moveFocus(-1)
            } else if (event.key === 'Home') {
              event.preventDefault()
              items()[0]?.focus()
            } else if (event.key === 'End') {
              event.preventDefault()
              items().at(-1)?.focus()
            } else if (event.key === 'Tab') {
              close(false)
            }
          }}
          className={cn(
            'bg-background-container absolute top-full z-20 mt-2 min-w-32 border border-black/10',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {React.Children.map(children, (child) =>
            React.isValidElement<{ role?: string; tabIndex?: number }>(child)
              ? React.cloneElement(child, { role: 'menuitem', tabIndex: -1 })
              : child,
          )}
        </div>
      ) : null}
    </div>
  )
}
