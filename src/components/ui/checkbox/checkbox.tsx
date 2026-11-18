'use client'

import React from 'react'

import { cn } from '@/lib/cn'

/**
 * FR-022 — the check affordance, from Figma nodes 10:194 (Checkbox) and 10:198 (Multiselectable).
 *
 * The design draws these as two components. They are one component here, because the only
 * differences between them are a border radius and a border opacity:
 *
 *   Checkbox         22px, square, border-black/10, neutral-primary fill + 14px check when on
 *   Multiselectable  22px, round,  border-black/5,  neutral-primary fill + 14px check when on
 *
 * Shipping both as separate files would be exactly the near-duplicate sibling Constitution II
 * forbids, so the difference is a `shape` prop. `<Checkbox shape="round">` IS the Multiselectable.
 *
 * Both remain checkboxes semantically. "Multiselectable" names the behaviour — many of the options
 * may be chosen at once — and that is what a checkbox means; only the silhouette changes. A round
 * control that permits multiple selection is a real usability risk (round reads as "pick one"), and
 * it will be near-indistinguishable from `Radio` when T053 lands. That is a design question, not a
 * code one, so the shape is reproduced as drawn and the concern is raised rather than corrected.
 *
 * Figma fills the checked box with #222, which is not a token and is 3 shades off the
 * `neutral-primary` #050301 used everywhere else in the same file. Treated as a drafting slip and
 * mapped to the token; the difference is imperceptible and the alternative fails the lint gate.
 */
export type CheckboxShape = 'square' | 'round'

export interface CheckboxProps extends Omit<React.ComponentProps<'input'>, 'type' | 'size'> {
  /** Required — a control without a label is a defect. */
  label: React.ReactNode
  /** Keeps the label in the accessibility tree but out of the layout. */
  hideLabel?: boolean
  shape?: CheckboxShape
}

export function Checkbox({
  label,
  hideLabel = false,
  shape = 'square',
  className,
  disabled,
  ...props
}: CheckboxProps) {
  return (
    <label
      className={cn(
        'inline-flex items-start gap-3',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      {/*
        A real input, visually hidden rather than replaced. It keeps native keyboard handling, form
        participation, and the checked state that every `peer-*` rule below reads — none of which a
        styled <div role="checkbox"> gets for free.
      */}
      <input type="checkbox" className="peer sr-only" disabled={disabled} {...props} />
      <span
        aria-hidden="true"
        className={cn(
          'text-neutral-white grid size-5.5 shrink-0 place-items-center border',
          'ease-standard transition-colors duration-[var(--duration-fast)]',
          shape === 'round' ? 'rounded-full border-black/5' : 'rounded-none border-black/10',
          'peer-checked:bg-neutral-primary peer-checked:border-transparent',
          // The glyph is a DESCENDANT of this box, not a sibling of the input, so `peer-checked`
          // cannot reach it directly — it has to be routed through this element's own child.
          '[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100',
          '[&>svg]:transition-opacity [&>svg]:duration-[var(--duration-fast)]',
          'peer-focus-visible:outline-primary-default peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
          'peer-disabled:opacity-40',
        )}
      >
        <svg
          className="size-3.5"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13.306 4.97163L6.28413 11.9935C6.12005 12.1575 5.89758 12.2496 5.66561 12.2496C5.43365 12.2496 5.21117 12.1575 5.0471 11.9935L1.13038 8.056C0.966575 7.89195 0.874573 7.66959 0.874573 7.43776C0.874573 7.20593 0.966575 6.98357 1.13038 6.81952L2.22413 5.72577C2.38812 5.56246 2.61012 5.47078 2.84155 5.47078C3.07298 5.47078 3.29498 5.56246 3.45897 5.72577L5.68749 7.88702L10.979 2.66053C11.1431 2.49706 11.3652 2.40527 11.5967 2.40527C11.8283 2.40527 12.0504 2.49706 12.2144 2.66053L13.3055 3.72913C13.3875 3.81043 13.4526 3.90718 13.4971 4.01379C13.5416 4.1204 13.5645 4.23475 13.5646 4.35026C13.5646 4.46577 13.5418 4.58015 13.4974 4.6868C13.453 4.79344 13.388 4.89025 13.306 4.97163Z"
            fill="currentColor"
          />
        </svg>
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
