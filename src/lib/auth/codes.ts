import 'server-only'

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

import config from '@payload-config'
import { getPayload } from 'payload'

import {
  CODE_LENGTH,
  CODE_MAX_ATTEMPTS,
  CODE_REQUESTS_PER_HOUR,
  CODE_RESEND_COOLDOWN_MS,
  CODE_TTL_MS,
} from '@/lib/auth/config'
import { env } from '@/env'

/**
 * The six digits a customer types, and the Payload token they stand for (spec 004, research R3).
 *
 * **The code is an alias, never a credential of its own.** Payload mints the verification or reset
 * token, owns the cryptography, and performs the state transition. A row in `verification-codes`
 * only remembers which six digits point at which token, for how long, and how many wrong guesses
 * have been spent on it.
 *
 * **This is the only module that touches that collection.** Every access function on it returns
 * `false`, so nothing reaches it through REST, GraphQL or the admin panel; these functions use the
 * Local API with `overrideAccess: true`. Keeping the reads in one place is also what stops a call
 * site from checking three of the four ways a code can be dead and forgetting the fourth.
 */

export type CodePurpose = 'reset-password' | 'verify-email'

export type CodeFailure =
  'consumed' | 'expired' | 'mismatch' | 'not-found' | 'superseded' | 'too-many-attempts'

export type ConsumeResult = { ok: true; token: string } | { failure: CodeFailure; ok: false }

export type IssueResult =
  { code: string; ok: true } | { ok: false; retryAfterMs: number; throttled: 'cooldown' | 'hourly' }

const client = () => getPayload({ config })

/**
 * Keyed HMAC rather than bcrypt or scrypt, and that is a deliberate departure from how the password
 * is stored.
 *
 * A six-digit code has a million possible values. No hash is slow enough to make that space
 * expensive to search offline — an attacker holding the table would walk it in moments whatever we
 * chose. What actually protects the code is that computing candidates requires `PAYLOAD_SECRET`,
 * which is not in the database. So the property worth having is a *keyed* digest, not a slow one,
 * and the ten-minute expiry does the rest.
 */
function hashCode(code: string): string {
  return createHmac('sha256', env.PAYLOAD_SECRET).update(code).digest('hex')
}

/** Constant-time, so a wrong code cannot be narrowed down by how long the comparison took. */
function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex')
  const right = Buffer.from(b, 'hex')
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

/**
 * `randomInt` and not `Math.random`. The latter is seeded predictably enough that a stream of codes
 * can be reconstructed from a couple of observed ones, which is a total break of the flow.
 */
