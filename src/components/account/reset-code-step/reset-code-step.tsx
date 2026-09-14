'use client'

import { useTranslations } from 'next-intl'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { OtpInput } from '@/components/ui/otp-input'
import { verifyResetCode } from '@/lib/auth/actions'
import { applyActionErrors, errorText } from '@/lib/auth/form-errors'
import { verifyCodeSchema, type VerifyCodeValues } from '@/lib/auth/schemas'

/**
 * Nodes `429:12348` and `429:12615` — the reset flow's six boxes (spec 004, US3, FR-018, FR-019).
 *
 * **The same control as the registration code screen, not a second one.** Figma draws these boxes
 * at 56px and the registration ones at 60px; FR-048 records that as a drafting artefact rather than
 * an instruction, so both screens use `OtpInput` at one size. `429:12615` is this frame in its
 * error state — the message under the boxes — which is a state of this component, not a screen.
 *
 * **What it hands back is a handle, never the token.** `verifyResetCode` resolves Payload's reset
 * token on the server and returns a signed reference to it instead, so the credential that could
 * set this account's password is never in the DOM. See `src/lib/auth/reset-handle.ts`.
 *
 * `Controller` rather than `register` for the same reason as the verification form: six inputs
 * presenting one value have no single element for a ref to point at.
 */

/**
 * The action returns a key; these are the sentences, and they are the same five the verification
 * screen shows. Written out again rather than shared: they are copy on a screen, and the day the
 * reset flow needs to word one of them differently — "request a new one" pointing at a different
 * control, say — a shared dictionary is the thing standing in the way.
 */

export interface ResetCodeStepProps {
  email: string
  /** Called with the opaque handle once the code is accepted. */
  onVerified: (handle: string) => void
}

export function ResetCodeStep({ email, onVerified }: ResetCodeStepProps) {
  const t_errors = useTranslations('errors')
  const t_forms = useTranslations('forms')

  const CODE_ERRORS: Record<string, string> = {
    codeAlreadyUsed: t_errors('codeUsed'),
    codeExpired: t_errors('codeExpired'),
    codeInvalid: t_errors('codeInvalid'),
    codeSuperseded: t_errors('codeSuperseded'),
    codeTooManyAttempts: t_errors('codeAttempts'),
  }

  const form = useForm<VerifyCodeValues>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: '', email },
    mode: 'onSubmit',
  })

  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await verifyResetCode(values)

    if (result.status === 'success' && result.data) {
      onVerified(result.data.handle)
      return
    }

    // FR-019: refused in place, beneath the boxes, with the code still there to correct.
    applyActionErrors(form, {
      fieldErrors: { code: result.status === 'error' ? result.message : 'codeInvalid' },
      message: 'codeInvalid',
      status: 'error',
    })
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-7.5" noValidate>
      <Controller
        control={form.control}
        name="code"
        render={({ field }) => (
          <OtpInput
            label={t_forms('resetCode')}
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            onComplete={() => void onSubmit()}
            error={errorText(CODE_ERRORS, errors.code?.message)}
            autoFocus
          />
        )}
      />

      <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
        Confirm
      </Button>
    </form>
  )
}
