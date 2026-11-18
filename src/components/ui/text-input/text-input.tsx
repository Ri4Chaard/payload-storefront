'use client'

import React from 'react'

import { Field } from '@/components/ui/field'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'
import { type IconName } from '@/lib/icon-registry'

/**
 * FR-022 — the single-line text control, from Figma node 196:1344, which draws six states:
 * normal, hover, focus, filled, error, and error-with-message.
 *
 * Two places this departs from the drawing, both deliberate:
 *
 * 1. **It has a label.** Every state in the design is placeholder-only. A placeholder is not a
 *    label: it disappears the moment someone types, it is not announced as a name by every screen
 *    reader, and it leaves a half-filled form with no way to tell what any box was for.
 *    `hideLabel` is available where the surrounding layout genuinely supplies the name.
 * 2. **The placeholder is `neutral-secondary`, which is #343231 and not the #a7a5a3 in the
 *    drawing.** That lighter grey measures 2.29:1 on white — it is the stale colours.json value the
 *    token module already corrects, and placeholder text is text.
 *
 * The design's fixed 341px width is dropped per FR-025: the control fills its container.
 */
export interface TextInputProps extends Omit<React.ComponentProps<'input'>, 'size'> {
  label: React.ReactNode
  hideLabel?: boolean
  description?: React.ReactNode
  error?: React.ReactNode
  iconStart?: IconName
  iconEnd?: IconName
  /** Trailing content inside the box — the design puts a "Forgot password?" link here. */
  trailing?: React.ReactNode
  /**
   * `inverse` is the footer's newsletter field (node 196:577): a white-on-dark control with a
   * white/30 hairline. It is a tone rather than a separate component because everything else about
   * the control — the label wiring, the error handling, the focus ring — is identical.
   */
  tone?: 'default' | 'inverse'
}

export function TextInput({
  label,
  hideLabel,
  description,
  error,
  iconStart,
  iconEnd,
  trailing,
  tone = 'default',
  id,
  required,
  disabled,
  className,
  ...props
}: TextInputProps) {
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
          'flex h-13 items-center gap-2.5 border px-5 py-3.5',
          'ease-standard transition-colors duration-[var(--duration-fast)]',
          // The ring goes on the BOX, not the input. The input's own outline is suppressed so the
          // indicator traces the control a person actually sees rather than the text area inside it.
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
        {iconStart ? <Icon name={iconStart} /> : null}
        <input
          id={inputId}
          required={required}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(
            'text-body-medium min-w-0 flex-1 bg-transparent outline-none',
            'disabled:cursor-not-allowed',
            tone === 'inverse'
              ? 'text-neutral-white placeholder:text-neutral-white/70'
              : 'text-neutral-primary placeholder:text-neutral-secondary',
          )}
          {...props}
        />
        {trailing}
        {iconEnd ? <Icon name={iconEnd} /> : null}
      </div>
    </Field>
  )
}
