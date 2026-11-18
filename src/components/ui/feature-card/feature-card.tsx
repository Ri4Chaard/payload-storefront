import { useTranslations } from 'next-intl'
import React from 'react'

import { Icon } from '@/components/ui/icon'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type IconName } from '@/lib/icon-registry'
import { cn } from '@/lib/cn'

/**
 * The service-promise cards from node 440:12774 — a glyph, a heading, and a line of copy on a white
 * panel: free shipping, quality guarantee, personal support, secure payments.
 *
 * Figma's three variants are three breakpoints, as usual:
 *
 *   Default   node 355:7774    four across, 100px gutter, 290px tall, 50px glyph
 *   Variant2  node 440:12775   a 2x2 grid, 24px gutter, 260px tall, 50px glyph
 *   Variant3  node 440:13717   250px cards that do not shrink, 16px gutter, 190px tall, 30px glyph
 *
 * **Variant3 is a horizontal scroller, and the drawing says so without saying so.** Four 250px cards
 * that do not shrink, laid in a row inside a 390px frame, can only be read by scrolling sideways.
 * That is why `FeatureStrip` is built on `ScrollArea` rather than on a stack: it is what the mobile
 * drawing actually describes.
 *
 * Heights are `min-h`, not `h`. The drawn heights are what four short strings happen to need; the
 * fourth card's copy is already nearly twice the first's, and a fixed height clips the first
 * translation that runs long. Flex and grid equalise the row anyway, so the drawn height is a floor
 * and the tallest card sets the rest.
 *
 * The copy drops from 16px medium to 14px regular below `md` (`H/H` in the drawing), which is the
 * one place these cards are not simply the same card at three sizes.
 *
 * The glyphs are the first 50-viewBox icons in the set — everything before them was 14, 20 or 24.
 * They also mix construction: `customer-support` is a 3px stroke where the other three are fills, so
 * at 30px it reads lighter than its neighbours. Reproduced as drawn; worth a designer's eye.
 */
/**
 * **Two additions for the contact page's channel cards**, both defaulting to what this
 * card already did, so every existing caller renders byte-identically.
 *
 * `href` makes the description a link — the drawing underlines it in `primary/default` where a
 * service promise is plain `neutral/secondary` text. `uppercaseTitle` exists because the promise
 * cards shout `FREE SHIPPING` and the channel cards read `WhatsApp`, `Telegram`, `Email Us`: a
 * brand name is not shouted, and the transform was hardcoded here.
 *
 * A new `ContactCard` was the alternative, and it would have been this card with a link —
 * `ProductCard` / `ProductCardNew` is the named failure Constitution II exists to prevent.
 *
 * **The link is the value line, not the whole card.** That is what the drawing underlines, and a
 * card that is entirely a link makes a screen reader announce the platform name and the handle as
 * one destination.
 */
export interface FeatureCardProps extends Omit<React.ComponentProps<'li'>, 'title'> {
  icon: IconName
  title: string
  description: string
  as?: 'li' | 'div'
  /** Makes the description a link. Absent, it stays plain text. */
  href?: string
  /** The promise cards draw their heading in capitals; the channel cards do not. */
  uppercaseTitle?: boolean
}

export function FeatureCard({
  icon,
  title,
  description,
  as = 'li',
  href,
  uppercaseTitle = true,
  className,
  ...props
}: FeatureCardProps) {
  // Widened deliberately: the props are typed for `<li>`, and nothing there is hostile to a `<div>`.
  const Element = as as React.ElementType

  return (
    <Element
      className={cn(
        'bg-background-container flex shrink-0 flex-col justify-between',
        'min-h-47.5 md:w-62.5 p-4',
        'md:min-h-65 md:w-auto md:shrink md:p-7.5',
        'xl:min-h-72.5',
        className,
      )}
      {...props}
    >
      {/*
        Decoration, not information: the heading beside it says the same thing in words, and a named
        glyph would make a screen reader say it twice.
      */}
      <Icon name={icon} className="text-primary-default size-7.5 md:size-12.5" />

      <div className="flex flex-col gap-3">
        <h3
          className={cn('text-body-strong text-neutral-primary', uppercaseTitle && 'uppercase')}
        >
          {title}
        </h3>
        {href ? (
          <a
            href={href}
            className={cn(
              'text-body-small text-primary-default underline md:text-body-medium',
              'hover:no-underline',
              'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
            )}
          >
            {description}
          </a>
        ) : (
          <p className="text-body-small text-neutral-secondary md:text-body-medium">
            {description}
          </p>
        )}
      </div>
    </Element>
  )
}

/**
 * The four-up arrangement (node 440:12774): a sideways scroller on a phone, a 2x2 grid on a tablet,
 * one row on a desktop.
 *
 * `ScrollArea` brings `tabIndex={0}`, which is what keeps the phone layout reachable by keyboard —
 * a region that scrolls and cannot be focused is `scrollable-region-focusable`, and these cards
 * contain nothing focusable of their own to rescue it. The cost is one tab stop above `md`, where
 * the grid no longer overflows and the container is focusable for nothing. That is the cheaper of
 * the two, and cheaper than rendering the cards twice to avoid it.
 */
export interface FeatureStripProps extends React.ComponentProps<'div'> {
  items: { icon: IconName; title: string; description: string }[]
  /** Names the region — it becomes a landmark, so say what is in it. */
  label?: string
}

export function FeatureStrip({
  items,
  label: labelProp,
  className,
  ...props
}: FeatureStripProps) {
  const t_product = useTranslations('product')
  /*
    Resolved in the body, not as a default parameter: `useTranslations` is a hook. The
    prop stays overridable, so a caller with its own words still wins — what changed is that the
    fallback is translated instead of being an English literal.
  */
  const label = labelProp ?? t_product('whyShopWithUs')
  return (
    <ScrollArea
      orientation="horizontal"
      label={label}
      className={cn('px-4 py-7.5 md:px-6 xl:px-25 xl:py-12.5', className)}
      {...props}
    >
      <ul className="flex gap-5 md:grid md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <FeatureCard key={item.title} {...item} />
        ))}
      </ul>
    </ScrollArea>
  )
}
