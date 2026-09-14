'use client'

import { useTranslations } from 'next-intl'
import React from 'react'

import { AuthCard } from '@/components/account/auth-card'
import { RegistrationSuccess } from '@/components/account/registration-success'
import { ResendCode } from '@/components/account/resend-code'
import { VerifyEmailForm } from '@/components/account/verify-email-form'

/**
 * Verification and its success state are one screen with two faces (nodes `428:11869`, `432:13049`).
 *
 * They live in one client component because the transition between them is the whole point: the
 * customer submits a code and the page becomes the confirmation, with no navigation in between. A
 * redirect would work and would also throw away the fact that they just succeeded, which is the
 * only moment this feature has to say well done.
 *
 * The resend prompt sits in the card's footer, where the design puts the onward line on every other
 * auth screen — "Don't have an account? Create one", "Already have an account? Log in", and here
 * "Didn't receive the code? Resend".
 */
export function VerifyEmailScreen({ email }: { email: string }) {
  const t_account = useTranslations('account')
  const [verified, setVerified] = React.useState(false)
  const onVerified = React.useCallback(() => setVerified(true), [])

  if (verified) return <RegistrationSuccess />

  return (
    <AuthCard
      title={t_account('verifyEmail')}
      subtitle={t_account('verifySent')}
      footer={
        <>
          {t_account('noCodePrompt')} <ResendCode email={email} />
        </>
      }
    >
      <VerifyEmailForm email={email} onVerified={onVerified} />
    </AuthCard>
  )
}
