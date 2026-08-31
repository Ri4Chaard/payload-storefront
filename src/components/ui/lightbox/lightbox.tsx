'use client'

import PhotoSwipeLightbox from 'photoswipe/lightbox'
import React from 'react'

import { iconRegistry, type IconName } from '@/lib/icon-registry'

import 'photoswipe/style.css'
import './lightbox.css'

/**
 * The full-screen photograph viewer from node 308:6392, built on **PhotoSwipe 5**.
 *
 * The frame draws paging, a close control and nothing else, and an earlier version of this file
 * implemented exactly that on top of `useOverlay`. Zoom was then added to the brief — people buy
 * jewellery on the stone, and a viewer they cannot look into is the wrong viewer. Pinch, pan with
 * momentum, bounded panning and a wheel that zooms instead of scrolling are the class of thing that
 * takes a week to write and a year to get right on real devices, so this is the case where
 * Constitution II's "reuse before creation" points at a dependency. See research.md R11.
 *
 * **Cost, measured rather than assumed.** 4.5KB gzipped in the route bundle, plus 16.4KB fetched on
 * first open — the core is behind `pswpModule`, which is a dynamic import — and 2.4KB of CSS. A
 * route that never opens the viewer pays the 4.5KB and nothing else.
 *
 * **The props did not change.** `open`, `index`, `onIndexChange`, `onClose`, `label` and
 * `triggerRef` are what they were, and the component is still controlled on the index so that the
 * gallery underneath stays on whatever photograph the viewer was closed on. PhotoSwipe keeps its
 * own index internally; the `change` event is what keeps the two in step, and it is the one place
 * this wrapper has real work to do. `LightboxImage` gained `width` and `height`, which the zoom
 * arithmetic needs and which `CatalogImage` already carries.
 *
 * **Zoom is deliberately shallow.** The levels are expressed as multiples of the fitted size rather
 * than of the file's natural size, because "1.75" should mean "a bit closer than it sits on screen"
 * regardless of whether the photograph is 1000px or 4000px wide.
 *
 * **The zoom button is drawn even though the frame has none.** The frame has none because the frame
 * predates zoom. Pinch and double-tap and the wheel are all pointer gestures; without a control
 * there is no keyboard path to the feature at all, and SC-006 covers the open viewer.
 *
 * **What PhotoSwipe does not label, we label.** Its root is `role="dialog"` with no accessible name
 * and no `aria-modal`, which is an axe violation on a gate this repository actually enforces. Both
 * are set on `afterInit`.
 */
export interface LightboxImage {
  src: string
  /** Natural dimensions. PhotoSwipe needs them to compute the fitted size and the zoom ceiling. */
  width: number
  height: number
  alt?: string
}

export interface LightboxProps {
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
  /**
   * The thumbnail a given photograph is opening FROM. Supply it and the viewer grows out of that
   * element instead of fading in; omit it and the transition is a fade. This is the whole of the
   * "opens from the picture you pressed" effect, and it needs a live DOM node rather than a
   * measurement, because the page may have scrolled between opening and closing.
   */
  thumbnailFor?: (index: number) => HTMLElement | null
}

/** Our own glyphs, handed over as markup. PhotoSwipe inserts a plain SVG string verbatim. */
function glyph(name: IconName): string {
  const { viewBox, body } = iconRegistry[name]
  return `<svg class="pswp__icn" viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`
}

export function Lightbox({
  open,
  onClose,
  images,
  index,
  onIndexChange,
  label,
  triggerRef,
  thumbnailFor,
}: LightboxProps) {
  const instance = React.useRef<PhotoSwipeLightbox | null>(null)

  // The callbacks are read through refs inside the effect below. Without this, an inline arrow —
  // which every caller passes — would tear down and rebuild the whole viewer on each render, and
  // rebuilding it mid-gesture closes it.
  const handlers = React.useRef({ onClose, onIndexChange, thumbnailFor })
  React.useEffect(() => {
    handlers.current = { onClose, onIndexChange, thumbnailFor }
  })

  // `index` is seeded at open and then owned by PhotoSwipe, so it is read rather than depended on:
  // re-running this effect for a change the library itself reported would fight the gesture that
  // caused it.
  const openIndex = React.useRef(index)
  openIndex.current = index

  React.useEffect(() => {
    if (!open || images.length === 0) return

    const lightbox = new PhotoSwipeLightbox({
      dataSource: images.map((image) => ({
        src: image.src,
        width: image.width,
        height: image.height,
        alt: image.alt ?? label,
      })),
      index: openIndex.current,
      pswpModule: () => import('photoswipe'),

      // The frame's chrome. `counter` is off because the frame draws none; `zoom` is on because
      // otherwise the feature has no keyboard path. See the note above.
      counter: false,
      zoom: true,
      closeSVG: glyph('close'),
      zoomSVG: glyph('search'),
      arrowPrevSVG: glyph('chevron-left'),
      arrowNextSVG: glyph('chevron-right'),
      closeTitle: 'Close',
      zoomTitle: `Zoom into the photograph of ${label}`,
      arrowPrevTitle: `Previous photograph of ${label}`,
      arrowNextTitle: `Next photograph of ${label}`,

      // Shallow on purpose, and relative to the fitted size rather than to the file.
      initialZoomLevel: 'fit',
      secondaryZoomLevel: (zoom) => zoom.fit * 1.75,
      maxZoomLevel: (zoom) => zoom.fit * 2.5,

      // `zoom` needs a thumbnail to grow out of; without one the library falls back to `fade`
      // anyway, so saying so up front keeps the two paths honest.
      showHideAnimationType: thumbnailFor ? 'zoom' : 'fade',
      bgOpacity: 1,
    })

    lightbox.on('afterInit', () => {
      const root = lightbox.pswp?.element
      if (!root) return
      // Its own root is an unnamed `role="dialog"`, which axe fails and a screen reader cannot
      // introduce. Both attributes are ours to supply.
      root.setAttribute('aria-label', `Photographs of ${label}`)
      root.setAttribute('aria-modal', 'true')
    })

    lightbox.on('change', () => {
      const next = lightbox.pswp?.currIndex
      if (typeof next === 'number') handlers.current.onIndexChange(next)
    })

    // Fires for every route out — the close button, Escape, the swipe-down gesture, the scrim.
    // Reporting it is what keeps `open` from going stale and refusing to reopen.
    lightbox.on('destroy', () => {
      handlers.current.onClose()
      triggerRef?.current?.focus()
    })

    lightbox.addFilter('thumbEl', (fallback, _data, slideIndex) =>
      // Declared as returning an element, but the library both passes and accepts `undefined` —
      // `getThumbBounds` checks for one before it measures. Narrowing to the declared type would
      // mean inventing an element that is not there.
      (handlers.current.thumbnailFor?.(slideIndex) ?? fallback) as HTMLElement,
    )

    lightbox.init()
    lightbox.loadAndOpen(openIndex.current)
    instance.current = lightbox

    return () => {
      instance.current = null
      lightbox.destroy()
    }
    // `index` is deliberately absent — see `openIndex` above.
  }, [open, images, label, triggerRef, thumbnailFor])

  // A caller may move the index while the viewer is open — the thumbnail rail beneath it does
  // exactly that. Driving PhotoSwipe rather than remounting it keeps the gesture state intact.
  React.useEffect(() => {
    const pswp = instance.current?.pswp
    if (pswp && pswp.currIndex !== index) pswp.goTo(index)
  }, [index])

  // PhotoSwipe renders into the document itself, so there is nothing for React to place.
  return null
}
