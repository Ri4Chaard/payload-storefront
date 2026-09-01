'use client'

import React from 'react'

import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
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
 * **Both actions are disabled**, deliberately and temporarily. The seam they hand to is FR-041 and
 * belongs to spec 004; until it exists, a live button would either do nothing or lie about what it
 * did. The controls above them are fully working, because choosing a stone changes the price and
 * that is worth having on its own.
 */
export interface ProductPurchaseProps extends React.ComponentProps<'div'> {
  /** The piece's own price, formatted — what shows before a stone narrows it. */
  price: string
  /** Set only where the stones differ, in which case the label reads "From …". */
  fromPrice: string | null
  description: string | null
  diamonds: DiamondOption[]
  sizes: SizeOption[]
  /** The piece as a whole. An unavailable one says so in text, not in colour (FR-040). */
  available: boolean
}

export function ProductPurchase({
  price,
  fromPrice,
  description,
  diamonds,
  sizes,
  available,
  className,
  ...props
}: ProductPurchaseProps) {
  const [diamond, setDiamond] = React.useState<number | null>(null)
  const [size, setSize] = React.useState<string | null>(null)
  const [quantity, setQuantity] = React.useState(1)

  const chosen = diamonds.find((option) => option.id === diamond) ?? null
  const shown = chosen ? chosen.price : fromPrice ? `From ${fromPrice}` : price

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

      <div className="mt-3 flex items-center gap-3 md:mt-4 md:gap-4 xl:mt-5 xl:gap-5">
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          min={1}
          // No ceiling: `ProductDetail` deliberately carries no inventory count, so there is no
          // stock-tracked maximum to enforce here. It arrives with the seam in 004.
          label="pieces"
          disabled={!available}
          className="shrink-0"
        />
        <Button
          type="button"
          variant="secondary"
          fullWidth
          disabled
          iconStart={<Icon name="cart" size="sm" />}
          className="min-w-0 flex-1 uppercase"
        >
          Add to cart
        </Button>
      </div>

      <Button
        type="button"
        variant="primary"
        fullWidth
        disabled
        className="mt-3 uppercase md:mt-4 xl:mt-5"
      >
        Buy now
      </Button>

      {/*
        The reason in TEXT, never in colour alone (FR-040). Only for a piece that genuinely cannot
        be bought — the actions being disabled while the checkout is still being built is a fact
        about this deployment, not about the piece, and saying so on the page would be noise.
      */}
      {!available ? (
        <p role="status" className="text-body-small text-neutral-primary mt-3">
          This piece is not available to order at the moment.
        </p>
      ) : null}
    </div>
  )
}
