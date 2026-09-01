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
      if (next.length === length) onComplete?.(next)
    },
    [length, onChange, onComplete, value],
  )

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
        className="flex items-center justify-center gap-2.5"
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
              'text-heading-2 text-neutral-primary size-14 text-center',
              'bg-background-container border transition-colors',
              'focus-visible:border-primary-default focus-visible:ring-primary-default/30 focus-visible:ring-2 focus-visible:outline-none',
              'disabled:text-neutral-secondary disabled:bg-background-bg disabled:cursor-not-allowed',
              error ? 'border-status-error-default' : 'border-black/10',
            )}
          />
        ))}
      </div>

      {/* The assembled value is what the form posts — the six boxes are a presentation of it. */}
      <input type="hidden" name={name} value={current} />

      {/*
        Message text is `neutral-primary`, not the error red. `status-error-default` on this surface
        is 3.01:1 — fine for the box borders above and for an icon, and a AA failure for body text.
        The token mapping states that split outright, and `Field` already follows it.
      */}
      {error ? (
        <p id={errorId} role="alert" className="text-body-small text-neutral-primary text-center">
          {error}
        </p>
      ) : null}
    </div>
  )
}
