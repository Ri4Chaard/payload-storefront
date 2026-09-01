import type { PayloadRequest } from 'payload'

/**
 * Turning Payload's verification link into our six-digit code (spec 004, research R3).
 *
 * Payload's email verification is link-based: it mints a token and hands `generateEmailHTML` the
 * job of wrapping it in a URL. This is the single point where that becomes a code instead — the
 * token is minted and owned by Payload exactly as before, and we mint six digits that stand for it.
 *
 * **This function has a side effect, which a template function normally should not.** Writing the
 * code row here is deliberate and it is the reason the comment exists: `generateEmailHTML` is the
 * only hook Payload offers that receives the token at send time, so it is the only place the alias
 * can be created without reading the hidden `_verificationToken` back out of the database
 * afterwards. Do not mistake it for a pure renderer.
 *
 * **The imports are dynamic, and that is not stylistic either.** `payload.config.ts` imports the
 * `customers` collection, which imports this module; `codes.ts` imports the config to get a client.
 * Statically that is a cycle through the config, resolved only by evaluation order. Deferring the
 * import to call time removes the question rather than relying on it.
 */

interface GenerateArgs {
  req: PayloadRequest
  token: string
  user: { email: string; id: number | string }
}

export async function generateVerificationEmailHTML({
  req,
  token,
  user,
}: GenerateArgs): Promise<string> {
  const { issueCode } = await import('@/lib/auth/codes')
  const { buildVerificationEmail } = await import('@/lib/email/transactional')

  const issued = await issueCode(user.email, 'verify-email', token, {
    // Reached once per new account, and account creation is itself the limit. See issueCode.
    bypassThrottle: true,
    customerId: user.id,
    // This runs inside the create transaction — without `req` the row cannot see the customer.
    req,
  })

  if (!issued.ok) {
    // Unreachable with the bypass, but an email containing no code is worse than a failed send:
    // the customer would sit staring at six empty boxes with nothing to type into them.
    throw new Error('Could not issue a verification code')
  }

  const { html } = await buildVerificationEmail(issued.code)
  return html
}

export async function generateVerificationEmailSubject(): Promise<string> {
  const { buildVerificationEmail } = await import('@/lib/email/transactional')
  // The code is not in the subject line. Subjects are shown on lock screens and in notification
  // previews, which is a wider audience than the person holding the phone.
  const { subject } = await buildVerificationEmail('')
  return subject
}
