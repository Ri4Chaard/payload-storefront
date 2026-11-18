'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import type { Locale } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'
import { requestPasswordReset } from '@/lib/auth/actions'
import { applyActionErrors, errorText } from '@/lib/auth/form-errors'
import { requestResetSchema, type RequestResetValues } from '@/lib/auth/schemas'

/**
 * Node `429:12087` — one field and one button.
 *
 * **It always goes to the next screen.** Not a convenience: this form is the easiest place in any
 * application to ask the shop which of a list of addresses has an account here, and the only defence
 * is that submitting one teaches you nothing. So a registered address and an unregistered one both
 * land on the code screen, which then refuses every code the second customer could possibly type.
 * The action is built the same way — see `requestPasswordReset`.
 *
 * The only error this form can show is a malformed address, which is the browser's own check and
 * never reaches the server.
 */

export function ForgotPasswordForm() {
  const t_errors = useTranslations('errors')
  const t_forms = useTranslations('forms')
  // Sent to the action, which sends it to the mail.
  const locale = useLocale() as Locale

  const ERRORS: Record<string, string> = {
    resetEmailInvalid: t_errors('emailInvalid'),
  }

  const router = useRouter()

  const form = useForm<RequestResetValues>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  })

  const { errors, isSubmitting } = form.formState
  const resolve = (key: string | undefined) => errorText(ERRORS, key)

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await requestPasswordReset(values, locale)

    if (result.status === 'success') {
      router.push(`/reset-password?email=${encodeURIComponent(values.email)}`)
      return
    }

    applyActionErrors(form, result)
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-7.5" noValidate>
      <TextInput
        {...form.register('email')}
        label={t_forms('emailAddress')}
        placeholder={t_forms('emailAddress')}
        hideLabel
        type="email"
        autoComplete="email"
        required
        error={resolve(errors.email?.message)}
      />

      {errors.root ? (
        <p role="alert" className="text-body-small text-status-error-text">
          {resolve(errors.root.message)}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
        {t_forms('sendCode')}
      </Button>
    </form>
  )
}
