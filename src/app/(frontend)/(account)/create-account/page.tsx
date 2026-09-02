import type { Metadata } from 'next'
import React from 'react'

import { AuthCard } from '@/components/account/auth-card'
import { CreateAccountForm } from '@/components/account/create-account-form'
import { Link } from '@/components/ui/link'
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
      title="CREATE ACCOUNT"
      subtitle="Please fill in the information below:"
      footer={
        <>
          Already have an account? <Link href="/sign-in">Log in</Link>
        </>
      }
    >
      <CreateAccountForm marketingEnabled={settings.marketingEnabled} />
    </AuthCard>
  )
}
