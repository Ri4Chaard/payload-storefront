import React from 'react'

import { cn } from '@/lib/cn'

/**
 * One labelled row of the profile card — node `266:5096` (spec 004, US4, FR-022, FR-025).
 *
 * Five of them on one page: a label, a bordered box holding the value, and sometimes a control at
 * the right edge. Written once because five near-identical blocks is how a card ends up with four
 * different paddings.
 *
 * **It borrows `TextInput`'s box without being one.** The design draws every row as what looks like
 * a disabled text field, and the temptation is to render a real `<input readOnly>` — which would
 * put five focusable controls on the page that accept no input, and announce "edit text, read only"
 * to a screen reader for what is simply a value. The border is copied; the semantics are not.
 *
 * **Feature-local rather than kit** (Principle II): one consumer, five instances. If a second
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
   * A node rather than a callback, because the rows that have one need different things — a button
   * that opens a modal, a switch, or (with `onActivate` below) a plain icon that is part of a
   * larger control. A prop that tried to cover all three would be a worse version of `children`.
   */
  action?: React.ReactNode
  /**
   * Where the action sits against a value taller than one line.
   *
   * Four of the five rows hold a single line and centre is right for all of them. A filled
   * Addresses row is a stack that grows, and a `+` floating at the middle of a list of four reads
   * as belonging to the item it happens to be beside.
   */
  align?: 'center' | 'start'
  /**
   * Makes the WHOLE box one control, rather than hanging a small icon button off its edge.
   *
   * A 20px pencil at the far right of a 1600px row is a target you have to aim at, and it is the
   * only way in — so the row looks editable and behaves as though it is not until the cursor
   * arrives in the right corner. With this set, the box is a single `<button>` carrying the
   * padding, `action` is drawn inside it as decoration, and `activateLabel` is the accessible name.
   *
   * It receives the event so the caller can record `currentTarget` as the element focus should
   * return to when its dialog closes.
   *
   * **`action` must then be inert** — an icon, not a button. A button inside a button is invalid
   * HTML and axe's `nested-interactive` violation. Rows whose box holds its own controls (a filled
   * address list) leave this unset and keep `action` interactive.
   */
  onActivate?: (event: React.MouseEvent<HTMLButtonElement>) => void
  /** Required with `onActivate`: the whole box is one control and it needs one name. */
  activateLabel?: string
  /**
   * Dialogs belonging to this row.
   *
   * Rendered inside the `<dd>`, and that is the point of the slot existing. The card is a `<dl>`,
   * which may only directly contain `dt`/`dd` groups plus `div`, `script` and `template` — a
   * `[role=dialog]` returned as a sibling of the row is a serious axe violation (WCAG 1.3.1). Modal
   * panels are fixed-positioned, so where they sit in the tree costs nothing visually.
   */
  dialog?: React.ReactNode
  className?: string
}

export function ProfileRow({
  label,
  children,
  empty,
  action,
  align = 'center',
  onActivate,
  activateLabel,
  dialog,
  className,
}: ProfileRowProps) {
  const filled = children !== undefined && children !== null && children !== ''
  const items = align === 'start' ? 'items-start' : 'items-center'

  const body = (
    <>
      <div
        className={cn(
          'text-body-base min-w-0 flex-1',
          filled ? 'text-neutral-primary' : 'text-neutral-secondary',
        )}
      >
        {filled ? children : empty}
      </div>
      {action ? <div className="flex shrink-0 items-center">{action}</div> : null}
    </>
  )

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <dt className="text-body-small text-neutral-primary">{label}</dt>
      <dd
        className={cn(
          'bg-neutral-white flex min-h-12 border border-black/10',
          // The padding moves onto the button when there is one, so the whole box is the target
          // rather than a rectangle inset from it by 16px.
          onActivate ? 'p-0' : cn('gap-3 px-4 py-2.5', items),
        )}
      >
        {onActivate ? (
          <button
            type="button"
            onClick={onActivate}
            aria-label={activateLabel}
            className={cn(
              'ease-standard flex w-full cursor-pointer gap-3 px-4 py-2.5 text-left',
              'transition-colors duration-[var(--duration-fast)] hover:bg-black/5',
              'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:-outline-offset-2',
              items,
            )}
          >
            {body}
          </button>
        ) : (
          body
        )}
        {dialog}
      </dd>
    </div>
  )
}
