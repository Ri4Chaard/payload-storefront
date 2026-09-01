import type { Metadata } from 'next'
import React from 'react'

import { AuthCard } from '@/components/account/auth-card'
import { CreateAccountForm } from '@/components/account/create-account-form'
import { Link } from '@/components/ui/link'
import { getAccountCopy } from '@/lib/auth/copy'

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
  const copy = await getAccountCopy()

  return (
    <AuthCard
      title={copy.createTitle ?? 'CREATE ACCOUNT'}
      subtitle={copy.createSubtitle ?? undefined}
      footer={
        <>
          {copy.createSignInPrompt ?? 'Already have an account?'}{' '}
          <Link href="/sign-in">{copy.createSignInLink ?? 'Log in'}</Link>
        </>
      }
    >
      <CreateAccountForm
        copy={{
          createConfirmLabel: copy.createConfirmLabel,
          createEmailInvalid: copy.createEmailInvalid,
          createMarketingConsent: copy.createMarketingConsent,
          createPasswordMismatch: copy.createPasswordMismatch,
          createPasswordTooWeak: copy.createPasswordTooWeak,
          createSubmit: copy.createSubmit,
          signInEmailLabel: copy.signInEmailLabel,
          signInPasswordLabel: copy.signInPasswordLabel,
        }}
      />
    </AuthCard>
  )
}
