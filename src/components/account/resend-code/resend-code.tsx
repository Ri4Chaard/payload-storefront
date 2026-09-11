'use client'

import { useTranslations } from 'next-intl'
import React from 'react'

import { resendCode } from '@/lib/auth/actions'
import { CODE_RESEND_COOLDOWN_MS } from '@/lib/auth/config'
import { cn } from '@/lib/cn'

/**
 * The “Resend” in “Didn’t receive the code? Resend” — node `428:11921`.
 *
 * **A button, not a link, and that is not pedantry.** It performs an action rather than going
 * somewhere, which decides how a screen reader announces it and which key activates it. It is
 * styled to match `Link`'s `inline` variant because the design draws it as part of the sentence;
 * the classes are mirrored rather than imported because the kit has no inline-button variant and
 * one consumer does not earn one (Principle II). Promote it the day a second screen wants it.
 *
 * **The countdown appears only once a send has been asked for.** Showing a wait before anyone has
 * clicked would be both confusing and a disclosure — the action deliberately refuses to say whether
 * a send was throttled, because "please wait" for a registered address and "sent" for an unknown one
 * turns this control into a way to discover who has an account. The timer is client-side, fixed,
 * and identical for every address, so it reveals nothing.
 *
 * **`aria-disabled`, not `disabled`.** A real `disabled` while counting down would drop focus to
 * the body at the moment the customer clicked — they press a control and their place on the page
 * disappears. This stays focusable and announceable, and the handler simply declines.
 */
export interface ResendCodeProps {
  email: string
  purpose?: 'reset-password' | 'verify-email'
  className?: string
}

export function ResendCode({ email, purpose = 'verify-email', className }: ResendCodeProps) {
  const t_account = useTranslations('account')
  const [cooldown, setCooldown] = React.useState(0)
  const [status, setStatus] = React.useState('')
  const [sending, startSending] = React.useTransition()

  React.useEffect(() => {
    if (cooldown <= 0) return

    const timer = setTimeout(() => {
      setCooldown((seconds) => {
        const next = seconds - 1
        // Clear the announcement as the wait ends, so the region is empty and ready to speak again.
        if (next <= 0) setStatus('')
        return next
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [cooldown])

  const waiting = cooldown > 0

  const onClick = () => {
    if (waiting || sending) return

    startSending(async () => {
      await resendCode({ email, purpose })
      // Started regardless of the answer. A countdown that appeared only on a real send would say
      // which addresses are registered — the same disclosure the action itself avoids.
      setCooldown(Math.ceil(CODE_RESEND_COOLDOWN_MS / 1000))
      setStatus(t_account('codeSent'))
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-disabled={waiting || sending}
        className={cn(
          'text-body-small underline underline-offset-4',
          'ease-standard transition-colors duration-[var(--duration-fast)]',
          'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
          waiting
            ? 'text-neutral-secondary cursor-default'
            : 'text-primary-default hover:text-primary-hover cursor-pointer',
          className,
        )}
      >
        {waiting ? `Resend in ${cooldown}s` : 'Resend'}
      </button>

      {/*
        Present from the first render rather than inserted on send: a live region added to the DOM
        at the same moment it gains content is unreliably announced. The countdown itself is not
        announced — a region that speaks every second is worse than one that speaks once.
      */}
      <span role="status" aria-live="polite" className="sr-only">
        {status}
      </span>
    </>
  )
}
