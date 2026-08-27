import Image from 'next/image'
import React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

/**
 * A collection tile, from Figma node 138:509 — a photograph with the collection name at the top and
 * a white call to action at the bottom, drawn at 415x480 with a 30px inset.
 *
 * Figma's two variants ("Default" and "Hover") are one component. The only difference between the
 * frames is the crop: the hover frame draws the image at 120% width, offset up and left, which is a
 * zoom on the photograph with the card's own bounds unchanged.
 *
 * **The card is one link, not a card containing a link.** The drawing shows a white button inside
 * a clickable tile, which as markup would be a control inside a control — invalid, and it gives a
 * screen reader two things to announce where the visitor sees one. Instead the CTA is the anchor
 * (`Button href`) and it stretches over the whole card with an inset pseudo-element, so the entire
 * tile is clickable, the accessible name is read once, and the focus ring lands on the CTA where
 * the affordance is drawn.
 *
 * The title is a heading, so a page of these produces a real outline rather than a wall of links.
 * `headingLevel` exists because the right level depends on what surrounds it, and getting that
 * wrong is the difference between a navigable page and a flat one.
 *
 * **The scrim is not in the drawing.** The drawn photograph is a near-black velvet and white text
 * sits on it comfortably. The `src` here comes from the CMS, which means the next photograph may be
 * a pale one — and white-on-pale is a 1.4.3 failure that no automated check catches, because axe
 * cannot measure text over an image. A gradient behind the two text zones costs nothing on a dark
 * photograph and rescues a light one. `scrim={false}` opts out when the image is known.
 */
export interface CategoryCardProps extends Omit<React.ComponentProps<'article'>, 'title'> {
  title: string
  href: string
  image: { src: string; alt: string }
  /** Defaults to the drawn label. */
  cta?: string
  headingLevel?: 2 | 3 | 4
  /**
   * Widths this card occupies, for the browser's source selection. Defaults to the drawn width with
   * a full-width fallback below the tablet breakpoint.
   */
  sizes?: string
  scrim?: boolean
}

export function CategoryCard({
  title,
  href,
  image,
  cta = 'View the collection',
  headingLevel = 3,
  sizes = '(min-width: 1280px) 415px, (min-width: 768px) 50vw, 100vw',
  scrim = true,
  className,
  ...props
}: CategoryCardProps) {
  const Heading = `h${headingLevel}` as const

  return (
    <article
      className={cn(
        'group relative isolate flex aspect-83/96 flex-col justify-between overflow-hidden p-7.5',
        className,
      )}
      {...props}
    >
      {/*
        `fill` rather than intrinsic dimensions: the card's size comes from its aspect ratio and the
        grid around it, and the photograph's own dimensions have no say in it. `-z-10` needs the
        `isolate` above to stay behind the content and in front of the page.
      */}
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        className={cn(
          'ease-standard -z-10 object-cover transition-transform duration-[var(--duration-slow)]',
          'group-focus-within:scale-110 group-hover:scale-110',
        )}
      />

      {scrim ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-b from-black/45 via-transparent to-black/45"
        />
      ) : null}

      <Heading className="text-heading-1 text-neutral-white">{title}</Heading>

      {/*
        `after:` is what makes the whole tile clickable from a single anchor.
        
        `static` is load-bearing: `Button` sets `relative` for its hover panels, and an
        `after:inset-0` resolves against the nearest POSITIONED ancestor — so with it left in place
        the overlay covers the button itself and nothing else, which looks identical in the source
        and does nothing on the page. The card does not expose `hoverEffect`, so there is no panel
        here for `relative` to be holding.
      */}
      <Button
        href={href}
        variant="inverse"
        className="static self-start after:absolute after:inset-0"
      >
        {cta}
      </Button>
    </article>
  )
}
