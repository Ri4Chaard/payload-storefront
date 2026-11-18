import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import React from 'react'

import { VerifyEmailScreen } from './verify-email-screen'

/** Nodes `428:11869` and `432:13049`. */
export async function generateMetadata(): Promise<Metadata> {
  const t_account = await getTranslations('account')
  return { title: t_account('metaVerifyEmail'), robots: { follow: false, index: false } }
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { email } = await searchParams
  const address = typeof email === 'string' ? email : ''

  // Arriving here without an address means the flow was entered sideways — there is nothing to
  // verify and no way to ask, so send them back to the start rather than showing empty boxes.
  if (!address) redirect('/create-account')

  return <VerifyEmailScreen email={address} />
}
