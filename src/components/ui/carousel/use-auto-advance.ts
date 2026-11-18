'use client'

import React from 'react'

/**
 * A timer that advances something, and every rule that makes an auto-advancing thing acceptable
 *.
 *
 * Extracted rather than left inside `Carousel` because the product gallery needs the same timer
 * over a DIFFERENT root. Its photograph is a `Carousel`, but its thumbnail rail, its dots and its
 * arrows are not — and a visitor who has just chosen the fourth photograph from the rail must not
 * be moved off it two seconds later. The thing that has to pause is the whole gallery, so the root
 * is the caller's to name.
 *
 * **Auto-advancing content has to be stoppable** (WCAG 2.2 AA, 2.2.2), and this stops four ways:
 *
 *   never starts   for a visitor whose system asks for reduced motion. Asked once, at setup: they
 *                  are not asking to be surprised later, and re-reading it every tick answers a
 *                  question nobody re-asked
 *   holds          while the root is hovered or holds focus. Read at the tick rather than tracked
 *                  through four listeners, which have to get the child-to-child focus handoff
 *                  right to be correct
 *   holds          while the tab is in the background, where advancing something nobody can see is
 *                  pure battery
 *   stops for good on the first `pointerdown`, `keydown`, `wheel` or `touchstart` anywhere inside
 *                  the root. Someone who has started reading is not interrupted by a timer they
 *                  have already overridden
 *
 * Deliberately NOT stopped by `scroll`, which fires for the caller's own paging — a carousel that
 * stops itself on its own first tick is a slower static row.
 *
 * @param root     What pauses on hover and stops on interaction. Wider than the thing that moves.
 * @param interval Milliseconds between advances. `undefined` — the default everywhere — is off.
 * @param advance  Called on each tick. Read through a ref, so an inline arrow is fine.
 */
export function useAutoAdvance(
  root: React.RefObject<HTMLElement | null>,
  interval: number | undefined,
  advance: () => void,
): void {
  const latest = React.useRef(advance)
  React.useEffect(() => {
    latest.current = advance
  })

  React.useEffect(() => {
    if (!interval) return

    const element = root.current
    if (!element) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let stopped = false
    const stop = () => {
      stopped = true
    }

    const takeovers = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    for (const kind of takeovers) element.addEventListener(kind, stop, { passive: true })

    const timer = setInterval(() => {
      if (stopped || document.hidden) return
      if (element.matches(':hover') || element.matches(':focus-within')) return
      latest.current()
    }, interval)

    return () => {
      clearInterval(timer)
      for (const kind of takeovers) element.removeEventListener(kind, stop)
    }
  }, [root, interval])
}
