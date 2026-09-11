'use client'

import React from 'react'

import { cn } from '@/lib/cn'

/**
 * The way back to the cookie chooser, in the footer's legal row (spec 009, T039, FR-032).
 *
 * **The design draws no re-entry point at all** — once a visitor presses one of the three buttons,
 * the drawn banner is gone for good. That is not a consent mechanism: withdrawal has to be as
 * available as consent was, and a decision somebody cannot revisit is a decision they cannot
 * revoke. The spec records the gap and this fills it.
 *
 * **It talks to the banner through a window event, not a context.** The obvious alternative was a
 * `ConsentProvider` wrapping the tree so this button and `CookieBanner` could share state — the
 * shape `CartCountProvider` already uses. It was rejected because the two components need to share
 * exactly one fact ("open the chooser now"), and a provider to carry it would put a second client
 * context around every page on the site for a button most visitors never press. The coupling here is
 * one exported constant used in two files.
 *
 * A `<button>` rather than a `Link`, because it opens a dialog rather than going anywhere — which
 * decides both the key that activates it and how a screen reader announces it. It is styled to match
 * the `inverse` links beside it so the row reads as one set.
 */

/** The one string both sides share. Exported so neither can typo it independently. */
export const OPEN_COOKIE_SETTINGS = 'aurum:open-cookie-settings'

/** Fixed, like the chooser's own labels: it names a control rather than saying anything. */
const LABEL = 'Cookie Settings'

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS))}
      className={cn(
        'text-body-small text-neutral-white/80 hover:text-neutral-white cursor-pointer',
        'focus-visible:outline-neutral-white transition-colors focus-visible:outline-2',
        'focus-visible:outline-offset-2',
        className,
      )}
    >
      {LABEL}
    </button>
  )
}
