import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import React from 'react'

import { currentLocale } from '@/i18n/locale'
import { CartEmpty, CartLines, OrderSummary } from '@/components/commerce'
import { SectionHeading } from '@/components/sections'
import { Container } from '@/components/ui'
import { beginCheckout, removeLine, setLineQuantity } from '@/lib/cart/actions'
import { getCart } from '@/lib/cart/loader'

/**
 * SHOPPING CART. Nodes `255:3635` (1920), `425:11164` (768),
 * `425:11269` (390).
 *
 * **A server component that composes three client islands.** The photographs, the names, the prices
 * and every total render on the server; what ships to the browser is the stepper, the bin, the
 * removal confirmation, the agreement and the checkout button. Constitution V asks for exactly this
 * shape, and it is what keeps a page of pictures off the route's JavaScript budget.
 *
 * **`noindex`.** A cart is one visitor's, it exists behind a cookie, and there is nothing on it a
 * search engine could usefully return. This is also why the route appears in no sitemap and is
 * absent from `src/lib/revalidate.ts` — see the note there.
 *
 * **Dynamic by construction**, not by a directive: `getCart` reads the session and the cart cookie,
 * and a request-time API is what makes a route dynamic in this version of Next. Saying so with
 * `export const dynamic` as well would be a second statement of the same fact, free to drift.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t_cart = await getTranslations('cart')
  return { title: t_cart('shoppingCart'), robots: { index: false, follow: false } }
}

export default async function CartPage() {
  const locale = await currentLocale()
  const cart = await getCart(locale)
  const t_cart = await getTranslations('cart')

  return (
    <>
      <Container className="pt-10 pb-7.5 xl:pt-15 xl:pb-10">
        <SectionHeading as="h1">{t_cart('shoppingCart')}</SectionHeading>
      </Container>

      {cart.empty ? (
        <CartEmpty />
      ) : (
        <Container className="pb-15 xl:pb-25">
          {/*
            One column until `xl`, where the summary moves alongside as the frames draw it. The
            summary is `h-fit` so it does not stretch to the height of a long list of rows.
          */}
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:gap-5">
            <CartLines
              lines={cart.lines}
              issues={cart.issues}
              onSetQuantity={setLineQuantity}
              onRemove={removeLine}
              className="min-w-0 flex-1"
            />
            <OrderSummary
              cart={cart}
              onCheckout={beginCheckout}
              blocked={cart.issues.length > 0}
              className="w-full xl:w-125 xl:shrink-0"
            />
          </div>
        </Container>
      )}
    </>
  )
}
