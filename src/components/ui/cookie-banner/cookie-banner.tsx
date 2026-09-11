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
  const [modalOpen, setModalOpen] = React.useState(false)
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

  /*
    Stand down while a modal dialog owns the screen (FR-024).

    **Found by the accessibility sweep, not by reading the code.** `/account` opens dialogs, and a
    dialog's scrim is 40% black drawn over everything behind it — including this banner, which is
    `position: fixed` and therefore not covered by the `inert` that `useOverlay` applies to `main`
    and `footer`. The banner stayed live underneath: its body text measured 3.23:1 against the
    dimmed surface where AA requires 4.5:1, and its three buttons were still in the page while a
    focus trap said they were not reachable.

    Hiding is the right answer rather than raising the z-index above the scrim. A modal is a task
    the visitor chose; the banner is ambient. Floating it over a dialog would put two competing
    surfaces on screen and let somebody press a consent button the trap has excluded.

    **The signal is the scroll lock, and the two more obvious signals are both wrong.**

    `[aria-modal="true"]` looks like the semantic answer and is not: `Modal` and `Drawer` stay
    mounted when closed and hide themselves with a class, so the attribute is in the DOM whether or
    not anything is open. Watching for it hid the banner on every page that merely *has* a dialog
    component — `/cart`, `/account` — whether or not the visitor had opened one.

    Watching `document.body` for that attribute with `subtree: true, childList: true` is the other
    mistake, and it is a performance one: the callback then runs on every DOM mutation anywhere on
    the page, on every route, for a banner most visitors dismiss in one press.

    `useOverlay` sets `documentElement.style.overflow = 'hidden'` for exactly as long as an overlay
    is open, and clears it on close. One element, one attribute, no subtree — and it covers `Modal`,
    `Drawer`, `Lightbox` and `MobileNav` alike, because all four go through that hook. An overlay
    that opts out of the scroll lock is not claiming the page, and correctly does not hide this.
  */
  React.useEffect(() => {
    const root = document.documentElement
    const check = () => setModalOpen(root.style.overflow === 'hidden')

    check()
    const observer = new MutationObserver(check)
    observer.observe(root, { attributes: true, attributeFilter: ['style'] })

    return () => observer.disconnect()
  }, [])

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
  const showBanner = state !== null && state.status !== 'decided' && !modalOpen

  return (
    <>
      {showBanner ? (
        <section
          role="region"
          aria-label={BANNER_COPY.region}
          aria-live="polite"
          className={cn(
            /*
              Full-bleed and flush to the bottom below `xl`, a centred panel above it — which is what
              the three frames draw. Tablet `544:16179` is 768 wide at x=0 and sits on the bottom
              edge; mobile `544:16200` does the same at 390. Desktop `196:1452` is 1300 wide, centred
              (`left-1/2 -translate-x-1/2`), with a ~40px gap beneath.

              `max-w-325` is 1300px on the 4px spacing scale, the same idiom `PageHeaderBlock` uses
              for its `md:max-w-167`.
            */
            'fixed inset-x-0 bottom-0 z-30',
            'bg-background-bg shadow-lg',
            'xl:right-auto xl:bottom-10 xl:left-1/2 xl:w-full xl:max-w-325 xl:-translate-x-1/2',
            className,
          )}
        >
          <div className="flex flex-col gap-5 p-5 md:p-7.5">
            {/*
              `text-display` is the design's H1 — 36px TT Ramillas at desktop, fluid down to 24px on
              a phone. An `h2` element carrying it, because the page it covers already owns the `h1`:
              the size is the design's, the level is the document's.
            */}
            <h2 className="text-display text-neutral-primary uppercase">{BANNER_COPY.heading}</h2>

            <p className="text-body-medium text-neutral-secondary">
              {BANNER_COPY.body}{' '}
              {policyHref ? (
                <Link href={policyHref} variant="inline">
                  {BANNER_COPY.link}
                </Link>
              ) : null}
            </p>

            {/*
              Three filled buttons of equal width, in the drawn order — `196:1462`, `196:1482`,
              `196:1487`, all `primary/default` on `flex-[1_0_0]`.

              **The design is more compliant than the obvious implementation.** An earlier version
              had *Agree* filled and the other two outlined, which is the conventional pattern and
              is exactly what FR-019 forbids: refusing must be as easy and as prominent as accepting.
              Three identical buttons say that visually rather than merely satisfying it on a
              stopwatch.

              Stacked full-width below `md` with the drawn 8px gap, a row above it at 12px, and the
              desktop 20px from `xl`.
            */}
            <div className="flex flex-col gap-2 md:flex-row md:gap-3 xl:gap-5">
              <Button
                variant="primary"
                className="uppercase md:flex-1"
                fullWidth
                onClick={() => settle({ kind: 'all' })}
              >
                {BANNER_COPY.agree}
              </Button>

              <Button
                ref={configureRef}
                variant="primary"
                className="uppercase md:flex-1"
                fullWidth
                onClick={() => setChooserOpen(true)}
              >
                {BANNER_COPY.configure}
              </Button>

              <Button
                variant="primary"
                className="uppercase md:flex-1"
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
