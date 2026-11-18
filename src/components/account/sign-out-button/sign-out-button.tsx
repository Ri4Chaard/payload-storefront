'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import React from 'react'

import { Button } from '@/components/ui/button'
import { signOutCustomer } from '@/lib/auth/actions'

/**
 * Ends the session.
 *
 * **`replace`, not `push`.** Pushing leaves the profile in the history stack, so Back walks
 * straight onto a page the customer just left on purpose. Replacing means Back goes to whatever
 * they were doing before they opened their account, which is what signing out ought to feel like.
 *
 * **`refresh` as well**, because the cookie is only half of it: the client router holds rendered
 * segments in memory, and without invalidating them the header still shows a signed-in state and
 * the profile is still sitting in the cache. The action revalidates on the server; this is the
 * client half of the same job.
 */
export function SignOutButton() {
  const t_account = useTranslations('account')
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  return (
    <Button
      type="button"
      variant="primary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await signOutCustomer()
          router.replace('/')
          router.refresh()
        })
      }}
    >
      {t_account('signOut')}
    </Button>
  )
}
