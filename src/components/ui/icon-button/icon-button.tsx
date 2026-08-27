'use client'

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
    'rounded-full text-neutral-white hover:bg-neutral-white hover:text-neutral-primary focus-visible:outline-neutral-white',
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
  hoverEffect?: 'none' | 'slide'
  /**
   * A count indicator pinned to the top-right corner (node 355:6868).
   *
   * Rendered `aria-hidden`, so the count MUST also appear in `label` — "Cart, 2 items", not "Cart".
   * A badge left in the accessibility tree announces as a bare number after the button's name,
   * which tells a screen-reader user nothing about what the number counts.
   */
  badge?: React.ReactNode
}

export function IconButton({
  icon,
  label,
  variant = 'filled',
  size = 'md',
  hoverEffect = 'none',
  badge,
  type = 'button',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'group relative inline-grid shrink-0 place-items-center',
        // Clipping is what makes the slide read as travel off the edge. It is scoped to that
        // effect because it would otherwise cut the corner off the badge.
        hoverEffect === 'slide' && 'overflow-hidden',
        'ease-standard transition-colors duration-[var(--duration-fast)]',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variantClasses[variant],
        variant === 'bare' ? 'size-auto' : sizeClasses[size],
        className,
      )}
      {...props}
    >
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
    </button>
  )
}
