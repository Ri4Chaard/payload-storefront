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
    'border border-neutral-primary text-neutral-primary hover:bg-neutral-primary hover:text-neutral-white',
  inverse:
    'bg-neutral-white text-neutral-primary hover:bg-background-bg active:bg-background-subtle focus-visible:outline-neutral-white',
  'inverse-outline':
    'border border-neutral-white text-neutral-white hover:bg-neutral-white hover:text-neutral-primary focus-visible:outline-neutral-white',
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
  /** Shows a spinner, marks the button `aria-busy`, and blocks activation. */
  loading?: boolean
  fullWidth?: boolean
  iconStart?: React.ReactNode
  iconEnd?: React.ReactNode
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
  loading = false,
  fullWidth = false,
  iconStart,
  iconEnd,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'text-body-medium inline-flex items-center justify-center gap-2.5 whitespace-nowrap',
        'ease-standard transition-colors duration-[var(--duration-fast)]',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : iconStart ? <IconSlot>{iconStart}</IconSlot> : null}
      {children}
      {iconEnd ? <IconSlot>{iconEnd}</IconSlot> : null}
    </button>
  )
}
