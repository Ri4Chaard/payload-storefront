'use client'

import { useRouter } from 'next/navigation'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { PasswordField } from '@/components/account/password-field'
import { Button } from '@/components/ui/button'
import { Link } from '@/components/ui/link'
import { TextInput } from '@/components/ui/text-input'
import { signIn } from '@/lib/auth/actions'
import { applyActionErrors, errorText } from '@/lib/auth/form-errors'
import { signInSchema, type SignInValues } from '@/lib/auth/schemas'

/**
 * Node `408:7412` — address, password, the forgot link, and one button.
 *
 * **The forgot-password link lives inside the password box**, which is what `TextInput`'s
 * `trailing` prop was added for in spec 001 and what the design draws. It is placed before the
 * reveal toggle so the reading order matches the visual one.
 *
 * **Every failure lands in one place, and says one thing.** A wrong password and an address with no
 * account are the same message by requirement (FR-011); it is rendered as a form-level error rather
 * than against the email field, because pointing at a control would itself suggest which half was
 * wrong.
 */
/**
 * The action returns a key; these are the sentences.
 *
 * `signInFailed` is shown for a wrong password AND for an address with no account. Do not split it.
 * Saying "we don't know that email" turns this form into a way to enumerate customers (FR-011), and
 * the action deliberately hands back one key for both.
 */
const ERRORS: Record<string, string> = {
  signInEmailInvalid: 'That does not look like an email address.',
  signInFailed: 'That email address and password do not match.',
  signInLocked:
    'Too many attempts. For your security, try again in a few minutes or reset your password.',
}

export interface SignInFormProps {
  /**
   * Where to go after signing in, from `?next=`. Passed through to the action, which validates it
   * as a same-origin path — the browser is not trusted with this, and neither is this component.
   */
  next?: string
}

export function SignInForm({ next }: SignInFormProps) {
  const router = useRouter()

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  })

  const { errors, isSubmitting } = form.formState
  const resolve = (key: string | undefined) => errorText(ERRORS, key)

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await signIn({ ...values, next })

    if (result.status === 'success') {
      // `next` is whatever the action decided, never what the URL asked for. An unverified account
      // is routed to the verify screen from here too — see `signIn`.
      router.push(result.data?.next ?? '/account')
      // The header renders from the session, and it was rendered for an anonymous visitor.
      router.refresh()
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

      <PasswordField
        {...form.register('password')}
        label="Password"
        placeholder="Password"
        hideLabel
        autoComplete="current-password"
        required
        error={resolve(errors.password?.message)}
      />

      <div className="text-body-small text-right">
        <Link href="/forgot-password">Forgot password?</Link>
      </div>

      {errors.root ? (
        <p role="alert" className="text-body-small text-status-error-text">
          {resolve(errors.root.message)}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
        Log in
      </Button>
    </form>
  )
}
