'use client'

import React from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Link } from '@/components/ui/link'
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
   * Opens the handoff modal. Spec 005 US3 supplies it; until then the button reports that
   * checkout is not ready rather than pretending to work.
   */
  onCheckout?: () => void
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
    onCheckout()
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
        type="button"
        variant="primary"
        fullWidth
        onClick={checkout}
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
        <p role="status" className="text-body-small text-primary-default mt-3.5">
          {refusal}
        </p>
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
