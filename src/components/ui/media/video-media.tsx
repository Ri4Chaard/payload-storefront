'use client'

import Image from 'next/image'
import React from 'react'

import { cn } from '@/lib/cn'

/**
 * A video that behaves (006/T048) — the only client component this feature adds.
 *
 * Everything a background video needs is native: `poster`, `muted`, `loop`, `playsInline` and
 * `preload` are all `<video>` attributes, and a server-rendered element would satisfy most of the
 * design. Two rules are not expressible that way, and each of them is a requirement rather than a
 * refinement:
 *
 *   **Reduced motion (FR-024).** CSS cannot suppress autoplay. `@media (prefers-reduced-motion)`
 *   can hide the element, but it would still play and still download — invisible, not stopped.
 *   Only `matchMedia` can answer the question before the file is requested.
 *
 *   **Deferred download (FR-024a).** `preload="none"` does not survive `autoPlay`: setting autoplay
 *   makes the browser fetch immediately regardless. So the attribute cannot be the mechanism.
 *
 * **Both are solved the same way: the `src` is withheld.** No `<source>` exists until the slot has
 * scrolled into view AND motion is allowed, so a band the visitor never reaches costs them nothing,
 * and a visitor who asked for stillness is never sent the bytes at all. Until then — and forever,
 * for that visitor — the poster is what is on screen.
 *
 * That also makes the failure modes free. A video deleted from the library, a codec the browser
 * refuses, a connection that drops: in every case the poster is already rendered underneath, so
 * there is nothing to fall back to because nothing was ever replaced.
 *
 * **The poster is a real `next/image`, and the `poster` ATTRIBUTE is deliberately not set.** The
 * attribute takes a raw URL and skips the image pipeline entirely — no AVIF, no responsive sizes,
 * no dimensions for the browser to reserve a box from. Layering the optimised image beneath the
 * video keeps Constitution V's image rules intact for the frame a visitor is most likely to see.
 *
 * Setting BOTH, which an earlier version did, is worse than setting either. Measuring `/about` with
 * a video in the first plate put LCP at 2.59s against a 2.5s budget, and the LCP element was the
 * `<video>` painting its `poster` attribute — a second, unoptimised copy of an image already on
 * screen, arriving late enough to become the largest paint. With all seven slots as photographs the
 * same page measured 1.44s. The attribute buys nothing here: the video sits transparent over the
 * image until its first frame decodes, so the optimised poster is what shows in that gap anyway.
 *
 * **No `controls`, anywhere.** Every media slot on this page is imagery — a full-bleed plate, a
 * detail panel, a banner backdrop, a step tile — and a video in one of them is a moving photograph
 * rather than something a visitor operates. An earlier version showed controls on any slot that was
 * not a backdrop, which put a scrub bar and a play button across the process-steps tiles: player
 * chrome on a picture, and nothing in the design draws it. FR-023 permits controls on a subject
 * video (`MAY`) rather than requiring them, and no block here is that.
 *
 * **The consequence, stated rather than hidden: WCAG 2.2 SC 2.2.2 (Pause, Stop, Hide) asks for an
 * in-page mechanism to stop moving content that starts automatically, lasts over five seconds and
 * sits alongside other content.** The `controls` attribute was that mechanism by accident. What is
 * left is the reduced-motion path above, which is a real accommodation and is not what 2.2.2 asks
 * for. Closing it properly means a pause affordance that is not player chrome — the whole frame as
 * a labelled button, say, invisible until focused. That is a deliberate product decision rather
 * than a detail to slip in here, so it is written down instead of assumed.
 */
export interface VideoMediaProps {
  src: string
  poster: { src: string; width: number; height: number; alt?: string }
  sizes?: string
  priority?: boolean
  /** Matches `Media`'s, so a slot looks the same whichever kind it holds. */
  fit?: 'cover' | 'contain'
}

export function VideoMedia({
  src,
  poster,
  sizes = '100vw',
  priority = false,
  fit = 'cover',
}: VideoMediaProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [play, setPlay] = React.useState(false)

  React.useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches) return

    const node = ref.current
    if (!node) return

    // `IntersectionObserver` is universally available in the browsers this site targets, but a
    // missing implementation must not mean a permanently blank band — fall back to playing.
    if (typeof IntersectionObserver === 'undefined') {
      setPlay(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setPlay(true)
          observer.disconnect()
        }
      },
      // A little before the band arrives, so the first frame is ready rather than arriving late.
      { rootMargin: '200px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    // Fills the frame `Media` established, so the scrim it draws sits above both branches alike.
    <div ref={ref} className="absolute inset-0">
      {/*
        Always rendered, never swapped out. It holds the box, it is what a reduced-motion visitor
        keeps, and it is what shows if the video cannot play.
      */}
      <Image
        src={poster.src}
        alt={poster.alt ?? ''}
        fill
        sizes={sizes}
        priority={priority}
        className={fit === 'contain' ? 'object-contain' : 'object-cover'}
      />

      {play ? (
        <video
          src={src}
          autoPlay
          muted
          loop
          playsInline
          className={cn(
            'absolute inset-0 h-full w-full',
            fit === 'contain' ? 'object-contain' : 'object-cover',
          )}
        />
      ) : null}
    </div>
  )
}
