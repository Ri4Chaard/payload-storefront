'use client'

import React from 'react'

import { cn } from '@/lib/cn'

/**
 * The six-digit code control from nodes `428:11924` and `429:12404`.
 *
 * **One component, one size.** The design draws 60px boxes for registration and 56px for the reset
 * flow. That is a drafting artefact, not two controls (FR-048).
 *
 * **Paste is handled at the group, and that is the whole point.** Six separate inputs is what
 * customers expect and what the design draws, but it is also the arrangement that usually breaks
 * pasting — a `paste` handler on each box gives box four a one-character code, so the customer
 * ends up typing six digits by hand while holding an email that already contains them. Reading the
 * clipboard once at the group and distributing from the first box means ⌘V or Ctrl+V anywhere in
 * the row fills the whole thing, which is what was asked for.
 *
 * It is deliberately generous about what it accepts: `482913`, `482 913`, `482-913` and
 * `Your Aurum code is 482913` all yield the same six digits, because all four are things people
 * actually paste out of a mail client.
 *
 * **`autocomplete="one-time-code"` goes on the first box only.** On more than one, the platform
 * fills every box with the entire code and the customer gets `482913482913…`. The autofilled value
 * arrives through the same distribute path as a paste, so there is one code path rather than two.
 *
 * **One tab stop, not six.** Arrow keys move within the group. Six tab stops to get past a code
 * field is a trap, particularly for someone who has already given up on it.
 */
export interface OtpInputProps {
  /** Required. The group's accessible name — a control without a label is a defect. */
  label: string
  /** The assembled value posts under this name. */
  name: string
  length?: number
  value?: string
  onChange?: (value: string) => void
  /**
   * Fired when focus leaves the GROUP, not when it moves between boxes.
   *
   * Six boxes are one control, so six blurs as a customer types would mark the field touched — and
   * with it, invalid — while they are still filling it in. Form libraries drive their touched state
   * from this, which is why the distinction matters here and not merely in principle.
   */
  onBlur?: () => void
  /** Fired when the last empty box is filled, including by a paste. */
  onComplete?: (value: string) => void
  error?: React.ReactNode
  disabled?: boolean
  autoFocus?: boolean
  id?: string
  className?: string
}

/** Everything that is not a digit is noise, wherever it came from. */
function digitsOnly(raw: string, max: number): string {
  return raw.replace(/\D/g, '').slice(0, max)
}

