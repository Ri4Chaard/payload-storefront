'use client'

import React from 'react'

import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'

import { useAutoAdvance } from './use-auto-advance'

/**
 * A scroll-snap track with arrows (002/T119), extracted from `ImageCarousel`.
 *
 * The home page's product row needs the same mechanism over different children — cards instead of
 * photographs. Copying it would be the near-duplicate Constitution II exists to prevent, so the
 * mechanism moved here and `ImageCarousel` became its first caller.
 *
 * **Still no carousel library.** The reasoning from `ImageCarousel` holds and is worth repeating,
 * because this is where the temptation returns: PhotoSwipe is a fullscreen lightbox that fights
 * being driven inline, and Swiper is ~150KB to move a strip sideways. A snap track gets native
 * touch swipe, native momentum, native keyboard scrolling, and it still works with JavaScript
 * disabled — the arrows stop, the track still scrolls. `scrollTo` is the entire runtime cost.
 *
 * `tabIndex={0}` on the track is not optional. A scrollable region a keyboard cannot reach is a
 * WCAG failure (axe's `scrollable-region-focusable`), and it is what makes the arrow keys work.
 *
 * The container must NOT create a stacking context — no `isolate`, no `z-index`. `ProductCard`
 * stretches its title link over the whole card with an inset pseudo-element and the arrows lift
 * above it with `z-10`; a stacking context here would trap them underneath, leaving controls that
 * look live and do nothing.
 *
 * **Two paging modes, because the two callers mean different things by "the end".**
 *
 *   `wrap`     three photographs of one product. Stopping dead on the third reads as broken, and
 *              the arrows are the only affordance saying there are more.
 *   clamped    a row of products. Wrapping from the last product back to the first is disorienting —
 *              a visitor cannot tell whether they have seen everything — so the arrows stop, and
 *              each one disappears when there is nothing on that side.
 *
 * The clamped arrows are also the answer to "an arrow that pages to nothing": with four products in
 * a row that fits four, neither arrow ever appears. That is exactly what the design draws, where
 * the desktop frame parks its scroll control at `hidden`.
 *
 * **Reach is measured, not assumed.** It has to be: whether a track overflows depends on the
 * viewport, the item count and the font, none of which are known at build time. The consequence is
 * that clamped arrows are absent until the effect runs — which is the correct no-JavaScript
 * behaviour too, since an arrow that cannot page is worse than no arrow.
 */
export interface CarouselProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  items: React.ReactNode[]
  /** The scrolling region's accessible name. */
  label: string
  prevLabel: string
  nextLabel: string
  /** Page past the last item back to the first. Off by default — see the note above. */
  wrap?: boolean
  /**
   * `hover` hides the arrows until the surrounding `group` is hovered or focused. `none` removes
   * them entirely, for a track paged from somewhere else — the product gallery's thumbnail rail
   * drives the photograph, and a second pair of arrows over the picture is not drawn and not wanted.
   */
  controls?: 'always' | 'hover' | 'none'
  /**
   * Which item the track is showing, counted from the item nearest the scroll start.
   *
   * Supplying it drives the track: change the number and it scrolls there. Supplying
   * `onActiveIndexChange` reports the other direction — a swipe, an arrow key, a drag on the
   * scrollbar. Together they make the track a controlled component, which is what lets a gallery
   * keep its thumbnails, its dots and its full-screen viewer all pointing at the same photograph.
   *
   * Leave both off and the track is uncontrolled, which is every caller that only ever scrolls.
   *
   * "Nearest the scroll start" is exact for a track of full-width items and deliberate for a track
   * of several: a row of four product cards reports its leftmost visible card.
   */
  activeIndex?: number
  onActiveIndexChange?: (index: number) => void
  /**
   * Milliseconds between automatic pages. Omit — the default — for a track that moves only when it
   * is asked to, which is every caller that is not a shop window. `useAutoAdvance` carries the
   * rules that make it acceptable; the short version is that it stops the moment anyone touches it
   * and never starts for a visitor who asked for less motion. At the end it returns to the start,
   * whatever `wrap` says.
   */
  autoAdvance?: number
  /**
   * A track with no ends: swiping past the last item arrives at the first, and the swipe itself
   * loops, not merely the arrows.
   *
   * Different from `wrap`, and the two answer different questions. `wrap` is about what an ARROW at
   * the last item does; the touch gesture underneath it still stops dead, because native scrolling
   * has ends. `loop` removes the ends by putting a copy of the last item before the first and a
   * copy of the first after the last: a swipe onto a copy is silently repositioned onto its
   * original once the scrolling settles, so the track never runs out in either direction.
   *
   * The copies are `inert` and `aria-hidden`, so a screen reader and the tab order still see each
   * item exactly once. They cost no downloads — same `src`, same cache entry.
   *
   * They are also added only AFTER mount. Rendering them on the server would put the copy of the
   * last item at scroll offset zero, so the first paint would show the LAST photograph before
   * hydration corrected it. Added afterwards, in a layout effect that compensates the scroll
   * position in the same frame, nothing is ever painted out of place.
   */
  loop?: boolean
  itemClassName?: string
  trackClassName?: string
  arrowClassName?: string
}

