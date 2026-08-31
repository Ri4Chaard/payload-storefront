'use client'

import React from 'react'

/**
 * The behaviour every overlay in this app shares (003/T240).
 *
 * Extracted from `MobileNav`, which built all of it in spec 002 and is now the third consumer.
 * `Drawer` and `Lightbox` need the same five things, and a focus trap written twice is a focus trap
 * that is subtly wrong once — which is the near-duplication Constitution II names and the reason
 * this is a hook before either component exists.
 *
 * What it owns:
 *
 *   scroll lock        the page behind an overlay must not move under it
 *   Escape             closes, and only the INNERMOST layer (see below)
 *   initial focus      into the panel, or the panel itself where it has no controls
 *   focus restoration  back to the trigger, so a keyboard returns where it left
 *   focus trap         optional, because not every overlay wants one (see below)
 *   inert              the covered regions leave the tab order and the accessibility tree
 *
 * **The trap is optional, and that is not a shortcut.** `MobileNav` deliberately does not trap:
 * its close button shares the header row with the basket and the account button, all drawn live,
 * so trapping inside the panel would put the control that closes it out of reach. A modal dialog
 * that owns its own close button traps; a disclosure that covers the page does not. Both are
 * correct, and the difference is a prop rather than two implementations.
 *
 * **Escape closes the innermost layer.** A menu inside an overlay is itself a layer, and both
 * listen on `document`. The outer one registered first, so `stopPropagation` from the inner one
 * arrives too late to help. Asking whether anything inside the panel is currently expanded is what
 * actually decides it — the same test `MobileNav` arrived at in 002.
 *
 * **`inert` skips any ancestor of the panel.** A drawer rendered inside `<main>` would otherwise
 * make itself inert along with the page it covers, and the failure is silent: the panel renders,
 * looks right, and cannot be operated at all.
 */
export interface UseOverlayOptions {
  open: boolean
  /** Called when Escape is pressed. The caller owns `open`, so it decides what closing means. */
  onClose: () => void
  panelRef: React.RefObject<HTMLElement | null>
  /**
   * Focus returns here on close. Without it focus returns to whatever held it when the overlay
   * opened, which is usually the same element and occasionally better.
   */
  triggerRef?: React.RefObject<HTMLElement | null>
  /** Where focus lands on open. Defaults to the first focusable control in the panel. */
  initialFocusRef?: React.RefObject<HTMLElement | null>
  /** Default `true`. A modal traps; a disclosure that covers the page does not. */
  trapFocus?: boolean
  /** Default `true`. Pass `false` where the caller restores focus conditionally. */
  restoreFocus?: boolean
  /** Default `true`. */
  lockScroll?: boolean
  /** Default `true`. */
  closeOnEscape?: boolean
  /**
   * What the overlay covers. Defaults to the two landmarks every page has. An ancestor of the panel
   * is skipped rather than being made inert along with it.
   */
  inertSelectors?: string[]
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** Laid out and visible. A control inside a collapsed section is focusable in the DOM and useless. */
function focusableWithin(panel: HTMLElement): HTMLElement[] {
  return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  )
}

export function useOverlay({
  open,
  onClose,
  panelRef,
  triggerRef,
  initialFocusRef,
  trapFocus = true,
  restoreFocus = true,
  lockScroll = true,
  closeOnEscape = true,
  inertSelectors = ['main', 'footer'],
}: UseOverlayOptions): void {
  // Read through a ref inside the effects, so that a caller passing an inline arrow — which every
  // caller does — is not re-registering listeners on every render.
  const onCloseRef = React.useRef(onClose)
  React.useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const selectors = inertSelectors.join(',')

  // --- Escape -------------------------------------------------------------------------------
  React.useEffect(() => {
    if (!open || !closeOnEscape) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (panelRef.current?.querySelector('[aria-expanded="true"]')) return
      onCloseRef.current()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, closeOnEscape, panelRef])

  // --- Focus in, and back out ---------------------------------------------------------------
  React.useEffect(() => {
    if (!open) return

    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current

    // After paint: a panel that steps from `display: none` has no layout on the frame it opens,
    // and `focus()` on an unlaid-out element does nothing at all.
    const frame = requestAnimationFrame(() => {
      const target = initialFocusRef?.current ?? (panel ? focusableWithin(panel)[0] : null)
      if (target) {
        target.focus()
      } else if (panel) {
        // Nothing to focus — a viewer showing one photograph. The panel takes focus itself so that
        // a screen reader is inside the overlay rather than still on the page behind it.
        panel.setAttribute('tabindex', '-1')
        panel.focus()
      }
    })

    return () => {
      cancelAnimationFrame(frame)
      if (!restoreFocus) return
      const destination = triggerRef?.current ?? returnTo
      destination?.focus()
    }
  }, [open, panelRef, triggerRef, initialFocusRef, restoreFocus])

  // --- Focus trap ---------------------------------------------------------------------------
  React.useEffect(() => {
    if (!open || !trapFocus) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return

      const focusable = focusableWithin(panel)
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) {
        // An overlay with no controls still must not tab away into the page behind it.
        event.preventDefault()
        panel.focus()
        return
      }

      const active = document.activeElement
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, trapFocus, panelRef])

  // --- Scroll lock --------------------------------------------------------------------------
  React.useEffect(() => {
    if (!open || !lockScroll) return

    // Overlay scrollbars are the norm on the platforms this ships to, so there is no gutter to
    // compensate for and no layout shift to hide.
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [open, lockScroll])

  // --- Inert behind ---------------------------------------------------------------------------
  React.useEffect(() => {
    if (!open || selectors === '') return

    const covered = [...document.querySelectorAll<HTMLElement>(selectors)].filter(
      (element) => !element.contains(panelRef.current),
    )
    for (const element of covered) element.setAttribute('inert', '')

    return () => {
      for (const element of covered) element.removeAttribute('inert')
    }
  }, [open, selectors, panelRef])
}
