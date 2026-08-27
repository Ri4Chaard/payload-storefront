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
 * **The card IS the link.** The drawing shows a white button inside a clickable tile, which as
 * markup would be a control inside a control — invalid, and it gives a screen reader two things to
 * announce where the visitor sees one. So the root element is the anchor and the drawn button is a
 * `Button as="span"`: the same variant, size and hover machinery, none of the interactivity.
 *
 * An earlier revision kept the CTA as the anchor and stretched it over the card with
 * `after:inset-0`. That cannot survive the `slide` hover, because `slide` makes the button
 * `overflow-hidden` — the stretched overlay is then clipped back to the button, and the rest of the
 * tile stops being clickable. Inverting which element is the link is what makes the two compatible.
 *
 * The photograph is decorative here — see `image.alt`.
 *
 * The heading stays a heading inside the anchor (`<a>` may contain flow content; only interactive
 * content is forbidden), so a page of these still produces a real outline. `headingLevel` exists
 * because the right level depends on what surrounds it.
 *
 * The card's group is NAMED. `Button` uses the unnamed `group` for its own hover, and an unnamed
 * group on the card would capture it: the fill would slide away whenever the pointer entered the
 * tile anywhere, while the label — which Button colours with plain `hover:` — stayed put. Dark text
 * on a photograph, for as long as the pointer was over the card but not over the button.
 *
 * **The scrim is not in the drawing.** The drawn photograph is a near-black velvet and white text
 * sits on it comfortably. The `src` here comes from the CMS, which means the next photograph may be
 * a pale one — and white-on-pale is a 1.4.3 failure that no automated check catches, because axe
 * cannot measure text over an image. A gradient behind the two text zones costs nothing on a dark
 * photograph and rescues a light one. `scrim={false}` opts out when the image is known.
 */
export interface CategoryCardProps extends Omit<React.ComponentProps<'a'>, 'href' | 'title'> {
  title: string
  href: string
  /**
   * The photograph. `alt` defaults to empty and should usually stay that way: the card is one link,
   * and anything in `alt` lands in front of the title in the link's accessible name — "A ring on
   * dark velvet, Rings, view the collection" for a tile whose meaning is "Rings". Inside a link
   * that carries its own text, the picture is decoration. Fill it in only when the photograph
   * carries something the title does not.
   */
  image: { src: string; alt?: string }
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
    <a
      href={href}
      className={cn(
        'group/card relative isolate flex aspect-83/96 flex-col justify-between overflow-hidden p-7.5',
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
        alt={image.alt ?? ''}
        fill
        sizes={sizes}
        className={cn(
          'ease-standard -z-10 object-cover transition-transform duration-[var(--duration-slow)]',
          'group-focus-within/card:scale-110 group-hover/card:scale-110',
        )}
      />

      {scrim ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-b from-black/45 via-transparent to-black/45"
        />
      ) : null}

      <Heading className="text-heading-1 text-neutral-white">{title}</Heading>

      <Button as="span" variant="inverse" hoverEffect="slide" className="self-start">
        {cta}
      </Button>
    </a>
  )
}
