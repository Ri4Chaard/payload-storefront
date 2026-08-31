import React from 'react'

import { ProductCard } from '@/components/commerce'
import { Button, Carousel, Container } from '@/components/ui'
import { cn } from '@/lib/cn'

import { SectionHeading } from '../section-heading'

/**
 * The featured-pieces band (002/T123), from Figma nodes 144:839, 440:12540 and 440:13525 — a
 * heading, a row of product cards, and a route to the full catalogue.
 *
 * **The drawing says "carousel" without saying it.** The desktop frame parks a 50px "scroll right"
 * control at `hidden` beside the last card. That control is real; it is hidden because four cards
 * fill the 1720px content width exactly, so at four pieces there is nowhere to page. Add a fifth
 * and it appears. Below `xl` the cards keep their drawn widths — 400px at 1024, 174px at 390 — and
 * overflow the frame, which is the same control doing visible work.
 *
 * That is why the arrows are clamped rather than wrapping, and why they are absent when the track
 * does not overflow. Wrapping from the last piece back to the first would leave a visitor unable to
 * tell whether they had seen everything; three photographs of ONE product are the case where
 * wrapping is right, and that is `ImageCarousel`'s job, not this one's.
 *
 * **The desktop width is derived, not drawn.** Four cards across the content width with three gaps
 * between them is `(100% - 3 gaps) / 4`, expressed in terms of the spacing token so that changing
 * the gap does not silently break the arithmetic. Hardcoding 415px would be correct at exactly
 * 1920 and wrong at every other desktop width.
 */
export interface JewelryCarouselProps extends React.ComponentProps<'section'> {
  heading: string
  items: {
    name: string
    price: string
    href: string
    images: { src: string; alt?: string }[]
  }[]
  /**
   * The route to the full catalogue, drawn beneath the row on the home page (node 144:839).
   *
   * Optional because the product page reuses this band for _Complete the Collection_ (FR-037) and
   * draws no button there (node `242:2585`): the pieces in the row already ARE the destinations,
   * and "view all" would point at a listing the visitor did not ask for.
   */
  cta?: { label: string; href: string }
  /**
   * The scrolling region's own name. It cannot simply repeat the heading — the band is already
   * labelled by that, and two regions with one name is worse than a slightly redundant second one.
   */
  trackLabel?: string
  headingId?: string
  /**
   * Milliseconds between automatic pages, passed straight to `Carousel`. Off by default.
   *
   * On for _Complete the Collection_ on the product page, where the row is a shop window beside a
   * piece someone is already looking at, and off on the home page, where the same band is the
   * visitor's first sight of the catalogue and moving it under them is not a welcome.
   */
  autoAdvance?: number
}

export function JewelryCarousel({
  heading,
  items,
  cta,
  trackLabel = 'Featured jewelry',
  headingId = 'featured-heading',
  autoAdvance,
  className,
  ...props
}: JewelryCarouselProps) {
  return (
    <Container
      as="section"
      aria-labelledby={headingId}
      className={cn('flex flex-col items-center gap-5 xl:gap-7.5', 'py-7.5 xl:py-12.5', className)}
      {...props}
    >
      <SectionHeading id={headingId}>{heading}</SectionHeading>

      <Carousel
        label={trackLabel}
        prevLabel="Show previous pieces"
        nextLabel="Show more pieces"
        autoAdvance={autoAdvance}
        trackClassName="gap-2.5 md:gap-5"
        // 174px, then 400px, then a quarter of the content width less the three gaps between the
        // four cards. `var(--spacing) * 15` is three `gap-5`s — the same token the gap comes from.
        itemClassName="w-43.5 snap-start md:w-100 xl:w-[calc((100%-var(--spacing)*15)/4)]"
        arrowClassName="bg-background-container/90 size-12.5 rounded-full"
        items={items.map((item) => (
          <ProductCard
            key={item.href}
            name={item.name}
            price={item.price}
            href={item.href}
            images={item.images}
          />
        ))}
      />

      {cta ? (
        <Button href={cta.href} className="uppercase">
          {cta.label}
        </Button>
      ) : null}
    </Container>
  )
}