/**
 * Move the track by `delta` with no animation, whatever the stylesheet says.
 *
 * `scrollLeft = x` is NOT instant here. The track carries `scroll-behavior: smooth`, and that
 * applies to a scroll started by assignment just as much as to one started by a click — so the
 * correction that steps off a loop copy animated all the way back across the track in full view.
 * The visitor saw the first photograph arrive and then rewind to itself.
 *
 * `behavior: 'instant'` is the one value that overrides the declaration rather than deferring to it
 * — which is what `'auto'` does, and why `'auto'` would have the same bug.
 */
function jump(track: HTMLElement, delta: number): void {
  track.scrollTo({ left: track.scrollLeft + delta, behavior: 'instant' })
}

/**
 * `useLayoutEffect` on the client, `useEffect` on the server — where it does nothing either way and
 * React says so out loud. The compensation below has to run before paint, which rules out the
 * plain effect; the warning is noise about a body that never executes there.
 */
const useBeforePaint = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect

/**
 * Which child sits closest to the track's scroll start. Measured from live rectangles because the
 * items' widths, the gap and the writing direction are all the caller's to decide.
 */
function nearestTo(track: HTMLElement): number {
  const origin = track.getBoundingClientRect().left
  let best = 0
  let smallest = Infinity

  Array.from(track.children).forEach((child, index) => {
    const distance = Math.abs(child.getBoundingClientRect().left - origin)
    if (distance < smallest) {
      smallest = distance
      best = index
    }
  })

  return best
}

