import type { CollectionConfig } from 'payload'

import { DEFAULT_LOCALE, LOCALES, LOCALE_LABELS } from '@/i18n/routing'
import { isAdmin } from '@/lib/access'
import { ENQUIRY_MAX, ENQUIRY_RETENTION_DAYS } from '@/lib/contact/config'

/**
 * What a visitor wrote in the contact form.
 *
 * **The site's first public data-collection point**, which is why almost every decision below is a
 * Constitution VI decision rather than a modelling one.
 *
 * **The record is the receipt, and that is the whole reason this collection exists.** The brief
 * asked only that the form "always send message to the email". Storing it as well was the answer to
 * the spec's one clarification, and it moved where the acknowledgement comes from: a visitor is
 * told their message arrived because a row was written, not because a third-party mail API returned
 * 200. A mail outage now costs the shop a notification rather than a customer's message. See
 * `src/lib/contact/actions.ts` for the ordering that makes that true.
 *
 * **`createdAt` IS "when it arrived".** Payload writes it, it is indexed, and it is what the
 * retention purge cuts on. A second `receivedAt` field would be a value that can disagree with it,
 * and the one nobody looks at is always the one that drifts.
 *
 * **Nothing here is editable, including by an administrator.** `update` is refused outright and
 * every field is `admin.readOnly`. What the visitor wrote is a record of what they wrote;
 * a correspondence log an owner can rewrite is not a log. The two writes this collection does take
 * — the create, and the notification outcome immediately after — go through the Local API with
 * `overrideAccess: true`, the construction `src/collections/verification-codes.ts` uses and
 * documents at length.
 *
 * **No `afterChange` revalidation hook, deliberately.** Every other content collection here carries
 * one, and copying it would have been the unthinking move. `src/lib/revalidate.ts` invalidates by
 * walking every product slug — so a hook here would let any visitor evict the entire catalogue by
 * submitting the contact form. This is the same reasoning `src/collections/questions.ts` records,
 * with a sharper edge: there, a typo fix cost the catalogue; here, an anonymous request would.
 *
 * **Never joined to a customer account**, even where the address matches one. An enquiry
 * is correspondence, not profile data, and a relationship would widen who can see it the moment
 * anything renders a customer's own record.
 */
export const Enquiries: CollectionConfig = {
  slug: 'enquiries',
  labels: { singular: 'Enquiry', plural: 'Enquiries' },
  // Top-level, not an admin option — `admin.defaultSort` type-checks nowhere, as
  // `src/collections/article-categories.ts` also records. Newest first is FR-029c's "at a glance".
  defaultSort: '-createdAt',
  admin: {
    useAsTitle: 'name',
    /*
      FR-029c: who wrote, their address, whether we told anyone, and when — all without opening a
      record. The notification column is the one that earns its place: it is how an owner finds the
      enquiries they were never emailed about.
    */
    defaultColumns: ['name', 'email', 'notification', 'createdAt'],
    group: 'Shop',
    description: `Messages sent through the contact form. Read-only — what a visitor wrote is kept as they wrote it. Deleted automatically after ${ENQUIRY_RETENTION_DAYS} days, and deleting one here is how a request to be forgotten is answered.`,
  },
  access: {
    /*
      Refused to everyone, in both directions that create data. The form's server action is the only
      writer and it uses `overrideAccess: true`, so "an enquiry can only arrive through the contact
      form" is a property of the architecture rather than a rule somebody has to enforce on a
      public endpoint.
    */
    create: () => false,
    update: () => false,
    /*
      Admin-only, NOT `isAuthenticated`. A customer must not read enquiries — including ones they
      sent themselves, which is the case that looks harmless and is not: it would turn an email
      address into a way to read whatever was written from it.
    */
    read: isAdmin,
    // The erasure path. Reachable by a person, not only by the nightly purge.
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: ENQUIRY_MAX.name,
      label: 'Name',
      admin: { readOnly: true, description: 'As the visitor typed it.' },
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      index: true,
      label: 'Email address',
      admin: {
        readOnly: true,
        description: 'Replies to the notification go here. Indexed — the form’s rate limit counts on it.',
      },
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
      maxLength: ENQUIRY_MAX.message,
      label: 'Message',
      admin: { readOnly: true, rows: 10 },
    },
    {
      /*
        The language the enquiry arrived in.

        Recorded rather than inferred, and NOT localized — it is a fact about one submission, like
        the sender's address. The acknowledgement is sent in it and the messenger handoff carries it,
        so the shop answers a Ukrainian enquiry in Ukrainian instead of guessing from the prose.

        `readOnly`, like every other field a visitor filled in: an admin editing it would be
        rewriting history.
      */
      name: 'locale',
      type: 'select',
      required: true,
      defaultValue: DEFAULT_LOCALE,
      options: LOCALES.map((code) => ({ label: LOCALE_LABELS[code].label, value: code })),
      label: 'Language',
      admin: {
        readOnly: true,
        description: 'The language the sender was reading the site in when they wrote.',
      },
    },
    {
      name: 'notification',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Sent', value: 'sent' },
        { label: 'Failed', value: 'failed' },
      ],
      label: 'Notification',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description:
          'Whether the email telling you about this reached you. “Failed” means the message is safe here but nobody was told — it is worth answering.',
      },
      /*
        `pending` is not a spare option. The row is written before the mail is attempted, so a crash
        between the two leaves a legible state rather than a nullable field or a lie in either
        direction.
      */
    },
    {
      name: 'notificationError',
      type: 'text',
      label: 'Why it failed',
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: (data) => data?.notification === 'failed',
      },
    },
    {
      name: 'senderHash',
      type: 'text',
      index: true,
      label: 'Sender key',
      admin: {
        readOnly: true,
        hidden: true,
        description: 'Used only to rate-limit the form.',
      },
      /*
        A keyed digest of the client address, never the address itself — see
        `src/lib/contact/throttle.ts` for why a hash is both sufficient and the smaller thing to
        hold. It dies with the row it is on, so it inherits the retention policy rather than needing
        one of its own.
      */
    },
  ],
}
