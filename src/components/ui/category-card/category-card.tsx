import Image from 'next/image'
import { useTranslations } from 'next-intl'
import React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

/**
 * A collection tile, from Figma node 138:509 — a photograph with the collection name at the top and
 * a white call to action at the bottom, drawn at 415x480 with a 30px inset.
 *
 * **The tile changes shape, not just size** (002/T111). The home page draws it at 415x480, then
 * 478x350, then 174x242 — portrait, LANDSCAPE, portrait. The proportion is therefore responsive
 * here rather than fixed, and it lives in the component rather than in a prop because a prop cannot
 * change at a breakpoint without rendering the card twice. A caller who needs a different
 * proportion passes `aspect-*` through `className`, which `tailwind-merge` resolves over the
 * defaults; there is a story for exactly that.
 *
 * **The title needed no breakpoint work at all** (002/T112). The design steps it 30px → 30px → 20px
 * and `text-heading-1` is already a clamp from 20 to 30, landing on both endpoints exactly. It
 * reads 27px rather than 30px at the 1024 frame, which is the fluid scale doing its job; stacking
 * `md:` overrides on top of a clamp would be two systems arguing over one number.
 *
 * **The call to action is where the drawing and the typeface disagree.** Below `md` it spans the
 * tile, as drawn — but the drawn 14px does not fit. At 174px wide with a 16px inset there are 142px
 * to work with, and "VIEW COLLECTION" sets to 140px at 14px in the body face, before any padding at all.
 * The design renders about 127px for the same string, so it fits there with roughly 7px a side.
 *
 * Rendered at the drawn size the label simply leaves the card, because `Button` is
 * `whitespace-nowrap`. So the compact frame takes one more type step down, to `caption`, and
 * tightens the inset to 10px. That lands the label at 120px inside 142px — the same "label nearly
 * fills the button" proportion the drawing shows, which is the part of the design that carries
 * intent. The 14px is the part that does not survive contact with the real typeface.
 *
 * Worth a designer's eye, and the reason this is written down rather than quietly adjusted.
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
   * and anything in `alt` lands in front of the title in the link's accessible name — "A product
   * on a dark backdrop, Category 1, view the collection" for a tile whose meaning is "Category 1".
   * Inside a link that carries its own text, the picture is decoration. Fill it in only when the photograph
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
  cta: ctaProp,
  headingLevel = 3,
  sizes = '(min-width: 1280px) 415px, 50vw',
  scrim = true,
  className,
  ...props
}: CategoryCardProps) {
  const t_catalog = useTranslations('catalog')
  /*
    Resolved in the body, not as a default parameter: `useTranslations` is a hook (spec 010). The
    prop stays overridable, so a caller with its own words still wins — what changed is that the
    fallback is translated instead of being an English literal.
  */
  const cta = ctaProp ?? t_catalog('viewCollection')
  const Heading = `h${headingLevel}` as const

  return (
    <a
      href={href}
      className={cn(
        'group/card relative isolate flex flex-col justify-between overflow-hidden',
        // The tile changes SHAPE, not just size: 174x242, then 478x350, then 415x480. The tablet
        // frame is landscape, and a card that stays portrait there is the failure this exists to
        // prevent. A caller who needs a different proportion overrides `aspect-*` through
        // `className`; `tailwind-merge` resolves it.
        'aspect-87/121 p-4 md:aspect-239/175 md:p-7.5 xl:aspect-83/96',
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

      {/*
        Below `md` the drawn call to action spans the tile and drops a type step. That is not a
        stylistic preference: at 174px wide with a 16px inset there are 142px to work with, and the
        button's own `whitespace-nowrap` would push the label straight out of the card at the
        desktop padding and size.
      */}
      <Button
        as="span"
        variant="inverse"
        hoverEffect="slide"
        className="text-caption self-stretch px-2.5 uppercase md:text-body-medium md:self-start md:px-7.5"
      >
        {cta}
      </Button>
    </a>
  )
}
