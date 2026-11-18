'use client'

import { useTranslations } from 'next-intl'
import { Link as NextLink } from '@/i18n/navigation'
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
 * **Where the action is drawn depends on where the card is.** `ctaVisibility` is the switch, and it
 * exists because the two places this card appears genuinely disagree — the home row's card is a
 * teaser whose action arrives on hover and is absent below `xl` (002 measured those card heights:
 * 415 + 20 + 58 + 20 + 52 at 1920, and 400 + 20 + 58 at 1024 without it), while the listing draws a
 * solid action under every card at 768 and 375 (nodes `412:7714`, `412:7860`). FR-017 says that
 * when the listing cannot reuse the card, the card is what gets fixed. This is that fix.
 *
 * At `xl` both behave identically, because the 1920 listing places this same card with its action
 * drawn at `opacity: 0` — so `always` means "solid below `xl`, revealed on hover at `xl`", which is
 * all three drawings rather than a compromise between them.
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
 * Heart Lab Grown Category 3 – Rare Shades Collection, 18k Rose Gold, IGI Certified", and it
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
  /**
   * `desktop-hover` (default) is the home row: absent below `xl`, revealed on hover above it.
   * `always` is the listing: solid at every width, and still hover-revealed at `xl`.
   */
  ctaVisibility?: 'desktop-hover' | 'always'
  /**
   * Makes the action a link to the product's own page rather than a button.
   *
   * It is marked `aria-hidden` and taken out of the tab order on purpose. It goes exactly where the
   * card's own stretched anchor goes, so to a screen reader or a keyboard it is a second copy of a
   * link that is already announced — and the tile stays ONE control, which is the arrangement this
   * card was built around. For a pointer it is the drawn button, and it works.
   */
  ctaHref?: string
  /**
   * How the name is set below `xl`.
   *
   * `truncate` (default) is one line with an ellipsis, at 16px — what the 1920 card draws
   * (`I225:1494;144:885`, `whitespace-nowrap`) and what the home row's own 390 card draws too
   * (`440:13594`), placeholder name a hundred characters long and all.
   *
   * `wrap` is the listing's later drawing (`412:7765`, `412:7773`): 14px, and the name runs to as
   * many lines as it needs. Two different answers to the same question in the same file, and both
   * are deliberate rather than a slip — the home row is a rail of fixed-width cards where ragged
   * names would make the rail ragged, and the listing is a grid where the name is the only thing
   * telling one product from another. At 174px wide, one truncated line of 16px type is about eleven
   * characters: "PARAGON EMERAL…". That is not a name.
   *
   * At `xl` both drawings agree again, so both settings truncate at 16px there.
   */
  nameFit?: 'truncate' | 'wrap'
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
  cta: ctaProp,
  ctaVisibility = 'desktop-hover',
  ctaHref,
  nameFit = 'truncate',
  onCtaClick,
  sizes,
  priority = false,
  className,
  ...props
}: ProductCardProps) {
  const t_product = useTranslations('product')
  /*
    Resolved in the body rather than as a default parameter: `useTranslations` is a hook. The prop
    still wins where a caller passes one — what changed is that the fallback is translated instead
    of being an English literal in the signature.
  */
  /*
    "View product" (`viewProduct`) since spec 011. It read "Select size" while the product page
    opened on a size selector — the card promised the next step. Sizes are deprecated, so the
    promise was to a control that no longer exists, and the honest label is what the card actually
    does: open the product.
  */
  const cta = ctaProp ?? t_product('viewProduct')

  const compact = size === 'compact'

  return (
    <article
      className={cn(
        'group relative flex flex-col items-start',
        // The default card takes the compact spacing on a phone too. `size` cannot do this: a prop
        // is one value for every viewport, and the home page's row is 174px wide at 390 and 415px
        // at 1920 (002/T124). `compact` still means "compact at every width", for a caller that
        // wants the small card on a desktop.
        compact ? 'gap-2.5' : 'gap-2.5 md:gap-5',
        className,
      )}
      {...props}
    >
      <ImageCarousel
        images={images}
        label={name}
        controls="hover"
        priority={priority}
        sizes={
          sizes ??
          (compact ? '174px' : '(min-width: 1280px) 415px, (min-width: 768px) 400px, 174px')
        }
        className="bg-background-container"
      />

      <div className="text-neutral-primary flex w-full flex-col gap-2.5 text-center">
        <NextLink
          href={href}
          className={cn(
            // No hover colour on the name. The link's hit area is the whole card, so it would
            // fire on any hover over the tile — and the drawing keeps the name dark in Variant2.
            // The CTA arriving is the hover feedback.
            // Uppercased in CSS, not typed in capitals — the same rule the wordmark follows. The
            // name reaches a screen reader and a translator in its real casing.
            'uppercase after:absolute after:inset-0',
            nameFit === 'wrap'
              ? 'text-body-small xl:text-body-medium xl:truncate'
              : 'text-body-medium truncate',
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
          // The listing draws 42px at 768 and 375 and 52px at 1920; `sm` is 44 and `md` is 52, so
          // the pair is a step rather than one height stretched across three drawings. The home
          // row's card never renders below `xl` and keeps the size it was calibrated at.
          size={ctaVisibility === 'always' ? 'sm' : 'md'}
          {...(ctaHref
            ? { href: ctaHref, 'aria-hidden': true, tabIndex: -1 }
            : { onClick: onCtaClick })}
          className={cn(
            // Uppercased in CSS rather than typed in capitals — the same rule the name above it
            // follows, and what every drawn button in the design does.
            'z-10 uppercase',
            'ease-standard transition-opacity duration-[var(--duration-base)]',
            // `hidden` rather than `opacity-0` for the widths that draw no action at all — an
            // invisible button that is still focusable is the precise trap the reveal exists to
            // avoid, and it is a trap `opacity-0` alone would walk straight into.
            ctaVisibility === 'always'
              ? 'inline-flex xl:h-13 xl:opacity-0'
              : 'hidden opacity-0 xl:inline-flex',
            // Pinned to the foot of the card, so a two-line name and a one-line name beside it
            // still put their actions on the same line. The grid stretches every tile to its row's
            // height already; without this the buttons follow the text and the row goes ragged.
            'mt-auto',
            'group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100',
          )}
        >
          {cta}
        </Button>
      ) : null}
    </article>
  )
}
