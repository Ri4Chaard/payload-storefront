'use client'

import React from 'react'

import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'

/**
 * The site search field, from Figma node 255:3167 — a display-sized serif line over a 2px rule,
 * with a clear affordance once something has been typed.
 *
 * Figma draws the text caret as a 2px maroon bar, positioned at the left in "default" and 90px in
 * "active". That is a drawing of the browser's own caret, not a component part: reproducing it as
 * an element would put a second bar next to the real one, and it could never track the real
 * insertion point. It is `caret-color` here, which is what the drawing is describing.
 *
 * **The placeholder is not the label.** The drawing has no visible label, so the label is
 * visually hidden rather than absent — placeholder text disappears the moment anyone types, taking
 * with it the only description of the field, and it is not reliably announced.
 *
 * The drawn placeholder is `#a7a5a3`, which is 2.29:1 on the page ground. `neutral-secondary` is
 * already corrected project-wide to #343231 for exactly this reason, so it inherits the fix.
 *
 * The rule is `neutral-primary` at rest and `primary-default` on focus — see the comment on it.
 */
export interface SearchFieldProps extends Omit<React.ComponentProps<'input'>, 'type' | 'size'> {
  /** Visually hidden, but required — see above. */
  label: string
  /** Fires on the clear affordance and on Escape. */
  onClear?: () => void
  /** Defaults to the drawn copy. */
  placeholder?: string
}

export function SearchField({
  label,
  onClear,
  placeholder = 'What are you searching for?',
  value,
  defaultValue,
  onChange,
  onKeyDown,
  className,
  id,
  disabled,
  ...props
}: SearchFieldProps) {
  const generated = React.useId()
  const inputId = id ?? generated
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Mirrored rather than read from the DOM, because the clear affordance's presence depends on it
  // and a ref read does not re-render. Controlled callers stay the source of truth.
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? '')
  const isControlled = value !== undefined
  const current = String(isControlled ? value : uncontrolled)

  function clear() {
    if (!isControlled) setUncontrolled('')
    onClear?.()
    // Clearing a field and being left with focus nowhere is the classic version of this control's
    // keyboard trap — the visitor has to tab back to where they already were.
    inputRef.current?.focus()
  }

  return (
    <div className={cn('w-full', className)}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>

      {/*
        The rule is the control's own focus indicator, which is why it is the row's bottom border
        and the colour swap hangs off `has-[:focus-visible]`. The drawing shows the same rule in
        both frames, leaving a keyboard visitor nothing but the caret to say where they are; the
        global focus ring is wrong here because it draws a rectangle around a control whose entire
        design is one line.
      */}
      <div
        className={cn(
          'ease-standard flex items-center gap-2.5 border-b-2 pb-3 transition-colors',
          'duration-[var(--duration-fast)]',
          'border-neutral-primary has-[:focus-visible]:border-primary-default',
          disabled && 'border-neutral-secondary',
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          placeholder={placeholder}
          value={isControlled ? value : uncontrolled}
          disabled={disabled}
          onChange={(event) => {
            if (!isControlled) setUncontrolled(event.target.value)
            onChange?.(event)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && current !== '') {
              event.preventDefault()
              clear()
            }
            onKeyDown?.(event)
          }}
          className={cn(
            'text-heading-1 text-neutral-primary placeholder:text-neutral-secondary',
            'caret-primary-default min-w-0 flex-1 bg-transparent outline-none',
            'disabled:text-neutral-secondary disabled:cursor-not-allowed',
            // Safari and Chrome draw their own clear affordance on a search input. Two of them, one
            // of which is unreachable by keyboard, is worse than either alone.
            '[&::-webkit-search-cancel-button]:appearance-none',
          )}
          {...props}
        />

        {current !== '' && !disabled ? (
          <button
            type="button"
            onClick={clear}
            className={cn(
              'text-neutral-primary shrink-0 cursor-pointer p-2.5',
              'ease-standard transition-colors duration-[var(--duration-fast)]',
              'hover:text-primary-default',
            )}
          >
            <Icon name="close" label={`Clear ${label.toLowerCase()}`} />
          </button>
        ) : null}
      </div>
    </div>
  )
}
