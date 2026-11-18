import type { PayloadEmailAdapter } from 'payload'

/**
 * An email adapter that writes the message to the log instead of sending it.
 *
 * **Why this exists: the test suites were mailing real people.** Every registration and every reset
 * request in `tests/integration` and `tests/e2e` went out through Resend, against a real account
 * with a real daily quota — and when that quota ran out, eight tests failed with "no reset code was
 * issued", which is a message about a code and not about a mail provider. A suite whose green
 * depends on a third party's rate limit is not a gate, it is a coin toss with a bill attached.
 *
 * **Selected by `EMAIL_TRANSPORT=log`, and the default is unchanged.** Production, staging and a
 * developer's `pnpm dev` all keep the Resend adapter without setting anything; the two test runners
 * set the variable themselves, so nobody has to remember to. Opting IN to the fake is what stops
 * this becoming the reason a production deploy silently stops mailing anyone.
 *
 * It logs the recipient and subject and never the body, because the body is where the codes are.
 */
export const logEmailAdapter =
  (defaults: { defaultFromAddress: string; defaultFromName: string }): PayloadEmailAdapter =>
  ({ payload }) => ({
    ...defaults,
    name: 'log',
    sendEmail: async (message) => {
      payload.logger.info({
        msg: 'Email not sent (EMAIL_TRANSPORT=log)',
        subject: message.subject,
        to: message.to,
      })
      return Promise.resolve()
    },
  })