export function OtpInput({
  label,
  name,
  length = 6,
  value,
  onChange,
  onBlur,
  onComplete,
  error,
  disabled,
  autoFocus,
  id,
  className,
}: OtpInputProps) {
  const generatedId = React.useId()
  const groupId = id ?? generatedId
  const labelId = `${groupId}-label`
  const errorId = `${groupId}-error`

  const [internal, setInternal] = React.useState('')
  const current = value ?? internal
  const boxRefs = React.useRef<(HTMLInputElement | null)[]>([])

  const commit = React.useCallback(
    (next: string) => {
      if (value === undefined) setInternal(next)
      onChange?.(next)
    },
    [onChange, value],
  )

  /**
   * `onComplete` fires from an effect, NOT from `commit`.
   *
   * Calling it inline looks equivalent and is not: it runs synchronously inside the same update
   * that sets the value, before React has re-rendered. The usual consumer submits the form on
   * complete — and the form then posts the hidden input's PREVIOUS value, so a pasted six-digit
   * code arrives at the server five digits long and is rejected as invalid. That is a bug the
   * component can prevent for every caller, and a footgun if left to each of them to remember.
   *
   * The ref stops it re-firing while the code stays complete, and resets when the customer edits.
   */
  const completed = React.useRef<null | string>(null)

  React.useEffect(() => {
    if (current.length !== length) {
      completed.current = null
      return
    }
    if (completed.current === current) return
    completed.current = current
    onComplete?.(current)
  }, [current, length, onComplete])

  const focusBox = (index: number) => {
    const clamped = Math.max(0, Math.min(length - 1, index))
    boxRefs.current[clamped]?.focus()
    boxRefs.current[clamped]?.select()
  }

  /**
   * Shared by typing, pasting and autofill. A browser that autofills an SMS or email code writes
   * the whole value into one box, which is indistinguishable from a paste and is handled as one.
   */
  const distribute = (index: number, raw: string) => {
    const digits = digitsOnly(raw, length)
    if (!digits) return

    let next: string
    if (digits.length > 1) {
      // A multi-character value is a paste or an autofill: it owns the whole field, from the start,
      // whichever box received it. Anything else makes "paste into box four" mean something odd.
      next = digits
    } else {
      const chars = current.padEnd(length, ' ').split('')
      chars[index] = digits
      next = chars.join('').trimEnd()
    }

    commit(next)
    focusBox(digits.length > 1 ? Math.min(digits.length, length - 1) : index + 1)
  }

  const handleKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const chars = current.padEnd(length, ' ').split('')

      if (chars[index] && chars[index] !== ' ') {
        // Something here — clear it and stay put, so a correction is one keystroke.
        chars[index] = ' '
        commit(chars.join('').trimEnd())
        return
      }

      // Empty box: step back and clear that one instead.
      if (index > 0) {
        chars[index - 1] = ' '
        commit(chars.join('').trimEnd())
        focusBox(index - 1)
      }
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusBox(index - 1)
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusBox(index + 1)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      focusBox(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      focusBox(length - 1)
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-2.5', className)}>
      {/* The six boxes are one control to a screen reader; the label names the group, not a digit. */}
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        className="flex items-center justify-center gap-1.5 sm:gap-2.5"
        onBlur={(event) => {
          // `relatedTarget` is whatever is receiving focus. If it is one of our own boxes the
          // customer has not left the control, they have moved along it.
          if (event.currentTarget.contains(event.relatedTarget)) return
          onBlur?.()
        }}
        onPaste={(event) => {
          // At the GROUP. The target box is irrelevant — see the note above.
          event.preventDefault()
          distribute(0, event.clipboardData.getData('text'))
        }}
      >
        <span id={labelId} className="sr-only">
          {label}
        </span>

        {Array.from({ length }, (_, index) => (
          <input
            key={index}
            ref={(node) => {
              boxRefs.current[index] = node
            }}
            // Real inputs, not contenteditable: password managers, autofill and assistive
            // technology all expect an input, and reimplementing a text field wins nothing.
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            // First box only. On every box the platform writes the whole code into each of them.
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            autoFocus={autoFocus && index === 0}
            disabled={disabled}
            aria-label={`${label}, digit ${index + 1} of ${length}`}
            aria-invalid={error ? true : undefined}
            value={current[index] ?? ''}
            onChange={(event) => distribute(index, event.target.value)}
            onKeyDown={handleKeyDown(index)}
            onFocus={(event) => event.target.select()}
            className={cn(
              // FR-042. Six 56px boxes and five 10px gaps need 386px of a 320px screen, so the
              // narrowest phones got a row that ran off the side — the design has no frame below
              // 1920 and this is the width where that shows. Shrunk rather than wrapped: two rows
              // of three stops reading as one code. 40px still clears the 24px minimum target size
              // WCAG 2.2 AA asks for, and the drawn size returns at `sm`. This is a width
              // adaptation, not a second variant — FR-048 is about there being one box, and there
              // still is.
              'text-heading-3 sm:text-heading-2 text-neutral-primary size-10 sm:size-14 text-center',
              'bg-background-container border transition-colors',
              'focus-visible:border-primary-default focus-visible:ring-primary-default/30 focus-visible:ring-2 focus-visible:outline-none',
              'disabled:text-neutral-secondary disabled:bg-background-bg disabled:cursor-not-allowed',
              // `enabled:` so a disabled box does not offer a border change it will not honour.
              // Same convention as `TextInput`, which is the control these six are pretending to be.
              error
                ? 'border-status-error-default'
                : 'enabled:hover:border-neutral-primary border-black/10',
            )}
          />
        ))}
      </div>

      {/* The assembled value is what the form posts — the six boxes are a presentation of it. */}
      <input type="hidden" name={name} value={current} />

      {/*
        `status-error-text`, not `status-error-default`. The boxes above are outlined in the latter,
        which is 3.01:1 on this surface — correct for a border, an AA failure for body text. The
        message gets the text-safe sibling at 5.66:1, which is the same red a shade darker. The
        token mapping states that split outright, and `Field` follows it too.
      */}
      {error ? (
        <p id={errorId} role="alert" className="text-body-small text-status-error-text text-center">
          {error}
        </p>
      ) : null}
    </div>
  )
}
