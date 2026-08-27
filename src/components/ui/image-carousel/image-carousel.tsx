import Image from 'next/image'
import React from 'react'

import { Carousel } from '@/components/ui/carousel'

/**
 * The image strip inside a product card (node 144:948) — arrows at the left and right edges of the
 * photograph, 14px, appearing on hover.
 *
 * This is now a thin caller of `Carousel` (002/T121). The scroll-snap machinery it used to own —
 * the hidden scrollbar, `tabIndex` on the track, the arrows, the reasoning about why there is no
 * carousel library here — moved into the primitive when the home page's jewelry row needed the same
 * mechanism over different children. Two copies of that logic is what Constitution II forbids.
 *
 * What stayed behind is everything specific to photographs of one product:
 *
 * - **`wrap`**. Three photographs of a single piece form a loop; stopping dead on the third reads
 *   as broken, and the arrows are the only affordance saying there are more. A row of products is
 *   the opposite case, which is why the primitive defaults the other way.
 * - **Square cells.** The card's photograph is square at every breakpoint.
 * - **Names built from the product.** "Previous photograph of Butterfly diamond pendant" is what
 *   distinguishes one card's arrows from the next card's in a listing of twenty.
 *
 * No `'use client'` here any more: this component is now pure markup and the interactivity lives in
 * `Carousel`, which carries the directive itself.
 */
export interface ImageCarouselProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  images: { src: string; alt?: string }[]
  /** What the photographs are OF — a product name. Every control's name is built from it. */
  label: string
  /** `hover` hides the arrows until the surrounding `group` is hovered or focused (node 144:948). */
  controls?: 'always' | 'hover'
  sizes?: string
  priority?: boolean
}

export function ImageCarousel({
  images,
  label,
  controls = 'always',
  sizes = '(min-width: 1280px) 415px, (min-width: 768px) 33vw, 100vw',
  priority = false,
  className,
  ...props
}: ImageCarouselProps) {
  return (
    <Carousel
      label={`Photographs of ${label}`}
      prevLabel={`Previous photograph of ${label}`}
      nextLabel={`Next photograph of ${label}`}
      wrap
      controls={controls}
      className={className}
      itemClassName="relative aspect-square w-full snap-center"
      items={images.map((image, index) => (
        <Image
          key={`${image.src}-${index}`}
          src={image.src}
          alt={image.alt ?? ''}
          fill
          sizes={sizes}
          priority={priority && index === 0}
          className="object-cover"
        />
      ))}
      {...props}
    />
  )
}
