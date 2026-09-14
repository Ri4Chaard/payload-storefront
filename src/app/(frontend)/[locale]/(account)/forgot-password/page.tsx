import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import React from 'react'

import { AuthCard } from '@/components/account/auth-card'
import { ForgotPasswordForm } from '@/components/account/forgot-password-form'
import { Link } from '@/components/ui/link'
import { getCustomer } from '@/lib/auth/dal'

/** Nodes `429:12087` and `614:13323` (spec 004, US3). `noindex` like every account route. */
export async function generateMetadata(): Promise<Metadata> {
  const t_account = await getTranslations('account')
  return { title: t_account('metaForgotPassword'), robots: { follow: false, index: false } }
}

/**
 * Step one of three.
 *
 * The footer reads "Back to sign in"; the frame draws `Вернуться к авторизации`, which is design
 * defect 1 (FR-047). `614:13323` is this same screen with the site footer's newsletter box in its
 * error state — a different component's state, and nothing to build here.
 *
 * **The way out depends on who is asking, and this screen has two kinds of visitor.** The drawn one
 * is locked out and wants the sign-in form. The other arrived from the Change password modal, which
 * offers this flow to a customer who cannot recall the password it is asking them to confirm — they
 * are signed in, and "Back to sign in" is both untrue and a worse destination than the page they
 * came from. This is why the flow was NOT put behind the same signed-in redirect as `/sign-in`:
 * that route out is the point of it.
 */
export default async function ForgotPasswordPage() {
  const t_account = await getTranslations('account')
  const customer = await getCustomer()

  return (
    <AuthCard
      title={t_account('forgotPasswordTitle')}
      subtitle={t_account('forgotPasswordSubtitle')}
      footer={
        customer ? (
          <Link href="/account">{t_account('backToAccount')}</Link>
        ) : (
          <Link href="/sign-in">{t_account('backToSignIn')}</Link>
        )
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  )
}
