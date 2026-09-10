import { colorValue } from '@tokens/mapping'
import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * Telling the shop somebody wrote (spec 008, T052, contracts/enquiry-action.md §6).
 *
 * **This is a notification, not a receipt.** The enquiry is already in the database by the time
 * anything here runs, and whether this succeeds decides nothing about what the visitor is told —
 * `src/lib/contact/actions.ts` records the ordering and why it is that way round. A failure here
 * costs the owner an email, not the customer their message.
 *
 * **Its own module rather than a fourth message in `./transactional.ts`.** That file's whole design
 * is that it "cannot see `marketingEmail`" — three messages a customer must receive regardless of
 * consent, kept apart from anything that could suppress them. This is a different kind of mail
 * entirely: it goes to the shop, not to a customer, and it carries text an anonymous stranger
 * typed. Putting it in there would blur the one boundary that module exists to hold.
 *
 * **Every interpolated value is attacker-controlled**, which is new for this codebase.
 * `transactional.ts` kept its `escapeHtml` "for the day somebody interpolates a customer's name
 * into a subject line"; this is that day, three times over. The subject is fixed and carries none
 * of it.
 */

const client = () => getPayload({ config })

const INK = colorValue('neutral-primary')
const MUTED = colorValue('neutral-secondary')

const BODY_STYLE = `font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:${INK}`
const LABEL_STYLE = `margin:0 0 4px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:${MUTED}`
const VALUE_STYLE = 'margin:0 0 20px'
const FOOTER_STYLE = `margin:0;font-size:13px;color:${MUTED}`

/**
 * The same escaping `transactional.ts` performs, and for a sharper reason.
 *
 * Duplicated rather than exported from there because that module is deliberately isolated, and
 * making it a shared utility would give a future change a reason to import the rest of it. Six
 * lines is cheaper than that coupling — and Constitution II's rule is about components and field
 * configs, not about refusing to write `replace` twice in two modules that must not know about each
 * other.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Newlines survive as line breaks; everything else is inert text. */
function paragraphs(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br />')
}

/**
 * The subject is fixed, and carries **no** visitor text.
 *
 * A subject line shows on a lock screen and in a notification preview, and it is the one part of a
 * message a mail client is most likely to render somewhere unexpected. The name is in the body,
 * where the whole message already is.
 */
const SUBJECT = 'New enquiry from the Aurum contact form'

export interface EnquiryNotification {
  name: string
  email: string
  message: string
}

function render({ name, email, message }: EnquiryNotification): string {
  return [
    `<div style="${BODY_STYLE}">`,
    `<p style="${LABEL_STYLE}">From</p>`,
    `<p style="${VALUE_STYLE}">${escapeHtml(name)}</p>`,
    `<p style="${LABEL_STYLE}">Email</p>`,
    `<p style="${VALUE_STYLE}">${escapeHtml(email)}</p>`,
    `<p style="${LABEL_STYLE}">Message</p>`,
    `<p style="${VALUE_STYLE}">${paragraphs(message)}</p>`,
    `<p style="${FOOTER_STYLE}">Reply to this email to answer ${escapeHtml(name)} directly.</p>`,
    '</div>',
  ].join('')
}

/**
 * Send it, and let the caller decide what a failure means.
 *
 * **Throws rather than swallowing**, unlike `sendPasswordChangedNotice`, and the difference is
 * deliberate: there, nothing could be done with the failure, so logging it was the end of it. Here
 * the outcome is stored on the enquiry and shown in the admin (FR-029c), so the caller needs to
 * know — an owner who can see "we never told you about this one" can act on it.
 *
 * `replyTo` is a real header, not a convention about the body:
 * `@payloadcms/email-resend/dist/index.js:51` maps it onto Resend's `reply_to`. The address is in
 * the body as well, so the mail is still useful if a client ignores it.
 */
export async function sendEnquiryNotification(
  to: string,
  enquiry: EnquiryNotification,
): Promise<void> {
  const payload = await client()

  await payload.sendEmail({
    to,
    replyTo: enquiry.email,
    subject: SUBJECT,
    html: render(enquiry),
  })
}
