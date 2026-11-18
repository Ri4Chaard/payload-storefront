/**
 * How long a cart is kept.
 *
 * A cart is a record of what somebody wants, tied either to their account or to their device. It is
 * a data collection point, and it therefore needs a stated life and a working deletion path — the
 * one part of this feature that "no payment" does not simplify away.
 *
 * **Configuration, not constants**. A retention period that exists only in a source file
 * is one nobody outside this repository can read or change, which is most of the point of stating
 * one. The environment is the smallest surface that satisfies it without inventing an admin screen
 * nobody asked for; the defaults below are what ships.
 *
 * **Thirty days for a guest, and that is not arbitrary**: `aurum-cart` expires on the same clock,
 * so past thirty days the row is unreachable by anybody — keeping it would be keeping a secret
 * nobody can spend. Twelve months for a customer's, which is long enough that a cart is still there
 * when somebody comes back for it, and bounded so the table cannot grow without end.
 */

const DAY = 24 * 60 * 60 * 1000

function period(name: string, fallbackDays: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallbackDays * DAY

  const days = Number(raw)
  // A misconfigured value falls back rather than throwing: the alternative is a nightly job that
  // stops running, which is silent, against a retention window that is a little wrong, which is not.
  if (!Number.isFinite(days) || days <= 0) {
    console.warn(`${name} is not a positive number of days; using ${fallbackDays}.`)
    return fallbackDays * DAY
  }

  return days * DAY
}

/** FR-047. Matches `CART_COOKIE_MAX_AGE` in `./cookie.ts` — see the note there. */
export const GUEST_CART_TTL_MS = period('CART_GUEST_RETENTION_DAYS', 30)

/** FR-048. */
export const CUSTOMER_CART_TTL_MS = period('CART_CUSTOMER_RETENTION_DAYS', 365)
