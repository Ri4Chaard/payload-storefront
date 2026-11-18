import { useTranslations } from 'next-intl'
import React from 'react'

import { ProductCard } from '@/components/commerce/product-card'
import { Container } from '@/components/ui/container'
import type { ProductSummary } from '@/lib/catalog/types'
import { cn } from '@/lib/cn'

/**
 * The listing grid (003/T251). Nodes `222:982` (1920) · `412:7764` (768) · `412:7881` (375).
 *
 * **Four, three and two columns**, from the drawn widths rather than from a guess: 1720 ÷ 4 cards
 * of 415 with 20px between them at 1920; 688 ÷ 3 of 218 with 16 at 768; 343 ÷ 2 of 163 with 16 at
 * 375. The card width is therefore never set here — the columns are, and the card fills one.
 *
 * **`ProductCard` is consumed unchanged** (FR-017). It takes a name, a price already formatted, an
 * href and photographs, which is exactly what `ProductSummary` carries; the mapping below is a
 * rename and nothing else. If this file ever needs to reach past the card's props, FR-017 says the
 * card is what gets fixed.
 *
 * **The action is drawn at every width here**, which the home row's card does not do. Nodes
 * `412:7714` and `412:7860` put a solid BUY NOW under every card at 768 and 375; the 1920 listing
 * (`222:982`) places the same card with its action revealed on hover. `ctaVisibility="always"` is
 * both of those, and it went into `ProductCard` rather than into a second card here — FR-017 says
 * that when the listing cannot reuse the card, the card is what gets fixed.
 *
 * **Availability is not drawn on a card and is not rendered on one.** A stock-tracked product at zero
 * still appears in the grid — the owner wants it seen — and says so on its own page.
 */
export interface ProductGridProps extends React.ComponentProps<'div'> {
  products: ProductSummary[]
  /**
   * How many photographs load eagerly. The default is the widest layout's first row, which is the
   * row containing this route's largest contentful paint; everything below it is lazy.
   */
  priorityCount?: number
  /** The heading this grid answers to, for assistive technology. The listing's `h1` by default. */
  label?: string
  /**
   * The action under every card. It reads "Buy now" as drawn, and it goes to the product's own page
   * rather than to a basket — a size and an option cannot be chosen from a grid, and FR-038 will not
   * let anything be bought until they are.
   */
  cta?: string
}

/**
 * Matches the columns above. Without it a browser fetches a 415px card image for a 163px slot on a
 * phone, which is most of a listing's weight spent on nothing.
 */
const SIZES = '(min-width: 1280px) 415px, (min-width: 768px) 33vw, 50vw'

export function ProductGrid({
  products,
  priorityCount = 4,
  label,
  cta: ctaProp,
  className,
  ...props
}: ProductGridProps) {
  const t_product = useTranslations('product')
  /*
    Resolved in the body rather than as a default parameter: `useTranslations` is a hook. The prop
    still wins where a caller passes one — what changed is that the fallback is translated instead
    of being an English literal in the signature.
  */
  const cta = ctaProp ?? t_product('buyNow')

  return (
    <Container
      as="section"
      aria-label={label}
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 xl:grid-cols-4 xl:gap-5',
        className,
      )}
      {...props}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          name={product.title}
          price={product.price}
          href={product.href}
          images={product.images}
          cta={cta}
          ctaVisibility="always"
          // The listing's own drawing sets the name at 14px and lets it run to as many lines as it
          // needs (`412:7765`). The home row keeps the single truncated line it was drawn with.
          nameFit="wrap"
          // Where the card already goes. The action is the drawn affordance for a pointer; the
          // card's own anchor is the one link a screen reader and a keyboard see.
          ctaHref={product.href}
          sizes={SIZES}
          priority={index < priorityCount}
        />
      ))}
    </Container>
  )
}
