'use client'

import Image from 'next/image'
import React from 'react'

import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'

/**
 * The image strip inside a product card (node 144:948) — arrows at the left and right edges of the
 * photograph, 14px, appearing on hover.
 *
 * **No carousel library.** The brief suggested PhotoSwipe, with Swiper as the fallback. Neither is
 * right here, for different reasons:
 *
 * - PhotoSwipe is a FULLSCREEN lightbox. Its whole design is taking over the viewport: it sets body
 *   styles, traps focus, and brings its own chrome. Driving it inline means fighting every one of
 *   those. It is the right tool for the product page's zoom, and should be added there — this is
 *   not that.
 * - Swiper is a real carousel, but it is ~150KB of JavaScript to move between three photographs, and
 *   a listing grid renders twenty of these at once.
 *
 * What this needs is a scroll-snap track: native touch swipe, native momentum, native keyboard
 * scrolling, and it still works with JavaScript disabled — the arrows stop, the strip still scrolls.
 * The arrows call `scrollBy`, which is the entire runtime cost.
 *
 * `tabIndex={0}` on the track is not optional. A scrollable region that keyboard users cannot reach
 * is a WCAG failure (axe's `scrollable-region-focusable`), and it is what makes the arrow keys work.
 *
 * The container must NOT create a stacking context — no `isolate`, no `z-index`. `ProductCard`
 * stretches its title link over the whole card with an inset pseudo-element, and the arrows lift
 * themselves above it with `z-10`. A stacking context here would trap them underneath, leaving two
 * buttons that look live and do nothing.
 */
export interface ImageCarouselProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  images: { src: string; alt?: string }[]
  /** What the photographs are OF — a product name. Every control's name is built from it. */
  label: string
  /** `hover` hides the arrows until the surrounding `group` is hovered or focused (node 144:948). */
  controls?: 'always' | 'hover'
  sizes?: string
  priority?: boolean
}

export function ImageCarousel({
  images,
  label,
  controls = 'always',
  sizes = '(min-width: 1280px) 415px, (min-width: 768px) 33vw, 100vw',
  priority = false,
  className,
  ...props
}: ImageCarouselProps) {
  const trackRef = React.useRef<HTMLUListElement>(null)

  function page(direction: 1 | -1) {
    const track = trackRef.current
    if (!track) return
    const width = track.clientWidth
    const last = track.scrollWidth - width
    // Wrap at both ends. A strip of three photographs that stops dead on the third reads as broken,
    // and the arrows are the only affordance saying there are more.
    const next = track.scrollLeft + direction * width
    track.scrollTo({
      left: next > last + 1 ? 0 : next < -1 ? last : next,
      behavior: 'smooth',
    })
  }

  const arrow = cn(
    'absolute top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center',
    'text-neutral-primary ease-standard transition-opacity duration-[var(--duration-base)]',
    'hover:text-primary-default',
    // Hidden until the card is hovered, but never hidden from the keyboard — `group-focus-within`
    // brings them back — and never hidden on touch, where there is no hover to give them back.
    controls === 'hover' &&
      'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100',
  )

  return (
    <div className={cn('relative w-full overflow-hidden', className)} {...props}>
      <ul
        ref={trackRef}
        tabIndex={0}
        aria-label={`Photographs of ${label}`}
        className={cn(
          'flex size-full snap-x snap-mandatory overflow-x-auto scroll-smooth',
          // The scrollbar is the thing that would give the strip away as a scroller. Hidden in both
          // vocabularies; the arrows and the swipe are the affordance.
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {images.map((image, index) => (
          // Keyed by position, not by `src`. A strip may legitimately repeat a photograph, and
          // React silently drops the duplicate when two siblings share a key.
          <li
            key={`${image.src}-${index}`}
            className="relative aspect-square w-full shrink-0 snap-center"
          >
            <Image
              src={image.src}
              alt={image.alt ?? ''}
              fill
              sizes={sizes}
              priority={priority && index === 0}
              className="object-cover"
            />
          </li>
        ))}
      </ul>

      {images.length > 1 ? (
        <>
          <button
            type="button"
            aria-label={`Previous photograph of ${label}`}
            onClick={() => page(-1)}
            className={cn(arrow, 'left-2.5')}
          >
            <Icon name="chevron-left" size="sm" />
          </button>
          <button
            type="button"
            aria-label={`Next photograph of ${label}`}
            onClick={() => page(1)}
            className={cn(arrow, 'right-2.5')}
          >
            <Icon name="chevron-right" size="sm" />
          </button>
        </>
      ) : null}
    </div>
  )
}
