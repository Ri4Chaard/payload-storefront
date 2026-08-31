'use client'

import Image from 'next/image'
import React from 'react'

import { Carousel, useAutoAdvance } from '@/components/ui/carousel'
import { Icon } from '@/components/ui/icon'
import { Lightbox } from '@/components/ui/lightbox'
import type { CatalogImage } from '@/lib/catalog/types'
import type { IconName } from '@/lib/icon-registry'
import { cn } from '@/lib/cn'

/**
 * The product page's photography (003/T260–T263). Nodes `297:4567` (1920), `410:7300` (1024),
 * `410:7635` (390).
 *
 * **One gallery, drawn three ways.** The design looks like three components and is not:
 *
 *   1920   a 120px rail of 140px thumbnails standing to the LEFT of the photograph, with its own
 *          up/down paging beneath it (`297:4591`)
 *   1024   the same rail lying BENEATH the photograph as a row of five 68px squares (`410:7302`)
 *   390    no rail at all (`410:7635`). The photograph is swiped, and three dots (`410:7637`)
 *          report where in the set you are
 *
 * Building those as three components would mean three copies of "which photograph is showing", and
 * the full-screen viewer would have to ask a different one at each width. So there is one
 * `index`, one list of photographs in the DOM, and the three arrangements are CSS.
 *
 * **The photograph is a scroll-snap track at every width, not only at 390.** That is what makes the
 * mobile swipe free — it is the browser's own scrolling — and it costs nothing on a desktop, where
 * the rail drives the track and the arrows over the picture are turned off (`controls="none"`).
 * The alternative, rendering a single `<img>` above 768 and a track below it, puts every photograph
 * in the document twice: two downloads, two alt texts, and a screen reader that reads the set out
 * from the top a second time.
 *
 * **Both arrangements are keyboard-operable** (FR-033). The thumbnails and the dots are buttons,
 * the track is focusable and answers the arrow keys, and the photograph itself is a button that
 * opens the viewer.
 *
 * **The arrows beneath the rail page the PHOTOGRAPHS, not the rail** (owner, 2026-08-31). Figma
 * draws them inside the rail frame (`297:4591`), which reads as a scrollbar for the thumbnails —
 * but a rail that only ever scrolls is a control for a control, and the thing a visitor wants to
 * move is the picture. So they are previous/next over the set, the rail scrolls itself to keep the
 * current thumbnail in view, and they are present whenever there is more than one photograph rather
 * than only when the rail happens to overflow.
 *
 * **The set is a loop.** Next from the last photograph is the first. Three photographs of one
 * piece have no natural end to stop dead at — the same reasoning `ImageCarousel` uses for `wrap`,
 * and the opposite of a row of products, where wrapping hides whether you have seen everything.
 *
 * The loop is the SWIPE's as well as the controls'. `Carousel`'s `loop` puts a copy of the last
 * photograph before the first and a copy of the first after the last, so native scrolling never
 * runs out of track in either direction; landing on a copy steps silently onto its original once
 * the scrolling settles. The copies are `inert`, so the set is still announced once and still
 * tabbed through once, and they cost no downloads — same `src`, same cache entry.
 *
 * **A single photograph offers no controls.** No rail, no dots, no arrows — the whole point of a
 * control here is to say "there is more", and there is not.
 */
export interface ProductGalleryProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  images: CatalogImage[]
  /** What the photographs are OF — the product name. Every control's name is built from it. */
  label: string
  /** The first photograph is this page's LCP candidate on the product route, and nowhere else. */
  priority?: boolean
  /**
   * Milliseconds between automatic advances. Off by default.
   *
   * The whole gallery pauses, not just the photograph — the rail, the dots and the arrows are all
   * inside the root the timer watches, so choosing the fourth thumbnail is not undone five seconds
   * later. It stops for good on the first press, key or swipe, and never starts for a visitor who
   * asks for reduced motion. It also holds while the full-screen viewer is open, where advancing
   * the page underneath would move the ground the viewer stands on.
   */
  autoAdvance?: number
}

const THUMBNAIL =
  'relative h-17 w-17 shrink-0 overflow-hidden rounded-sm border border-transparent xl:h-35 xl:w-30 xl:rounded-none'

/** Previous and next over the set, drawn beneath the rail at 1920 (`297:4591`). */
const STEPS: readonly { icon: IconName; name: string; step: 1 | -1 }[] = [
  { icon: 'chevron-up', name: 'Show the previous photograph', step: -1 },
  { icon: 'chevron-down', name: 'Show the next photograph', step: 1 },
]

