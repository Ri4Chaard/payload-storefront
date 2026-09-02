'use client'

import { useRouter } from 'next/navigation'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { PasswordField } from '@/components/account/password-field'
import { Button } from '@/components/ui/button'
import { resetPassword } from '@/lib/auth/actions'
import { applyActionErrors, errorText } from '@/lib/auth/form-errors'
import { resetPasswordSchema, type ResetPasswordValues } from '@/lib/auth/schemas'

/**
 * Node `429:12884` — the new password and its confirmation (spec 004, US3, FR-018, FR-021).
 *
 * **The drawn labels are Russian and the button says `СОХРАНИТЬ`** (design defect 1). They are
 * replaced with English here, which is what FR-047 asks for; the rest of the frame is transcribed.
 *
 * **The reveal toggle is an addition.** This frame draws two plain boxes, but FR-044 requires a
 * show/hide control on password fields — and it is needed most on the screen where somebody is
 * typing a password they have just invented and cannot yet have memorised.
 *
 * **`handle` is submitted as form state, not a hidden input.** Nothing renders it and it cannot be
 * edited in the DOM before submitting. It is a reference rather than a credential either way — see
 * `src/lib/auth/reset-handle.ts` — but there is no reason to draw it.
 */
const ERRORS: Record<string, string> = {
  resetEmailInvalid: 'That does not look like an email address.',
  resetPasswordMismatch: 'The two passwords do not match.',
  resetPasswordTooWeak: 'Use at least 8 characters, and avoid a password you use elsewhere.',
  resetSessionExpired: 'That reset has expired. Request a new code and try again.',
}

export interface NewPasswordFormProps {
  email: string
  /** Issued by `ResetCodeStep`. Opaque, and good for ten minutes. */
  handle: string
}

export function NewPasswordForm({ email, handle }: NewPasswordFormProps) {
  const router = useRouter()

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { confirmPassword: '', email, handle, password: '' },
    mode: 'onTouched',
  })

  const { errors, isSubmitting } = form.formState
  const resolve = (key: string | undefined) => errorText(ERRORS, key)

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await resetPassword(values)

    if (result.status === 'success') {
      // The action signed them in as it went — `payload.resetPassword` mints a session — so this
      // lands on the profile rather than back at the sign-in form.
      router.push(result.data?.next ?? '/account')
      router.refresh()
      return
    }

    applyActionErrors(form, result)
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-7.5" noValidate>
      <PasswordField
        {...form.register('password')}
        label="New Password"
        placeholder="New Password"
        hideLabel
        autoComplete="new-password"
        required
        error={resolve(errors.password?.message)}
      />

      <PasswordField
        {...form.register('confirmPassword')}
        label="Confirm Password"
        placeholder="Confirm Password"
        hideLabel
        autoComplete="new-password"
        required
        error={resolve(errors.confirmPassword?.message)}
      />

      {/* A dead handle belongs to no field, so it lands here rather than under a password box. */}
      {errors.root || errors.handle ? (
        <p role="alert" className="text-body-small text-status-error-text">
          {resolve((errors.root ?? errors.handle)?.message)}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
        Save
      </Button>
    </form>
  )
}
