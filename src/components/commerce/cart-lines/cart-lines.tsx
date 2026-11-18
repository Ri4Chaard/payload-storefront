'use client'

import { useTranslations } from 'next-intl'
import React from 'react'

import { CartItem } from '@/components/commerce/cart-item'
import { announceCartCount } from '@/components/layout/cart-count'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import type { CartActionResult, CartIssue, CartLineView } from '@/lib/cart/types'
import { cn } from '@/lib/cn'

/**
 * The rows of the cart, in the card the design draws them in.
 * Nodes `258:3930` (1920), `425:11175` (768), `425:11276` (390).
 *
 * **A `<ul>`, because a basket is a list of things.** A screen reader saying "list, 3 items" before
 * reading them is the difference between knowing how much is in the basket and finding out by
 * arrowing to the end. `CartItem` already renders as an `<li>` by default for exactly this.
 *
 * **Removal asks first.** The confirmation is `Modal` at the drawn 500px with a centred
 * heading, and it is dismissible by the close mark, the backdrop and Escape — all three leave the
 * line alone. Nothing is removed until the primary is pressed.
 *
 * **The actions arrive as props, not imports.** They are Server Actions, and a `'use client'` file
 * that imports a `'use server'` module drags the whole Payload config into the browser bundle —
 * proven in this feature by a Storybook build that died inside prettier. The route hands them down.
 */

export interface CartLinesProps extends Omit<React.ComponentProps<'div'>, 'onChange'> {
  lines: CartLineView[]
  /** What changed underneath the cart, per line. Rendered on the row it belongs to. */
  issues?: CartIssue[]
  /** The Server Actions, from the route. Omitted in a story, where the controls go inert. */
  onSetQuantity?: (lineId: string, quantity: number) => Promise<CartActionResult>
  onRemove?: (lineId: string) => Promise<CartActionResult>
}

export function CartLines({
  lines,
  issues = [],
  onSetQuantity,
  onRemove,
  className,
  ...props
}: CartLinesProps) {
  const t_cart = useTranslations('cart')
  const t_common = useTranslations('common')
  /** Which line a Server Action is currently in flight for. One at a time is enough. */
  const [busyId, setBusyId] = React.useState<null | string>(null)
  const [pendingRemoval, setPendingRemoval] = React.useState<CartLineView | null>(null)
  const [, startTransition] = React.useTransition()

  /**
   * Focus returns here when the confirmation closes.
   *
   * Held rather than defaulted, because the element that opened the dialog — the bin on that row —
   * may no longer exist once the row is gone. `useOverlay` restores focus to whatever held it, and
   * whatever held it has been unmounted; the card is what is left.
   */
  const cardRef = React.useRef<HTMLDivElement>(null)

  function changeQuantity(line: CartLineView, quantity: number) {
    if (!onSetQuantity || quantity === line.quantity) return

    setBusyId(line.id)
    startTransition(async () => {
      const result = await onSetQuantity(line.id, quantity)
      if (result.ok) announceCartCount()
      setBusyId(null)
    })
  }

  function confirmRemoval() {
    const line = pendingRemoval
    if (!line || !onRemove) return

    setPendingRemoval(null)
    setBusyId(line.id)
    startTransition(async () => {
      const result = await onRemove(line.id)
      if (result.ok) announceCartCount()
      setBusyId(null)
    })
  }

  return (
    <div
      ref={cardRef}
      className={cn('bg-background-container px-5 pt-2.5 xl:px-7.5', className)}
      {...props}
    >
      {/*
        Named, so a screen reader announces "Items in your cart, list, 2 items" rather than an
        anonymous list among the several a page carries. It is also what lets a test address the
        cart's rows rather than the footer's navigation.
      */}
      <ul aria-label={t_cart('title')}>
        {lines.map((line) => (
          <CartItem
            key={line.id}
            name={line.title}
            price={line.unitPrice}
            lineTotal={line.lineTotal}
            image={line.image ? { src: line.image.src, alt: line.image.alt } : null}
            quantity={line.quantity}
            max={line.maxQuantity}
            busy={busyId === line.id}
            options={optionsLabel(line)}
            issue={issues.find((issue) => issue.lineId === line.id)?.message}
            {...(line.href === null ? {} : { href: line.href })}
            onQuantityChange={(quantity) => changeQuantity(line, quantity)}
            onRemove={() => setPendingRemoval(line)}
            // The last row's rule is the card's own edge in the drawing, not a divider.
            className="last:border-b-0"
          />
        ))}
      </ul>

      <Modal
        open={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        title={t_cart('remove')}
        size="lg"
        align="center"
        triggerRef={cardRef}
        closeLabel={t_cart('keep')}
      >
        <p className="text-body-medium text-neutral-primary pb-7.5 text-center">
          {t_cart('removeConfirm')}
        </p>
        <div className="flex justify-center pb-7.5">
          <Button type="button" variant="primary" onClick={confirmRemoval} disabled={!onRemove}>
            {t_common('remove')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

/**
 * "Option A · Size 6".
 *
 * Returns `undefined` rather than an empty string where a product offers neither, so the row renders
 * nothing at all instead of an empty paragraph holding open a gap.
 */
function optionsLabel(line: CartLineView): string | undefined {
  // Just the option since spec 011 — size was the other half until it was deprecated.
  return line.variantChoice ?? undefined
}
