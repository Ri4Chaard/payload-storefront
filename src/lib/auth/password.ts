import { PASSWORD_MIN_LENGTH } from '@/lib/auth/config'

/**
 * What counts as a password we are willing to store (spec 004, FR-003).
 *
 * **Length and uniqueness, not composition.** No "one uppercase, one digit, one symbol" rule:
 * those reliably produce `Password1!`, push people towards reuse, and buy nothing against the only
 * attack that matters here — an offline crack of a stolen database, which is what Payload's
 * memory-hard hash is for. A long, unusual password is worth more than a short, decorated one.
 *
 * Pure and synchronous on purpose, so it can be unit-tested exhaustively and called from validation
 * without a round trip.
 */

export type PasswordProblem = 'too-short' | 'too-common' | 'contains-email'

/**
 * Passwords that a credential-stuffing list would try in its first few hundred guesses.
 *
 * A deliberately short list rather than a bundled breach corpus: the top entries are what actually
 * appear in real sign-ups, and a multi-megabyte dependency shipped to block the rest would be a
 * dependency to maintain for diminishing returns. Compared case-insensitively.
 */
const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password1',
  'password123',
  'qwertyui',
  'qwerty123',
  'iloveyou',
  'princess',
  'sunshine',
  'football',
  'baseball',
  'welcome1',
  'welcome123',
  'admin123',
  'letmein1',
  'monkey123',
  'abc12345',
  'passw0rd',
  'trustno1',
  'starwars',
  'whatever',
  'shopping1',
  'aurum1',
  'aurum123',
])

export interface PasswordCheck {
  ok: boolean
  problems: PasswordProblem[]
}

/**
 * `email` is optional and only used to refuse a password that is the customer's own address, or the
 * part of it before the `@`. It is the single most guessable password a shop account can have.
 */
export function checkPassword(password: string, email?: string): PasswordCheck {
  const problems: PasswordProblem[] = []

  if (password.length < PASSWORD_MIN_LENGTH) {
    problems.push('too-short')
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    problems.push('too-common')
  }

  if (email) {
    const normalized = password.toLowerCase()
    const address = email.toLowerCase().trim()
    const localPart = address.split('@')[0] ?? ''

    if (normalized === address || (localPart.length >= 3 && normalized === localPart)) {
      problems.push('contains-email')
    }
  }

  return { ok: problems.length === 0, problems }
}
