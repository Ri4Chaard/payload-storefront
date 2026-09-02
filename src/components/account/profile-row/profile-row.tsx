import React from 'react'

import { cn } from '@/lib/cn'

/**
 * One labelled row of the profile card — node `266:5096` (spec 004, US4, FR-022, FR-025).
 *
 * Six of them on one page: a label, a bordered box holding the value, and sometimes a control at
 * the right edge. Written once because six near-identical blocks is how a card ends up with five
 * different paddings.
 *
 * **It borrows `TextInput`'s box without being one.** The design draws every row as what looks like
 * a disabled text field, and the temptation is to render a real `<input readOnly>` — which would
 * put six focusable controls on the page that accept no input, and announce "edit text, read only"
 * to a screen reader for what is simply a value. The border is copied; the semantics are not.
 *
 * **Feature-local rather than kit** (Principle II): one consumer, six instances. If a second
 * feature grows a row like it, promote it rather than copy it.
 */
export interface ProfileRowProps {
  /** The label above the box. Rendered as the `<dt>` of the card's description list. */
  label: string
  /**
   * The value. When absent, `empty` is shown in the muted style instead — FR-025 asks for an
   * explicit empty state rather than a blank box, because a blank box reads as a broken one.
   */
  children?: React.ReactNode
  empty?: string
  /**
   * The control at the right edge: the pencil, the `+`, or nothing.
   *
   * A node rather than a callback, because the three rows that have one need three different
   * things — a button that opens a modal, a button that opens a different modal, and a switch —
   * and a prop that tried to cover all three would be a worse version of `children`.
   */
  action?: React.ReactNode
  className?: string
}

export function ProfileRow({ label, children, empty, action, className }: ProfileRowProps) {
  const filled = children !== undefined && children !== null && children !== ''

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <dt className="text-body-small text-neutral-primary">{label}</dt>
      <dd
        className={cn(
          'flex min-h-12 items-center gap-3 border border-black/10 bg-neutral-white',
          'px-4 py-2.5',
        )}
      >
        <div
          className={cn(
            'text-body-base min-w-0 flex-1',
            filled ? 'text-neutral-primary' : 'text-neutral-secondary',
          )}
        >
          {filled ? children : empty}
        </div>
        {action ? <div className="flex shrink-0 items-center">{action}</div> : null}
      </dd>
    </div>
  )
}
