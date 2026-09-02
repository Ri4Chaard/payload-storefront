import config from '@payload-config'
import { getPayload } from 'payload'
import { LockedAuth, UnverifiedEmail } from 'payload'

/**
 * Checking a password, and nothing else (spec 004, US2).
 *
 * **Deliberately not in `actions.ts`.** Every export of a `'use server'` module is a public RPC
 * endpoint, so putting this beside the actions would publish a second, undocumented way to trade
 * credentials for a session token. It also could not be tested there: `signIn` writes a cookie, and
 * `cookies()` needs a request, so the assertions FR-011 actually cares about would have nowhere to
 * live. One function, callable from a test, and the action wraps it.
 *
 * **The three failures are reported separately here and collapsed by the caller.** This function's
 * job is to say what happened; deciding what the customer is told is the action's, and that is
 * where FR-011's "wrong password and unknown address are indistinguishable" is enforced. Keeping
 * the collapse in one visible place is better than a function that has already forgotten the
 * difference.
 */

export type AuthOutcome =
  | { customerId: number; ok: false; reason: 'unverified' }
  | { customerId: number; ok: true; token: string }
  | { ok: false; reason: 'invalid' | 'locked' }

interface Credentials {
  email: string
  password: string
}

export async function authenticateCustomer({ email, password }: Credentials): Promise<AuthOutcome> {
  const payload = await getPayload({ config })

  try {
    const result = await payload.login({
      collection: 'customers',
      data: { email, password },
    })

    // Payload types `token` as optional because a collection can disable local strategy tokens.
    // Ours does not, so an absent token is a broken assumption rather than a wrong password — but
    // it is still reported as a failed sign-in, because there is nothing useful to say to a
    // customer about it.
    if (!result.token || !result.user) return { ok: false, reason: 'invalid' }

    return { customerId: result.user.id, ok: true, token: result.token }
  } catch (error) {
    /**
     * `LockedAuth` after `maxLoginAttempts` (FR-014). Payload counts and locks; we only report.
     */
    if (error instanceof LockedAuth) return { ok: false, reason: 'locked' }

    /**
     * **`UnverifiedEmail` is thrown only after the password has already been verified**, which is
     * what makes it safe to act on. Payload authenticates at
     * `payload/dist/auth/operations/login.js:162`, throws `AuthenticationError` for a bad password
     * at :182, and only reaches the `_verified` check at :184. So reaching this branch proves the
     * caller knows the password, and telling them their address is unverified reveals nothing they
     * could not already confirm. Had the order been the other way round, this branch would have
     * been an account-enumeration oracle and would have had to be collapsed into `invalid`.
     */
    if (error instanceof UnverifiedEmail) {
      const found = await payload.find({
        collection: 'customers',
        limit: 1,
        overrideAccess: true,
        where: { email: { equals: email.trim().toLowerCase() } },
      })

      const customer = found.docs[0]
      if (customer) return { customerId: customer.id, ok: false, reason: 'unverified' }
    }

    // Everything else — including `AuthenticationError` for both a wrong password and an address
    // with no account, which is the pair FR-011 exists for.
    return { ok: false, reason: 'invalid' }
  }
}
