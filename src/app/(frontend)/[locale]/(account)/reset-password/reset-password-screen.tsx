'use client'

import { useTranslations } from 'next-intl'
import React from 'react'

import { AuthCard } from '@/components/account/auth-card'
import { NewPasswordForm } from '@/components/account/new-password-form'
import { ResetCodeStep } from '@/components/account/reset-code-step'
import { ResendCode } from '@/components/account/resend-code'
import { Link } from '@/components/ui/link'

/**
 * Steps two and three of the reset flow, in one client component (nodes `429:12348`, `429:12615`
 * and `429:12884`).
 *
 * Together for the same reason the verification screen and its success state are together: the
 * transition IS the flow. Splitting them across two routes would mean putting the handle in a URL,
 * where it would sit in history, in the referrer of anything the page loads, and in any bug report
 * containing a screenshot of the address bar. Held in memory it lives exactly as long as the tab is
 * on this screen.
 *
 * A refresh therefore sends the customer back to the code step, which is correct — the code was
 * spent, so they ask for another. The alternative is persisting a live reset credential somewhere
 * to save one click.
 */
export interface ResetPasswordScreenProps {
  email: string
  /**
   * Whether the visitor already has a session — read on the server, passed down.
   *
   * The onward line is the only thing it changes, and it changes it because the line would
   * otherwise be wrong: a customer who reached this flow from the Change password modal is signed
   * in, and offering them "Already have an account? Log in" is both untrue and a dead end.
   */
  signedIn: boolean
}

export function ResetPasswordScreen({ email, signedIn }: ResetPasswordScreenProps) {
  const t_account = useTranslations('account')
  const [handle, setHandle] = React.useState<null | string>(null)
  const onVerified = React.useCallback((issued: string) => setHandle(issued), [])

  if (handle) {
    return (
      <AuthCard
        title={t_account('newPasswordTitle')}
        subtitle={t_account('newPasswordSubtitle')}
        footer={
          signedIn ? (
            <Link href="/account">{t_account('backToAccount')}</Link>
          ) : (
            <>
              {t_account('haveAccountPrompt')} <Link href="/sign-in">{t_account('signIn')}</Link>
            </>
          )
        }
      >
        <NewPasswordForm email={email} handle={handle} />
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={t_account('enterTheCode')}
      subtitle={t_account('enterTheCodeSubtitle')}
      footer={
        <>
          Didn’t receive the code? <ResendCode email={email} purpose="reset-password" />
        </>
      }
    >
      <ResetCodeStep email={email} onVerified={onVerified} />
    </AuthCard>
  )
}
