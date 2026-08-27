'use client'

import NextLink from 'next/link'
import React from 'react'

import { Button } from '@/components/ui/button'
import { ImageCarousel } from '@/components/ui/image-carousel'
import { cn } from '@/lib/cn'

/**
 * A product tile (node 144:947). Figma draws three variants; they are two sizes and a hover:
 *
 *   Default   node 144:946     415px wide, and the CTA is drawn at `opacity: 0`
 *   Variant2  node 144:948     the same card with the CTA visible and the carousel arrows showing
 *   Variant3  node 440:13588   174px wide, tighter gap, no CTA at all
 *
 * Default and Variant2 differ only in what is revealed, so they are one card and a hover. Variant3
 * is a genuinely different size — the strip that runs beside a page of content — so it is `size`.
 *
 * **A hidden CTA is a trap in three directions, and each needs its own answer.** `opacity: 0` leaves
 * a control that is invisible, clickable and focusable:
 *
 *   pointer     revealed on `group-hover`. A pointer over the button is a pointer over the card, so
 *               it can never be clicked while invisible.
 *   keyboard    revealed on `group-focus-within`, or tabbing lands on something nobody can see.
 *   touch       revealed by `pointer-coarse`, where there is no hover to reveal it at all — this is
 *               the one that would have shipped as "the button does not exist on phones".
 *
 * **The card is one link with two escape hatches.** The title anchor stretches over the whole tile
 * with `after:inset-0`; the carousel arrows and the CTA lift above it with `z-10`. That is what lets
 * the photograph be clickable without nesting the arrows and the button inside an anchor, which
 * would be invalid markup and would give a screen reader three controls for one tile.
 *
 * The title is a plain anchor rather than `Link`. `Link` is `relative` for the rule it grows on
 * hover, and a positioned title would capture `after:inset-0` — the overlay would cover the title
 * and nothing else. The design draws no rule under it either.
 *
 * The title is clamped to one line, as drawn. That is a real loss on a name like "Fancy Vivid Pink
 * Heart Lab Grown Diamond Earrings – Rare Shades Collection, 18k Rose Gold, IGI Certified", and it
 * is why the full name stays in the anchor's accessible name rather than being truncated there too.
 */
export interface ProductCardProps extends Omit<React.ComponentProps<'article'>, 'title'> {
  name: string
  /** Formatted for display — currency and grouping belong to the caller's locale, not here. */
  price: string
  href: string
  images: { src: string; alt?: string }[]
  size?: 'default' | 'compact'
  /** The drawn action. Omit it — as `compact` does — and the card is a link and nothing else. */
  cta?: string
  onCtaClick?: () => void
  sizes?: string
  priority?: boolean
}

export function ProductCard({
  name,
  price,
  href,
  images,
  size = 'default',
  cta = 'Select size',
  onCtaClick,
  sizes,
  priority = false,
  className,
  ...props
}: ProductCardProps) {
  const compact = size === 'compact'

  return (
    <article
      className={cn(
        'group relative flex flex-col items-start',
        compact ? 'gap-2.5' : 'gap-5',
        className,
      )}
      {...props}
    >
      <ImageCarousel
        images={images}
        label={name}
        controls="hover"
        priority={priority}
        sizes={sizes ?? (compact ? '174px' : '(min-width: 1280px) 415px, 50vw')}
        className="bg-background-container"
      />

      <div className="text-neutral-primary flex w-full flex-col gap-2.5 text-center">
        <NextLink
          href={href}
          className={cn(
            // No hover colour on the name. The link's hit area is the whole card, so it would
            // fire on any hover over the tile — and the drawing keeps the name dark in Variant2.
            // The CTA arriving is the hover feedback.
            'text-body-medium truncate after:absolute after:inset-0',
          )}
        >
          {name}
        </NextLink>
        <p className="text-body-strong">{price}</p>
      </div>

      {!compact && cta ? (
        <Button
          variant="primary"
          fullWidth
          onClick={onCtaClick}
          className={cn(
            'z-10 opacity-0',
            'ease-standard transition-opacity duration-[var(--duration-base)]',
            'group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100',
          )}
        >
          {cta}
        </Button>
      ) : null}
    </article>
  )
}