function generateCode(): string {
  const max = 10 ** CODE_LENGTH
  return String(randomInt(0, max)).padStart(CODE_LENGTH, '0')
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Mint a code for a token, retiring anything live for the same address and purpose.
 *
 * Throttled per address (research R8): a cooldown between sends, and an hourly ceiling. Both are
 * database state rather than in-process counters, so they survive a redeploy and hold across
 * instances — an in-memory limiter on a horizontally scaled app limits nothing.
 */
export async function issueCode(
  email: string,
  purpose: CodePurpose,
  token: string,
  customerId?: number | string,
): Promise<IssueResult> {
  const payload = await client()
  const address = normalizeEmail(email)
  const now = Date.now()

  const recent = await payload.find({
    collection: 'verification-codes',
    limit: CODE_REQUESTS_PER_HOUR,
    overrideAccess: true,
    sort: '-createdAt',
    where: {
      and: [
        { email: { equals: address } },
        { createdAt: { greater_than: new Date(now - 60 * 60 * 1000).toISOString() } },
      ],
    },
  })

  const newest = recent.docs[0]
  if (newest) {
    const since = now - new Date(newest.createdAt).getTime()
    if (since < CODE_RESEND_COOLDOWN_MS) {
      return { ok: false, retryAfterMs: CODE_RESEND_COOLDOWN_MS - since, throttled: 'cooldown' }
    }
  }

  if (recent.totalDocs >= CODE_REQUESTS_PER_HOUR) {
    return { ok: false, retryAfterMs: 60 * 60 * 1000, throttled: 'hourly' }
  }

  // Retire live codes for this address and purpose BEFORE writing the new one, so there is never a
  // window in which two codes would both be accepted (FR-005).
  await payload.update({
    collection: 'verification-codes',
    data: { supersededAt: new Date(now).toISOString() },
    overrideAccess: true,
    where: {
      and: [
        { email: { equals: address } },
        { purpose: { equals: purpose } },
        { consumedAt: { exists: false } },
        { supersededAt: { exists: false } },
      ],
    },
  })

  const code = generateCode()

  await payload.create({
    collection: 'verification-codes',
    data: {
      attempts: 0,
      codeHash: hashCode(code),
      email: address,
      expiresAt: new Date(now + CODE_TTL_MS).toISOString(),
      purpose,
      token,
      ...(customerId ? { customer: customerId as number } : {}),
    },
    overrideAccess: true,
  })

  return { code, ok: true }
}

/**
 * The only reader. Returns the token the code stands for, or precisely why it does not.
 *
 * The four terminal states — consumed, superseded, expired, attempts exhausted — are all checked
 * here so that no caller can implement three of them. They are reported separately because the
 * customer-facing difference matters: "that code expired, here is a new one" is actionable, and
 * "invalid code" shown to someone whose code merely timed out is how a person ends up retyping the
 * same six digits until they give up.
 *
 * **It matches the code against the customer's recent codes, not just the newest one**, and that is
 * not a refinement — the obvious version is wrong twice. Someone who requests a second code and then
 * pastes the first (out of the older email, which is still sitting in their inbox) would be told
 * their code was *invalid* rather than superseded, which is unactionable; and each of those
 * attempts would burn a guess against the NEW code, so five paste-the-wrong-one mistakes would lock
 * them out of the code they actually needed. Finding the row the digits belong to and reporting
 * that row's state fixes both.
 */
export async function consumeCode(
  email: string,
  purpose: CodePurpose,
  code: string,
): Promise<ConsumeResult> {
  const payload = await client()
  const address = normalizeEmail(email)
  const submitted = hashCode(code.trim())

  const found = await payload.find({
    collection: 'verification-codes',
    // Deep enough to cover an hour of resends at the per-address ceiling, so a customer working
    // through a stack of emails is always told which one they are looking at.
    limit: CODE_REQUESTS_PER_HOUR,
    overrideAccess: true,
    sort: '-createdAt',
    where: {
      and: [{ email: { equals: address } }, { purpose: { equals: purpose } }],
    },
  })

  if (found.docs.length === 0) return { failure: 'not-found', ok: false }

  const record = found.docs.find((candidate) => hashesMatch(candidate.codeHash, submitted))

  // The digits belong to no code we issued. The guess is spent against the code that is currently
  // live, which is the one an attacker would be trying to brute-force.
  if (!record) {
    const live = found.docs.find(
      (candidate) =>
        !candidate.consumedAt &&
        !candidate.supersededAt &&
        new Date(candidate.expiresAt).getTime() > Date.now(),
    )

    if (!live) return { failure: 'mismatch', ok: false }

    const attempts = (live.attempts ?? 0) + 1
    await payload.update({
      collection: 'verification-codes',
      data: { attempts },
      id: live.id,
      overrideAccess: true,
    })

    return { failure: attempts >= CODE_MAX_ATTEMPTS ? 'too-many-attempts' : 'mismatch', ok: false }
  }

  if (record.consumedAt) return { failure: 'consumed', ok: false }
  if (record.supersededAt) return { failure: 'superseded', ok: false }
  if (new Date(record.expiresAt).getTime() <= Date.now()) return { failure: 'expired', ok: false }
  if ((record.attempts ?? 0) >= CODE_MAX_ATTEMPTS) {
    return { failure: 'too-many-attempts', ok: false }
  }

  // Stamped in the same write that hands back the token, so single-use is enforced by the database
  // rather than by the caller remembering to mark it.
  await payload.update({
    collection: 'verification-codes',
    data: { consumedAt: new Date().toISOString() },
    id: record.id,
    overrideAccess: true,
  })

  return { ok: true, token: record.token }
}
