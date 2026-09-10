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
   * The band lays text over this. Decided by the block, never by the editor — a "put text over
   * this" switch on a band that always does would be a setting with one correct value.
   */
  background?: boolean
}

export function Media({
  media,
  sizes = '100vw',
  priority = false,
  background = false,
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
          background={background}
        />
      ) : (
        <Image
          src={media.src}
          alt={media.alt ?? ''}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      )}

      {/*
        A scrim only where text sits on top, and OUTSIDE the branch above so it covers both kinds.
        It sat inside the photograph branch first, which left a banner backed by video showing white
        display type over an unknown frame — the exact failure the scrim exists to prevent.

        `CategoryCard` made this call for the same reason: neither a designer nor a build step can
        measure contrast against a photograph nobody has uploaded yet, and a gradient costs nothing
        on a dark plate while rescuing a light one.
      */}
      {background ? (
        <div
          aria-hidden
          className="from-neutral-primary/60 absolute inset-0 bg-linear-to-r to-transparent"
        />
      ) : null}
    </div>
  )
}
