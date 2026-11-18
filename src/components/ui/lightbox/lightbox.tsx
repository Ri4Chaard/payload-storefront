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
 * on the detail, and a viewer they cannot look into is the wrong viewer. Pinch, pan with
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
 * **There is no zoom button, and the keyboard still reaches zoom.** A magnifier beside the close
 * control was the first answer and the owner rejected it: the frame draws two controls and it
 * should draw two. But pinch, double-tap and the wheel are all pointer gestures, so removing the
 * button alone would have left a keyboard with no route to the feature, which SC-006 does not
 * allow. `+` and `-` are bound instead — the shortcut every image viewer already answers to.
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

  /**
   * Everything the viewer needs, read through a ref rather than depended on.
   *
   * This is load-bearing and was got wrong once. The effect below builds a PhotoSwipe instance, and
   * its cleanup destroys it — so anything in its dependency array that changes identity between
   * renders closes the viewer. `images` is usually a fresh array, and `thumbnailFor` is an inline
   * arrow at every call site. Worse, the loop closes: a swipe reports a new index, the parent
   * re-renders, the callbacks get new identities, the effect tears down, and the viewer shuts
   * itself the moment anyone pages it.
   *
   * So the effect depends on `open` alone, and everything else is read at the moment it is needed.
   */
  const latest = React.useRef({ images, label, index, onClose, onIndexChange, thumbnailFor, triggerRef })
  React.useEffect(() => {
    latest.current = { images, label, index, onClose, onIndexChange, thumbnailFor, triggerRef }
  })

  React.useEffect(() => {
    if (!open) return

    const { images: photographs, label: name, index: from, thumbnailFor: thumbnail } = latest.current
    if (photographs.length === 0) return

    // `torn` marks a teardown WE started, which happens when the caller sets `open` to false — it
    // already knows, and telling it again would be an echo. `gone` stops us destroying an instance
    // that has already destroyed itself, which is the ordinary path out through Escape or the
    // close button.
    let torn = false
    let gone = false

    // Captured BEFORE the viewer opens and takes focus for itself.
    const opener = document.activeElement as HTMLElement | null

    // Asked once, here, rather than watched: a preference that changes while a viewer is open
    // should not restyle the transition it is already halfway through.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const lightbox = new PhotoSwipeLightbox({
      dataSource: photographs.map((image) => ({
        src: image.src,
        width: image.width,
        height: image.height,
        alt: image.alt ?? name,
      })),
      index: from,
      pswpModule: () => import('photoswipe'),

      // The frame's chrome. `counter` is off because the frame draws none; `zoom` is on because
      // otherwise the feature has no keyboard path. See the note above.
      counter: false,
      zoom: false,
      closeSVG: glyph('close'),
      arrowPrevSVG: glyph('chevron-left'),
      arrowNextSVG: glyph('chevron-right'),
      closeTitle: 'Close',
      arrowPrevTitle: `Previous photograph of ${name}`,
      arrowNextTitle: `Next photograph of ${name}`,

      // Shallow on purpose, and relative to the fitted size rather than to the file.
      initialZoomLevel: 'fit',
      secondaryZoomLevel: (zoom) => zoom.fit * 1.75,
      maxZoomLevel: (zoom) => zoom.fit * 2.5,

      /**
       * `zoom` needs a thumbnail to grow out of; without one the library falls back to `fade`
       * anyway, so saying so up front keeps the two paths honest.
       *
       * **`none` under reduced motion, and this is the one place that has to be said in
       * JavaScript**. The global rule in `styles.css` collapses every CSS transition on
       * the page, which is what covers the drawer and the gallery — but this animation is not CSS.
       * PhotoSwipe drives the open and close itself, frame by frame, and a declaration cannot reach
       * it. A viewer that flies up out of a thumbnail is exactly the whole-screen movement the
       * preference is about.
       */
      showHideAnimationType: still ? 'none' : thumbnail ? 'zoom' : 'fade',
      bgOpacity: 1,

      /**
       * Focus restoration is OURS, through `triggerRef`, and the library's own is a second
       * implementation of it that cannot be steered.
       *
       * PhotoSwipe captures `document.activeElement` when it is constructed and focuses that on
       * close, forever. A caller whose trigger MOVES while the viewer is open — the product
       * gallery, where paging to the fourth photograph should send you back to the fourth — has no
       * way to say so, and the two restorations then race. Turning the library's off makes the
       * documented prop authoritative instead of merely first.
       */
      returnFocus: false,
    })

    lightbox.on('afterInit', () => {
      const root = lightbox.pswp?.element
      if (!root) return
      // Its own root is an unnamed `role="dialog"`, which axe fails and a screen reader cannot
      // introduce. Both attributes are ours to supply.
      root.setAttribute('aria-label', `Photographs of ${name}`)
      root.setAttribute('aria-modal', 'true')
    })

    lightbox.on('change', () => {
      const next = lightbox.pswp?.currIndex
      if (typeof next === 'number') latest.current.onIndexChange(next)
    })

    // Fires for every route out the visitor can take — the close button, Escape, the swipe-down
    // gesture, a press on the ground. Reporting it is what keeps `open` from going stale and
    // refusing to reopen.
    lightbox.on('destroy', () => {
      gone = true
      if (torn) return
      latest.current.onClose()
      // `opener` is the fallback for a caller that supplies no `triggerRef`: focus still has to
      // land somewhere, and the thing that was focused when the viewer opened is the only sensible
      // candidate. It is what the library would have done.
      ;(latest.current.triggerRef?.current ?? opener)?.focus()
    })

    lightbox.addFilter('thumbEl', (fallback, _data, slideIndex) =>
      // Declared as returning an element, but the library both passes and accepts `undefined` —
      // `getThumbBounds` checks for one before it measures. Narrowing to the declared type would
      // mean inventing an element that is not there.
      (latest.current.thumbnailFor?.(slideIndex) ?? fallback) as HTMLElement,
    )

    lightbox.init()
    lightbox.loadAndOpen(from)
    instance.current = lightbox

    return () => {
      torn = true
      instance.current = null
      if (!gone) lightbox.destroy()
    }
  }, [open])

  /**
   * `+` and `-`, because the zoom control is gone and a gesture is not a keyboard.
   *
   * `toggleZoom` steps between the fitted size and `secondaryZoomLevel`, which is the same pair
   * double-tap moves between — so the two paths land in the same place rather than offering a
   * keyboard user a different zoom from everyone else.
   */
  React.useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      const pswp = instance.current?.pswp
      const slide = pswp?.currSlide
      if (!pswp || !slide) return

      const zoomedIn = slide.currZoomLevel > slide.zoomLevels.initial
      if ((event.key === '+' || event.key === '=') && !zoomedIn) pswp.toggleZoom()
      else if (event.key === '-' && zoomedIn) pswp.toggleZoom()
      else return

      event.preventDefault()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  // A caller may move the index while the viewer is open — the thumbnail rail beneath it does
  // exactly that. Driving PhotoSwipe rather than remounting it keeps the gesture state intact.
  React.useEffect(() => {
    const pswp = instance.current?.pswp
    if (pswp && pswp.currIndex !== index) pswp.goTo(index)
  }, [index])

  // PhotoSwipe renders into the document itself, so there is nothing for React to place.
  return null
}
