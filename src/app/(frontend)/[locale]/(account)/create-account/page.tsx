import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import React from 'react'

import { AuthCard } from '@/components/account/auth-card'
import { CreateAccountForm } from '@/components/account/create-account-form'
import { Link } from '@/components/ui/link'
import { getCustomer } from '@/lib/auth/dal'

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
  // Signed in, so there is nothing to create. Same reasoning as `/sign-in`: an authentication entry
  // point offered to someone already through the door either does nothing or does something worse.
  if (await getCustomer()) redirect('/account')

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
      <CreateAccountForm />
    </AuthCard>
  )
}
