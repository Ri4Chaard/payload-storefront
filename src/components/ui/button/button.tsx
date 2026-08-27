'use client'

import React from 'react'

import { cn } from '@/lib/cn'

/**
 * FR-022, FR-023 — the action primitive. A control that NAVIGATES is a `Link`; this one performs.
 *
 * Five variants, all taken from Figma node 10:169. Figma's own names were positional — "Default",
 * "white", "Variant3", "Variant4", "Variant5" — which say where a variant sits on the canvas, not
 * when to reach for it. They are renamed here by surface and emphasis, with the mapping recorded so
 * a designer can still find the one they drew:
 *
 *   primary          node 10:170   primary-default fill    main action, light surface
 *   secondary        node 30:21    neutral-primary fill    equal-weight second action
 *   outline          node 10:186   neutral-primary border  low emphasis, light surface
 *   inverse          node 30:27    neutral-white fill      main action, DARK surface
 *   inverse-outline  node 45:19    neutral-white border    low emphasis, DARK surface
 *
 * The two inverse variants are the only ones that assume their background. Both are unreadable on
 * the light page ground, which is why their stories render on `background-base`.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'inverse' | 'inverse-outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * The hover treatment, from the "Ховер эффекты" board (node 196:941).
 *
 * These are motion applied to an existing variant, not new variants — which is why they are a
 * second prop rather than five more entries above. Two mechanics, and they are structurally
 * opposite, which is why they do not share a skin table:
 *
 *   slide   nodes 164:748, 158:708   the variant's own fill TRAVELS OUT to the right, uncovering
 *                                    the outline underneath
 *   reveal  node 312:9907            a circle in a contrasting colour GROWS IN from the top edge
 *                                    until it floods the button
 *
 * Both invert the label as the fill leaves or arrives, and the label's transition is matched to the
 * panel's so the two land together rather than the text snapping ahead of the colour behind it.
 *
 * Under `prefers-reduced-motion` the global rule in styles.css collapses the duration, so the swap
 * becomes instantaneous rather than absent.
 */
export type ButtonHoverEffect = 'fill' | 'slide' | 'reveal'

/**
 * Only the resting fill is drawn in Figma; hover, active, focus and disabled are not. They are
 * derived here and marked as such:
 *
 * - `primary` hover uses the real `primary-hover` token.
 * - Every other hover shifts the resting fill's opacity, because inventing four more brand colours
 *   is a bigger claim than dimming one.
 * - Focus comes from the global `:focus-visible` rule in styles.css. The inverse variants override
 *   its colour, since a `primary-default` ring on a near-black surface is close to invisible.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-default text-neutral-white hover:bg-primary-hover active:bg-primary-hover',
  secondary:
    'bg-neutral-primary text-neutral-white hover:bg-neutral-primary/90 active:bg-neutral-primary/80',
  outline:
    'border border-neutral-primary text-neutral-primary hover:bg-primary-default hover:text-neutral-white',
  inverse:
    'bg-neutral-white text-neutral-primary hover:bg-background-bg active:bg-background-subtle focus-visible:outline-neutral-white',
  'inverse-outline':
    'border border-neutral-white text-neutral-white hover:bg-neutral-white hover:text-neutral-primary focus-visible:outline-neutral-white',
}

/**
 * `slide` styles the button as what it becomes once the fill has gone — the border it uncovers and
 * the label colour it lands on — and re-applies the fill as a panel that travels away.
 *
 * The label uses `hover:`, NOT `group-hover:`. `group-hover:` compiles to `.group:hover &`, a
 * DESCENDANT selector, so on the very element that carries `group` it can never match. An earlier
 * revision had it here and the label silently never changed colour: the rule was emitted, applied
 * to nothing, and looked correct in the source.
 */
interface SlideSkin {
  fill: string
  resting: string
}

const slideSkins: Partial<Record<ButtonVariant, SlideSkin>> = {
  primary: {
    fill: 'bg-primary-default',
    resting: 'border border-neutral-primary text-neutral-white hover:text-neutral-primary',
  },
  secondary: {
    fill: 'bg-neutral-primary',
    resting: 'border border-neutral-primary text-neutral-white hover:text-neutral-primary',
  },
  inverse: {
    fill: 'bg-neutral-white',
    resting:
      'border border-neutral-white text-neutral-primary hover:text-neutral-white focus-visible:outline-neutral-white',
  },
}

/**
 * `reveal` is the opposite arrangement: the button keeps its normal filled appearance and the panel
 * is a circle in a CONTRASTING colour that grows over it. So `base` is the variant's resting fill,
 * not its outline.
 */
interface RevealSkin {
  base: string
  circle: string
}

const revealSkins: Partial<Record<ButtonVariant, RevealSkin>> = {
  primary: {
    base: 'bg-primary-default text-neutral-white',
    circle: 'bg-neutral-primary',
  },
  secondary: {
    base: 'bg-neutral-primary text-neutral-white',
    circle: 'bg-primary-default',
  },
  inverse: {
    base: 'bg-neutral-white text-neutral-primary hover:text-neutral-white focus-visible:outline-neutral-white',
    circle: 'bg-primary-default',
  },
}

