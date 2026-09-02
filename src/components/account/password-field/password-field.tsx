'use client'

import React from 'react'

import { Icon } from '@/components/ui/icon'
import { TextInput, type TextInputProps } from '@/components/ui/text-input'

/**
 * A password box with a show/hide control (spec 004, FR-044).
 *
 * Nodes `408:7412` and `429:12884` draw the eye inside the field on the sign-in, reset and
 * change-password screens. It is one control repeated, so it is one component.
 *
 * **Feature-local rather than kit** (Principle II): the kit's `TextInput` already does everything
 * except toggle its own type, and a `type="password"` variant with a built-in button would push a
 * concern into a component that eleven other forms use for names and postcodes.
 *
 * **The toggle is a real `<button>` inside `trailing`, not an `iconEnd`.** `iconEnd` renders a
 * decorative glyph; this one is operable, needs a name that changes with its state, and must be
 * reachable by keyboard. A clickable icon that is not a button is the single most common way a
 * password field becomes unusable without a mouse.
 *
 * **It does not steal a tab stop from the field.** The button follows the input in DOM order, so
 * tabbing goes field → toggle → next field, which is what someone expects when the control sits
 * inside the box.
 *
 * **Revealing is not remembered.** Every instance starts hidden, including after a failed submit:
 * a password left visible on screen because the form re-rendered is a shoulder-surfing problem the
 * customer did not opt into.
 */
export type PasswordFieldProps = Omit<TextInputProps, 'iconEnd' | 'trailing' | 'type'> & {
  /**
   * The accessible name of the toggle while the password is hidden, and while it is shown.
   *
   * Named `reveal`/`conceal` rather than `show`/`hide` because `TextInput` already has a
   * `hideLabel`, which hides the field's LABEL. Two props one letter apart meaning unrelated things
   * is a bug waiting for a tired afternoon.
   */
  revealLabel?: string
  concealLabel?: string
}

export function PasswordField({
  concealLabel = 'Hide password',
  revealLabel = 'Show password',
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = React.useState(false)

  return (
    <TextInput
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          // Without this the button submits the form it sits in — the browser's default for a
          // button inside a form, and a particularly confusing one here because the customer's
          // intent was to look at what they typed.
          onClick={() => setVisible((shown) => !shown)}
          aria-pressed={visible}
          aria-label={visible ? concealLabel : revealLabel}
          className={[
            'text-neutral-secondary hover:text-neutral-primary -mr-1 flex size-8 items-center',
            'justify-center transition-colors',
            'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
          ].join(' ')}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} className="size-5" />
        </button>
      }
    />
  )
}
