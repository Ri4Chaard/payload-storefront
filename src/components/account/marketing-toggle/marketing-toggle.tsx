'use client'

import React from 'react'

import { ProfileRow } from '@/components/account/profile-row'
import { Icon } from '@/components/ui/icon'
import { Switch } from '@/components/ui/switch'
import { setMarketingEmail } from '@/lib/auth/actions'

/**
 * The Marketing preferences row — node row `I266:5096;266:4954` (spec 004, US6, FR-033).
 *
 * **The row moved into a client component, and the switch is the only reason.** The page is a
 * Server Component; a control that flips in place needs state, so whoever owns the state owns the
 * row — the shape `NameRow` and `AddressList` already take. Nothing else about the row changed.
 *
 * **Optimistic, and it reverts out loud.** The switch moves on the click, before the server has
 * answered, because a toggle that waits ~300ms to move reads as broken and gets clicked twice. The
 * risk that buys is the one that matters here: a customer who believes they opted out when they did
 * not. So a failure puts the switch back AND says so (US6 scenario 3) — silently reverting would be
 * the same lie told more quietly, and this is consent rather than a preference about a layout.
 *
 * **No `useOptimistic`.** That hook ties the optimistic value to a transition and drops it when the
 * transition ends, which is right for a list that re-renders from the server and wrong here: the
 * failure path needs the value to STAY reverted with an error beside it, not to snap back to
 * whatever the last server render said. Plain state, reconciled against the prop below.
 */
export interface MarketingToggleProps {
  /** The stored preference, server-rendered. The switch's position when nothing is in flight. */
  subscribed: boolean
}

const LABEL = 'Email me occasional news and offers'
const FAILED = 'That did not save. Your preference is unchanged — please try again.'

export function MarketingToggle({ subscribed }: MarketingToggleProps) {
  const [checked, setChecked] = React.useState(subscribed)
  const [failed, setFailed] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  /**
   * The server's value wins once it changes, and `subscribed` only changes after a successful
   * write revalidates `/account`. Without this the switch would keep the position it was given at
   * mount and drift from the record on any change made elsewhere — a second tab, or the admin panel.
   */
  React.useEffect(() => {
    setChecked(subscribed)
  }, [subscribed])

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.checked

    setChecked(next)
    setFailed(false)

    startTransition(async () => {
      const result = await setMarketingEmail({ subscribed: next })

      if (result.status === 'error') {
        // Back to what is actually stored, which is what we started from.
        setChecked(!next)
        setFailed(true)
      }
    })
  }

  return (
    <ProfileRow
      label="Marketing preferences"
      action={
        <Switch
          label={LABEL}
          hideLabel
          checked={checked}
          onChange={onChange}
          // Not disabled while in flight: a customer who clicks twice means it, and blocking the
          // second click would leave the switch showing a state they are actively trying to leave.
          // The action is idempotent — writing the value it already holds changes nothing and, by
          // `stampMarketingConsent`, does not even move the timestamp.
          aria-busy={pending}
        />
      }
    >
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-2.5">
          <Icon name="mail" className="text-neutral-secondary size-5" />
          Email
        </span>
        {failed ? (
          <span role="alert" className="text-body-small text-status-error-text">
            {FAILED}
          </span>
        ) : null}
      </span>
    </ProfileRow>
  )
}
