'use client'

import React from 'react'

import { HandoffModal } from '@/components/commerce/handoff-modal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Link } from '@/components/ui/link'
import type { CheckoutResult } from '@/lib/cart/actions-types'
import type { CartView } from '@/lib/cart/types'
import { cn } from '@/lib/cn'

/**
 * ORDER SUMMARY (spec 005, T031, T032). Nodes `255:3868` (1920), `425:11228` (768),
 * `425:11327` (390).
 *
 * Three rows, a button, and the agreement — in that order, as drawn.
 *
 * **Every amount here was computed on the server** and arrives formatted. This component adds
 * nothing up; it cannot, because it has no integers to add. That is Constitution VI expressed as a
 * component boundary rather than as a rule somebody has to remember: a page that could name its own
 * total is a page that can be edited to name a smaller one.
 *
 * **`Shipping` is always nothing**, and says so rather than being hidden. Delivery is arranged with
 * the seller, and a summary that silently omits a line the customer expects reads as an oversight.
 *
 * **CHECKOUT is refused until the agreement is ticked (FR-018)**, and the refusal names the
 * agreement. Disabling the button instead was the alternative and is worse: a disabled control
 * gives no reason, and a visitor who has not noticed the checkbox has nothing to read. So it stays
 * enabled and answers.
 */

export interface OrderSummaryProps extends React.ComponentProps<'section'> {
  cart: CartView
  /**
   * The Server Action that composes the message and builds a link per messenger.
   *
   * A prop rather than an import, for the reason this feature has now proven twice: a `'use client'`
   * file importing a `'use server'` module drags the whole Payload config into the browser bundle.
   * Omitted in a story, where the button says checkout is not available rather than pretending.
   */
  onCheckout?: () => Promise<CheckoutResult>
  /**
   * Lines have changed underneath the customer since they were added (FR-014).
   *
   * The first press of CHECKOUT is refused and says so; the second proceeds. **That second press is
   * the acknowledgement** the requirement asks for — the changes are already on the rows above in
   * words, and this makes the customer act once more, deliberately, after being told. A separate
   * "I have reviewed these" control was the alternative and is drawn nowhere; it would also be a
   * second thing to tick beside the agreement, which is how people learn to tick without reading.
   */
  blocked?: boolean
}

export function OrderSummary({
  cart,
  onCheckout,
  blocked = false,
  className,
  ...props
}: OrderSummaryProps) {
  const [agreed, setAgreed] = React.useState(false)
  const [acknowledged, setAcknowledged] = React.useState(false)
  const [refusal, setRefusal] = React.useState<null | string>(null)
  const [handoff, setHandoff] = React.useState<null | Extract<CheckoutResult, { ok: true }>>(null)
  const [pending, startTransition] = React.useTransition()
  const checkoutRef = React.useRef<HTMLButtonElement>(null)

  function checkout() {
    if (blocked && !acknowledged) {
      setAcknowledged(true)
      setRefusal(
        'Some pieces in your cart have changed — the details are on the rows above. Press Checkout again to continue with the cart as it stands.',
      )
      return
    }
    if (!agreed) {
      setRefusal('Please agree to the Terms of Use and Return Policy before continuing.')
      return
    }
    if (!onCheckout) {
      setRefusal('Checkout is not available yet.')
      return
    }

    setRefusal(null)

    /**
     * Composed once, and the trigger is blocked while the modal is open (FR-026).
     *
     * With no order record to be idempotent about, this is what "no duplicates" means: a
     * double-click must not produce two messages built from two reads of a cart whose price could
     * have changed in between, leaving the customer looking at one total and the seller holding
     * another.
     */
    startTransition(async () => {
      const result = await onCheckout()

      if (!result.ok) {
        setRefusal(
          result.reason === 'empty'
            ? 'Your cart is empty.'
            : result.reason === 'issues'
              ? 'Some pieces in your cart have changed — the details are on the rows above.'
              : 'Something went wrong opening checkout. Please try again.',
        )
        return
      }

      setHandoff(result)
    })
  }

  return (
    <section
      aria-labelledby="order-summary-title"
      className={cn('bg-background-container h-fit px-5 py-7.5 xl:px-7.5', className)}
      {...props}
    >
      <h2 id="order-summary-title" className="text-heading-2 text-neutral-primary">
        Order summary
      </h2>

      <dl className="mt-5 flex flex-col gap-3.5">
        {/*
          The products row and the subtotal carry the same figure, and that is correct rather than a
          copy-paste: subtotal is products plus shipping, and shipping is nothing. The design draws
          them equal too. The day delivery is computed, only the subtotal row changes.
        */}
        <Row
          term={`Products, ${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'items'}`}
          value={cart.subtotal}
        />
        <Row term="Shipping" value={cart.shipping} />
        <div className="mt-1.5 border-t border-black/10 pt-3.5">
          <Row term="Subtotal" value={cart.subtotal} strong />
        </div>
      </dl>

      <Button
        ref={checkoutRef}
        type="button"
        variant="primary"
        fullWidth
        onClick={checkout}
        loading={pending}
        disabled={handoff !== null}
        className="mt-7.5 uppercase"
      >
        Checkout
      </Button>

      <Checkbox
        checked={agreed}
        onChange={(event) => {
          setAgreed(event.currentTarget.checked)
          setRefusal(null)
        }}
        className="mt-5"
        label={
          <>
            I agree to the <Link href="/terms">Terms of Use</Link> and{' '}
            <Link href="/returns">Return Policy.</Link>
          </>
        }
      />

      {/*
        One live region, polite: this is the consequence of something the visitor just did. It names
        what to go and fix rather than reporting that the action failed.
      */}
      {refusal ? (
        <p role="status" className="text-body-small text-status-error-text mt-3.5">
          {refusal}
        </p>
      ) : null}

      {handoff ? (
        <HandoffModal
          open
          onClose={() => setHandoff(null)}
          message={handoff.message}
          messengers={handoff.messengers}
          triggerRef={checkoutRef}
        />
      ) : null}
    </section>
  )
}

function Row({ term, value, strong = false }: { term: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-5">
      <dt className={cn('text-neutral-primary', strong ? 'text-body-strong' : 'text-body-medium')}>
        {term}
      </dt>
      <dd className={cn('text-neutral-primary', strong ? 'text-body-strong' : 'text-body-medium')}>
        {value}
      </dd>
    </div>
  )
}
