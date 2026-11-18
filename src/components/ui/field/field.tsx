import React from 'react'

import { cn } from '@/lib/cn'

/**
 * FR-022 — the wrapper every form control shares: label, description, error, required,
 * disabled, and the ARIA wiring between them.
 *
 * It takes ids rather than generating them. The control owns its id (it needs one for `htmlFor`
 * anyway), and passing them in keeps the relationship visible in the calling component instead of
 * hidden behind context — which is what makes a broken `aria-describedby` findable.
 *
 * **Error text is red, and it is a different red from the border.** The design draws this message
 * in red (node 530:12217) and it should be red — an error nobody can see the colour of is doing
 * half its job. But `status-error-default` #f75959 measures 3.01:1 on our light surfaces:
 * compliant for a border or an icon, an AA failure for body-size text. So the message uses
 * `status-error-text` #bf2222, the same hue at 5.66:1, while the control's border keeps #f75959.
 * Two tokens because the two jobs have different thresholds, not because the palette drifted.
 *
 * The design pairs that red text with no icon, and the icon set currently has no warning glyph, so
 * the "red on the icon" half of the contract has nothing to attach to yet.
 *
 * `disabled` de-emphasises the label by COLOUR rather than by opacity. Dimming the whole field to
 * 40% is the obvious move and it fails: it drags the label under the contrast threshold, and it
 * only escapes the automated check because axe exempts controls that are themselves disabled — an
 * exemption that evaporates the moment a caller sets `disabled` here and forgets it on the control.
 * `neutral-secondary` is 11.92:1 and reads as muted without becoming unreadable.
 */
export interface FieldProps {
  /** The control's id — must match the control's own `id` for `htmlFor` to bind. */
  id: string
  label: React.ReactNode
  /** Keeps the label in the accessibility tree but out of the layout. */
  hideLabel?: boolean
  description?: React.ReactNode
  descriptionId?: string
  error?: React.ReactNode
  errorId?: string
  required?: boolean
  disabled?: boolean
  /** `inverse` flips the label and description for a dark surface. */
  tone?: 'default' | 'inverse'
  className?: string
  children: React.ReactNode
}

export function Field({
  id,
  label,
  hideLabel = false,
  description,
  descriptionId,
  error,
  errorId,
  required = false,
  disabled = false,
  tone = 'default',
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label
        htmlFor={id}
        className={cn(
          'text-label',
          tone === 'inverse'
            ? 'text-neutral-white'
            : disabled
              ? 'text-neutral-secondary'
              : 'text-neutral-primary',
          hideLabel && 'sr-only',
        )}
      >
        {label}
        {/*
          Decorative only. The control carries `required`, which is what assistive tech actually
          announces — an asterisk read aloud as "star" tells nobody anything.
        */}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>

      {description ? (
        <p
          id={descriptionId}
          className={cn(
            'text-caption',
            tone === 'inverse' ? 'text-neutral-white/80' : 'text-neutral-secondary',
          )}
        >
          {description}
        </p>
      ) : null}

      {children}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className={cn(
            'text-body-small',
            // `inverse` is the dark footer surface, where a dark red is unreadable — white is what
            // carries there, and the control's border still says which field it is.
            tone === 'inverse' ? 'text-neutral-white' : 'text-status-error-text',
          )}
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
