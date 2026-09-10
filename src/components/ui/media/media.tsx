import Image from 'next/image'
import React from 'react'

import { cn } from '@/lib/cn'

import { VideoMedia } from './video-media'

/**
 * A photograph or a video, in one frame (006/T026, T049).
 *
 * Every band that shows imagery renders through this, so the seven slots the design draws behave
 * identically: the same crop, the same box reserved before anything loads, the same fallback.
 *
 * **`src`, `width` and `height` are always a STILL image** — the photograph itself, or a video's
 * poster. The data layer guarantees it (see `src/lib/story/types.ts`), and it is what makes layout
 * shift structurally impossible rather than carefully avoided: the box is known before the network
 * is consulted, whatever the slot turns out to hold.
 *
 * **The box is the caller's, and the fill is this component's.** Bands are drawn at fixed heights
 * per breakpoint — 240 / 400 / 530 for a full-bleed plate — which is a property of the band, not of
 * the picture in it. So the caller sizes the frame with `className` and this crops to it.
 *
 * **This component picks the branch, rather than the caller picking a component.** A photograph slot
 * then mounts no client JavaScript at all, and the cost of video is paid per slot that holds one.
 *
 * The props are structural rather than an imported view model, matching `CategoryCard` and
 * `ProductCard`: the kit describes what it needs and the data layer's `StoryMedia` satisfies it.
 */
export interface MediaProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  media: {
    kind: 'photo' | 'video'
    src: string
    width: number
    height: number
    /** Absent where the media is decoration beside copy that already names it. */
    alt?: string
    /** Present only for a video. The file to play, once it is allowed to load. */
    videoSrc?: string
  }
  /** Responsive hint for the still image. Defaults to full viewport width. */
  sizes?: string
  /** Set on the one image above the fold. Everything else stays lazy. */
  priority?: boolean
  /**
   * How the media fills its frame.
   *
   * `cover` is right for a plate whose job is to fill the width — cropping a full-bleed photograph
   * is what makes it full-bleed. `contain` is right when the subject IS the picture and must not be
   * cut: the detail band's side panel shows one necklace on its own ground, and covering it crops
   * the ends off.
   */
  fit?: 'cover' | 'contain'
  /**
   * The band lays text over this, so the media gets a scrim behind the copy.
   *
   * Decided by the block, never by the editor — a "put text over this" switch on a band that always
   * does would be a setting with one correct value. It no longer reaches `VideoMedia`: a video is
   * imagery in every slot on this page, so there is nothing left for the distinction to change
   * there.
   */
  background?: boolean
  /**
   * Which edge the text column is against, so the scrim fades away from it.
   *
   * Only consulted above `lg`. Below it the text spans the full width and a directional fade would
   * leave half of it unprotected — see the note on the scrim below.
   */
  scrimFrom?: 'left' | 'right'
}

export function Media({
  media,
  sizes = '100vw',
  priority = false,
  background = false,
  scrimFrom = 'left',
  fit = 'cover',
  className,
  ...props
}: MediaProps) {
  return (
    <div className={cn('relative overflow-hidden', className)} {...props}>
      {media.kind === 'video' && media.videoSrc ? (
        <VideoMedia
          src={media.videoSrc}
          poster={{ src: media.src, width: media.width, height: media.height, alt: media.alt }}
          sizes={sizes}
          priority={priority}
          fit={fit}
        />
      ) : (
        <Image
          src={media.src}
          alt={media.alt ?? ''}
          fill
          sizes={sizes}
          priority={priority}
          className={fit === 'contain' ? 'object-contain' : 'object-cover'}
        />
      )}

      {/*
        A scrim only where text sits on top, and OUTSIDE the branch above so it covers both kinds.
        It sat inside the photograph branch first, which left a banner backed by video showing white
        display type over an unknown frame — the exact failure the scrim exists to prevent.

        `CategoryCard` made this call for the same reason: neither a designer nor a build step can
        measure contrast against a photograph nobody has uploaded yet, and a gradient costs nothing
        on a dark plate while rescuing a light one.

        **Flat below `lg`, directional above it — and that split came from looking at the page.** A
        single left-to-right fade is right at desktop, where the text occupies one half of the band
        and the photograph's subject the other. On a phone the text spans the full width, so its
        last lines sat over the transparent end of the gradient and, on the Standard banner, over a
        brilliant-cut diamond. Legible in the design's own mobile frame, unreadable with a real
        photograph behind it.
      */}
      {background ? (
        <div
          aria-hidden
          className={cn(
            'bg-neutral-primary/55 absolute inset-0',
            'lg:bg-transparent lg:from-neutral-primary/70 lg:to-transparent',
            scrimFrom === 'right' ? 'lg:bg-linear-to-l' : 'lg:bg-linear-to-r',
          )}
        />
      ) : null}
    </div>
  )
}
