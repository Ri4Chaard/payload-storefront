import { localeFromContext } from '@/i18n/locale-context'
import type { PayloadRequest } from 'payload'

/**
 * Turning Payload's password-reset link into our six-digit code.
 *
 * The sibling of `./verification-email.ts`, and the same trick: Payload mints the reset token and
 * owns every state transition; `generateEmailHTML` is the one hook that sees the token at send
 * time, so it is where six digits get minted to stand for it. The dynamic imports are for the same
 * reason too — `payload.config.ts` → `customers` → this module, and `codes.ts` imports the config.
 *
 * **Wiring this also closes a hole that has nothing to do with our screens.** Payload exposes
 * `POST /api/customers/forgot-password` for every auth collection, and its default email contains a
 * link to `/admin/reset/<token>` — the admin panel, which customers cannot use and must never be
 * pointed at. Without this hook that endpoint mails customers a broken, credential-bearing URL.
 * With it, every path through `forgotPassword` produces the same code email our own screens do.
 *
 * **The throttle is enforced by throwing, and the throw is the mechanism rather than an oversight.**
 * `payload.forgotPassword` rotates `resetPasswordToken` on the customer BEFORE calling this, all
 * inside one transaction. Refusing quietly and returning some HTML would leave that rotation
 * committed — and a rotated token orphans the code the customer is holding from the email that
 * arrived a minute ago, so the digits they type would be refused for reasons no message could
 * explain. Throwing rolls the rotation back with it. `requestPasswordReset` catches it and answers
 * exactly as it answers everything else.
 */

/**
 * Every field is optional, and that is Payload's own signature rather than defensiveness on our
 * part — `GenerateForgotPasswordEmailHTML` declares the whole argument object as possibly
 * undefined. The operation always passes all three, so the guard below is unreachable; it is here
 * because the alternative is a non-null assertion, which would be a lie of the same size.
 */
interface GenerateArgs {
  req?: PayloadRequest
  token?: string
  user?: { email?: string; id?: number | string }
}

export async function generateResetEmailHTML(args?: GenerateArgs): Promise<string> {
  const { req, token, user } = args ?? {}
  if (!req || !token || !user?.email) {
    throw new Error('Reset email generated without a token')
  }

  const { issueCode } = await import('@/lib/auth/codes')
  const { buildResetEmail } = await import('@/lib/email/transactional')

  const issued = await issueCode(user.email, 'reset-password', token, {
    // No `bypassThrottle`. Unlike registration this endpoint can be hit repeatedly for any address
    // an attacker names, so it is precisely the mail cannon the cooldown and hourly ceiling exist
    // to stop.
    customerId: user.id,
    // Joins the forgotPassword transaction, so the code row and the token rotation commit together
    // or not at all.
    req,
  })

  if (!issued.ok) {
    throw new Error(`Reset code throttled (${issued.throttled})`)
  }

  const { html } = await buildResetEmail(issued.code, localeFromContext(req?.context))
  return html
}

export async function generateResetEmailSubject(args?: GenerateArgs): Promise<string> {
  const { buildResetEmail } = await import('@/lib/email/transactional')
  // No code in the subject: subjects appear on lock screens and in notification previews.
  const { subject } = await buildResetEmail('', localeFromContext(args?.req?.context))
  return subject
}
