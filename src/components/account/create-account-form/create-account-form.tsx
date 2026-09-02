'use client'

import { useRouter } from 'next/navigation'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TextInput } from '@/components/ui/text-input'
import { registerCustomer } from '@/lib/auth/actions'
import { applyActionErrors, errorText } from '@/lib/auth/form-errors'
import { createAccountSchema, type CreateAccountValues } from '@/lib/auth/schemas'

/**
 * Node `428:11594` — email, password, confirmation.
 *
 * **Plus a marketing-consent control the design does not draw.** Marketing email is opt-in, so
 * consent has to be asked for rather than assumed; the box is unticked and registration succeeds
 * whether or not it is touched (FR-036, FR-036a). Recorded as design defect 5 in the spec.
 *
 * **The consent control is drawn only when the shop does marketing at all.** `marketingEnabled`
 * in Account settings turns it off, and the form then submits an unticked value — which is what an
 * untouched box submits, so the action needs no matching branch (FR-036a).
 *
 * **Validation is `createAccountSchema`, and the server runs the same one.** The browser's copy
 * exists so a mistyped confirmation is caught without a round trip; it is not a security boundary,
 * because anything can call the action directly (see `./schemas.ts`).
 *
 * **The action returns a result; this navigates.** `registerCustomer` could call `redirect()` and
 * save a few lines, but then it could not be called from a test without throwing — and the
 * assertions that matter most here are the ones comparing two of its responses to each other.
 * Keeping the action pure is what makes those possible.
 */
/** The action and the schema both return keys; these are the sentences. */
const ERRORS: Record<string, string> = {
  createEmailInvalid: 'That does not look like an email address.',
  createPasswordMismatch: 'The two passwords do not match.',
  createPasswordTooWeak: 'Use at least 8 characters, and avoid a password you use elsewhere.',
}

export interface CreateAccountFormProps {
  /** From `getAccountSettings()`. When false the consent checkbox is not rendered. */
  marketingEnabled: boolean
}

export function CreateAccountForm({ marketingEnabled }: CreateAccountFormProps) {
  const router = useRouter()

  const form = useForm<CreateAccountValues>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: { confirmPassword: '', email: '', marketingConsent: false, password: '' },
    // Complain when a field is left, never while it is being typed into. `onChange` marks an
    // address invalid at `a`, which is true and useless.
    mode: 'onTouched',
  })

  const { errors, isSubmitting } = form.formState
  const resolve = (key: string | undefined) => errorText(ERRORS, key)

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await registerCustomer(values)

    if (result.status === 'success') {
      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`)
      return
    }

    applyActionErrors(form, result)
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-7.5" noValidate>
      <TextInput
        {...form.register('email')}
        label="Email Address"
        placeholder="Email Address"
        hideLabel
        type="email"
        autoComplete="email"
        required
        error={resolve(errors.email?.message)}
      />

      <TextInput
        {...form.register('password')}
        label="Password"
        placeholder="Password"
        hideLabel
        type="password"
        autoComplete="new-password"
        required
        error={resolve(errors.password?.message)}
      />

      <TextInput
        {...form.register('confirmPassword')}
        label="Confirm Password"
        placeholder="Confirm Password"
        hideLabel
        type="password"
        autoComplete="new-password"
        required
        error={resolve(errors.confirmPassword?.message)}
      />

      {marketingEnabled ? (
        <Checkbox
          {...form.register('marketingConsent')}
          label="Email me occasional news and offers."
        />
      ) : null}

      {/* Only failures that belong to no single field, so nothing is said twice. */}
      {errors.root ? (
        <p role="alert" className="text-body-small text-status-error-text">
          {resolve(errors.root.message)}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
        Create Account
      </Button>
    </form>
  )
}
