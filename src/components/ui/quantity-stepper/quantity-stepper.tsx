'use client'

import React from 'react'

import { IconButton } from '@/components/ui/icon-button'
import { cn } from '@/lib/cn'

/**
 * The quantity control from the cart row (node 255:3545) — two 52px squares either side of a count.
 *
 * Drawn only inside the cart, but it is a primitive rather than part of `CartItem`: the product page
 * needs the same control before anything reaches a basket, and a stepper that lives inside a cart
 * row is one somebody rebuilds.
 *
 * **Not a `<input type="number">`.** The design draws a plain count, and a number input at 30px wide
 * brings native spinners that have to be hidden, a keyboard that accepts `-1e5`, and a value that
 * can be typed empty. What it gains — typing 12 rather than pressing plus eleven times — matters for
 * a stock system, not for jewellery bought one at a time. `max` is what stops the count exceeding
 * what is available.
 *
 * The count is a live region, because pressing a button that changes a number elsewhere on screen
 * announces nothing on its own. The buttons carry the full phrase rather than relying on the group
 * label, since a group's name is not reliably announced with the controls inside it.
 *
 * Both buttons are `IconButton variant="bare"` with the drawn box applied on top. `outline` would
 * have been closer at a glance and wrong underneath — it carries a shadow and a lighter hairline
 * that would then need overriding away, and four overrides fighting a variant means it is the wrong
 * variant.
 */
export interface QuantityStepperProps extends Omit<React.ComponentProps<'div'>, 'onChange'> {
  value: number
  onChange: (value: number) => void
  min?: number
  /** Usually the stock level. Without one the count has no ceiling. */
  max?: number
  /**
   * What is being counted, for the buttons' names. A cart with three rows otherwise offers three
   * identical "Increase quantity" buttons.
   */
  label?: string
  disabled?: boolean
}

const BOX = [
  'size-13 rounded-none border border-black/10 text-neutral-primary',
  'hover:border-primary-default hover:text-primary-default',
  'disabled:hover:border-black/10 disabled:hover:text-neutral-primary',
].join(' ')

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  label = 'quantity',
  disabled = false,
  className,
  ...props
}: QuantityStepperProps) {
  const atMin = value <= min
  const atMax = max !== undefined && value >= max

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex items-center gap-2.5', className)}
      {...props}
    >
      <IconButton
        variant="bare"
        icon="minus"
        label={`Decrease ${label}`}
        disabled={disabled || atMin}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={BOX}
      />
      <span
        aria-live="polite"
        className="text-body-strong text-neutral-primary w-7.5 shrink-0 text-center"
      >
        {value}
      </span>
      <IconButton
        variant="bare"
        icon="plus"
        label={`Increase ${label}`}
        disabled={disabled || atMax}
        onClick={() => onChange(max === undefined ? value + 1 : Math.min(max, value + 1))}
        className={BOX}
      />
    </div>
  )
}
