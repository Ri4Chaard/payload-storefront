'use client'

import { useRouter } from 'next/navigation'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { PasswordField } from '@/components/account/password-field'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
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
 * **The trigger lives here with the modal it opens**, as `NameRow` does, so `triggerRef` never
 * has to leave this file for focus to return to the link on close.
 *
 * **Success is a second state of this dialog, not a vanishing act** (FR-045). It used to close on
 * save and announce the result in a visually hidden live region — correct for a screen reader and
 * nothing at all for everybody else, so the reported experience was a modal that disappeared and no
 * feedback until the confirmation email arrived minutes later. The Security row is the worst place
 * in the profile for that, because it shows no password: there is no value on screen that visibly
 * changes, so the dialog itself has to be what says it worked.
 *
 * It also answers the question the email raises. A customer who has just changed a password wants
 * to know whether they are about to be signed out and why they were emailed about it — so the panel
 * says both, rather than leaving the message to look like a warning about somebody else.
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
  const confirmationRef = React.useRef<HTMLDivElement>(null)

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
    mode: 'onTouched',
  })

  const { errors, isSubmitting } = form.formState
  const resolve = (key: string | undefined) => errorText(ERRORS, key)

  const close = () => {
    setOpen(false)
    setSaved(false)
    // Three passwords left in memory for the next time the modal opens is a shoulder-surfing
    // problem the customer did not opt into, and one of them is their current one.
    form.reset(EMPTY)
  }

  /**
   * Focus follows the content when it swaps.
   *
   * `useOverlay` places focus on open and restores it on close; it has no opinion about a panel
   * that replaces its own contents while open. Without this the Save button unmounts under the
   * customer's focus and it falls to `<body>`, which drops them out of the dialog they are still
   * looking at — and leaves Escape and the focus trap with nothing to act on.
   */
  React.useEffect(() => {
    if (saved) confirmationRef.current?.focus()
  }, [saved])

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await changePassword(values)

    if (result.status === 'success') {
      // Cleared before the confirmation renders, not on close: the three values have done their
      // job, and one of them is the password that was just replaced.
      form.reset(EMPTY)
      // FR-045. The dialog STAYS OPEN and becomes the confirmation — see the note above.
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
          'ease-standard underline-offset-4 transition-colors duration-[var(--duration-fast)]',
          'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
        ].join(' ')}
      >
        change password
      </button>

      <Modal
        open={open}
        onClose={close}
        title={saved ? 'PASSWORD CHANGED' : 'CHANGE PASSWORD'}
        closeLabel="Close change password"
        triggerRef={triggerRef}
        footer={
          saved ? (
            // One way out, and it is the same one Escape and the close button take. A confirmation
            // with a Cancel beside it invites the question of what there is left to cancel.
            <Button type="button" variant="primary" onClick={close}>
              Done
            </Button>
          ) : (
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
          )
        }
      >
        {saved ? (
          /*
            `role="status"` so the swap is announced rather than silently replacing the form under
            a screen reader, and `tabIndex={-1}` so the effect above has something to focus. The
            heading is the Modal's own title, so this is the body and nothing more.
          */
          <div
            ref={confirmationRef}
            role="status"
            tabIndex={-1}
            className="flex flex-col items-center gap-4 py-2 text-center focus-visible:outline-none"
          >
            <Icon name="seal-check" className="text-status-success-default size-12" />

            <p className="text-body-base text-neutral-primary">Your password has been updated.</p>

            {/*
              Both of these are facts about what just happened, and both pre-empt a question. The
              sign-out is FR-021 — the customer should not discover it by finding themselves logged
              out on their phone — and the email is the one they are about to receive, which reads
              as an alarm if nothing here has mentioned it.
            */}
            <p className="text-body-small text-neutral-secondary max-w-80">
              You are still signed in on this device. Any other device has been signed out, and we
              have emailed you a confirmation.
            </p>
          </div>
        ) : (
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
        )}
      </Modal>
    </>
  )
}
