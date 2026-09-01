import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { env } from '@/env'

/**
 * Marketing consent, mirrored into Resend (spec 004, research R2).
 *
 * **This module cannot send a message.** It only moves a contact's subscribed state into the Resend
 * audience that campaigns are sent against. Marketing mail is composed and sent from Resend, by a
 * person; the application never sends it. Together with `./transactional.ts` — which cannot see the
 * consent flag — that makes FR-035 a property of the architecture rather than a conditional
 * somebody has to remember.
 *
 * **Payload is the source of truth.** Consent is customer data, and Constitution VI keeps customer
 * data under Payload's access control rather than a third party's. Resend holds a copy so that a
 * send respects it; if the two ever disagree, Payload wins and the sync is what gets repaired.
 *
 * **A failure here never fails the write.** A customer who withdraws consent has withdrawn it, and
 * telling them otherwise because a third-party API was briefly unreachable would be both a lie and,
 * arguably, a compliance problem of its own. The error is logged and left to reconciliation.
 *
 * **Not yet built, and recorded rather than hidden**: the inbound webhook that would catch an
 * unsubscribe made from the email client's own List-Unsubscribe header. Until it exists, that
 * unsubscribe is honoured by Resend but not reflected on the profile page. It is in the plan's
 * Complexity Tracking, and it needs a signed endpoint and a replay story of its own.
 */

const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID?.trim()

interface SyncArgs {
  email: string
  firstName?: null | string
  lastName?: null | string
  subscribed: boolean
}

export async function syncMarketingContact({
  email,
  firstName,
  lastName,
  subscribed,
}: SyncArgs): Promise<void> {
  const payload = await getPayload({ config })

  if (!AUDIENCE_ID) {
    // Not an error. An installation that has not created an audience yet still has working
    // accounts; it simply has nowhere to mirror the preference to.
    payload.logger.debug({
      msg: 'RESEND_AUDIENCE_ID is unset — marketing consent recorded in Payload only.',
    })
    return
  }

  try {
    const response = await fetch(
      `https://api.resend.com/audiences/${encodeURIComponent(AUDIENCE_ID)}/contacts`,
      {
        body: JSON.stringify({
          email,
          first_name: firstName ?? undefined,
          last_name: lastName ?? undefined,
          unsubscribed: !subscribed,
        }),
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    )

    if (!response.ok) {
      payload.logger.error({
        msg: 'Resend audience sync rejected',
        status: response.status,
      })
    }
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Resend audience sync failed' })
  }
}
