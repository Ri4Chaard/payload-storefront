import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import React from 'react'

import { ResetPasswordScreen } from './reset-password-screen'

/** Nodes `429:12348`, `429:12615` and `429:12884` (spec 004, US3). */
export const metadata: Metadata = {
  title: 'Reset your password',
  robots: { follow: false, index: false },
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

  return <ResetPasswordScreen email={address} />
}
