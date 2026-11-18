import React from 'react'

import { Field } from '@/components/ui/field'
import { cn } from '@/lib/cn'

/**
 * A multi-line control, drawn at `312:8666` / `419:10799` / `419:10879`.
 *
 * **In the kit rather than beside the contact form, and that is a deliberate reading of
 * Constitution II.** The rule says a feature directory may hold only components with a single
 * consumer, and this has one today. It sits here anyway because the alternative was worse: the box
 * treatment below — the border states, the focus ring on the box rather than the control, the error
 * border, the inverse tone — is `TextInput`'s, and a second copy of it in a feature folder is
 * precisely the drift that rule exists to prevent. Every other form primitive on this site
 * (`TextInput`, `Select`, `Checkbox`, `Switch`, `OtpInput`) is a kit component; a textarea is not
 * the one that should be the exception.
 *
 * **`Field` does the label, description and error wiring**, exactly as it does for `TextInput`, so
 * the two controls cannot describe themselves differently to a screen reader.
 *
 * The drawn height is 134px at desktop; `rows` is the knob rather than a fixed height, so a control
 * that needs to be taller does not need a magic value. `resize-y` is kept — a visitor writing a
 * long message should be able to see it, and removing the affordance buys nothing.
 */
export interface TextAreaProps extends React.ComponentProps<'textarea'> {
  label: React.ReactNode
  hideLabel?: boolean
  description?: React.ReactNode
  error?: React.ReactNode
  /** `inverse` matches `TextInput`'s dark-surface tone. Unused today; kept so the two agree. */
  tone?: 'default' | 'inverse'
}

export function TextArea({
  label,
  hideLabel,
  description,
  error,
  tone = 'default',
  id,
  required,
  disabled,
  className,
  rows = 5,
  ...props
}: TextAreaProps) {
  const generated = React.useId()
  const inputId = id ?? generated
  const descriptionId = description ? `${inputId}-description` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <Field
      id={inputId}
      label={label}
      hideLabel={hideLabel}
      description={description}
      descriptionId={descriptionId}
      error={error}
      errorId={errorId}
      required={required}
      disabled={disabled}
      tone={tone}
      className={className}
    >
      <div
        className={cn(
          'flex border px-5 py-3.5',
          'ease-standard transition-colors duration-[var(--duration-fast)]',
          // The ring goes on the BOX, not the control — the same decision `TextInput` records, and
          // it has to be the same or two adjacent fields would trace their focus differently.
          'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
          tone === 'inverse'
            ? 'has-[:focus-visible]:outline-neutral-white'
            : 'has-[:focus-visible]:outline-primary-default',
          error
            ? 'border-status-error-default'
            : tone === 'inverse'
              ? 'hover:border-neutral-white focus-within:border-neutral-white border-white/30'
              : 'hover:border-neutral-primary focus-within:border-neutral-primary border-black/10',
        )}
      >
        <textarea
          id={inputId}
          rows={rows}
          required={required}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(
            'text-body-medium min-w-0 flex-1 resize-y bg-transparent outline-none',
            'disabled:cursor-not-allowed',
            tone === 'inverse'
              ? 'text-neutral-white placeholder:text-neutral-white/70'
              : 'text-neutral-primary placeholder:text-neutral-secondary',
          )}
          {...props}
        />
      </div>
    </Field>
  )
}