export function ProductGallery({
  images,
  label,
  priority = false,
  autoAdvance,
  className,
  ...props
}: ProductGalleryProps) {
  const [index, setIndex] = React.useState(0)
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)

  /**
   * The photographs themselves, so the viewer can grow out of the one that was pressed and put
   * focus back on it afterwards. `Lightbox` wants a live node rather than a measurement, because
   * the page may have scrolled between opening and closing.
   */
  const photographs = React.useRef<(HTMLButtonElement | null)[]>([])
  const thumbnails = React.useRef<(HTMLButtonElement | null)[]>([])
  const trigger = React.useRef<HTMLElement | null>(null)

  /**
   * Where focus goes when the viewer closes — the photograph currently showing, not the one that
   * opened it.
   *
   * This is not a preference, it is a correctness fix. `focus()` on an element inside a horizontal
   * scroller scrolls it into view, so pointing at the opening photograph after someone had paged
   * to the fourth dragged the track back to the first, and the scroll report then put the state
   * back with it. Whichever photograph you were looking at is also the one you came back to.
   */
  React.useEffect(() => {
    if (open) trigger.current = photographs.current[index] ?? null
  }, [open, index])

  /**
   * The rail follows the current photograph, however it became current — an arrow, a dot, a swipe,
   * the viewer being paged, the timer. Which is why this is an effect on `index` rather than a line
   * inside the thumbnail's own handler: the thumbnail is the one case that needs it least.
   *
   * `nearest` moves nothing when the thumbnail is already visible, which is most of the time; it
   * matters once the set is longer than the rail can show at once, and it is the whole reason the
   * rail needs no scroll control of its own.
   */
  const mounted = React.useRef(false)
  React.useEffect(() => {
    // Not on the first render. Nothing has moved yet, and scrolling something into view before the
    // visitor has done anything is how a page loads already scrolled.
    if (!mounted.current) {
      mounted.current = true
      return
    }

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    thumbnails.current[index]?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: still ? 'auto' : 'smooth',
    })
  }, [index])

  /** Previous or next over the set, wrapping at both ends. */
  function step(direction: 1 | -1) {
    setIndex((current) => (current + direction + images.length) % images.length)
  }

  // Held while the viewer is open, and never started for a set of one: both short-circuit the
  // interval to `undefined`, which tears the timer down and builds it again when the reason lifts.
  useAutoAdvance(rootRef, open || images.length < 2 ? undefined : autoAdvance, () => step(1))

  if (images.length === 0) {
    // A piece with no photography is a content problem, not a rendering one. The box keeps the
    // column's proportions so the information beside it does not jump, and says nothing.
    return (
      <div
        className={cn('bg-background-container aspect-square w-full rounded-md', className)}
        {...props}
      />
    )
  }

  const many = images.length > 1

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative flex flex-col gap-4',
        // 990px — the 120px rail, the 20px gap and the 850px photograph the design draws at 1920
        // (`297:4567`). Without it the photograph is a square that grows with the viewport, so a
        // 2560px monitor renders a 1200px picture of a ring. `Container` deliberately has no
        // max-width; this is the one element that needs its own, because it is the one whose
        // height follows its width.
        'xl:block xl:max-w-247.5',
        className,
      )}
      {...props}
    >
      {many ? (
        // Second in the DOM and second at 1024, where it is drawn beneath the photograph; first at
        // 1920, where it is drawn beside it. Reading order follows the picture at both widths.
        <div
          className={cn(
            'order-2 hidden min-w-0 flex-col gap-5 md:flex',
            /**
             * At 1280 the rail leaves the flow, and that is the only way the photograph can set
             * the height.
             *
             * A flex row is as tall as its tallest item's CONTENT, so a rail of ten 140px
             * thumbnails made the row 1580px tall and the photograph — a square that follows its
             * own width — simply sat inside it. The rail then always fitted, never overflowed, and
             * the up/down paging drawn at `297:4591` was measured as unnecessary and never
             * rendered. `min-height: 0` does not help: it governs shrinking within a height that
             * is already decided, and the rail was the thing deciding it.
             *
             * Out of the flow, the photograph is the only item left to set the height, and
             * `inset-y-0` hands that height straight back to the rail — which is exactly the
             * relationship the design draws, where the rail and the photograph are both 853px.
             */
            'xl:absolute xl:inset-y-0 xl:left-0 xl:w-30',
          )}
        >
          <div
            className={cn(
              'flex min-h-0 flex-1 gap-3 overflow-auto',
              'xl:flex-col xl:gap-5',
              // The rail is a list of controls, not a scroller anyone needs to reach directly —
              // every thumbnail in it is already a tab stop.
              '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            )}
          >
            {images.map((image, position) => (
              <button
                key={`${image.src}-${position}`}
                ref={(node) => {
                  thumbnails.current[position] = node
                }}
                type="button"
                // `aria-current` rather than `aria-pressed`: these are five views of one thing and
                // exactly one of them is showing, which is what "current" means.
                aria-current={position === index}
                aria-label={`Show photograph ${position + 1} of ${images.length}`}
                onClick={() => setIndex(position)}
                className={cn(
                  THUMBNAIL,
                  'ease-standard transition-colors duration-[var(--duration-fast)]',
                  'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
                  position === index
                    ? 'border-primary-default border-[1.5px] xl:border-2'
                    : 'hover:border-black/20',
                )}
              >
                <Image
                  src={image.src}
                  // Named by the button above it. Repeating the alt here makes a screen reader say
                  // the same photograph twice.
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 120px, 68px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>

          <div className="hidden gap-5 xl:flex">
            {STEPS.map(({ icon, name, step: direction }) => (
              <button
                key={icon}
                type="button"
                aria-label={name}
                onClick={() => step(direction)}
                className={cn(
                  'grid size-12.5 shrink-0 place-items-center border border-black/10',
                  'text-neutral-primary ease-standard transition-colors duration-[var(--duration-fast)]',
                  'hover:border-neutral-primary',
                )}
              >
                <Icon name={icon} size="sm" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* 140px at 1280 — the rail's 120px and the 20px gap it is drawn with. Only when there IS a
          rail: one photograph must not leave a column of empty space beside it. */}
      <div className={cn('relative order-1 min-w-0 flex-1', many && 'xl:ml-35')}>
        <Carousel
          label={`Photographs of ${label}`}
          prevLabel={`Previous photograph of ${label}`}
          nextLabel={`Next photograph of ${label}`}
          controls="none"
          // The swipe loops too, not only the arrows and the dots (owner, 2026-08-31). `Carousel`
          // puts a copy of the last photograph before the first and a copy of the first after the
          // last, both `inert`, and steps off them once the scrolling settles.
          loop
          activeIndex={index}
          onActiveIndexChange={setIndex}
          itemClassName="w-full snap-center"
          className="bg-background-container aspect-square rounded-md xl:rounded-none"
          items={images.map((image, position) => (
            <button
              key={`${image.src}-${position}`}
              ref={(node) => {
                /**
                 * `Carousel`'s loop paints the first and last photographs TWICE, and both copies
                 * run this callback — so without the guard the entry ends up pointing at the
                 * `inert` copy, which is then what the viewer grows out of and what focus is
                 * handed back to on close. Focus on an inert element goes nowhere.
                 *
                 * The cleanup only clears the entry it actually set: a copy unmounting must not
                 * take the original's node with it.
                 */
                if (!node || node.closest('[inert]')) return
                photographs.current[position] = node
                return () => {
                  if (photographs.current[position] === node) photographs.current[position] = null
                }
              }}
              type="button"
              // The photograph's own description PLUS what pressing it does. An `aria-label` alone
              // would replace the alt text rather than add to it, and the alt is the only place the
              // piece is described to someone who cannot see it.
              aria-label={`${image.alt ?? label} — open full screen`}
              onClick={() => {
                trigger.current = photographs.current[position] ?? null
                setIndex(position)
                setOpen(true)
              }}
              className="relative block size-full cursor-zoom-in"
            >
              <Image
                src={image.src}
                alt={image.alt ?? ''}
                fill
                sizes="(min-width: 1280px) 850px, (min-width: 768px) 400px, 100vw"
                priority={priority && position === 0}
                className="object-cover"
              />
            </button>
          ))}
        />

        {many ? (
          // Drawn only at 390 (`410:7637`), where there is no rail to say where you are.
          //
          // The dots are 8px and 6px apart in the design, which is a 14px target. WCAG 2.2 AA
          // 2.5.8 wants 24px, and the spacing exception does not save an 8px dot at that pitch —
          // so the CONTROL is 24px and the drawn dot is what it contains. The row is wider than
          // the drawn 36px as a result; the dots themselves are exactly as drawn.
          <div className="absolute inset-x-0 bottom-4 flex justify-center md:hidden">
            {images.map((image, position) => (
              <button
                key={`${image.src}-${position}`}
                type="button"
                aria-current={position === index}
                aria-label={`Show photograph ${position + 1} of ${images.length}`}
                onClick={() => setIndex(position)}
                className="grid size-6 place-items-center"
              >
                <span
                  className={cn(
                    'ease-standard size-2 rounded-full transition-colors duration-[var(--duration-fast)]',
                    position === index ? 'bg-primary-default' : 'bg-black/30',
                  )}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Lightbox
        open={open}
        onClose={() => setOpen(false)}
        images={images}
        index={index}
        onIndexChange={setIndex}
        label={label}
        triggerRef={trigger}
        thumbnailFor={(position) => photographs.current[position] ?? null}
      />
    </div>
  )
}
