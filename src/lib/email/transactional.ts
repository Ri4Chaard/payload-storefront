import { createTranslator } from 'next-intl'

import { loadMessages } from '@/i18n/messages'

import { DEFAULT_LOCALE, type Locale } from '@/i18n/routing'
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
 * The three messages are written below rather than fetched. They are part of the mechanism, not
 * content: each one exists because a specific operation happened, and two of them carry a code that
 * only means anything for ten minutes.
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

/**
 * The words, in the language the request was made in (spec 010, FR-042).
 *
 * **The locale is an ARGUMENT, never inferred here.** `getTranslations({ locale })` is the one
 * place in this codebase that passes next-intl an explicit locale, and it is passed because this
 * code runs inside a Server Action, where `next/root-params` does not resolve — and where reading
 * `NEXT_LOCALE` would be wrong anyway, because a visitor who arrived on `/ru/create-account` from a
 * link has no cookie (research R13, contracts/i18n-modules.md §5).
 *
 * **FR-045: a missing translation may never stop a code being delivered.** It cannot, and not by
 * accident: `src/i18n/request.ts` merges English underneath every locale, so an untranslated key
 * resolves to the English sentence rather than throwing or rendering a key. Deleting a line from
 * `ru.json` costs a Russian sentence, never the mail.
 *
 * The code never appears in a subject line. Subjects show on lock screens and in notification
 * previews, which is a wider audience than the person holding the phone.
 */
/*
  **Built with `createTranslator` over `loadMessages`, not with `getTranslations`.**

  `getTranslations` reads next-intl's per-request configuration, which needs the `react-server`
  condition and a request scope. Neither is guaranteed here: this code runs inside Payload's
  `generateEmailHTML` hook, which is also reached from the admin panel and from scripts, and it is
  the one place in the codebase where the locale is already known explicitly. Asking a request-scoped
  API for something we were handed is a dependency with nothing to buy.

  It also makes this testable without a Next server around it — `getTranslations` throws
  "`getTranslations` is not supported in Client Components" under vitest, which is how this was
  found.
*/
function copy(locale: Locale): (key: string) => string {
  const messages = loadMessages(locale) as Record<string, Record<string, string>>
  const t = createTranslator({ locale, messages, namespace: 'email' })
  return (key: string) => t(key as Parameters<typeof t>[0])
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
export async function buildVerificationEmail(
  code: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<BuiltEmail> {
  const t = copy(locale)
  return {
    html: renderCodeEmail(t('verifyBody'), code),
    subject: t('verifySubject'),
  }
}

export async function buildResetEmail(
  code: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<BuiltEmail> {
  const t = copy(locale)
  return {
    html: renderCodeEmail(t('resetBody'), code),
    subject: t('resetSubject'),
  }
}

export async function sendVerificationCode(
  to: string,
  code: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<void> {
  const payload = await client()
  const { html, subject } = await buildVerificationEmail(code, locale)
  await payload.sendEmail({ html, subject, to })
}

export async function sendResetCode(
  to: string,
  code: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<void> {
  const payload = await client()
  const { html, subject } = await buildResetEmail(code, locale)
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
export async function sendPasswordChangedNotice(
  to: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<void> {
  const payload = await client()

  try {
    const t = copy(locale)
    await payload.sendEmail({
      html: renderNoticeEmail(t('passwordChangedBody')),
      subject: t('passwordChangedSubject'),
      to,
    })
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Failed to send password-changed notice' })
  }
}
