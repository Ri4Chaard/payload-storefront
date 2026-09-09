'use client'

import React from 'react'

import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { HandoffModal } from '@/components/commerce/handoff-modal'
import { announceCartCount } from '@/components/layout/cart-count'
import type { CheckoutResult } from '@/lib/cart/actions-types'
import type { CartActionResult } from '@/lib/cart/types'
import { intentFrom, type CartIntent } from '@/lib/catalog/cart-intent'
import type { DiamondOption, SizeOption } from '@/lib/catalog/types'
import { cn } from '@/lib/cn'

import { ProductOptions } from '../product-options'

/**
 * Everything on the product page that depends on what the visitor has chosen (003/T283). Nodes
 * `301:5028` (1920), `410:7314`–`410:7371` (1024), `410:7647`–`410:7703` (390).
 *
 * **It spans the price as well as the controls, and that is the point.** FR-039 says the displayed
 * price follows the selected stone, so the price and the selector have to share a state — and the
 * description sits between them in the drawn order (FR-035). Splitting them would mean lifting the
 * choice into the route, which is a server component, or duplicating it. So this owns the whole
 * run from the price down to BUY NOW, and takes the description as copy to render in its place.
 *
 * Above it the route still renders the eyebrow and the name on the server, which is what keeps the
 * page's only `h1` and its structured data out of a client bundle.
 *
 * **"From" belongs to the unchosen state.** Before a stone is picked the piece has a range and the
 * label says so; after one is picked it has a price, and continuing to say "from" would be quoting
 * a range the visitor has already resolved.
 *
 * **Both actions are live** (spec 005, T021, T069). Each builds a `CartIntent` — identifiers only,
 * never a price — and hands it to a Server Action, which re-reads the piece from the published
 * catalogue and validates the choice again before doing anything. Nothing here is trusted: this
 * component's only job is to say what was chosen and to render whatever comes back.
 *
 * **They kept separate signatures, and spec 003 was right that they would need to.** That file
 * predicted the divergence — "one stays on the page and one leaves for the checkout" — at a point
 * when their bodies were identical. They are not identical now: one writes a cart row and returns a
 * count, the other writes nothing and returns a composed message and a set of links. A single
 * function with a flag would have had to be taken apart here.
 *
 * **The action arrives as a prop rather than as an import**, and that is not a style preference.
 * `src/lib/cart/actions.ts` is a `'use server'` module; importing it here would put the whole
 * Payload config on this file's graph, and a `'use client'` file that reaches Payload drags Node
 * built-ins into the browser bundle. `src/lib/addresses/types.ts` records the same lesson from spec
 * 004; here it was proven again by a Storybook build that died inside prettier. Passing the action
 * down from the route — a Server Component — costs one prop and keeps this component renderable in
 * a browser, which is what its stories depend on.
 *
 * **BUY NOW never touches the cart** (FR-020). It validates the same choices and opens the same
 * handoff modal for this one piece; a customer with a basket already assembled finds it exactly as
 * they left it. That is a property of the action's code path rather than a check inside it — see
 * `buyNow` in `src/lib/cart/actions.ts`.
 */
export interface ProductPurchaseProps extends React.ComponentProps<'div'> {
  /** Which piece this is. The one identifier the intent cannot be built without. */
  productId: number
  /** The piece's own price, formatted — what shows before a stone narrows it. */
  price: string
  /** Set only where the stones differ, in which case the label reads "From …". */
  fromPrice: string | null
  description: string | null
  diamonds: DiamondOption[]
  sizes: SizeOption[]
  /** The piece as a whole. An unavailable one says so in text, not in colour (FR-040). */
  available: boolean
  /** The ceiling for a piece with no stones. With stones, each stone carries its own. */
  maxQuantity?: number
  /**
   * The Server Action, handed down by the route. Omitted in a story, where there is no server —
   * the button then does nothing rather than pretending to.
   */
  onAddToCart?: (intent: CartIntent) => Promise<CartActionResult>
  /** Opens the handoff for this piece alone, leaving the cart untouched (FR-020). */
  onBuyNow?: (intent: CartIntent) => Promise<CheckoutResult>
}

