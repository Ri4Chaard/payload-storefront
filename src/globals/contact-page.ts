import type { GlobalConfig } from 'payload'

import { seoField } from '@/fields/seo'
import { isAdmin } from '@/lib/access'

/**
 * The `/contact` page (spec 008, FR-042, FR-046).
 *
 * **Flat grouped fields, not a blocks body — and that is a deliberate departure from `/about`.**
 * `story-page` is `blockReferences` because that page is seven bands whose order is genuinely the
 * editor's. This page has four, and two of them — the channel grid and the message form — are the
 * page's *purpose* rather than bands somebody would move. Modelled as blocks, the admin would offer
 * "delete the contact form from the contact page" and "put the FAQ above the headline" as
 * first-class actions, and every one of those arrangements is worse than the drawn one.
 * `src/globals/blog-page.ts` reached the same conclusion for the same reason, and 008/research.md
 * R1 records the alternative in full.
 *
 * **The requester described the page as "static texts", and this is what that means here.** Fixed
 * in structure, editable in content: Constitution I does not permit a user-visible string to live in
 * a component, so every word the page draws is a field below.
 *
 * **What is deliberately NOT here: the channel cards.** WhatsApp, Telegram, Instagram and the email
 * address are the `messengers` array and the `email` of `contact-settings`, already read by the
 * footer and the checkout modal. FR-008 forbids a second place to write them, and the structural
 * form of that rule is that this global has no field to write them into.
 *
 * **The defaults are content, not code.** A `defaultValue` applies until the global is first saved,
 * so a fresh install renders the drawn page rather than a blank one — and every string stays
 * something an editor can change without a deploy. The same mechanism `story-page` and `blog-page`
 * use, for the same reason.
 *
 * **No revalidation hook**, for the reason `src/collections/questions.ts` records at length: the
 * route is `force-dynamic`, so nothing is cached, and the shared `invalidate()` would evict every
 * product page in the shop over a paragraph edit.
 */
export const ContactPage: GlobalConfig = {
  slug: 'contact-page',
  label: 'Contact page',
  admin: {
    group: 'Content',
    description:
      'The /contact page. The four ways to reach you come from Shop → Contact settings; everything this page says is below.',
  },
  versions: { drafts: true },
  access: {
    // Public, exactly as `story-page` and `blog-page` are. Draft protection is the loader's
    // `draft: false`, not this rule — a global's drafts are a version query, not a row filter.
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      defaultValue: 'CONTACT US',
      label: 'Eyebrow',
      admin: { description: 'The small line above the headline, e.g. “CONTACT US”.' },
    },
    {
      name: 'heading',
      type: 'textarea',
      required: true,
      defaultValue: 'WE’RE HERE TO HELP',
      label: 'Headline',
      admin: { description: 'The page’s main statement.' },
    },
    {
      name: 'intro',
      type: 'textarea',
      defaultValue: 'Questions, custom requests, or styling advice — our team is here for you',
      label: 'Intro paragraph',
      admin: { description: 'One line under the headline.' },
    },
    {
      name: 'form',
      type: 'group',
      label: 'Send us a message',
      admin: {
        description: 'The message form: what it says, and the picture beside it.',
      },
      fields: [
        {
          name: 'heading',
          type: 'text',
          required: true,
          defaultValue: 'SEND US A MESSAGE',
          label: 'Heading',
        },
        {
          name: 'body',
          type: 'textarea',
          defaultValue:
            'To make an enquiry, please use the contact form below. Our Aurum team will be happy to assist you with diamonds, orders, delivery, or any other questions.',
          label: 'Intro paragraph',
        },
        /*
          The three labels are fields because FR-042 names them. They are short and unlikely to
          change, which is not the same as being a developer's business: "E-mail" versus "Email" is
          an editorial choice, and a shop that wants "Your name" should not need a deployment.
        */
        {
          name: 'nameLabel',
          type: 'text',
          required: true,
          defaultValue: 'Name',
          label: 'Name field label',
        },
        {
          name: 'emailLabel',
          type: 'text',
          required: true,
          defaultValue: 'E-mail',
          label: 'Email field label',
        },
        {
          name: 'messageLabel',
          type: 'text',
          required: true,
          defaultValue: 'Message',
          label: 'Message field label',
        },
        {
          name: 'submitLabel',
          type: 'text',
          required: true,
          defaultValue: 'SEND MESSAGE',
          label: 'Button label',
        },
        {
          name: 'footnote',
          type: 'text',
          /*
            The drawing reads “We’ll get back to you ass soon as possible.” — a typo, corrected here
            (FR-046). The drawing and the site now disagree by one letter, which is the right way
            round; T105 tells the designer.
          */
          defaultValue: 'We’ll get back to you as soon as possible.',
          label: 'Footnote',
          admin: { description: 'The small line under the button. Drawn only at desktop width.' },
        },
        {
          name: 'successMessage',
          type: 'textarea',
          required: true,
          defaultValue:
            'Thank you — your message has reached us. We’ll be in touch as soon as we can.',
          label: 'Confirmation message',
          admin: {
            description:
              'Shown in place of the form once a message is safely received. Say what happens next.',
          },
        },
        {
          name: 'errorMessage',
          type: 'textarea',
          required: true,
          defaultValue:
            'We couldn’t receive your message just now. Please try again, or reach us on WhatsApp, Telegram or Instagram.',
          label: 'Failure message',
          admin: {
            description:
              'Shown when the message could not be received at all. Point them at another way to reach you.',
          },
        },
        {
          name: 'photo',
          type: 'upload',
          relationTo: 'media',
          label: 'Photograph',
          admin: {
            description:
              'Sits beside the form on a desktop and beneath it on a phone. Its alternative text comes from the media library.',
          },
          /*
            A plain upload rather than `mediaSlot()`, which is the shared photo-or-video config
            (008/research.md R11). A video slot requires a poster still, so `mediaSlot` would ask
            the editor for two assets to place one photograph — and the drawing shows no video here.
            This is not a near-copy of that field: it is the simpler field `mediaSlot` is built on.
          */
        },
      ],
    },
    {
      name: 'faq',
      type: 'group',
      label: 'Questions',
      admin: {
        description: 'A few questions at the foot of the page. Write them in Content → FAQ first.',
      },
      fields: [
        {
          name: 'heading',
          type: 'text',
          required: true,
          defaultValue: 'Frequently Asked Questions',
          label: 'Heading',
        },
        {
          name: 'questions',
          type: 'relationship',
          relationTo: 'questions',
          hasMany: true,
          label: 'Questions',
          admin: {
            description:
              'Pick the questions this page shows, in the order you want them. Leave empty and the whole band disappears — a heading over nothing is worse than one band fewer.',
          },
          /*
            Named `questions` to match `src/blocks/faq.ts`'s field for the same concept —
            Constitution IV asks that one concept keep one field name across collections.

            **Row order is display order.** A `hasMany` relationship preserves the arrangement, so
            there is no position number two rows could share and nothing that can disagree with what
            the admin shows (FR-031) — the same reasoning `contact-settings.messengers` records.

            No default: the band ships absent, and appears once somebody chooses questions. That is
            FR-032 working rather than a gap.
          */
        },
      ],
    },
    seoField(),
  ],
}