/**
 * `md` is the drawn size — 52px tall, 30px of horizontal padding (node 10:170).
 *
 * `sm` and `lg` are PROVISIONAL: the design defines one size, and the kit contract requires three.
 * Both stay on the 4px scale. `sm` lands on 44px rather than 40 so it still clears the 44×44 touch
 * target that mobile guidance asks for — a 40px control is the kind of thing that passes review and
 * then fails in someone's hand.
 */
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-11 px-6',
  md: 'h-13 px-7.5',
  lg: 'h-15 px-9',
}

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  hoverEffect?: ButtonHoverEffect
  /** Shows a spinner, marks the button `aria-busy`, and blocks activation. */
  loading?: boolean
  fullWidth?: boolean
  iconStart?: React.ReactNode
  iconEnd?: React.ReactNode
  /**
   * Renders an `<a>` instead of a `<button>`, matching `IconButton`. A control that NAVIGATES is a
   * link — that decides which key activates it and how a screen reader announces it — but plenty of
   * navigation is DRAWN as a filled button, which is the gap this closes. The category card's
   * "view the collection" (node 138:492) is one.
   *
   * An absolute href is treated as external and gets `rel` and a new tab, as `Link` does.
   *
   * `loading` and `disabled` have no anchor equivalent: `<a>` has no `disabled` attribute, and
   * `aria-disabled` leaves it followable. A link that must be disabled should not be rendered as a
   * link at all — drop the href and it is a button again.
   */
  href?: string
  /**
   * Renders a NON-INTERACTIVE `<span>` that only looks like a button.
   *
   * It exists for one shape: a whole tile that is a single link, where the drawn button is the
   * affordance inside it. A `<button>` or an `<a>` nested in a link is invalid markup and gives a
   * screen reader two controls where the visitor sees one, and duplicating the variant, size and
   * hover styling in the consumer is how a design system stops being one. `CategoryCard` is the
   * case that drove it.
   *
   * Never reach for this on something clickable. A span has no role, no keyboard activation and no
   * focus — if the thing responds to a click, it is a `Button` or a `Link`.
   */
  as?: 'button' | 'span'
}

/**
 * Icons sit in an 18px box (node 10:171). The slot fixes that box so a caller passing a 24-viewBox
 * glyph cannot stretch the button — the icon set is not optically uniform, so the container has to
 * be the thing that decides.
 */
function IconSlot({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-4.5 shrink-0 place-items-center [&>svg]:size-full"
    >
      {children}
    </span>
  )
}

/**
 * Local until T063 extracts `Spinner`, at which point this is deleted and Button composes it.
 * Written inline rather than as a sibling file so it cannot be imported by anything else and
 * quietly become a second spinner.
 */
function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-4.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
    />
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  hoverEffect = 'fill',
  loading = false,
  fullWidth = false,
  iconStart,
  iconEnd,
  disabled,
  href,
  as = 'button',
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  const slide = hoverEffect === 'slide' ? slideSkins[variant] : undefined
  const reveal = hoverEffect === 'reveal' ? revealSkins[variant] : undefined
  const animated = slide ?? reveal

  const classes = cn(
    'group text-body-medium relative inline-flex items-center justify-center gap-2.5 whitespace-nowrap',
    'ease-standard transition-colors',
    // The label's fade is matched to the panel's travel so the two land together. At the
    // default 120ms the text finished long before the fill had crossed the button, which read
    // as a flicker rather than an inversion.
    reveal
      ? 'duration-[var(--duration-slow)]'
      : slide
        ? 'duration-[var(--duration-base)]'
        : 'duration-[var(--duration-fast)]',
    'disabled:cursor-not-allowed disabled:opacity-40',
    // `isolate` keeps the panel's stacking context inside the button, so a button placed over a
    // positioned ancestor cannot have its own fill escape behind it.
    animated ? 'isolate overflow-hidden' : undefined,
    slide?.resting,
    reveal?.base,
    animated ? undefined : variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
    className,
  )

  const content = (
    <>
      {slide ? (
        <span
          aria-hidden="true"
          className={cn(
            'ease-standard absolute inset-0 -z-10 transition-transform duration-[var(--duration-base)]',
            'group-hover:translate-x-full',
            slide.fill,
          )}
        />
      ) : null}

      {reveal ? (
        <span
          aria-hidden="true"
          /*
           * A circle centred on the TOP edge, scaled from nothing. It is wider than the button so
           * that at full scale its radius clears the button's height from that centre — otherwise a
           * short, wide button would be left with two uncovered corners at the bottom.
           */
          className={cn(
            'ease-standard absolute top-0 left-1/2 -z-10 aspect-square w-[175%] -translate-x-1/2',
            '-translate-y-1/2 scale-0 rounded-full transition-transform duration-[var(--duration-slow)]',
            'group-hover:scale-100',
            reveal.circle,
          )}
        />
      ) : null}
      {loading ? <Spinner /> : iconStart ? <IconSlot>{iconStart}</IconSlot> : null}
      {children}
      {iconEnd ? <IconSlot>{iconEnd}</IconSlot> : null}
    </>
  )

  if (as === 'span') {
    // The surrounding control owns interaction; this only draws. `group` still resolves, so the
    // hover effects run from whatever wraps it.
    return (
      <span className={classes} {...(props as React.ComponentProps<'span'>)}>
        {content}
      </span>
    )
  }

  if (href) {
    const isExternal = /^(?:[a-z]+:)?\/\//i.test(href)
    // The rest props are typed for a button because that is the common case. Nothing
    // anchor-hostile survives the destructure above, so widening them here is safe — the same
    // arrangement IconButton uses.
    const anchorProps = props as React.ComponentProps<'a'>

    return (
      <a
        href={href}
        className={classes}
        {...(isExternal ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
        {...anchorProps}
      >
        {content}
        {isExternal ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </a>
    )
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...props}
    >
      {content}
    </button>
  )
}
