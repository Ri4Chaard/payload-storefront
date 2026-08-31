'use client'

import Image from 'next/image'
import React from 'react'

import { IconButton } from '@/components/ui/icon-button'
import { useOverlay } from '@/components/ui/overlay'
import { cn } from '@/lib/cn'

/**
 * The full-screen photograph viewer from node 308:6392 — one photograph on white, filling the
 * height, with a close control at the top right and a 50px arrow at each side.
 *
 * Drawn for the product gallery and built as a primitive for the same reason `Drawer` is: it takes
 * photographs and an index, and knows nothing about products.
 *
 * **The arrows are drawn asymmetrically and are built symmetrically.** The frame puts the left one
 * 150px from the edge and the right one 100px, while the close control above it sits at 100px. One
 * of those three is a nudge that was never straightened, and matching it would put a permanent
 * 50px lean into a component whose whole subject is centred. Recorded rather than reproduced.
 *
 * **Arrow keys move between photographs.** A viewer that can only be driven by finding and pressing
 * a 50px target is one a keyboard cannot really use, and `←`/`→` is what a viewer of anything is
 * expected to answer to. Escape closes, via `useOverlay`.
 *
 * **The count is announced even though it is not drawn.** Pressing "next" changes a picture and
 * nothing else — with no caption and no counter on screen there is no feedback at all for a screen
 * reader, so a live region says "2 of 5". It is `sr-only` because the design deliberately shows
 * nothing, and that is a visual decision rather than an informational one.
 *
 * **Always mounted, `display` toggled** — the pattern `MobileNav` set in 002 and `Drawer` follows.
 */
export interface LightboxImage {
  src: string
  alt?: string
}

export interface LightboxProps extends Omit<React.ComponentProps<'div'>, 'onChange'> {
  open: boolean
  onClose: () => void
  images: LightboxImage[]
  /** Which photograph is showing. Controlled, so the gallery underneath stays in step with it. */
  index: number
  onIndexChange: (index: number) => void
  /** What the photographs are OF. Every control's accessible name is built from it. */
  label: string
  /** Focus returns here on close — the photograph that was pressed to open the viewer. */
  triggerRef?: React.RefObject<HTMLElement | null>
}

const ARROW = 'absolute top-1/2 z-10 -translate-y-1/2 size-12.5 [&_svg]:size-4'

export function Lightbox({
  open,
  onClose,
  images,
  index,
  onIndexChange,
  label,
  triggerRef,
  className,
  ...props
}: LightboxProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const total = images.length
  const current = images[index]

  useOverlay({
    open,
    onClose,
    panelRef,
    triggerRef,
    // The viewer covers everything, the header included — unlike the menu, which leaves the header
    // live because its own close control lives there.
    inertSelectors: ['header', 'main', 'footer'],
  })

  // Wrapping, because a viewer of five photographs that stops at the fifth makes the sixth press
  // do nothing, and there is no visible end marker to explain why.
  const go = React.useCallback(
    (step: number) => {
      if (total === 0) return
      onIndexChange((index + step + total) % total)
    },
    [index, total, onIndexChange],
  )

  React.useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') go(-1)
      else if (event.key === 'ArrowRight') go(1)
      else return
      event.preventDefault()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, go])

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Photographs of ${label}`}
      className={cn(
        'bg-background-container fixed inset-0 z-50 flex items-center justify-center',
        'transition-[opacity,display] duration-[var(--duration-base)]',
        'transition-discrete ease-[var(--ease-standard)] motion-reduce:transition-none',
        open ? 'opacity-100 starting:opacity-0' : 'hidden opacity-0',
        className,
      )}
      {...props}
    >
      <IconButton
        variant="bare"
        icon="close"
        label="Close"
        onClick={onClose}
        className="text-neutral-primary hover:text-primary-default absolute top-10 right-6 z-10 [&_svg]:size-5 md:top-25 md:right-25"
      />

      {total > 1 ? (
        <>
          <IconButton
            variant="outline"
            icon="chevron-left"
            label={`Previous photograph of ${label}`}
            onClick={() => go(-1)}
            className={cn(ARROW, 'left-4 md:left-25')}
          />
          <IconButton
            variant="outline"
            icon="chevron-right"
            label={`Next photograph of ${label}`}
            onClick={() => go(1)}
            className={cn(ARROW, 'right-4 md:right-25')}
          />
        </>
      ) : null}

      {current ? (
        <div className="relative h-full w-full">
          <Image
            key={current.src}
            src={current.src}
            alt={current.alt ?? label}
            fill
            // The photograph is the entire screen here, so there is nothing smaller to ask for.
            sizes="100vw"
            className="object-contain"
          />
        </div>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {total > 0 ? `Photograph ${index + 1} of ${total}` : 'No photographs'}
      </p>
    </div>
  )
}
