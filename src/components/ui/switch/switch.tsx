'use client'

import React from 'react'

import { cn } from '@/lib/cn'

/**
 * FR-022 — the on/off primitive, from Figma node 10:202 ("Toggle").
 *
 * Geometry is taken exactly: a 46×26 track, a 28×22 knob inset 2px, so the knob travels 14px.
 *
 * Two things the design does that are worth naming rather than quietly normalising:
 *
 * 1. The TRACK does not change colour. It is `background-subtle` in both states; only the knob
 *    moves and changes colour (`neutral-secondary` off, `primary-default` on). That makes position
 *    the primary state cue, which is fine — but it also means the track reads at roughly 1.3:1
 *    against the `background-bg` page ground, short of the 3:1 that WCAG 2.2 asks of a user
 *    interface component's boundary. Reproduced as drawn; flagged for the designer.
 * 2. Figma gives the on-state a 15px radius and the off-state 30px. Both exceed half the 26px
 *    height, so both are already fully round — the difference is a drafting artefact, not a design,
 *    and collapses to `rounded-full`.
 *
 * The knob's drawn shadow is an untokenised `0 0 3.1px rgb(0 0 0 / 0.11)`; `shadow-sm` stands in.
 */
export interface SwitchProps extends Omit<React.ComponentProps<'input'>, 'type' | 'size'> {
  /** Required — a control without a label is a defect (contracts/ui-kit.md). */
  label: React.ReactNode
  /** Keeps the label in the accessibility tree but out of the layout. */
  hideLabel?: boolean
  /**
   * Renders a NON-INTERACTIVE drawing of the switch, the way `Button` does for the same reason.
   *
   * It exists for one shape: a control that is drawn as a toggle but IS a link, because what it
   * changes is the address. The listing's IN-STOCK ONLY is exactly that — every filter lives in the
   * URL, so turning it on is a navigation, and a real `<input>` inside an `<a>` is invalid markup
   * that hands a screen reader two controls where the visitor sees one.
   *
   * The surrounding link owns the state and announces it; this only paints. Never reach for it on
   * something that toggles in place — that is a `Switch`.
   */
  as?: 'input' | 'span'
}

/** The two painted halves, shared by both branches so the drawing is written once. */
const TRACK = 'bg-background-subtle relative block h-6.5 w-11.5 shrink-0 rounded-full'
const KNOB = [
  'absolute top-1/2 left-0.5 block h-5.5 w-7 -translate-y-1/2 rounded-full',
  'bg-neutral-secondary shadow-sm',
  'ease-standard transition-[translate,background-color] duration-[var(--duration-fast)]',
].join(' ')

export function Switch({
  label,
  hideLabel = false,
  as = 'input',
  className,
  disabled,
  ...props
}: SwitchProps) {
  if (as === 'span') {
    return (
      <span className={cn('inline-flex items-center gap-3', className)}>
        <span
          aria-hidden="true"
          className={cn(
            TRACK,
            props.checked && '[&>span]:bg-primary-default [&>span]:translate-x-3.5',
          )}
        >
          <span className={KNOB} />
        </span>
        <span className={cn('text-body-base', hideLabel && 'sr-only')}>{label}</span>
      </span>
    )
  }

  return (
    <label
      className={cn(
        'inline-flex items-center gap-3',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      {/*
        `role="switch"` on a real checkbox rather than a <button>: it reads as on/off to a screen
        reader while keeping native form participation and the Space key behaviour.
      */}
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        disabled={disabled}
        {...props}
      />
      <span
        aria-hidden="true"
        className={cn(
          TRACK,
          'peer-focus-visible:outline-primary-default peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
          'peer-disabled:opacity-40',
          'peer-checked:[&>span]:bg-primary-default peer-checked:[&>span]:translate-x-3.5',
        )}
      >
        <span className={KNOB} />
      </span>
      <span
        className={cn(
          'text-body-base',
          hideLabel && 'sr-only',
          disabled && 'text-neutral-secondary',
        )}
      >
        {label}
      </span>
    </label>
  )
}
