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
 * **The narrow frames draw a card this does not build.** Nodes `412:7764` and `412:7881` put a
 * visible BUY NOW under every card, while the 1920 listing places the same `Default` card the home
 * page uses — whose action is revealed on hover and, per 002, absent below `md` entirely. Two
 * drawings of one component, and the 1920 one agrees with the component that exists. Recorded in
 * spec.md rather than resolved here.
 *
 * **Availability is not drawn on a card and is not rendered on one.** A stock-tracked piece at zero
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
  className,
  ...props
}: ProductGridProps) {
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
          sizes={SIZES}
          priority={index < priorityCount}
        />
      ))}
    </Container>
  )
}
