'use client'

import React from 'react'

import { Icon } from '@/components/ui/icon'
import { TextInput, type TextInputProps } from '@/components/ui/text-input'

/**
 * A password box with a show/hide control (spec 004, FR-044).
 *
 * Node `408:7412` draws the eye inside the field on sign-in, and `426:11616` does the same in the
 * change-password modal. It is one control repeated, so it is one component.
 *
 * **The reset screen (`429:12884`) does not draw it, and gets it anyway.** That frame shows two
 * plain boxes — an omission rather than a decision, since FR-044 asks for the control on password
 * fields and the screen where somebody types a password they invented ten seconds ago is where
 * being able to look at it matters most.
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
   * Rendered inside the field, BEFORE the toggle.
   *
   * `trailing` is not available to callers — this component owns that slot — but the change-password
   * modal draws `Forgot password?` inside the current-password box, and a field that could show
   * either the toggle or the link but not both would be a worse component than one that composes
   * them. Before the toggle, so the reading order matches the drawn one.
   */
  adornment?: React.ReactNode
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
  adornment,
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
        <>
          {adornment}
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
        </>
      }
    />
  )
}
