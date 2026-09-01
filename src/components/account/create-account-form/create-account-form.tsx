'use client'

import { useRouter } from 'next/navigation'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TextInput } from '@/components/ui/text-input'
import { registerCustomer } from '@/lib/auth/actions'
import { message, type AccountCopy } from '@/lib/auth/account-copy'

/**
 * Node `428:11594` — email, password, confirmation.
 *
 * **Plus a marketing-consent control the design does not draw.** Marketing email is opt-in, so
 * consent has to be asked for rather than assumed; the box is unticked and registration succeeds
 * whether or not it is touched (FR-036, FR-036a). Recorded as design defect 5 in the spec.
 *
 * **The action returns a result; this navigates.** `registerCustomer` could call `redirect()` and
 * save a few lines, but then it could not be called from a test without throwing — and the
 * assertions that matter most here are the ones comparing two of its responses to each other.
 * Keeping the action pure is what makes those possible.
 */
/**
 * The strings this form renders, and nothing else.
 *
 * Handing the whole `account` global across the boundary is one prop and costs about four kilobytes
 * of the RSC payload on every auth page — the profile row labels, the modal titles and the full
 * text of three email templates, none of which this screen shows. A `Pick` keeps the client
 * receiving what it displays.
 */
export type CreateAccountCopy = Pick<
  AccountCopy,
  | 'createConfirmLabel'
  | 'createEmailInvalid'
  | 'createMarketingConsent'
  | 'createPasswordMismatch'
  | 'createPasswordTooWeak'
  | 'createSubmit'
  | 'signInEmailLabel'
  | 'signInPasswordLabel'
>

export interface CreateAccountFormProps {
  copy: CreateAccountCopy
}

export function CreateAccountForm({ copy }: CreateAccountFormProps) {
  const resolve = (key: string | undefined) => message(copy, key)
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [state, action, pending] = React.useActionState(registerCustomer, null)

  React.useEffect(() => {
    if (state?.status === 'success') {
      router.push(`/verify-email?email=${encodeURIComponent(email)}`)
    }
  }, [state, router, email])

  const fieldError = (name: string) =>
    state?.status === 'error' ? resolve(state.fieldErrors?.[name]) : undefined

  // Shown only when the failure belongs to no single field, so it is never said twice.
  const formError =
    state?.status === 'error' && !state.fieldErrors ? resolve(state.message) : undefined

  return (
    <form action={action} className="flex flex-col gap-7.5" noValidate>
      <TextInput
        label={copy.signInEmailLabel ?? 'Email Address'}
        placeholder={copy.signInEmailLabel ?? 'Email Address'}
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
        label={copy.signInPasswordLabel ?? 'Password'}
        placeholder={copy.signInPasswordLabel ?? 'Password'}
        hideLabel
        type="password"
        name="password"
        autoComplete="new-password"
        required
        error={fieldError('password')}
      />

      <TextInput
        label={copy.createConfirmLabel ?? 'Confirm Password'}
        placeholder={copy.createConfirmLabel ?? 'Confirm Password'}
        hideLabel
        type="password"
        name="confirmPassword"
        autoComplete="new-password"
        required
        error={fieldError('confirmPassword')}
      />

      <Checkbox name="marketingConsent" label={copy.createMarketingConsent ?? ''} />

      {formError ? (
        <p role="alert" className="text-body-small text-neutral-primary">
          {formError}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {copy.createSubmit ?? 'Create Account'}
      </Button>
    </form>
  )
}
