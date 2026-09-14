'use client'

import { useTranslations } from 'next-intl'
import React from 'react'

import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'
import { type IconName } from '@/lib/icon-registry'

/**
 * A button whose entire label is an icon. Four variants, drawn across four Figma nodes:
 *
 *   filled   node 144:908    48px, primary-default fill, primary-hover on hover
 *   outline  node 144:1045   50px, hairline border and a soft shadow, dark glyph
 *   bare     node 258:3981   no chrome at all — the row-level delete affordance
 *   social   node 312:9301   dark surfaces: white glyph that gains a white disc on hover
 *
 * `label` is REQUIRED and has no visually-hidden escape hatch. An icon-only control with no
 * accessible name is the single most common way a keyboard or screen-reader user hits a dead end,
 * and it is invisible in review because the button looks fine.
 *
 * The design draws `filled` at 48px and both `outline` and `social` at 50px. Two pixels between
 * three sibling controls reads as drift rather than intent, so they are normalised onto one 4px
 * scale. Worth confirming with the designer.
 *
 * The outline variant's drawn shadow is an untokenised `0 0 7.3px rgb(0 0 0 / 0.2)` — a diffuse
 * glow considerably heavier than anything in the elevation scale. `shadow-md` stands in.
 */
export type IconButtonVariant = 'filled' | 'outline' | 'bare' | 'social'
export type IconButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<IconButtonVariant, string> = {
  filled: 'bg-primary-default text-neutral-white hover:bg-primary-hover',
  outline:
    'border border-black/5 text-neutral-primary shadow-md hover:border-black/10 hover:bg-background-container',
  bare: 'text-neutral-secondary hover:text-neutral-primary',
  social:
    'rounded-full border border-white/30 text-neutral-white hover:bg-neutral-white hover:text-neutral-primary focus-visible:outline-neutral-white',
}

/**
 * `reveal` is the button's counterpart of the same effect (node 312:9907): a disc in a contrasting
 * colour grows from the top edge and floods the control while the glyph inverts.
 *
 * Like `Button`, the inversion is written with `hover:` and not `group-hover:` — the latter is a
 * descendant selector and matches nothing on the element that carries `group`.
 */
interface RevealSkin {
  base: string
  circle: string
}

const revealSkins: Partial<Record<IconButtonVariant, RevealSkin>> = {
  social: {
    base: 'rounded-full border border-white/30 text-neutral-white hover:text-neutral-primary focus-visible:outline-neutral-white',
    circle: 'bg-neutral-white',
  },
  filled: {
    base: 'bg-primary-default text-neutral-white',
    circle: 'bg-neutral-primary',
  },
  outline: {
    base: 'border border-black/5 text-neutral-primary shadow-md hover:text-neutral-white',
    circle: 'bg-primary-default',
  },
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'size-10',
  md: 'size-12',
  lg: 'size-14',
}

export interface IconButtonProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  icon: IconName
  /** Required. There is no other source of an accessible name for an icon-only control. */
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  /**
   * `slide` reproduces node 144:1045: on hover the glyph travels out of the left edge while an
   * identical one arrives from the right. Two glyphs on a track rather than one animated glyph,
   * because the design shows both on screen at once mid-transition.
   */
  hoverEffect?: 'none' | 'slide' | 'reveal'
  /**
   * A count indicator pinned to the top-right corner (node 355:6868).
   *
   * Rendered `aria-hidden`, so the count MUST also appear in `label` — "Cart, 2 items", not "Cart".
   * A badge left in the accessibility tree announces as a bare number after the button's name,
   * which tells a screen-reader user nothing about what the number counts.
   */
  badge?: React.ReactNode
  /**
   * Renders an `<a>` instead of a `<button>`. A control that NAVIGATES is a link — the footer's
   * social marks (node 312:9300) go to WhatsApp and Instagram, and announcing them as buttons tells
   * a screen-reader user the wrong thing about what will happen.
   *
   * An absolute href is treated as external and gets `rel` and a new tab, matching `Link`.
   */
  href?: string
}

