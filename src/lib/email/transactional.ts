import { colorValue } from '@tokens/mapping'
import config from '@payload-config'
import { getPayload } from 'payload'

import { emailCopy } from '@/lib/auth/copy'

/**
 * Mail a customer must receive regardless of what they think of our marketing (spec 004, R2).
 *
 * **This module cannot see `marketingEmail`, and that is the design.** FR-035 requires that turning
 * marketing off never suppresses a verification code or a password-change notice. Written as one
 * send path with a consent check, that guarantee lasts exactly until somebody adds a fourth message
 * and forgets the conditional — and the failure mode is a customer who unsubscribed and can now
 * never reset their password. Two modules with no reference to each other cannot fail that way:
 * this one has no access to the flag, and `./marketing.ts` cannot send a message.
 *
 * Copy lives in `src/lib/auth/copy.ts` — see the note there on why these strings are code.
 *
 * **Colours are resolved from the design tokens, not written as hex.** Email is the one place that
 * cannot use a CSS custom property or a utility class — every serious mail client strips both, so
 * the value has to be inlined literally. Reading it through `colorValue` keeps Constitution III's
 * actual requirement intact anyway: change the token and the email follows, because the hex is
 * resolved from the same source the site is.
 */

const client = () => getPayload({ config })

const INK = colorValue('neutral-primary')
const MUTED = colorValue('neutral-secondary')
const BRAND = colorValue('primary-default')

const BODY_STYLE = `font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:${INK}`
const FOOTER_STYLE = `margin:0;font-size:13px;color:${MUTED}`
const CODE_STYLE = `margin:0 0 24px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;letter-spacing:8px;font-weight:600;color:${BRAND}`

/** Minimal, deliberately. An HTML email is a compatibility problem, not a design opportunity. */
function renderCodeEmail(body: string, code: string): string {
  return [
    `<div style="${BODY_STYLE}">`,
    `<p style="margin:0 0 24px">${escapeHtml(body)}</p>`,
    `<p style="${CODE_STYLE}">${escapeHtml(code)}</p>`,
    `<p style="${FOOTER_STYLE}">AURUM</p>`,
    '</div>',
  ].join('')
}

function renderNoticeEmail(body: string): string {
  return [
    `<div style="${BODY_STYLE}">`,
    `<p style="margin:0 0 24px">${escapeHtml(body)}</p>`,
    `<p style="${FOOTER_STYLE}">AURUM</p>`,
    '</div>',
  ].join('')
}

/**
 * Kept even though every string interpolated below is now a literal in this repository.
 *
 * It guards the one value that is not: the code. And the day somebody interpolates a customer's
 * name into a subject line, the escaping is already here rather than being the thing they forgot.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface BuiltEmail {
  html: string
  subject: string
}

/**
 * Built rather than sent, because these two messages leave by two different doors.
 *
 * At registration, Payload sends the verification mail itself — `verify.generateEmailHTML` hands it
 * HTML and it does the rest. On a resend there is no Payload operation to hook, so we send it. Both
 * paths must produce the same message, which they do by sharing this.
 *
 * Still `async`. The copy no longer needs fetching, but both call sites await these and one of them
 * is Payload's own `generateEmailHTML` hook, whose contract is a promise — narrowing the signature
 * would buy nothing and churn every caller.
 */
export async function buildVerificationEmail(code: string): Promise<BuiltEmail> {
  return {
    html: renderCodeEmail(emailCopy.verifyEmailBody, code),
    subject: emailCopy.verifyEmailSubject,
  }
}

export async function buildResetEmail(code: string): Promise<BuiltEmail> {
  return {
    html: renderCodeEmail(emailCopy.resetEmailBody, code),
    subject: emailCopy.resetEmailSubject,
  }
}

export async function sendVerificationCode(to: string, code: string): Promise<void> {
  const payload = await client()
  const { html, subject } = await buildVerificationEmail(code)
  await payload.sendEmail({ html, subject, to })
}

export async function sendResetCode(to: string, code: string): Promise<void> {
  const payload = await client()
  const { html, subject } = await buildResetEmail(code)
  await payload.sendEmail({ html, subject, to })
}

/**
 * Sent after a password changes, and never gated on anything.
 *
 * It is the mechanism by which somebody finds out their account has been taken, so it is the last
 * message in the system that should ever be suppressed. A failure to send is logged rather than
 * thrown: the password HAS changed by this point, and reporting failure to the customer who just
 * changed it would be a lie.
 */
export async function sendPasswordChangedNotice(to: string): Promise<void> {
  const payload = await client()

  try {
    await payload.sendEmail({
      html: renderNoticeEmail(emailCopy.passwordChangedBody),
      subject: emailCopy.passwordChangedSubject,
      to,
    })
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Failed to send password-changed notice' })
  }
}
