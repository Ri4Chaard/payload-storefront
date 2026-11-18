import type { ConsentRecord } from './types'

import { serialise } from './record'

/**
 * Where the visitor's decision is kept (spec 009, T029; contract `consent-record.md` §1, §5).
 *
 * **Read and written in the browser, never on the server, and that is the load-bearing decision of
 * this whole feature.** `cookies()` from `next/headers` is a request-time API — Next's own
 * documentation says using it in a layout or page opts that route into dynamic rendering. The banner
 * lives in the root layout, so reading the decision server-side would opt **every route on this
 * site** into dynamic rendering and cost the prerendered catalogue. This codebase already refused
 * that trade once, in `src/components/layout/cart-count/cart-count.tsx`, whose comment says "a
 * number in a badge is not worth the prerendered catalogue". A consent banner is not worth it
 * either. `eslint.config.mjs` bans `next/headers` in this directory so the decision cannot be
 * quietly undone.
 *
 * **A cookie rather than `localStorage`**, even though nothing on the server reads it. The two are
 * equally reachable from a client component, so the tiebreaker is expiry: a cookie's lifetime is
 * enforced by the browser, which is FR-035 for free, while `localStorage` has no expiry and would
 * need a hand-rolled timestamp check that silently does nothing the day somebody forgets it.
 *
 * **This cookie is itself strictly necessary** and is named in the Cookie Policy. It is the
 * answer to the cookie question; there is nowhere else to keep it.
 *
 * **Every operation is wrapped.** A browser with cookies blocked must get a working banner that
 * simply cannot remember the answer, never an exception (contract §5). `document.cookie` can also
 * throw outright in a sandboxed frame.
 */

export const CONSENT_COOKIE = 'aurum-consent'

/** 180 days. FR-035, and enforced by the browser rather than by code that has to remember. */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180

export const readConsentCookie = (): string | undefined => {
  if (typeof document === 'undefined') return undefined

  try {
    const match = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${CONSENT_COOKIE}=`))

    return match?.slice(CONSENT_COOKIE.length + 1)
  } catch {
    // Storage access denied. Indistinguishable from "no decision yet", which is the safe reading.
    return undefined
  }
}

/**
 * Store a decision. Returns whether it actually stuck.
 *
 * The caller uses the answer to decide what to render, not to show an error: a visitor who has
 * blocked cookies made a deliberate choice, and nagging them about it would be answering their
 * privacy preference with a complaint.
 */
export const writeConsentCookie = (record: ConsentRecord): boolean => {
  if (typeof document === 'undefined') return false

  const attributes = [
    `${CONSENT_COOKIE}=${serialise(record)}`,
    'path=/',
    `max-age=${CONSENT_MAX_AGE}`,
    // The visitor leaves for WhatsApp and comes back; `strict` would not send the cookie on that
    // return and they would be asked all over again. `src/lib/cart/cookie.ts` made the same call.
    'samesite=lax',
    ...(typeof location !== 'undefined' && location.protocol === 'https:' ? ['secure'] : []),
  ]

  try {
    document.cookie = attributes.join('; ')
    return readConsentCookie() !== undefined
  } catch {
    return false
  }
}
