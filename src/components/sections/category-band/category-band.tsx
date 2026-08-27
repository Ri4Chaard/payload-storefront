import React from 'react'

import { CategoryCard } from '@/components/ui'
import { cn } from '@/lib/cn'

import { SectionHeading } from '../section-heading'

/**
 * The collection band (002/T115), from Figma nodes 144:835, 440:12512 and 440:13487 — a heading
 * over four photographic tiles.
 *
 * Four across at 1280 and up, two-by-two below it. The tiles themselves carry the shape change
 * that goes with each arrangement — portrait, landscape, portrait — because a proportion cannot be
 * a prop without rendering the card twice. See `CategoryCard`.
 *
 * **It is a list, and the markup says so.** Four sibling links to four collections is exactly what
 * a list is for, and it costs nothing to say: a screen reader announces "list, 4 items" and a
 * visitor knows how much is here before walking it.
 */
export interface CategoryBandProps extends React.ComponentProps<'section'> {
  heading: string
  items: {
    title: string
    href: string
    cta: string
    image: { src: string; alt?: string }
  }[]
  /** The band labels itself with this. Constant because the band appears once on a page. */
  headingId?: string
}

export function CategoryBand({
  heading,
  items,
  headingId = 'categories-heading',
  className,
  ...props
}: CategoryBandProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex flex-col items-center gap-5 xl:gap-7.5',
        'px-4 py-7.5 md:px-6 xl:px-25 xl:py-12.5',
        className,
      )}
      {...props}
    >
      <SectionHeading id={headingId}>{heading}</SectionHeading>

      <ul className="grid w-full grid-cols-2 gap-2.5 md:gap-5 xl:grid-cols-4">
        {items.map((item) => (
          <li key={item.href} className="flex">
            <CategoryCard
              title={item.title}
              href={item.href}
              cta={item.cta}
              image={item.image}
              className="w-full"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
