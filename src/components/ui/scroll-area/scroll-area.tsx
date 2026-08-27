import React from 'react'

import { cn } from '@/lib/cn'

/**
 * A scrollable region with the brand scrollbar, from Figma node 301:5934.
 *
 * **This styles the NATIVE scrollbar rather than reimplementing one.** The drawing shows a 6px
 * thumb between two 5px carets; the thumb and its colour are reproducible in CSS, the carets are
 * not portably (`::-webkit-scrollbar-button` has no Firefox equivalent). Rebuilding the scrollbar in
 * JavaScript to recover two 8x5px arrows would cost keyboard scrolling, trackpad momentum, the
 * platform's own overlay-scrollbar behaviour, and every assistive technology that understands a
 * native scroll container. That is a bad trade for the arrows, so they are dropped and the decision
 * recorded here rather than made silently.
 *
 * `tabIndex={0}` is not decoration: a region that scrolls but cannot be focused is unreachable by
 * keyboard, which axe reports as `scrollable-region-focusable`.
 */
export interface ScrollAreaProps extends React.ComponentProps<'div'> {
  orientation?: 'vertical' | 'horizontal'
  /** Names the region for assistive tech. A focusable scroll container should say what it holds. */
  label?: string
}

export function ScrollArea({
  orientation = 'vertical',
  label,
  className,
  children,
  ...props
}: ScrollAreaProps) {
  return (
    <div
      tabIndex={0}
      role={label ? 'region' : undefined}
      aria-label={label}
      className={cn(
        'scrollbar-subtle',
        orientation === 'vertical' ? 'overflow-y-auto' : 'overflow-x-auto',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
