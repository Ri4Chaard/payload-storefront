'use client'

import Image from 'next/image'
import NextLink from 'next/link'
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
  image: { src: string; alt?: string }
  quantity: number
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
  /** Links the name to the product. Omit for a row that is a record rather than a route. */
  href?: string
  /** Usually the stock level. */
  max?: number
  as?: 'li' | 'div'
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
  className,
  ...props
}: CartItemProps) {
  // Widened deliberately: the props are typed for `<li>`, and nothing on that interface is hostile
  // to a `<div>`. Without this the ref types disagree and the union stops type-checking at all.
  const Element = as as React.ElementType

  return (
    <Element
      className={cn('flex items-center gap-4 border-b border-black/10 py-5 pr-5', className)}
      {...props}
    >
      <div className="bg-background-container relative size-37.5 shrink-0">
        <Image src={image.src} alt={image.alt ?? ''} fill sizes="150px" className="object-cover" />
      </div>

      {/*
        `min-w-0` is what lets a long product name truncate instead of pushing the quantity control
        off the row. A flex child's default `min-width: auto` refuses to shrink below its content.
      */}
      <div className="flex h-37.5 min-w-0 flex-1 flex-col justify-between">
        <div className="text-neutral-primary flex flex-col gap-2.5">
          {href ? (
            <NextLink
              href={href}
              className={cn(
                'text-body-medium truncate',
                'ease-standard transition-colors duration-[var(--duration-fast)]',
                'hover:text-primary-default',
              )}
            >
              {name}
            </NextLink>
          ) : (
            <p className="text-body-medium truncate">{name}</p>
          )}
          <p className="text-body-strong">{price}</p>
        </div>

        <div className="flex items-center gap-5">
          <QuantityStepper
            value={quantity}
            onChange={onQuantityChange}
            max={max}
            label={`quantity of ${name}`}
          />
          <IconButton
            variant="bare"
            icon="trash"
            label={`Remove ${name}`}
            onClick={onRemove}
            className="text-neutral-secondary hover:text-primary-default"
          />
        </div>
      </div>
    </Element>
  )
}
