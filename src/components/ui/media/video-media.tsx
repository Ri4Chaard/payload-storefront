'use client'

import Image from 'next/image'
import React from 'react'

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
 * **The poster is a real `next/image`, not the `poster` attribute.** The attribute takes a raw URL
 * and skips the image pipeline entirely — no AVIF, no responsive sizes, no width and height for the
 * browser to reserve a box from. Layering the optimised image beneath the video keeps Constitution
 * V's image rules intact for the frame a visitor is most likely to actually see.
 */
export interface VideoMediaProps {
  src: string
  poster: { src: string; width: number; height: number; alt?: string }
  sizes?: string
  priority?: boolean
  /** No controls, and no sound. A backdrop is imagery, not media a visitor operates. */
  background?: boolean
}

export function VideoMedia({
  src,
  poster,
  sizes = '100vw',
  priority = false,
  background = false,
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
        className="object-cover"
      />

      {play ? (
        <video
          src={src}
          autoPlay
          muted
          loop
          playsInline
          controls={!background}
          // The poster attribute as well as the image beneath: it is what the element shows in the
          // instant between the `src` being set and the first frame decoding.
          poster={poster.src}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </div>
  )
}
