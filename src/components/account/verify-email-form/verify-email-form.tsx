'use client'

import React from 'react'

import { Button } from '@/components/ui/button'
import { OtpInput } from '@/components/ui/otp-input'
import { resendCode, verifyEmailCode } from '@/lib/auth/actions'
import { CODE_RESEND_COOLDOWN_MS } from '@/lib/auth/config'
import { message, verifyCopy as copy } from '@/lib/auth/copy'

/**
 * Nodes `428:11869` and `429:12615` — the six boxes, the submit, and the resend prompt.
 *
 * The customer pastes the code out of their email rather than reading and retyping it, which is
 * what `OtpInput` handles at the group; `onComplete` then submits without them having to find the
 * button (contracts/ui-kit-additions.md O3).
 */
export interface VerifyEmailFormProps {
  email: string
  onVerified: () => void
}

export function VerifyEmailForm({ email, onVerified }: VerifyEmailFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [code, setCode] = React.useState('')
  const [state, action, pending] = React.useActionState(verifyEmailCode, null)
  const [resendState, resendAction] = React.useActionState(resendCode, null)

  /**
   * A visible countdown driven by a fixed interval, identical for every address.
   *
   * The action deliberately does not say whether a send was throttled — that would tell an attacker
   * which addresses are registered (see `resendCode`). The customer still needs to know the button
   * is not simply broken, so the wait is shown here, where it reveals nothing.
   */
  const [cooldown, setCooldown] = React.useState(0)

  React.useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  React.useEffect(() => {
    if (resendState?.status === 'success') setCooldown(Math.ceil(CODE_RESEND_COOLDOWN_MS / 1000))
  }, [resendState])

  React.useEffect(() => {
    if (state?.status === 'success') onVerified()
  }, [state, onVerified])

  const error = state?.status === 'error' ? message(copy, state.message) : undefined

  return (
    <div className="flex flex-col gap-7.5">
      <form ref={formRef} action={action} className="flex flex-col gap-7.5">
        <input type="hidden" name="email" value={email} />

        <OtpInput
          label={copy.verifyCodeLabel}
          name="code"
          value={code}
          onChange={setCode}
          // Six digits in and nothing left to decide — submitting for them saves a hunt for the
          // button, and the code is single-use so an accidental submit costs nothing.
          onComplete={() => formRef.current?.requestSubmit()}
          error={error}
          autoFocus
        />

        <Button type="submit" variant="primary" disabled={pending} className="w-full">
          {copy.verifySubmit}
        </Button>
      </form>

      <form action={resendAction} className="text-center">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="purpose" value="verify-email" />
        <p className="text-body-base text-neutral-primary">{copy.verifyResendPrompt}</p>
        <Button type="submit" variant="outline" disabled={cooldown > 0} className="mt-3.5">
          {cooldown > 0 ? `${cooldown}s` : copy.verifyResendSent}
        </Button>
      </form>
    </div>
  )
}
