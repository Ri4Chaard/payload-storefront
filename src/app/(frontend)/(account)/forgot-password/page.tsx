import type { Metadata } from 'next'
import React from 'react'

import { AuthCard } from '@/components/account/auth-card'
import { ForgotPasswordForm } from '@/components/account/forgot-password-form'
import { Link } from '@/components/ui/link'

/** Nodes `429:12087` and `614:13323` (spec 004, US3). `noindex` like every account route. */
export const metadata: Metadata = {
  title: 'Forgot password',
  robots: { follow: false, index: false },
}

/**
 * Step one of three.
 *
 * The footer reads "Back to sign in"; the frame draws `Вернуться к авторизации`, which is design
 * defect 1 (FR-047). `614:13323` is this same screen with the site footer's newsletter box in its
 * error state — a different component's state, and nothing to build here.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="FORGOT PASSWORD"
      subtitle="Enter the email address associated with your account."
      footer={<Link href="/sign-in">Back to sign in</Link>}
    >
      <ForgotPasswordForm />
    </AuthCard>
  )
}
