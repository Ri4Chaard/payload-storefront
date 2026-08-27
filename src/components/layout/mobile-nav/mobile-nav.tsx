'use client'

import NextLink from 'next/link'
import React from 'react'

import { IconButton } from '@/components/ui/icon-button'
import { cn } from '@/lib/cn'

/**
 * The hamburger and the panel it opens (T074, FR-036).
 *
 * **The open panel is not designed.** Every header variant draws the closed state only, so the
 * panel here is the plainest thing that works: the same navigation, stacked, in the header's own
 * surface. It is deliberately unstyled beyond that rather than invented, and should be replaced the
 * moment there is a drawer to build.
 *
 * The behaviour is not improvised, though — it follows the disclosure pattern:
 *
 * - `aria-expanded` and `aria-controls` on the trigger, so the state is announced rather than
 *   merely drawn.
 * - `Escape` closes and returns focus to the trigger. Without the return, focus is stranded on an
 *   element that no longer exists and the next Tab restarts from the top of the document.
 * - Focus moves to the first link on open, so a keyboard user is not left tabbing through the whole
 *   header to reach what they just opened.
 * - A pointer press outside closes it.
 *
 * Focus is NOT trapped. This is a disclosure, not a dialog: trapping would strand anyone who wanted
 * to tab past it, which is a worse failure than the one it prevents.
 */
export interface MobileNavItem {
  label: string
  href: string
}

export interface MobileNavProps {
  items: MobileNavItem[]
  className?: string
}

export function MobileNav({ items, className }: MobileNavProps) {
  const [open, setOpen] = React.useState(false)
  const panelId = React.useId()
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)

  const close = React.useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  React.useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close(true)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  React.useEffect(() => {
    if (open) panelRef.current?.querySelector('a')?.focus()
  }, [open])

  return (
    <div className={cn('flex items-center', className)}>
      <IconButton
        ref={triggerRef}
        variant="bare"
        icon={open ? 'close' : 'menu'}
        label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="text-neutral-primary hover:text-primary-default [&_svg]:size-5 md:[&_svg]:size-6"
      />

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          className="bg-background-bg absolute top-full left-0 z-20 w-full border-b border-black/10"
        >
          <nav aria-label="Primary">
            <ul className="flex flex-col">
              {items.map((item) => (
                <li key={item.href}>
                  <NextLink
                    href={item.href}
                    onClick={() => close(false)}
                    className="text-body-medium text-neutral-primary ease-standard flex h-13 items-center border-b border-black/5 px-4 uppercase transition-colors duration-[var(--duration-fast)] hover:bg-black/5 md:px-6"
                  >
                    {item.label}
                  </NextLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  )
}