export function ProductPurchase({
  productId,
  price,
  fromPrice,
  description,
  diamonds,
  sizes,
  available,
  maxQuantity,
  onAddToCart,
  onBuyNow,
  className,
  ...props
}: ProductPurchaseProps) {
  const [diamond, setDiamond] = React.useState<number | null>(null)
  const [size, setSize] = React.useState<string | null>(null)
  const [wanted, setWanted] = React.useState(1)
  const [pending, startTransition] = React.useTransition()
  const [handoff, setHandoff] = React.useState<null | Extract<CheckoutResult, { ok: true }>>(null)
  const buyNowRef = React.useRef<HTMLButtonElement>(null)
  const [status, setStatus] = React.useState<null | { kind: 'added' | 'refused'; message: string }>(
    null,
  )

  const chosen = diamonds.find((option) => option.id === diamond) ?? null
  const shown = chosen ? chosen.price : fromPrice ? `From ${fromPrice}` : price

  /**
   * How high the stepper may go: the chosen stone's ceiling, or the piece's own where there are no
   * stones. Undefined for anything made to order, which has no ceiling to reach.
   */
  const ceiling = chosen ? chosen.maxQuantity : maxQuantity

  /**
   * Clamped on the way OUT rather than corrected in an effect.
   *
   * The ceiling moves when the stone does — three of one, twenty of another — so a quantity stored
   * as final would need watching and rewriting every time. Storing what was ASKED FOR and capping
   * it at the moment of use means the number can never exceed the stock even for a frame, and a
   * visitor who wanted five, moved to a stone with two, then moved to one with ten, gets their five
   * back rather than being silently left at two.
   */
  const quantity = ceiling === undefined ? wanted : Math.min(wanted, ceiling)

  /**
   * What to say when the action refuses (FR-002, FR-003).
   *
   * The action returns the FIELD, never a sentence — the words belong here, where they can be
   * reworded and one day translated. Each names the control the visitor has to go and fix, which is
   * what FR-003 means by naming the unmade choice.
   */
  const refusal = (
    field: string | undefined,
    reason: string,
    action: 'buy' | 'cart' = 'cart',
  ): string => {
    // The two buttons do different things, so an unmade choice is worded for the one that was
    // pressed. BUY NOW telling somebody to choose a size "before adding this piece to your cart"
    // describes an action they did not take.
    const before = action === 'cart' ? 'before adding this piece to your cart' : 'before ordering'

    if (field === 'diamond') {
      return reason === 'missing-option'
        ? `Choose a diamond ${before}.`
        : 'That diamond is no longer available. Choose another.'
    }
    if (field === 'size') return `Choose a size ${before}.`
    if (field === 'product') return 'This piece is not available to order at the moment.'
    if (field === 'quantity') return 'Choose how many you would like.'
    return action === 'cart'
      ? 'That could not be added to your cart. Please try again.'
      : 'That could not be sent just now. Please try again.'
  }

  function submit() {
    if (!onAddToCart) return
    setStatus(null)
    startTransition(async () => {
      const result = await onAddToCart(
        intentFrom({ productId, quantity, diamondId: diamond, sizeValue: size, sizes }),
      )

      if (result.ok) announceCartCount()

      setStatus(
        result.ok
          ? { kind: 'added', message: 'Added to your cart.' }
          : { kind: 'refused', message: refusal(result.field, result.reason) },
      )
    })
  }

  /**
   * The same intent, the same validation, a different destination.
   *
   * The refusal wording is shared with ADD TO CART deliberately: the visitor has to fix the same
   * control either way, and two sets of words for one unmade choice is two things to keep in step.
   */
  function buy() {
    if (!onBuyNow) return

    const unmet = missingChoice()
    if (unmet) {
      setStatus({ kind: 'refused', message: unmet })
      return
    }

    setStatus(null)
    startTransition(async () => {
      const result = await onBuyNow(
        intentFrom({ productId, quantity, diamondId: diamond, sizeValue: size, sizes }),
      )

      if (result.ok) {
        setHandoff(result)
        return
      }

      setStatus({ kind: 'refused', message: refusal(undefined, 'error', 'buy') })
    })
  }

  /**
   * What the visitor still has to choose, checked here so BUY NOW can name it without a round trip.
   *
   * The server checks it again — this one can be skipped by anybody posting to the action directly.
   */
  function missingChoice(): null | string {
    if (diamonds.length > 0 && diamond === null) return refusal('diamond', 'missing-option', 'buy')
    if (sizes.length > 0 && size === null) return refusal('size', 'missing-option', 'buy')
    return null
  }

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      {/*
        `aria-live="polite"` because the price CHANGES under the visitor without the page moving,
        and a change nobody is told about is a change a screen reader user has to go hunting for.
        Polite rather than assertive: it is the consequence of something they just did.
      */}
      <p
        aria-live="polite"
        className="text-heading-1 text-primary-default mt-1.5 md:mt-2 xl:mt-5"
      >
        {shown}
      </p>

      {description ? (
        <p className="text-body-medium text-neutral-primary/80 mt-4 xl:mt-5">{description}</p>
      ) : null}

      {/* The rule the 1024 and 390 frames draw here (`410:7313`, `410:7646`). At 1920 the gap does it. */}
      <hr className="mt-5 border-black/10 xl:hidden" />

      <ProductOptions
        diamonds={diamonds}
        sizes={sizes}
        diamond={diamond}
        size={size}
        onDiamondChange={setDiamond}
        onSizeChange={setSize}
        disabled={!available}
        className="mt-5"
      />

      {/*
        The stepper and ADD TO CART share a line, and below the narrowest drawn frame they stop
        sharing it (003/T298).

        `flex-wrap` is the whole of that. The button's label does not wrap — no button's does — so
        the row's minimum width is the stepper plus the words "ADD TO CART" laid end to end, which
        is 355px. That fits the 390 frame this was drawn at and does not fit a 320 viewport, where
        it pushed the whole page sideways: the grid column took its width from this row, and the
        gallery beside it stretched to match. Wrapping drops the button onto its own line at that
        width and changes nothing at any width the design names.
      */}
      <div className="mt-3 flex flex-wrap items-center gap-3 md:mt-4 md:gap-4 xl:mt-5 xl:gap-5">
        <QuantityStepper
          value={quantity}
          onChange={setWanted}
          min={1}
          // Absent for a made-to-order piece, which is exactly how `QuantityStepper` reads "no
          // ceiling" — it stops disabling the plus and stops clamping.
          {...(ceiling === undefined ? {} : { max: ceiling })}
          label="pieces"
          disabled={!available}
          className="shrink-0"
        />
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={submit}
          disabled={!available || !onAddToCart}
          loading={pending}
          iconStart={<Icon name="cart" size="sm" />}
          className="min-w-0 flex-1 uppercase"
        >
          Add to cart
        </Button>
      </div>

      <Button
        ref={buyNowRef}
        type="button"
        variant="primary"
        fullWidth
        onClick={buy}
        loading={pending}
        disabled={!available || !onBuyNow || handoff !== null}
        className="mt-3 uppercase md:mt-4 xl:mt-5"
      >
        Buy now
      </Button>

      {handoff ? (
        <HandoffModal
          open
          onClose={() => setHandoff(null)}
          message={handoff.message}
          messengers={handoff.messengers}
          contact={handoff.contact}
          triggerRef={buyNowRef}
        />
      ) : null}

      {/*
        The reason in TEXT, never in colour alone (FR-040). Only for a piece that genuinely cannot
        be bought — BUY NOW being disabled while the handoff is still being built is a fact about
        this deployment, not about the piece, and saying so on the page would be noise.
      */}
      {!available ? (
        <p role="status" className="text-body-small text-neutral-primary mt-3">
          This piece is not available to order at the moment.
        </p>
      ) : null}

      {/*
        One live region for both outcomes (FR-002, FR-003, T022).
        `role="status"` rather than `alert`: this is the consequence of something the visitor just
        did, announced politely, in the same way the price above announces itself when a stone
        changes. A refusal names the control to go and fix rather than saying the action failed.
      */}
      {status && available ? (
        <p
          role="status"
          className={cn(
            'text-body-small mt-3',
            status.kind === 'refused' ? 'text-status-error-text' : 'text-neutral-primary',
          )}
        >
          {status.message}
        </p>
      ) : null}
    </div>
  )
}
