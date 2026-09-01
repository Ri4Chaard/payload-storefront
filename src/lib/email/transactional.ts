import { colorValue } from '@tokens/mapping'
import config from '@payload-config'
import { getPayload } from 'payload'

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
 * Copy comes from the `account` global, so an editor can rewrite any of it without a deploy
 * (Constitution I).
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
 * The strings are editor-authored, so they arrive as text and must not be able to become markup.
 * An editor typing an ampersand should not produce a broken entity, and an editor pasting a `<` is
 * not authoring HTML.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function copy() {
  const payload = await client()
  return payload.findGlobal({ slug: 'account', overrideAccess: true })
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
 */
export async function buildVerificationEmail(code: string): Promise<BuiltEmail> {
  const text = await copy()
  return {
    html: renderCodeEmail(text.verifyEmailBody ?? '', code),
    subject: text.verifyEmailSubject ?? 'Your verification code',
  }
}

export async function buildResetEmail(code: string): Promise<BuiltEmail> {
  const text = await copy()
  return {
    html: renderCodeEmail(text.resetEmailBody ?? '', code),
    subject: text.resetEmailSubject ?? 'Your password reset code',
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
    const text = await copy()
    await payload.sendEmail({
      html: renderNoticeEmail(text.passwordChangedBody ?? ''),
      subject: text.passwordChangedSubject ?? 'Your password was changed',
      to,
    })
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Failed to send password-changed notice' })
  }
}
