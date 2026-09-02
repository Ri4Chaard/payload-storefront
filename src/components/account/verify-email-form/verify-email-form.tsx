'use client'

import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { OtpInput } from '@/components/ui/otp-input'
import { resendCode, verifyEmailCode } from '@/lib/auth/actions'
import { CODE_RESEND_COOLDOWN_MS } from '@/lib/auth/config'
import { message, verifyCopy as copy } from '@/lib/auth/copy'
import { applyActionErrors } from '@/lib/auth/form-errors'
import { verifyCodeSchema, type VerifyCodeValues } from '@/lib/auth/schemas'

/**
 * Nodes `428:11869` and `429:12615` — the six boxes, the submit, and the resend prompt.
 *
 * The customer pastes the code out of their email rather than reading and retyping it, which is
 * what `OtpInput` handles at the group; `onComplete` then submits without them having to find the
 * button (contracts/ui-kit-additions.md O3).
 *
 * **`OtpInput` is driven through `Controller`, not `register`.** It is six inputs presenting one
 * value, so there is no single element for a ref to point at — which is exactly the case
 * `Controller` exists for. Submitting through `handleSubmit` also removes the class of bug that
 * cost this form a day: the value that gets validated and sent is the one RHF holds, not whatever a
 * hidden input happened to contain at the moment the event fired.
 *
 * The address is form state rather than a hidden input. Nothing renders it, the schema still checks
 * it, and it cannot be edited in the DOM before submitting.
 */
export interface VerifyEmailFormProps {
  email: string
  onVerified: () => void
}

export function VerifyEmailForm({ email, onVerified }: VerifyEmailFormProps) {
  const form = useForm<VerifyCodeValues>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: '', email },
    mode: 'onSubmit',
  })

  const { errors, isSubmitting } = form.formState

  /**
   * A visible countdown driven by a fixed interval, identical for every address.
   *
   * The action deliberately does not say whether a send was throttled — that would tell an attacker
   * which addresses are registered (see `resendCode`). The customer still needs to know the button
   * is not simply broken, so the wait is shown here, where it reveals nothing.
   */
  const [cooldown, setCooldown] = React.useState(0)
  const [resending, startResend] = React.useTransition()

  React.useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await verifyEmailCode(values)

    if (result.status === 'success') {
      onVerified()
      return
    }

    // Every failure here is about the code, so it lands on the boxes rather than in a banner.
    applyActionErrors(form, { ...result, fieldErrors: { code: result.message } })
  })

  const onResend = () => {
    startResend(async () => {
      await resendCode({ email, purpose: 'verify-email' })
      // Started whatever the answer was — a countdown that appeared only on a real send would say
      // which addresses are registered, which is the disclosure the action itself avoids.
      setCooldown(Math.ceil(CODE_RESEND_COOLDOWN_MS / 1000))
    })
  }

  return (
    <div className="flex flex-col gap-7.5">
      <form onSubmit={onSubmit} className="flex flex-col gap-7.5" noValidate>
        <Controller
          control={form.control}
          name="code"
          render={({ field }) => (
            <OtpInput
              label={copy.verifyCodeLabel}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              // Six digits in and nothing left to decide — submitting for them saves a hunt for the
              // button, and the code is single-use so an accidental submit costs nothing.
              onComplete={() => void onSubmit()}
              error={message(copy, errors.code?.message)}
              autoFocus
            />
          )}
        />

        <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
          {copy.verifySubmit}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-body-base text-neutral-primary">{copy.verifyResendPrompt}</p>
        <Button
          type="button"
          variant="outline"
          onClick={onResend}
          disabled={cooldown > 0 || resending}
          className="mt-3.5"
        >
          {cooldown > 0 ? `${cooldown}s` : copy.verifyResendSent}
        </Button>
      </div>
    </div>
  )
}
