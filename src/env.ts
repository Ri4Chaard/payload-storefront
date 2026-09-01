/**
 * Runtime environment validation (FR-006).
 *
 * A missing variable must fail startup with a message naming it — not with an obscure error three
 * layers down. Secrets are injected at runtime and never committed (Constitution VI).
 */

const REQUIRED = [
  'DATABASE_URI',
  'PAYLOAD_SECRET',
  'NEXT_PUBLIC_SERVER_URL',
  // Spec 004. Registration cannot complete without a verification code, and a verification code
  // cannot be sent without these — so a deployment missing them is broken in a way that only shows
  // up at a customer's first sign-up. Better to refuse to start.
  'RESEND_API_KEY',
  'EMAIL_FROM_ADDRESS',
] as const

type RequiredKey = (typeof REQUIRED)[number]

function read(): Record<RequiredKey, string> {
  const missing: string[] = []
  const values = {} as Record<RequiredKey, string>

  for (const key of REQUIRED) {
    const value = process.env[key]
    if (!value || value.trim() === '') {
      missing.push(key)
    } else {
      values[key] = value
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.\n` +
        `Copy .env.example to .env and fill in the listed values.`,
    )
  }

  return values
}

export const env = read()

/**
 * Send every message to one address instead of to the customer. Optional, and unset in production.
 *
 * This exists because the alternative is a staging database full of real addresses and a transport
 * that will happily mail all of them. A restored production dump on staging is the normal way that
 * happens, and it is not a mistake anyone gets to make twice. Resend's adapter implements the
 * redirect itself; this only decides whether to ask for it.
 */
export const emailOverrideRecipient = process.env.EMAIL_OVERRIDE_RECIPIENT?.trim() || undefined

/**
 * The name a customer sees in their inbox beside the address.
 *
 * Env rather than the Account global because the adapter is constructed inside `buildConfig`,
 * before any global can be read — and env rather than a constant so staging can say so in the
 * sender name rather than impersonating production.
 */
export const emailFromName = process.env.EMAIL_FROM_NAME?.trim() || 'Aurum'
