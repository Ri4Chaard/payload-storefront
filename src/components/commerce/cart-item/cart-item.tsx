'use client'

import Image from 'next/image'
import { Link as NextLink } from '@/i18n/navigation'
import React from 'react'

import { IconButton } from '@/components/ui/icon-button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { cn } from '@/lib/cn'

/**
 * A row in the basket (node 255:3556) — a 150px photograph, the name and price stacked at the top,
 * and the quantity control with the remove affordance at the bottom.
 *
 * The row is a `<li>` by default. A basket is a list of things, and a screen reader saying "list,
 * 3 items" before reading them is the difference between knowing how much is in the basket and
 * finding out by arrowing to the end. `as="div"` is there for the layouts where it is not in a list.
 *
 * Everything interactive here already exists: `QuantityStepper` (node 255:3545) and an
 * `IconButton` for the bin (node 258:3980). What is new is the arrangement.
 *
 * **Extended by spec 005 rather than copied** (Principle II). The cart page needs three things this
 * did not have: the chosen stone and size on the line, a line total, and a way to look busy while a
 * Server Action is in flight. All three are additions; a `CartLine` sibling would have been the
 * duplication Principle II calls the most expensive violation.
 *
 * **The line total appears at `xl` and not below it**, which is what the frames draw: at 390 the
 * photograph, the text column and the stepper already fill the row, and the drawn mobile line
 * carries the unit price alone (node `425:11276`). Dropping the total there is the design's
 * decision, not an omission — the summary below still adds up.
 *
 * The name carries the accessible context for both controls — "Decrease quantity of BUTTERFLY
 * DIAMOND PENDANT", "Remove BUTTERFLY DIAMOND PENDANT". A basket of three rows otherwise offers
 * three identical "Increase quantity" buttons and three identical bins, which is unusable by voice
 * or by screen reader and looks perfectly fine on screen.
 *
 * The photograph is `alt=""`. It sits beside a name that says what it is, and the row's link is the
 * name — a described photograph would be announced twice over.
 */
export interface CartItemProps extends Omit<React.ComponentProps<'li'>, 'onChange'> {
  name: string
  /** Formatted for display; currency and grouping belong to the caller's locale. */
  price: string
  /**
   * `null` where the product is gone and there is no photograph to show — a withdrawn piece keeps
   * its row (FR-014) and the row still needs a box where the picture was. Passing `{ src: '' }`
   * instead makes `next/image` request the current page as an image; the story sweep caught it.
   */
  image: { src: string; alt?: string } | null
  quantity: number
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
  /** Links the name to the product. Omit for a row that is a record rather than a route. */
  href?: string
  /** Usually the stock level. */
  max?: number
  as?: 'li' | 'div'
  /** The chosen stone and size, already worded. Absent where the piece offers neither. */
  options?: React.ReactNode
  /** `unitPrice × quantity`, formatted. Drawn at `xl` only. */
  lineTotal?: string
  /** A Server Action is in flight for this row: controls are blocked, the row dims. */
  busy?: boolean
  /**
   * Something changed under this line — sold out, withdrawn, repriced (FR-014).
   *
   * Rendered as text beneath the price, never as colour alone, and it does not remove the row: a
   * cart that quietly loses a piece is one the customer cannot reason about.
   */
  issue?: React.ReactNode
}

export function CartItem({
  name,
  price,
  image,
  quantity,
  onQuantityChange,
  onRemove,
  href,
  max,
  as = 'li',
  options,
  lineTotal,
  busy = false,
  issue,
  className,
  ...props
}: CartItemProps) {
  // Widened deliberately: the props are typed for `<li>`, and nothing on that interface is hostile
  // to a `<div>`. Without this the ref types disagree and the union stops type-checking at all.
  const Element = as as React.ElementType

  return (
    <Element
      aria-busy={busy || undefined}
      className={cn(
        'flex items-center gap-4 border-b border-black/10 py-5 pr-5',
        busy && 'opacity-60 transition-opacity duration-[var(--duration-fast)]',
        className,
      )}
      {...props}
    >
      {/*
        100px below `sm`, the drawn 150px above it.

        Not a stylistic choice: at 390 the photograph, the stepper and the bin together were 6px
        wider than the viewport, and the bin was clipped against the right edge. Measured with a
        `scrollWidth` assertion rather than noticed by eye, which is why the e2e walk checks it at
        every width.
      */}
      <div className="bg-background-bg relative size-25 shrink-0 sm:size-37.5">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt ?? ''}
            fill
            sizes="(min-width: 640px) 150px, 100px"
            className="object-cover"
          />
        ) : null}
      </div>

      {/*
        `min-w-0` is what lets a long product name truncate instead of pushing the quantity control
        off the row. A flex child's default `min-width: auto` refuses to shrink below its content.
      */}
      <div className="flex min-h-25 min-w-0 flex-1 flex-col justify-between gap-2.5 sm:h-37.5 sm:gap-0">
        <div className="text-neutral-primary flex flex-col gap-2.5">
          {href ? (
            <NextLink
              href={href}
              className={cn(
                // The frames draw the name in caps (node `255:3556`). Applied in CSS rather than
                // upper-cased in the data, so the catalogue keeps the title the owner typed and a
                // screen reader is not handed an acronym.
                'text-body-medium truncate uppercase',
                'ease-standard transition-colors duration-[var(--duration-fast)]',
                'hover:text-primary-default',
              )}
            >
              {name}
            </NextLink>
          ) : (
            <p className="text-body-medium truncate uppercase">{name}</p>
          )}
          <p className="text-body-strong">{price}</p>
          {options ? <p className="text-body-small text-neutral-secondary">{options}</p> : null}
          {issue ? (
            <p role="status" className="text-body-small text-status-error-text">
              {issue}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-5">
          <QuantityStepper
            value={quantity}
            onChange={onQuantityChange}
            max={max}
            disabled={busy}
            label={`quantity of ${name}`}
            className="xl:hidden"
          />
          <IconButton
            variant="bare"
            icon="trash"
            label={`Remove ${name}`}
            onClick={onRemove}
            disabled={busy}
            className="text-neutral-secondary hover:text-primary-default"
          />
        </div>
      </div>

      {/*
        The desktop arrangement (node `258:3949`): the stepper leaves the text column and sits on
        the right beside the line total.

        **The stepper is in the markup twice, and only ever displayed once.** Each copy is
        `display: none` at the widths it does not serve, which takes it out of the tab order and
        out of the accessibility tree — so a keyboard finds one stepper and a screen reader reads
        one, at every width. The alternative, moving one element between two flex parents, cannot be
        expressed in CSS without `order` tricks that would put the stepper before the name in the
        reading order at one width or the other. Two hidden copies is the cheaper wrong-looking
        thing.
      */}
      <div className="hidden items-center gap-10 xl:flex">
        <QuantityStepper
          value={quantity}
          onChange={onQuantityChange}
          max={max}
          disabled={busy}
          label={`quantity of ${name}`}
        />
        {lineTotal ? (
          <p className="text-body-strong text-neutral-primary w-25 text-right">{lineTotal}</p>
        ) : null}
      </div>
    </Element>
  )
}
