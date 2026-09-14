import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import React from 'react'

import { AuthCard } from '@/components/account/auth-card'
import { SignInForm } from '@/components/account/sign-in-form'
import { Link } from '@/components/ui/link'
import { getCustomer } from '@/lib/auth/dal'
import { safeNextPath } from '@/lib/auth/schemas'

/** Node `408:7412` (spec 004, US2). `noindex` like every account route. */
export async function generateMetadata(): Promise<Metadata> {
  const t_account = await getTranslations('account')
  return { title: t_account('signIn'), robots: { follow: false, index: false } }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const t_account = await getTranslations('account')
  const { next } = await searchParams
  const target = typeof next === 'string' ? next : undefined

  /**
   * **A customer who is already signed in has nothing to do here.**
   *
   * Left alone, this screen offers to sign in someone who is — and the form beneath it would take
   * a second set of credentials, mint a second session, and leave the first one live. That is the
   * shape the header's account link used to have too, before it was pointed at `/account` for both
   * states.
   *
   * `next` is honoured so an expired-looking link still lands where it was going, and it goes
   * through the same whitelist the sign-in action uses — an unchecked `next` is an open redirect
   * whether it is read here or there.
   */
  if (await getCustomer()) redirect(safeNextPath(target))

  return (
    <AuthCard
      title={t_account('welcomeBack')}
      subtitle={t_account('createAccountPrompt')}
      footer={
        <>
          {t_account('noAccountPrompt')} <Link href="/create-account">{t_account('createOne')}</Link>
        </>
      }
    >
      <SignInForm next={target} />
    </AuthCard>
  )
}
