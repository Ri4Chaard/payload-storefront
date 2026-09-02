'use client'

import { useRouter } from 'next/navigation'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { PasswordField } from '@/components/account/password-field'
import { Button } from '@/components/ui/button'
import { Link } from '@/components/ui/link'
import { Modal } from '@/components/ui/modal'
import { changePassword } from '@/lib/auth/actions'
import { applyActionErrors, errorText } from '@/lib/auth/form-errors'
import { changePasswordSchema, type ChangePasswordValues } from '@/lib/auth/schemas'

/**
 * The Security row's `change password`, and the modal behind it — nodes `426:11615` and
 * `426:11616` (spec 004, US7, FR-020).
 *
 * **Labels are visible here, unlike every other form in this feature.** That is what the frame
 * draws, and it is right: three password boxes that differ only in placeholder are three boxes a
 * customer will fill in the wrong order at least once, and a placeholder disappears the moment they
 * start typing.
 *
 * **`Forgot password?` sits inside the current-password field**, which is what `TextInput`'s
 * `trailing` exists for. FR-020 requires a route out for somebody who cannot recall the password
 * they are being asked to confirm — without it this modal is a dead end for exactly the person most
 * likely to open it. The frame spells it `Fargot password?`; that is design defect 2.
 *
 * **The trigger lives here with the modal it opens**, as `NameModal` does, so `triggerRef` never
 * has to leave this file for focus to return to the link on close.
 */
const ERRORS: Record<string, string> = {
  changePasswordMismatch: 'The two passwords do not match.',
  changePasswordTooWeak: 'Use at least 8 characters, and avoid a password you use elsewhere.',
  changePasswordWrong: 'That is not your current password.',
  signInLocked:
    'Too many attempts. For your security, try again in a few minutes or reset your password.',
}

const EMPTY: ChangePasswordValues = { confirmPassword: '', currentPassword: '', newPassword: '' }

export function ChangePasswordModal() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
    mode: 'onTouched',
  })

  const { errors, isSubmitting } = form.formState
  const resolve = (key: string | undefined) => errorText(ERRORS, key)

  const close = () => {
    setOpen(false)
    // Three passwords left in memory for the next time the modal opens is a shoulder-surfing
    // problem the customer did not opt into, and one of them is their current one.
    form.reset(EMPTY)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await changePassword(values)

    if (result.status === 'success') {
      close()
      // FR-045 — something has to say it worked. The row shows no password, so without this the
      // modal simply vanishes and the customer cannot tell whether anything happened.
      setSaved(true)
      // The action replaced the session cookie; the header and the page were rendered against the
      // old one.
      router.refresh()
      return
    }

    applyActionErrors(form, result)
  })

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={[
          'text-body-base text-primary-default hover:text-primary-hover cursor-pointer underline',
          'underline-offset-4 ease-standard transition-colors duration-[var(--duration-fast)]',
          'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
        ].join(' ')}
      >
        change password
      </button>

      {/*
        Announced rather than drawn into the row: the success is a fact about an action, not a
        property of the Security row, and a message that lives in the row would have to be dismissed.
        Present from the first render so the region is reliably announced when it gains content.
      */}
      <span role="status" aria-live="polite" className="sr-only">
        {saved ? 'Your password has been changed.' : ''}
      </span>

      <Modal
        open={open}
        onClose={close}
        title="CHANGE PASSWORD"
        closeLabel="Close change password"
        triggerRef={triggerRef}
        footer={
          <>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="change-password-form"
              variant="primary"
              disabled={isSubmitting}
            >
              Save
            </Button>
          </>
        }
      >
        <form
          id="change-password-form"
          onSubmit={onSubmit}
          className="flex flex-col gap-5"
          noValidate
        >
          <PasswordField
            {...form.register('currentPassword')}
            label="Current password"
            placeholder="Enter current password"
            autoComplete="current-password"
            required
            error={resolve(errors.currentPassword?.message)}
            // FR-020's route out, for the customer who cannot recall what they are being asked to
            // confirm. Before the reveal toggle, so reading order matches the drawing.
            adornment={
              <span className="text-body-small mr-2 shrink-0 whitespace-nowrap">
                <Link href="/forgot-password">Forgot password?</Link>
              </span>
            }
          />

          <PasswordField
            {...form.register('newPassword')}
            label="New password"
            placeholder="Enter new password"
            autoComplete="new-password"
            required
            error={resolve(errors.newPassword?.message)}
          />

          <PasswordField
            {...form.register('confirmPassword')}
            label="Confirm new password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            required
            error={resolve(errors.confirmPassword?.message)}
          />

          {errors.root ? (
            <p role="alert" className="text-body-small text-status-error-text">
              {resolve(errors.root.message)}
            </p>
          ) : null}
        </form>
      </Modal>
    </>
  )
}
