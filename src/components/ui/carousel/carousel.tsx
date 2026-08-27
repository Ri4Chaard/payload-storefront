'use client'

import React from 'react'

import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'

/**
 * A scroll-snap track with arrows (002/T119), extracted from `ImageCarousel`.
 *
 * The home page's jewelry row needs the same mechanism over different children — cards instead of
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
 *   clamped    a row of products. Wrapping from the last piece back to the first is disorienting —
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
  /** `hover` hides the arrows until the surrounding `group` is hovered or focused. */
  controls?: 'always' | 'hover'
  itemClassName?: string
  trackClassName?: string
  arrowClassName?: string
}

export function Carousel({
  items,
  label,
  prevLabel,
  nextLabel,
  wrap = false,
  controls = 'always',
  itemClassName,
  trackClassName,
  arrowClassName,
  className,
  ...props
}: CarouselProps) {
  const trackRef = React.useRef<HTMLUListElement>(null)
  const [reach, setReach] = React.useState({ start: true, end: true })

  React.useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const update = () => {
      const max = track.scrollWidth - track.clientWidth
      // A track with nothing to scroll reports BOTH ends reached, which is what makes
      // `start && end` mean "does not overflow".
      setReach({ start: track.scrollLeft <= 1, end: track.scrollLeft >= max - 1 })
    }

    update()
    track.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(track)

    return () => {
      track.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [items.length])

  function page(direction: 1 | -1) {
    const track = trackRef.current
    if (!track) return

    const width = track.clientWidth
    const last = track.scrollWidth - width
    const next = track.scrollLeft + direction * width

    // `scroll-smooth` is a CSS declaration and a JS `behavior` overrides it, so the preference has
    // to be read here as well as suppressed in the class list.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    track.scrollTo({
      left: wrap
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
  const showPrev = wrap ? items.length > 1 : overflows && !reach.start
  const showNext = wrap ? items.length > 1 : overflows && !reach.end

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
    <div className={cn('relative w-full overflow-hidden', className)} {...props}>
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
        {items.map((item, index) => (
          // Keyed by position. A track may legitimately repeat content, and React silently drops
          // the duplicate when two siblings share a key.
          <li key={index} className={cn('shrink-0', itemClassName)}>
            {item}
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