export function IconButton({
  icon,
  label,
  variant = 'filled',
  size = 'md',
  hoverEffect = 'none',
  badge,
  href,
  type = 'button',
  className,
  ...props
}: IconButtonProps) {
  const t_common = useTranslations('common')
  const reveal = hoverEffect === 'reveal' ? revealSkins[variant] : undefined

  const classes = cn(
    'group relative inline-grid shrink-0 place-items-center',
    // Clipping is what makes the slide read as travel off the edge, and what keeps the reveal disc
    // inside the control. It is scoped to those effects because it would otherwise cut the corner
    // off a badge — which is why `badge` and an animated hover do not combine.
    hoverEffect !== 'none' && 'overflow-hidden',
    // `isolate` is load-bearing, not tidiness. The disc sits at `-z-10`, and `relative` alone does
    // NOT open a stacking context — so without this the disc paints behind the nearest ancestor
    // that has one, which on the footer means behind its own background. It rendered as nothing at
    // all: the element was in the DOM, correctly sized, and invisible.
    reveal && 'isolate',
    'ease-standard transition-colors duration-[var(--duration-fast)]',
    /*
     * The glyph inverts AFTER the disc has reached it, not while it is arriving.
     *
     * The disc is centred on the top edge and grows to a radius of 0.875x the control's width, so
     * it reaches the centred glyph at roughly 57% of its travel. Holding the colour until then
     * keeps a white glyph off a white disc, and lands the flip as the disc finishes. The delay is
     * symmetric because the leaving direction has the same problem mirrored.
     */
    reveal && 'delay-[var(--duration-base)]',
    'disabled:cursor-not-allowed disabled:opacity-40',
    reveal ? reveal.base : variantClasses[variant],
    variant === 'bare' ? 'size-auto' : sizeClasses[size],
    className,
  )

  const content = (
    <>
      {reveal ? (
        <span
          aria-hidden="true"
          /*
           * Centred on the TOP edge and scaled from nothing.
           *
           * The width is not decorative. From a centre on the top edge, the far bottom corner of a
           * SQUARE control is hypot(w/2, h) away — 54px on a 48px button — so a disc must be at
           * least 224% of the control's width to cover it. At 175% it fell 6px short and left the
           * bottom of every social mark dark, which reads as the animation not finishing.
           */
          className={cn(
            'ease-standard absolute top-0 left-1/2 -z-10 aspect-square w-[240%] -translate-x-1/2',
            '-translate-y-1/2 scale-0 rounded-full transition-transform duration-[var(--duration-slow)]',
            'group-hover:scale-100',
            reveal.circle,
          )}
        />
      ) : null}
      {hoverEffect === 'slide' ? (
        <span
          aria-hidden="true"
          className="ease-standard flex w-full transition-transform duration-[var(--duration-base)] group-hover:-translate-x-full"
        >
          <span className="grid w-full shrink-0 place-items-center">
            <Icon name={icon} />
          </span>
          <span className="grid w-full shrink-0 place-items-center">
            <Icon name={icon} />
          </span>
        </span>
      ) : (
        <Icon name={icon} />
      )}
      {badge != null ? (
        <span
          aria-hidden="true"
          className="text-caption bg-primary-default text-neutral-white absolute -top-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 font-semibold"
        >
          {badge}
        </span>
      ) : null}
    </>
  )

  if (href) {
    const isExternal = /^(?:[a-z]+:)?\/\//i.test(href)
    // The rest props are typed for a button because that is the common case. Nothing anchor-hostile
    // survives the destructure above, so widening them here is safe.
    const anchorProps = props as React.ComponentProps<'a'>

    return (
      <a
        href={href}
        aria-label={label}
        className={classes}
        {...(isExternal ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
        {...anchorProps}
      >
        {content}
        {isExternal ? <span className="sr-only">{t_common('opensInNewTab')}</span> : null}
      </a>
    )
  }

  return (
    <button type={type} aria-label={label} className={classes} {...props}>
      {content}
    </button>
  )
}
