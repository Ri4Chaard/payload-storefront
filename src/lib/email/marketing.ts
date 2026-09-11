import config from '@payload-config'
import { getPayload } from 'payload'

import type { Locale } from '@/i18n/routing'
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

/**
 * The same switch the transactional adapter honours, for the same reason — and it has to be
 * repeated here because this module does not go through that adapter.
 *
 * `EMAIL_TRANSPORT=log` swaps Payload's email adapter (`src/payload.config.ts`), which covers every
 * verification code and reset notice, because those are all sent by Payload. This is a bare `fetch`
 * to a third party carrying the live API key, so the adapter has no opportunity to intercept it.
 * Without this line, the moment the sync is wired to a hook, every test that registers a customer —
 * and both suites register many — writes a throwaway `@aurum-testing.dev` address into whatever
 * audience `RESEND_AUDIENCE_ID` names. That is only harmless while the variable is unset, which is
 * not a property to depend on: it is one `.env` line away from a marketing list full of test rows,
 * and unlike a wasted quota that is not self-repairing.
 *
 * Read at call time rather than at module load. The runners set it in their config files before any
 * test module is imported, so a constant would work today, but a guard whose correctness depends on
 * import order is a guard that fails silently the day the order changes.
 */
const suppressed = () => process.env.EMAIL_TRANSPORT === 'log'

interface SyncArgs {
  email: string
  firstName?: null | string
  lastName?: null | string
  /**
   * The language this subscriber reads the site in (spec 010, FR-044).
   *
   * **Logged, not sent — and that is a limitation worth stating rather than hiding.** Resend's
   * contacts endpoint accepts `email`, `first_name`, `last_name` and `unsubscribed`, and nothing
   * else; there is no field to put a language in. The authority is `customers.locale`, which this
   * mirrors, so a campaign can be segmented by exporting from Payload. Sending it to Resend needs
   * either their custom-properties API or a second audience per language, and that is a decision
   * for whoever first writes a Russian campaign.
   */
  locale?: Locale
  subscribed: boolean
}

export async function syncMarketingContact({
  email,
  firstName,
  locale,
  lastName,
  subscribed,
}: SyncArgs): Promise<void> {
  const payload = await getPayload({ config })

  if (suppressed()) {
    payload.logger.info({
      msg: 'Marketing contact not synced (EMAIL_TRANSPORT=log)',
      locale,
      subscribed,
    })
    return
  }

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
