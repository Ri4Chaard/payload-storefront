'use client'

import { useRouter } from 'next/navigation'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TextInput } from '@/components/ui/text-input'
import { registerCustomer } from '@/lib/auth/actions'
import { createAccountCopy as copy, message } from '@/lib/auth/copy'

/**
 * Node `428:11594` — email, password, confirmation.
 *
 * **Plus a marketing-consent control the design does not draw.** Marketing email is opt-in, so
 * consent has to be asked for rather than assumed; the box is unticked and registration succeeds
 * whether or not it is touched (FR-036, FR-036a). Recorded as design defect 5 in the spec.
 *
 * **The consent control is drawn only when the shop does marketing at all.** `marketingEnabled`
 * in Account settings turns it off, and the form then submits no consent — which is the same thing
 * an untouched box submits, so the action needs no matching branch (FR-036a).
 *
 * **The action returns a result; this navigates.** `registerCustomer` could call `redirect()` and
 * save a few lines, but then it could not be called from a test without throwing — and the
 * assertions that matter most here are the ones comparing two of its responses to each other.
 * Keeping the action pure is what makes those possible.
 */
export interface CreateAccountFormProps {
  /** From `getAccountSettings()`. When false the consent checkbox is not rendered. */
  marketingEnabled: boolean
}

export function CreateAccountForm({ marketingEnabled }: CreateAccountFormProps) {
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [state, action, pending] = React.useActionState(registerCustomer, null)

  React.useEffect(() => {
    if (state?.status === 'success') {
      router.push(`/verify-email?email=${encodeURIComponent(email)}`)
    }
  }, [state, router, email])

  const fieldError = (name: string) =>
    state?.status === 'error' ? message(copy, state.fieldErrors?.[name]) : undefined

  // Shown only when the failure belongs to no single field, so it is never said twice.
  const formError =
    state?.status === 'error' && !state.fieldErrors ? message(copy, state.message) : undefined

  return (
    <form action={action} className="flex flex-col gap-7.5" noValidate>
      <TextInput
        label={copy.signInEmailLabel}
        placeholder={copy.signInEmailLabel}
        hideLabel
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldError('email')}
      />

      <TextInput
        label={copy.signInPasswordLabel}
        placeholder={copy.signInPasswordLabel}
        hideLabel
        type="password"
        name="password"
        autoComplete="new-password"
        required
        error={fieldError('password')}
      />

      <TextInput
        label={copy.createConfirmLabel}
        placeholder={copy.createConfirmLabel}
        hideLabel
        type="password"
        name="confirmPassword"
        autoComplete="new-password"
        required
        error={fieldError('confirmPassword')}
      />

      {marketingEnabled ? (
        <Checkbox name="marketingConsent" label={copy.createMarketingConsent} />
      ) : null}

      {formError ? (
        <p role="alert" className="text-body-small text-neutral-primary">
          {formError}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {copy.createSubmit}
      </Button>
    </form>
  )
}
