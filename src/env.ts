/**
 * Runtime environment validation (FR-006).
 *
 * A missing variable must fail startup with a message naming it — not with an obscure error three
 * layers down. Secrets are injected at runtime and never committed (Constitution VI).
 */

const REQUIRED = ['DATABASE_URI', 'PAYLOAD_SECRET', 'NEXT_PUBLIC_SERVER_URL'] as const

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
