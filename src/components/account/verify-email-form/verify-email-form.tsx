'use client'

import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { OtpInput } from '@/components/ui/otp-input'
import { verifyEmailCode } from '@/lib/auth/actions'
import { applyActionErrors, errorText } from '@/lib/auth/form-errors'
import { verifyCodeSchema, type VerifyCodeValues } from '@/lib/auth/schemas'

/**
 * Nodes `428:11869` and `429:12615` — the six boxes and the submit.
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
 *
 * **The resend control is not here.** The design puts it in the card's footer, under the button —
 * see `ResendCode`.
 */

/**
 * The action returns a key; these are the sentences.
 *
 * They are distinct on purpose. `consumeCode` goes to real trouble to tell the four ways a code can
 * be dead apart, and collapsing them back into "invalid code" here would throw that away — telling
 * someone their code is wrong when it has merely expired is how a person ends up retyping the same
 * six digits until they give up.
 */
const CODE_ERRORS: Record<string, string> = {
  codeAlreadyUsed: 'That code has already been used. Request a new one.',
  codeExpired: 'That code has expired. Request a new one.',
  codeInvalid: 'Invalid code. Please try again.',
  codeSuperseded: 'A newer code was sent. Please use the most recent one.',
  codeTooManyAttempts: 'Too many incorrect attempts. Request a new code.',
}

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

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await verifyEmailCode(values)

    if (result.status === 'success') {
      onVerified()
      return
    }

    // Every failure here is about the code, so it lands on the boxes rather than in a banner.
    applyActionErrors(form, { ...result, fieldErrors: { code: result.message } })
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-7.5" noValidate>
      <Controller
        control={form.control}
        name="code"
        render={({ field }) => (
          <OtpInput
            label="Verification code"
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            // Six digits in and nothing left to decide — submitting for them saves a hunt for the
            // button, and the code is single-use so an accidental submit costs nothing.
            onComplete={() => void onSubmit()}
            error={errorText(CODE_ERRORS, errors.code?.message)}
            autoFocus
          />
        )}
      />

      <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
        Verify
      </Button>
    </form>
  )
}
