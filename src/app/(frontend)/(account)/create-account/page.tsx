import type { Metadata } from 'next'
import React from 'react'

import { AuthCard } from '@/components/account/auth-card'
import { CreateAccountForm } from '@/components/account/create-account-form'
import { Link } from '@/components/ui/link'
import { createAccountCopy as copy } from '@/lib/auth/copy'
import { getAccountSettings } from '@/lib/auth/settings'

/**
 * Node `428:11594` (spec 004, US1).
 *
 * `noindex` on every auth route. A sign-in or sign-up page in search results is not a feature —
 * it competes with the pages that sell things, and a create-account form is not a landing page.
 */
export const metadata: Metadata = {
  title: 'Create account',
  robots: { follow: false, index: false },
}

export default async function CreateAccountPage() {
  const settings = await getAccountSettings()

  return (
    <AuthCard
      title={copy.createTitle}
      subtitle={copy.createSubtitle}
      footer={
        <>
          {copy.createSignInPrompt} <Link href="/sign-in">{copy.createSignInLink}</Link>
        </>
      }
    >
      <CreateAccountForm marketingEnabled={settings.marketingEnabled} />
    </AuthCard>
  )
}
