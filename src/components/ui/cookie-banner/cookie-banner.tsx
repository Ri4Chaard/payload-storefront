'use client'

import React from 'react'

import { Button } from '@/components/ui/button'
import { Link } from '@/components/ui/link'
import { readConsentCookie, writeConsentCookie } from '@/lib/consent/cookie'
import { decide, readState, startingSelection, type Decision } from '@/lib/consent/record'
import type { ConsentState } from '@/lib/consent/types'
import type { CookieSettings } from '@/lib/policies/types'
import { cn } from '@/lib/cn'

import { BANNER_COPY } from './copy'
import { OPEN_COOKIE_SETTINGS } from './cookie-settings-button'

/**
 * The cookie consent banner (spec 009, T031, T035, T037, T038), from Figma `255:3381` and its
 * tablet and mobile frames `544:16179` / `544:16200`.
 *
 * **It renders nothing on the server, and it must not.** The server cannot know what this visitor
 * decided without `cookies()`, which is a request-time API — calling it in the root layout, where
 * this component lives, would opt every route on the site into dynamic rendering. So the decision is
 * read after mount. The visible consequence is that the banner arrives a moment after the page; the
 * invisible one is that the catalogue stays prerendered. `src/lib/consent/cookie.ts` records the
 * whole trade.
 *
 * **Fixed to the bottom, which is what makes FR-021 true by construction**: it overlays the page
 * rather than displacing it, so appearing late costs no layout shift at all. It is also why the page
 * behind stays readable and scrollable — the design draws it over the hero, not across it.
 *
 * **No focus trap** (FR-024). A modal dialog would be wrong here: the visitor may browse while
 * deciding, and trapping them in a banner they cannot dismiss without answering would be coercive
 * rather than merely insistent. The chooser IS modal, because it is a task. What this uses instead
 * is `role="region"` with a name, placed early in the DOM so a keyboard reaches it within a few tabs
 * (FR-023), and `aria-live="polite"` so a screen reader is told it appeared without being dragged
 * out of the sentence it was reading.
 *
 * **The chooser is loaded on demand** (research R9, Constitution V). This component sits in the root
 * layout and is therefore charged to every route on the site; the chooser is the expensive half and
 * most visitors press one of the other two buttons and never see it. `React.lazy` keeps it out of
 * the initial bundle.
 *
 * **Every word here is fixed in code** — see `./copy.ts` for why, and for the rule that keeps it
 * safe.
 */

const CookiePreferences = React.lazy(() =>
  import('@/components/ui/cookie-preferences').then((module) => ({
    default: module.CookiePreferences,
  })),
)

export interface CookieBannerProps {
  settings: CookieSettings
  className?: string
}

export function CookieBanner({ settings, className }: CookieBannerProps) {
  const { enabled, consentVersion, categories, policyHref } = settings

  /*
    `null` means "not read yet" and is distinct from any real state. Without the distinction the
    banner would flash on for one frame for a visitor who decided months ago, which is both ugly and
    a small lie about whether they have been asked.
  */
  const [state, setState] = React.useState<ConsentState | null>(null)
  const [chooserOpen, setChooserOpen] = React.useState(false)
  const configureRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    setState(readState(readConsentCookie(), { consentVersion, categories }))
  }, [consentVersion, categories])

  /*
    The footer's re-entry point (FR-032). It dispatches rather than calling in, so that this
    component stays the single owner of consent state — see `./cookie-settings-button.tsx` for why
    that is an event and not a context.

    The state is re-read on open rather than trusted from mount: the visitor may have decided in
    another tab since this page was drawn, and showing them stale switches would invite them to
    "save" a choice they already changed.
  */
  React.useEffect(() => {
    const open = () => {
      setState(readState(readConsentCookie(), { consentVersion, categories }))
      setChooserOpen(true)
    }

    window.addEventListener(OPEN_COOKIE_SETTINGS, open)
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, open)
  }, [consentVersion, categories])

  const settle = React.useCallback(
    (decision: Decision) => {
      const record = decide(decision, categories, consentVersion)
      writeConsentCookie(record)

      /*
        The state is advanced whether or not the write stuck, which is why the boolean
        `writeConsentCookie` returns is deliberately ignored here. A browser blocking cookies gets a
        banner that closes now and returns on the next page — the honest outcome, and better than
        either nagging somebody about their own privacy setting or pretending to remember something
        we cannot (contract §5).
      */
      setState({ status: 'decided', record })
      setChooserOpen(false)
    },
    [categories, consentVersion],
  )

  /*
    Off means off (FR-026): no banner, and — because `isAllowed()` treats anything other than a
    settled decision as "necessary only" — nothing optional is treated as consented while it is off.
    An existing decision is left untouched, so turning it back on does not re-ask anybody.
  */
  if (!enabled) return null

  /*
    Still reading, or already decided. Either way the banner itself is not drawn — but the chooser
    still can be, because the footer can ask for it at any time.
  */
  const showBanner = state !== null && state.status !== 'decided'

  return (
    <>
      {showBanner ? (
        <section
          role="region"
          aria-label={BANNER_COPY.region}
          aria-live="polite"
          className={cn(
            'bg-background-container fixed inset-x-0 bottom-0 z-30 shadow-lg',
            'md:inset-x-auto md:bottom-6 md:left-6 md:max-w-160',
            className,
          )}
        >
          <div className="flex flex-col gap-5 p-5 md:p-7.5">
            <h2 className="text-heading-2 text-neutral-primary uppercase">
              {BANNER_COPY.heading}
            </h2>

            <p className="text-body-base text-neutral-primary/80">
              {BANNER_COPY.body}{' '}
              {policyHref ? (
                <Link href={policyHref} variant="inline">
                  {BANNER_COPY.link}
                </Link>
              ) : null}
            </p>

            {/*
              Three actions of equal weight and equal width, in the drawn order. FR-019 is the reason
              they are the same size and the same number of presses: refusing must be exactly as easy
              as accepting, and a "reject" tucked behind the chooser would fail that whether or not
              anybody noticed.

              Stacked full-width below `md`, in a row above it — the mobile frame at `544:16200`.
            */}
            <div className="flex flex-col gap-2.5 md:flex-row md:gap-3.5">
              <Button
                variant="primary"
                className="md:flex-1"
                fullWidth
                onClick={() => settle({ kind: 'all' })}
              >
                {BANNER_COPY.agree}
              </Button>

              <Button
                ref={configureRef}
                variant="outline"
                className="md:flex-1"
                fullWidth
                onClick={() => setChooserOpen(true)}
              >
                {BANNER_COPY.configure}
              </Button>

              <Button
                variant="outline"
                className="md:flex-1"
                fullWidth
                onClick={() => settle({ kind: 'necessary-only' })}
              >
                {BANNER_COPY.technical}
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {/*
        Mounted only once somebody asks for it, so its code is fetched then too. No fallback is
        rendered: the chooser opens on a press, and a spinner that appears for the length of one
        chunk download is more distracting than the brief nothing it replaces.
      */}
      {chooserOpen ? (
        <React.Suspense fallback={null}>
          <CookiePreferences
            open
            categories={categories}
            initialSelection={startingSelection(state ?? { status: 'ask' }, categories)}
            triggerRef={configureRef}
            onClose={() => setChooserOpen(false)}
            onSave={(keys) => settle({ kind: 'chosen', keys })}
          />
        </React.Suspense>
      ) : null}
    </>
  )
}
