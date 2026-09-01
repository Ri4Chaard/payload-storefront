'use client'

import React from 'react'

import { AuthCard } from '@/components/account/auth-card'
import { RegistrationSuccess } from '@/components/account/registration-success'
import { VerifyEmailForm } from '@/components/account/verify-email-form'
import type { AccountCopy } from '@/lib/auth/account-copy'

/**
 * Verification and its success state are one screen with two faces (nodes `428:11869`, `432:13049`).
 *
 * They live in one client component because the transition between them is the whole point: the
 * customer submits a code and the page becomes the confirmation, with no navigation in between. A
 * redirect would work and would also throw away the fact that they just succeeded, which is the
 * only moment this feature has to say well done.
 */
export type VerifyScreenCopy = Pick<
  AccountCopy,
  | 'codeAlreadyUsed'
  | 'codeExpired'
  | 'codeInvalid'
  | 'codeSuperseded'
  | 'codeTooManyAttempts'
  | 'successAction'
  | 'successBody'
  | 'successTitle'
  | 'verifyCodeLabel'
  | 'verifyResendPrompt'
  | 'verifyResendSent'
  | 'verifySubmit'
  | 'verifySubtitle'
  | 'verifyTitle'
>

export function VerifyEmailScreen({ copy, email }: { copy: VerifyScreenCopy; email: string }) {
  const [verified, setVerified] = React.useState(false)
  const onVerified = React.useCallback(() => setVerified(true), [])

  if (verified) return <RegistrationSuccess copy={copy} />

  return (
    <AuthCard
      title={copy.verifyTitle ?? 'VERIFY YOUR EMAIL'}
      subtitle={copy.verifySubtitle ?? undefined}
    >
      <VerifyEmailForm copy={copy} email={email} onVerified={onVerified} />
    </AuthCard>
  )
}
