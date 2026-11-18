import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import React from 'react'

import { getCustomer } from '@/lib/auth/dal'

import { ResetPasswordScreen } from './reset-password-screen'

/** Nodes `429:12348`, `429:12615` and `429:12884`. */
export async function generateMetadata(): Promise<Metadata> {
  const t_account = await getTranslations('account')
  return { title: t_account('metaResetPassword'), robots: { follow: false, index: false } }
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { email } = await searchParams
  const address = typeof email === 'string' ? email : ''

  // No address means the flow was entered sideways: there is no code to check and no way to ask for
  // one. Send them to the screen that collects it, exactly as `/verify-email` does.
  if (!address) redirect('/forgot-password')

  // Read here rather than in the screen: the screen is a client component, and the session is not
  // something a client component can be trusted to know about itself.
  return <ResetPasswordScreen email={address} signedIn={Boolean(await getCustomer())} />
}
