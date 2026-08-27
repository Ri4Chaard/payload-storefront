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
}

export function Switch({ label, hideLabel = false, className, disabled, ...props }: SwitchProps) {
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
          'bg-background-subtle relative block h-6.5 w-11.5 shrink-0 rounded-full',
          'peer-focus-visible:outline-primary-default peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
          'peer-disabled:opacity-40',
          'peer-checked:[&>span]:bg-primary-default peer-checked:[&>span]:translate-x-3.5',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 left-0.5 block h-5.5 w-7 -translate-y-1/2 rounded-full',
            'bg-neutral-secondary shadow-sm',
            'ease-standard transition-[translate,background-color] duration-[var(--duration-fast)]',
          )}
        />
      </span>
      <span className={cn('text-body-base', hideLabel && 'sr-only', disabled && 'opacity-40')}>
        {label}
      </span>
    </label>
  )
}
