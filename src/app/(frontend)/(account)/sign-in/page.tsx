import type { Metadata } from 'next'
import React from 'react'

import { AuthCard } from '@/components/account/auth-card'
import { SignInForm } from '@/components/account/sign-in-form'
import { Link } from '@/components/ui/link'

/** Node `408:7412` (spec 004, US2). `noindex` like every account route. */
export const metadata: Metadata = {
  title: 'Log in',
  robots: { follow: false, index: false },
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { next } = await searchParams

  return (
    <AuthCard
      title="WELCOME BACK"
      subtitle="Please fill in the information below:"
      footer={
        <>
          Don’t have an account? <Link href="/create-account">Create one</Link>
        </>
      }
    >
      <SignInForm next={typeof next === 'string' ? next : undefined} />
    </AuthCard>
  )
}