export function Carousel({
  items,
  label,
  prevLabel,
  nextLabel,
  wrap = false,
  controls = 'always',
  activeIndex,
  onActiveIndexChange,
  autoAdvance,
  loop = false,
  itemClassName,
  trackClassName,
  arrowClassName,
  className,
  ...props
}: CarouselProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const trackRef = React.useRef<HTMLUListElement>(null)
  const [reach, setReach] = React.useState({ start: true, end: true })

  /**
   * The copies exist only once there is a browser to swipe in. See `loop` above: server-rendering
   * them would paint the last item first.
   */
  const [looping, setLooping] = React.useState(false)
  const canLoop = loop && items.length > 1
  React.useEffect(() => setLooping(canLoop), [canLoop])

  /** A position in the DOM ↔ a position in `items`. They differ by the leading copy. */
  const toItem = (position: number) =>
    looping ? (position - 1 + items.length) % items.length : position
  const toPosition = (index: number) => (looping ? index + 1 : index)

  /**
   * Puts the copies in and takes the scroll position with them, in the frame the DOM changes —
   * inserting an item before the first one otherwise shifts everything right under the visitor.
   */
  useBeforePaint(() => {
    if (!looping) return
    const track = trackRef.current
    const first = track?.children[1]
    if (!track || !first) return

    jump(track, first.getBoundingClientRect().left - track.getBoundingClientRect().left)
  }, [looping])

  /**
   * The last index handed outward. It exists to stop the report firing on every scroll frame —
   * a swipe produces dozens — and to keep the two directions from chasing each other: the effect
   * below scrolls in response to `activeIndex`, and that scroll would otherwise be reported back
   * as a change the caller has to absorb.
   */
  const reported = React.useRef(activeIndex ?? 0)

  /** Read at the moment it is needed. The scroll listener is installed once; this is not. */
  const notify = React.useRef(onActiveIndexChange)
  React.useEffect(() => {
    notify.current = onActiveIndexChange
  })

  const settling = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const update = () => {
      const max = track.scrollWidth - track.clientWidth
      // A track with nothing to scroll reports BOTH ends reached, which is what makes
      // `start && end` mean "does not overflow".
      setReach({ start: track.scrollLeft <= 1, end: track.scrollLeft >= max - 1 })

      /**
       * Reported when the scrolling STOPS, not while it is happening.
       *
       * Mid-flight positions are not answers. A smooth scroll from the first photograph to the
       * third passes over the second, and reporting that would hand the caller an index it never
       * asked for — which, when the caller is driving the track from `activeIndex`, turns into the
       * two directions fighting: the report moves the caller's state back, the caller scrolls
       * again, and the track settles wherever the argument happened to end.
       *
       * `scrollend` would say this exactly, and is not in Safari yet. A short quiet period says
       * the same thing everywhere.
       */
      const report = notify.current
      if (!report) return

      if (settling.current) clearTimeout(settling.current)
      settling.current = setTimeout(() => {
        const position = nearestTo(track)

        // Landed on a copy — silently step onto its original. Instant, never smooth: this is a
        // correction the visitor must not be able to see, and it happens only once the scrolling
        // has stopped, so there is no momentum left to fight.
        if (looping && (position === 0 || position === items.length + 1)) {
          const twin = track.children[position === 0 ? items.length : 1]
          if (twin) jump(track, twin.getBoundingClientRect().left - track.getBoundingClientRect().left)
        }

        const index = toItem(position)
        if (index === reported.current) return
        reported.current = index
        report(index)
      }, 120)
    }

    update()
    track.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(track)

    return () => {
      if (settling.current) clearTimeout(settling.current)
      track.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [items.length, looping])

  React.useEffect(() => {
    if (activeIndex === undefined) return
    const track = trackRef.current
    if (!track) return

    /**
     * While looping, the first and last items each exist in TWO places, and which one to scroll to
     * decides whether the loop is seamless.
     *
     * Pressing "next" on the last photograph asks for item 0. Scrolling to the real item 0 rakes
     * the whole track backwards past everything; scrolling to the COPY of item 0 that sits just to
     * the right carries on in the direction the visitor was going, and the settle above then steps
     * onto the original without anyone seeing. So both candidates are measured and the nearer one
     * wins, which is the same rule for either direction and needs no notion of "forward".
     */
    const twin =
      !looping || items.length < 2
        ? null
        : // Only the first and last items exist twice: the first is copied to the far right, the
          // last to the far left. Everything between them has exactly one place to be, and
          // offering a "nearer" alternative for those was a bug that flung the track onto the copy
          // of the last photograph whenever it happened to be closer.
          activeIndex === 0
          ? items.length + 1
          : activeIndex === items.length - 1
            ? 0
            : null

    const candidates = twin === null ? [toPosition(activeIndex)] : [toPosition(activeIndex), twin]

    // Measured rather than read off `offsetLeft`, which is relative to whichever ancestor happens
    // to be positioned — and the track's ancestors belong to the caller.
    const origin = track.getBoundingClientRect().left
    let delta: number | null = null
    for (const position of candidates) {
      const item = track.children[position]
      if (!item) continue
      const candidate = item.getBoundingClientRect().left - origin
      if (delta === null || Math.abs(candidate) < Math.abs(delta)) delta = candidate
    }

    if (delta === null || Math.abs(delta) < 1) return

    if (settling.current) clearTimeout(settling.current)
    reported.current = activeIndex
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollTo({ left: track.scrollLeft + delta, behavior: still ? 'auto' : 'smooth' })
  }, [activeIndex, looping])

  useAutoAdvance(rootRef, autoAdvance, () => {
    const track = trackRef.current
    if (!track) return

    const max = track.scrollWidth - track.clientWidth
    if (max <= 1) return // Everything fits. There is nothing to advance TO.

    // Back to the beginning at the end, whatever `wrap` says about the arrows. `wrap` is about
    // what an ARROW at the last item should do; this is about a loop that has finished.
    if (track.scrollLeft >= max - 1) track.scrollTo({ left: 0, behavior: 'smooth' })
    else page(1)
  })

  function page(direction: 1 | -1) {
    const track = trackRef.current
    if (!track) return

    const width = track.clientWidth
    const last = track.scrollWidth - width
    const next = track.scrollLeft + direction * width

    // `scroll-smooth` is a CSS declaration and a JS `behavior` overrides it, so the preference has
    // to be read here as well as suppressed in the class list.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // While looping there is nothing to clamp against: the copies at either end ARE the extra
    // room, and the settle steps off them afterwards.
    track.scrollTo({
      left:
        wrap && !looping
          ? next > last + 1
            ? 0
            : next < -1
              ? last
              : next
          : Math.max(0, Math.min(next, last)),
      behavior: still ? 'auto' : 'smooth',
    })
  }

  const overflows = !(reach.start && reach.end)
  const paged = controls !== 'none'
  // A looping track has no ends to run out of, so its arrows are always live — the same conclusion
  // `wrap` reaches, by a different route.
  const endless = wrap || looping
  const showPrev = paged && (endless ? items.length > 1 : overflows && !reach.start)
  const showNext = paged && (endless ? items.length > 1 : overflows && !reach.end)

  const arrow = cn(
    'absolute top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center',
    'text-neutral-primary ease-standard transition-opacity duration-[var(--duration-base)]',
    'hover:text-primary-default',
    // Hidden until hover, but never hidden from the keyboard — `group-focus-within` brings them
    // back — and never on touch, where there is no hover to give them back.
    controls === 'hover' &&
      'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100',
    arrowClassName,
  )

  return (
    <div ref={rootRef} className={cn('relative w-full overflow-hidden', className)} {...props}>
      <ul
        ref={trackRef}
        tabIndex={0}
        aria-label={label}
        className={cn(
          'flex size-full snap-x snap-mandatory overflow-x-auto scroll-smooth',
          'motion-reduce:scroll-auto',
          // The scrollbar is the thing that would give the track away as a scroller. Hidden in
          // both vocabularies; the arrows and the swipe are the affordance.
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          trackClassName,
        )}
      >
        {(looping
          ? [
              { node: items[items.length - 1], copy: true },
              ...items.map((node) => ({ node, copy: false })),
              { node: items[0], copy: true },
            ]
          : items.map((node) => ({ node, copy: false }))
        ).map(({ node, copy }, position) => (
          // Keyed by position. A track may legitimately repeat content — and while looping it
          // certainly does — and React silently drops the duplicate when two siblings share a key.
          <li
            key={position}
            // The copies are scenery. `inert` takes them and everything inside them out of the tab
            // order and out of the accessibility tree, so each item is still announced once and
            // still focusable once, however many times it is painted.
            {...(copy ? { inert: true, 'aria-hidden': true } : {})}
            className={cn('shrink-0', itemClassName)}
          >
            {node}
          </li>
        ))}
      </ul>

      {showPrev ? (
        <button
          type="button"
          aria-label={prevLabel}
          onClick={() => page(-1)}
          className={cn(arrow, 'left-2.5')}
        >
          <Icon name="chevron-left" size="sm" />
        </button>
      ) : null}

      {showNext ? (
        <button
          type="button"
          aria-label={nextLabel}
          onClick={() => page(1)}
          className={cn(arrow, 'right-2.5')}
        >
          <Icon name="chevron-right" size="sm" />
        </button>
      ) : null}
    </div>
  )
}
