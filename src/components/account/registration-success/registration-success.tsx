import { useTranslations } from 'next-intl'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Icon } from '@/components/ui/icon'

/**
 * Node `432:13049` — the check emblem, the heading, the body, and one onward action.
 *
 * **The button leads to sign-in rather than to the shop.** FR-007 wanted the customer signed in by
 * this point, and Payload 3.88 exposes no supported way to mint a session without the password —
 * the reasoning is at `verifyEmailCode`. So the single action the design draws does the one thing
 * still outstanding.
 */
export function RegistrationSuccess() {
  const t_account = useTranslations('account')
  return (
    <Container>
      <div className="mx-auto flex w-full max-w-160 flex-col items-center gap-10 py-12 text-center md:py-20">
        <span
          aria-hidden="true"
          className="border-primary-default/25 flex size-30 items-center justify-center rounded-full border"
        >
          <span className="bg-primary-default/8 flex size-21 items-center justify-center rounded-full">
            <Icon name="check" className="text-primary-default size-8" />
          </span>
        </span>

        <div className="flex flex-col gap-3.5">
          <h1 className="text-heading-1 text-neutral-primary">{t_account('registrationSuccess')}</h1>
          <p className="text-body-base text-neutral-primary">
            {t_account('createdBody')}
          </p>
        </div>

        <Button href="/sign-in" variant="primary" className="w-full max-w-120">
          {t_account('startShopping')}
        </Button>
      </div>
    </Container>
  )
}
