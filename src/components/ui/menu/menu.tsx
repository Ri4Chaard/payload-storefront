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
 * - Choosing an item closes it and returns focus to the trigger. That is the container's job here
 *   rather than each caller's, because every caller needs it and forgetting it strands focus.
 * - A pointer press outside closes it.
 *
 * **The panel opens upward when there is no room below it.** `placement` decides between the two,
 * and `auto` — the default — measures. A menu near the foot of the screen that always opened
 * downward would extend past the viewport, and inside a scrolling container it would grow that
 * container's scroll height instead: the language switcher at the bottom of the mobile menu did
 * exactly that, adding a scrollbar to a drawer that fits.
 *
 * The measurement happens in a layout effect, so the panel is placed before it is painted rather
 * than being seen in the wrong place for a frame. Preferring below on a tie keeps the common case
 * unchanged.
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
  /**
   * Which side of the trigger the panel opens on. `auto` measures the room below and flips up when
   * there is not enough; `top` and `bottom` force it, for the rare case where the surrounding
   * layout knows something the measurement cannot.
   */
  placement?: 'auto' | 'top' | 'bottom'
  className?: string
  triggerClassName?: string
  children: React.ReactNode
}

/** What `Menu` writes onto each child. Anything a row already had is called first, then closed. */
interface MenuItemProps {
  role?: string
  tabIndex?: number
  onClick?: (event: React.MouseEvent<HTMLElement>) => void
}

export function Menu({
  label,
  trigger,
  align = 'start',
  placement = 'auto',
  className,
  triggerClassName,
  children,
}: MenuProps) {
  const [open, setOpen] = React.useState(false)
  const [side, setSide] = React.useState<'top' | 'bottom'>('bottom')
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

  // Before paint, not after: the panel is measured and placed in the same frame it appears in, so
  // there is no version of it that a visitor sees in the wrong position.
  React.useLayoutEffect(() => {
    if (!open) return
    if (placement !== 'auto') {
      setSide(placement)
      return
    }

    const trigger = triggerRef.current
    const list = listRef.current
    if (!trigger || !list) return

    const box = trigger.getBoundingClientRect()
    // The 8px is the gap the panel sets either way — `mt-2` and `mb-2` are the same measure.
    const needed = list.offsetHeight + 8
    const below = window.innerHeight - box.bottom
    const above = box.top

    // Below unless it genuinely does not fit AND there is more room the other way. A tie keeps the
    // ordinary downward menu, which is what everything above `md` gets.
    setSide(below < needed && above > below ? 'top' : 'bottom')
  }, [open, placement])

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
            'bg-background-container absolute z-20 min-w-32 border border-black/10',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {React.Children.map(children, (child) =>
            React.isValidElement<MenuItemProps>(child)
              ? React.cloneElement(child, {
                  role: 'menuitem',
                  tabIndex: -1,
                  /*
                   * Choosing closes, and focus goes back to the trigger.
                   *
                   * The menu button pattern says a menu is dismissed by the choice, and leaving it
                   * open is not a cosmetic slip: focus stays on a row inside a panel the visitor has
                   * finished with, and the next Tab walks the rest of the list rather than the page.
                   * It is done HERE rather than at each call site because every consumer needs it and
                   * the first two both forgot it.
                   */
                  onClick: (event: React.MouseEvent<HTMLElement>) => {
                    child.props.onClick?.(event)
                    close(true)
                  },
                })
              : child,
          )}
        </div>
      ) : null}
    </div>
  )
}
