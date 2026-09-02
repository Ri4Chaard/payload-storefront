import { createHmac, timingSafeEqual } from 'node:crypto'

import { RESET_HANDLE_TTL_MS } from '@/lib/auth/config'
import { env } from '@/env'

/**
 * The thing the browser holds between "the code was right" and "here is my new password"
 * (spec 004, contracts/auth-actions.md).
 *
 * **The reset flow is two screens, so something has to survive the gap.** The obvious candidate is
 * Payload's reset token — it is right there, `verifyResetCode` has just resolved it, and putting it
 * in a hidden field would work. It would also mean shipping a live password-reset credential into
 * the DOM, where an extension, a screenshot, a bug report or a `next`-style URL leak can carry it
 * off. Anyone holding it can set that account's password without the code.
 *
 * So the browser gets a *reference* instead: which code row, until when, signed. Redeeming it means
 * looking the row up again on the server, which is the only place the token ever exists.
 *
 * **HMAC rather than encryption**, for the same reason `codes.ts` uses a keyed digest rather than a
 * slow hash: there is nothing secret in `{ recordId, expiresAt }` — a row id is not a credential.
 * What must be impossible is *forging* a pair, and a MAC is exactly the primitive for that.
 *
 * **The expiry is inside the signed payload, not alongside it.** An expiry the client can edit is
 * not an expiry. It is signed with the id, so changing either invalidates both.
 *
 * Pure: no Payload import, no database. That keeps it unit-testable and keeps `codes.ts` the only
 * module that reads the codes collection.
 */

/** `<recordId>.<expiresAt>.<signature>` — opaque to the browser, trivially parsed here. */
const SEPARATOR = '.'

export type OpenedHandle = { ok: false; reason: 'expired' | 'malformed' } | { ok: true; recordId: number }

function sign(body: string): string {
  return createHmac('sha256', env.PAYLOAD_SECRET).update(`reset-handle:${body}`).digest('hex')
}

/**
 * Constant-time, and length-guarded first because `timingSafeEqual` throws on a length mismatch
 * rather than returning false — an attacker supplying a short signature would get an exception
 * instead of a rejection, which is a different code path and therefore a different response time.
 */
function signaturesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex')
  const right = Buffer.from(b, 'hex')
  if (left.length === 0 || left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function mintResetHandle(recordId: number, now: number = Date.now()): string {
  const body = `${recordId}${SEPARATOR}${now + RESET_HANDLE_TTL_MS}`
  return `${body}${SEPARATOR}${sign(body)}`
}

/**
 * Verify and unpack. The signature is checked BEFORE the expiry, so a forged handle is refused as
 * malformed rather than being told how stale it is.
 */
export function openResetHandle(handle: string, now: number = Date.now()): OpenedHandle {
  const parts = handle.split(SEPARATOR)
  if (parts.length !== 3) return { ok: false, reason: 'malformed' }

  const [rawId, rawExpiry, signature] = parts as [string, string, string]
  if (!signaturesMatch(sign(`${rawId}${SEPARATOR}${rawExpiry}`), signature)) {
    return { ok: false, reason: 'malformed' }
  }

  const recordId = Number(rawId)
  const expiresAt = Number(rawExpiry)
  // Signed, so these cannot have been tampered with — but a signature over nonsense is still
  // nonsense, and `Number('')` is 0.
  if (!Number.isInteger(recordId) || recordId <= 0 || !Number.isFinite(expiresAt)) {
    return { ok: false, reason: 'malformed' }
  }

  if (expiresAt <= now) return { ok: false, reason: 'expired' }

  return { ok: true, recordId }
}
