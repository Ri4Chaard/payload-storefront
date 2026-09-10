import { createHmac } from 'node:crypto'

import config from '@payload-config'
import { getPayload } from 'payload'

import { ENQUIRY_RATE_LIMIT, ENQUIRY_RATE_WINDOW_MS } from './config'

/**
 * Keeping the contact form from being a megaphone (spec 008, T051,
 * contracts/enquiry-action.md §4).
 *
 * **Counted over stored enquiries, with no table of its own.** FR-027 asks for a limit that
 * "survives a redeploy and holds across instances", which rules out an in-process counter —
 * `src/lib/auth/codes.ts` rejected exactly that for the auth codes, in those words: "an in-memory
 * limiter on a horizontally scaled app limits nothing." It also requires that a refused submission
 * is **not recorded**, so the counter cannot be "rows written including rejected ones". Counting
 * *accepted* rows inside the window satisfies both, and needs nothing new to migrate or purge.
 *
 * **Two keys, because one is trivially defeated.** An address alone is no obstacle — a script
 * varies it per request. The client address is the useful second key, and it is the one this module
 * takes care not to keep.
 *
 * **A property worth stating plainly:** because only accepted enquiries count, a sender who hits
 * the limit may send another five an hour later. That is the intended behaviour — the cap is on
 * rate, not on total — and it is what SC-010 measures.
 */

const client = () => getPayload({ config })

/**
 * The client address, reduced to something that cannot be read back.
 *
 * **A keyed digest, not the address**, and the reasoning is `src/lib/auth/codes.ts`'s: what protects
 * the value is that computing candidates requires `PAYLOAD_SECRET`, which is not in the database.
 * The IP space is small enough to enumerate offline, so no hash is slow enough to matter — a
 * *keyed* digest is the property worth having, not a slow one.
 *
 * It is still personal data, pseudonymised rather than anonymised, which is why it lives on the
 * enquiry row and dies with it (FR-029d) rather than in a store with a lifetime of its own.
 *
 * Returns `undefined` where no address can be determined, and the caller then throttles on the
 * email alone rather than on a constant that would bucket every anonymous visitor together.
 */
export function senderHash(ip: string | undefined | null): string | undefined {
  const value = ip?.trim()
  if (!value) return undefined

  const secret = process.env.PAYLOAD_SECRET
  // Without a secret the digest is not keyed and therefore not worth storing. Better to throttle on
  // the address alone than to keep a reversible fingerprint of everyone who visits.
  if (!secret) return undefined

  return createHmac('sha256', secret).update(value).digest('hex')
}

/**
 * The client's address, as far as it can be trusted.
 *
 * `x-forwarded-for` is written by the proxy in front of this app and can be forged by a client when
 * nothing rewrites it. That is acceptable here and would not be for authorisation: forging it
 * defeats the IP half of the throttle, which leaves the email half — and a limit that can be evaded
 * by an attacker who knows to try is still a limit on the accidental flood and the naive script.
 */
export function clientIp(headers: Headers): string | undefined {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim()
  return headers.get('x-real-ip') ?? undefined
}

export type ThrottleResult = { allowed: true } | { allowed: false; key: 'email' | 'sender' }

/**
 * Whether this sender may send another (FR-027).
 *
 * Two `count` queries rather than one `or`, so the caller can log which limit was reached without
 * a second round trip — and so a missing `senderHash` skips its query entirely instead of matching
 * every row with a null column, which is the bug an `or` would have invited.
 */
export async function checkEnquiryThrottle(
  email: string,
  hash: string | undefined,
): Promise<ThrottleResult> {
  const payload = await client()
  const since = new Date(Date.now() - ENQUIRY_RATE_WINDOW_MS).toISOString()

  const byEmail = await payload.count({
    collection: 'enquiries',
    // Lowercased for counting only. The stored address keeps the visitor's own capitalisation,
    // because it is what the owner replies to rather than an identity to match on.
    where: { email: { equals: email.trim().toLowerCase() }, createdAt: { greater_than: since } },
    overrideAccess: true,
  })

  if (byEmail.totalDocs >= ENQUIRY_RATE_LIMIT) return { allowed: false, key: 'email' }

  if (!hash) return { allowed: true }

  const bySender = await payload.count({
    collection: 'enquiries',
    where: { senderHash: { equals: hash }, createdAt: { greater_than: since } },
    overrideAccess: true,
  })

  if (bySender.totalDocs >= ENQUIRY_RATE_LIMIT) return { allowed: false, key: 'sender' }

  return { allowed: true }
}
