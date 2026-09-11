import { useTranslations } from 'next-intl'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { cn } from '@/lib/cn'

/**
 * A cart with nothing in it (spec 005, T033, FR-015).
 *
 * **Nothing is drawn for this**, the same gap `ListingEmpty` records and the same reason it is
 * worth building on purpose: an empty card with an ORDER SUMMARY beside it reading `$0` looks like
 * a page that has failed, not like an answer. So the summary is not rendered at all, and this says
 * three things in the order they are useful — that the cart is empty, why that is unremarkable, and
 * where to go next.
 *
 * A server component. Nothing here is interactive, so there is no reason for it to cost the route a
 * client bundle.
 */
export interface CartEmptyProps extends React.ComponentProps<'div'> {
  browseHref?: string
}

export function CartEmpty({ browseHref = '/all-jewelry', className, ...props }: CartEmptyProps) {
  const t_nav = useTranslations('nav')
  return (
    <Container
      as="section"
      aria-labelledby="cart-empty-title"
      className={cn(
        'text-neutral-primary flex flex-col items-center gap-5 py-15 text-center xl:py-25',
        className,
      )}
      {...props}
    >
      <h2 id="cart-empty-title" className="text-heading-1">
        Your cart is empty
      </h2>
      <p className="text-body-medium max-w-150 text-balance">
        Nothing has been added yet. Every piece is made in small numbers, so it is worth taking a
        look at what is in the collection today.
      </p>
      <Button href={browseHref} variant="primary" className="mt-2.5 uppercase">
        {t_nav('browseCollection')}
      </Button>
    </Container>
  )
}
