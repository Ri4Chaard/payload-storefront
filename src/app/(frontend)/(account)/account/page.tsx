import type { Metadata } from 'next'
import React from 'react'

import { SignOutButton } from '@/components/account/sign-out-button'
import { Container } from '@/components/ui/container'
import { profileCopy as copy } from '@/lib/auth/copy'
import { requireCustomer } from '@/lib/auth/dal'

/**
 * The profile page, in the form US2 needs it (spec 004, FR-015).
 *
 * **This is not the design yet.** Node `266:4382` draws rows for the name, addresses, marketing
 * preferences and security, and those land with US4–US7. What is here is the smallest page that
 * makes US2 a real user story rather than a half of one: a signed-in customer needs somewhere that
 * proves they are signed in and somewhere to sign out from, and "the profile is unreachable after
 * signing out" cannot be tested against a route that does not exist.
 *
 * **`requireCustomer` is the guard, and it is here rather than in a layout.** `src/lib/auth/dal.ts`
 * explains why at length; the short version is that a layout does not decide whether its children
 * render. `src/proxy.ts` sends anonymous visitors here away before this runs, but that is a
 * courtesy — a forged cookie passes the proxy and is refused on this line (FR-015).
 */
export const metadata: Metadata = {
  title: 'My account',
  robots: { follow: false, index: false },
}

export default async function AccountPage() {
  const customer = await requireCustomer('/account')

  return (
    <Container>
      <div className="mx-auto flex w-full max-w-160 flex-col gap-7.5 py-12 md:py-20">
        <h1 className="text-heading-1 text-neutral-primary">{copy.profileTitle}</h1>

        <dl className="flex flex-col gap-1.5">
          <dt className="text-body-small text-neutral-secondary">{copy.profileEmailLabel}</dt>
          <dd className="text-body-base text-neutral-primary">{customer.email}</dd>
        </dl>

        <div>
          <SignOutButton />
        </div>
      </div>
    </Container>
  )
}
