'use client'

import { useRouter } from 'next/navigation'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Modal } from '@/components/ui/modal'
import { TextInput } from '@/components/ui/text-input'
import { updateName } from '@/lib/auth/actions'
import { applyActionErrors, errorText } from '@/lib/auth/form-errors'
import { nameSchema, type NameValues } from '@/lib/auth/schemas'

/**
 * The Full name row's pencil and the modal behind it — node `525:13319` (spec 004, US4, FR-024).
 *
 * Figma names that frame "Add address"; it draws the FULL NAME modal. The spec records the names as
 * unreliable and the contents as governing.
 *
 * **The trigger lives here with the modal it opens.** Splitting them would mean the page owning
 * `open` state for a dialog it does not otherwise know about, and passing a ref back down so focus
 * can return to the pencil on close. Kept together, `triggerRef` never leaves this file.
 *
 * **The form is reset from props each time it opens.** A customer who types a name, cancels, and
 * opens the modal again must see what is actually stored — not the draft they abandoned. Cancel
 * that silently keeps your discarded edit is worse than one that discards it (US4 scenario 4).
 */
const ERRORS: Record<string, string> = {
  nameTooLong: 'That is longer than a name can be here — 100 characters at most.',
}

export interface NameModalProps {
  firstName: null | string
  lastName: null | string
}

export function NameModal({ firstName, lastName }: NameModalProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const form = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { firstName: firstName ?? '', lastName: lastName ?? '' },
    mode: 'onTouched',
  })

  const { errors, isSubmitting } = form.formState
  const resolve = (key: string | undefined) => errorText(ERRORS, key)

  const openModal = () => {
    // Whatever is stored wins over whatever was last typed. See above.
    form.reset({ firstName: firstName ?? '', lastName: lastName ?? '' })
    setOpen(true)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await updateName(values)

    if (result.status === 'success') {
      setOpen(false)
      // The action revalidated the route on the server; this is what asks for the new tree.
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
        onClick={openModal}
        // Named for the row it edits. Six rows, and "Edit" three times over tells a screen-reader
        // user which controls exist and nothing about which one they want.
        aria-label="Edit full name"
        className={[
          'text-neutral-secondary hover:text-neutral-primary flex size-8 items-center',
          'justify-center transition-colors',
          'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
        ].join(' ')}
      >
        <Icon name="edit" className="size-5" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="FULL NAME"
        closeLabel="Close full name"
        triggerRef={triggerRef}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {/*
              Outside the `<form>`, so it is wired by `form=`. The design puts the actions in the
              modal's footer and the fields in its body; submitting from there needs the association
              to be explicit rather than positional.
            */}
            <Button type="submit" form="name-form" variant="primary" disabled={isSubmitting}>
              Save
            </Button>
          </>
        }
      >
        <form id="name-form" onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-5 sm:flex-row">
            <TextInput
              {...form.register('firstName')}
              label="First name"
              placeholder="First name"
              hideLabel
              autoComplete="given-name"
              error={resolve(errors.firstName?.message)}
              className="flex-1"
            />
            <TextInput
              {...form.register('lastName')}
              label="Last name"
              placeholder="Last name"
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
    </>
  )
}
