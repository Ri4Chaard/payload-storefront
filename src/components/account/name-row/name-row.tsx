'use client'

import { useTranslations } from 'next-intl'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { ProfileRow } from '@/components/account/profile-row'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Modal } from '@/components/ui/modal'
import { TextInput } from '@/components/ui/text-input'
import { updateName } from '@/lib/auth/actions'
import { applyActionErrors, errorText } from '@/lib/auth/form-errors'
import { nameSchema, type NameValues } from '@/lib/auth/schemas'

/**
 * The Full name row and the modal behind it — node `525:13319`.
 *
 * Figma names that frame "Add address"; it draws the FULL NAME modal. The spec records the names as
 * unreliable and the contents as governing.
 *
 * **The row belongs to this component, not to the page.** The page is a Server Component and the
 * open state is not something it can hold, so whoever owns the dialog has to own the control that
 * opens it — the same shape `AddressList` takes. Keeping them together is also what stops
 * `triggerRef` from leaving this file.
 *
 * **The whole box opens the modal, not a 20px pencil at its right edge.** The pencil is still drawn
 * — it is the affordance that says the row is editable — but it is decoration inside one large
 * control rather than the only way in. `ProfileRow`'s `onActivate` docblock has the reasoning.
 *
 * **The dialog is a fresh component on every opening.** A customer who types a name, cancels, and
 * opens it again must see what is actually stored — not the draft they abandoned (US4 scenario 4).
 * Remounting is what guarantees that, and it closes a second, less obvious hole; `NameDialog`'s
 * `useForm` has the reasoning.
 */
export interface NameRowProps {
  firstName: null | string
  lastName: null | string
}

export function NameRow({ firstName, lastName }: NameRowProps) {
  const t_account = useTranslations('account')
  const [open, setOpen] = React.useState(false)
  /**
   * Bumped on every opening, and used as the dialog's `key` — see the note on `useForm` in
   * {@link NameDialog}. It is also what gives Cancel its promised behaviour for free: an abandoned
   * draft cannot survive, because the component that held it does not.
   */
  const [openSeq, setOpenSeq] = React.useState(0)
  const triggerRef = React.useRef<HTMLElement | null>(null)

  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  const openModal = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Recorded on the way in, so focus goes back to the box that was clicked.
    triggerRef.current = event.currentTarget
    setOpenSeq((seq) => seq + 1)
    setOpen(true)
  }

  return (
    <ProfileRow
      label={t_account('fullName')}
      // FR-025. A customer who has not given a name sees that they have not, rather than a box that
      // looks like it failed to load.
      empty={t_account('noName')}
      onActivate={openModal}
      // Named for the row it edits. Five rows, and "Edit" three times over tells a screen-reader
      // user which controls exist and nothing about which one they want.
      activateLabel={t_account('editName')}
      action={<Icon name="edit" className="text-neutral-secondary size-5" />}
      dialog={
        <NameDialog
          key={openSeq}
          firstName={firstName}
          lastName={lastName}
          onClose={() => setOpen(false)}
          open={open}
          triggerRef={triggerRef}
        />
      }
    >
      {fullName}
    </ProfileRow>
  )
}

interface NameDialogProps extends NameRowProps {
  onClose: () => void
  open: boolean
  triggerRef: React.RefObject<HTMLElement | null>
}

function NameDialog({ firstName, lastName, onClose, open, triggerRef }: NameDialogProps) {
  const t_account = useTranslations('account')
  const t_common = useTranslations('common')
  // Resolved here rather than at module scope: `useTranslations` is a hook.
  const ERRORS: Record<string, string> = { nameTooLong: useTranslations('errors')('nameTooLong') }
  /**
   * **Mounted fresh for each opening, so these are the only values it ever loads.**
   *
   * The alternative — one long-lived form that clears itself when `open` flips — is what the
   * Addresses row did first, and it lost edits: saving revalidates `/account`, and applying that
   * server tree while a dialog is open replaces the inputs underneath the customer. The next
   * keystroke reaches a DOM node React is no longer listening to, the form still holds what was
   * there before, and Save writes it back unchanged. A component that is newer than the last tree
   * swap has nothing to carry across one, which is why `NameRow` re-keys this on every open.
   */
  const form = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { firstName: firstName ?? '', lastName: lastName ?? '' },
    mode: 'onTouched',
  })

  const { errors, isSubmitting } = form.formState
  const resolve = (key: string | undefined) => errorText(ERRORS, key)

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await updateName(values)

    if (result.status === 'success') {
      onClose()
      return
    }

    applyActionErrors(form, result)
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t_account('fullNameTitle')}
      closeLabel={t_account('closeFullName')}
      triggerRef={triggerRef}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {t_common('cancel')}
          </Button>
          {/*
            Outside the `<form>`, so it is wired by `form=`. The design puts the actions in the
            modal's footer and the fields in its body; submitting from there needs the association
            to be explicit rather than positional.
          */}
          <Button type="submit" form="name-form" variant="primary" disabled={isSubmitting}>
            {t_common('save')}
          </Button>
        </>
      }
    >
      <form id="name-form" onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-5 sm:flex-row">
          <TextInput
            {...form.register('firstName')}
            label={t_account('firstName')}
            placeholder={t_account('firstName')}
            hideLabel
            autoComplete="given-name"
            error={resolve(errors.firstName?.message)}
            className="flex-1"
          />
          <TextInput
            {...form.register('lastName')}
            label={t_account('lastName')}
            placeholder={t_account('lastName')}
            hideLabel
            autoComplete="family-name"
            error={resolve(errors.lastName?.message)}
            className="flex-1"
          />
        </div>

        {errors.root ? (
          <p role="alert" className="text-body-small text-status-error-text">
            {resolve(errors.root.message)}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
