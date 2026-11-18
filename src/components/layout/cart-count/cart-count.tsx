'use client'

import React from 'react'

import { CART_COUNT_COOKIE } from '@/lib/cart/types'

/**
 * How many products the header badge should show.
 *
 * **Why a client provider rather than a number the layout reads.** `cookies()` is a request-time
 * API: reading it in the root layout would opt *every* route into dynamic rendering, and
 * `/products/[slug]` is prerendered from `generateStaticParams`. That trade — the whole prerendered
 * catalogue, in exchange for a number in a badge — is the wrong way round, and Constitution V's
 * Core Web Vitals budgets are what it would be paid out of.
 *
 * So the count travels in its own readable cookie, written by every cart mutation beside the
 * httpOnly credential. This reads it once on mount and then listens for the actions to say
 * otherwise.
 *
 * **It is allowed to be briefly wrong, and that is the deal.** The cart page is the authority; this
 * is a hint. The failure mode is a badge one behind for a moment, which is recoverable by looking
 * at the cart — as against a catalogue that renders on demand forever, which is not.
 */

const CartCountContext = React.createContext<number>(0)

/** The event a cart action fires so an open page updates without waiting for a navigation. */
const CART_COUNT_EVENT = 'aurum:cart-count'

function readCookie(): number {
  if (typeof document === 'undefined') return 0

  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${CART_COUNT_COOKIE}=`))

  const value = Number(match?.slice(CART_COUNT_COOKIE.length + 1))
  return Number.isInteger(value) && value > 0 ? value : 0
}

export function CartCountProvider({ children }: { children: React.ReactNode }) {
  /**
   * Starts at zero on the server and on the first client render, then corrects itself.
   *
   * Reading the cookie during render would mean the server rendered one number and the browser
   * another, which React reports as a hydration mismatch. `useEffect` runs after hydration has
   * settled, so the badge appears a frame late rather than the console filling with warnings.
   */
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    const sync = () => setCount(readCookie())
    sync()

    window.addEventListener(CART_COUNT_EVENT, sync)
    // A cart changed in another tab, or the page came back from the messenger.
    window.addEventListener('focus', sync)
    window.addEventListener('pageshow', sync)

    return () => {
      window.removeEventListener(CART_COUNT_EVENT, sync)
      window.removeEventListener('focus', sync)
      window.removeEventListener('pageshow', sync)
    }
  }, [])

  return <CartCountContext.Provider value={count}>{children}</CartCountContext.Provider>
}

export function useCartCount(): number {
  return React.useContext(CartCountContext)
}

/**
 * Tell the badge a cart action has just happened.
 *
 * Called by whatever awaited the action, with the count it returned. The cookie is already written
 * by then — this only saves the badge from waiting for the next navigation to notice.
 */
export function announceCartCount(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CART_COUNT_EVENT))
}
