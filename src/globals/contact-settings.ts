import type { GlobalConfig } from 'payload'

import { isAdmin } from '@/lib/access'
import { DEFAULT_CONTACT } from '@/lib/contact'
import { normaliseDestination, PLATFORM_LABELS, PLATFORMS, type Platform } from '@/lib/messengers/normalise'
import { revalidateGlobalOnChange } from '@/lib/revalidate'

/**
 * Where the shop's own messenger accounts live (spec 005, T045 – T047, FR-033 – FR-042).
 *
 * **The one schema change this feature makes.** The cart table, its `size` column and its foreign
 * key were landed by spec 003 and are already migrated; everything else spec 005 needs is code.
 *
 * **A third global rather than fields on `Shop`.** `Shop` is documented as shop-wide copy that is
 * not per-product, and every field on it is product-page accordion content; `AccountSettings` is
 * "how the accounts feature behaves — not what it says". Messenger destinations are neither. They
 * are the shop's identity, they are read by the chrome on every route, and `admin.group: 'Shop'`
 * puts the three configuration surfaces together without pretending they are one thing.
 *
 * **An array, not three named field groups.** FR-038 requires the owner to reorder the messengers,
 * and Payload's array field is what gives an editor drag handles. Row order *is* display order —
 * there is no `position` number two rows could share, and therefore no way for the list to
 * disagree with itself.
 *
 * **The destination is the raw account, never a built link** (FR-035, FR-036). An owner types the
 * phone number they say out loud and `src/lib/messengers/normalise.ts` reduces it to what `wa.me`
 * accepts. Storing a URL instead would move the formatting rules out of tested code and into a
 * text field somebody has to get right, which is the failure FR-039 exists to make impossible.
 *
 * **The shop's own email and phone live here too.** They were three hardcoded strings in
 * `src/lib/contact.ts`, and the number was written two different ways in two components — the
 * contact strip said `+1 (555) 010 20-30` and the footer said `+1 555 010 2030`, over a third form
 * hardcoded into the footer's `tel:`. One record now, with the dialling link derived from it, so
 * there is nothing left that can quietly disagree.
 */

const platformOptions = PLATFORMS.map((platform) => ({
  label: PLATFORM_LABELS[platform],
  value: platform,
}))

/**
 * The shipped wording. `{{items}}` is required; the other two are optional.
 *
 * Written as a request rather than an order, because that is what it is (FR-025): the site takes no
 * money and the seller confirms availability and price in the conversation this message opens.
 */
export const DEFAULT_MESSAGE_TEMPLATE = `Hello Aurum, I would like to order:

{{items}}

Total: {{total}}

{{customer}}`

export const ContactSettings: GlobalConfig = {
  slug: 'contact-settings',
  label: 'Contact settings',
  admin: {
    group: 'Shop',
    description:
      'How customers reach the shop: the email and phone shown across the site, the messengers offered when they finish an order, and what their message says. Changes appear on the storefront immediately — no deployment.',
  },
  /**
   * Stated explicitly, never left to the default (Constitution IV).
   *
   * `read` is public because these values are shown to every visitor who opens the handoff modal
   * and, after the chrome migration, in the footer of every page. `update` is admin-only: a
   * customer session must never be able to redirect the shop's own orders (FR-041).
   */
  access: {
    read: () => true,
    update: isAdmin,
  },
  hooks: {
    // A saved change has to reach cached pages without a deployment (FR-042) — and after the chrome
    // reads these too, that includes every prerendered product page.
    afterChange: [revalidateGlobalOnChange],
  },
  fields: [
    /**
     * The email and the phone the chrome draws (the contact strip, the footer, the mobile menu).
     *
     * Here rather than in `src/lib/contact.ts`, where they were three hardcoded strings, for the
     * same reason the messenger destinations moved: a shop's own phone number is not a code change.
     * They sit above the messengers because they are the two an owner is most likely to edit.
     */
    {
      name: 'email',
      type: 'email',
      defaultValue: DEFAULT_CONTACT.email,
      label: 'Email address',
      admin: {
        description:
          'Shown in the contact strip, the footer and the mobile menu, and offered in the checkout modal when a customer would rather write.',
      },
    },
    {
      name: 'phone',
      type: 'text',
      defaultValue: DEFAULT_CONTACT.phone,
      label: 'Phone number',
      admin: {
        description:
          'Written however you like — “+1 (555) 010 20-30” is fine. The tap-to-call link is built from it, so there is nothing else to keep in step.',
      },
      /**
       * A number nobody can dial is worse than no number: it looks like a way to reach the shop.
       * Eight digits is the shortest national number with a country code; fifteen is E.164's own
       * ceiling. An empty field is allowed — that is "we do not publish a number", and the reader
       * falls back rather than rendering a dead link.
       */
      validate: (value: unknown) => {
        if (typeof value !== 'string' || value.trim() === '') return true
        const digits = value.replace(/\D/g, '')
        return digits.length >= 8 && digits.length <= 15
          ? true
          : 'That does not look like a phone number with a country code. Write it as you would say it — “+1 (555) 010 20-30”.'
      },
    },
    {
      name: 'messengers',
      type: 'array',
      label: 'Messengers',
      admin: {
        description:
          'The platforms offered when a customer completes their order. Drag to reorder — customers see them in this order.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'platform',
          type: 'select',
          options: platformOptions,
          required: true,
          label: 'Platform',
          admin: { description: 'Which service this row opens.' },
        },
        {
          name: 'destination',
          type: 'text',
          required: true,
          label: 'Account',
          admin: {
            description:
              'WhatsApp: the phone number, written however you like — “+1 (555) 010 20-30” is fine. Telegram and Instagram: the username, with or without the @.',
          },
          /**
           * The save is refused and the field is named (FR-039), so the modal can never draw a row
           * that leads nowhere.
           *
           * **Only when the row is offered.** An owner may park a half-filled messenger with the
           * checkbox clear and come back to it; validating an unticked row would make that
           * impossible and teach them to delete rows instead of hiding them.
           */
          validate: (value: unknown, { siblingData }: { siblingData: unknown }) => {
            const sibling = (siblingData ?? {}) as { enabled?: unknown; platform?: unknown }
            if (sibling.enabled === false) return true

            const platform = sibling.platform as Platform | undefined
            if (!platform) return 'Choose a platform first.'

            const result = normaliseDestination(platform, typeof value === 'string' ? value : '')
            return result.ok ? true : result.error
          },
          hooks: {
            /**
             * Normalised on the way in, so the database holds one shape however it was typed.
             *
             * Doing it here rather than in the reader means the value an owner sees after saving is
             * the value that will be used — a field that silently accepts one thing and uses
             * another is how a destination gets "fixed" twice and broken once.
             */
            beforeValidate: [
              ({ siblingData, value }) => {
                const sibling = (siblingData ?? {}) as { platform?: unknown }
                const platform = sibling.platform as Platform | undefined
                if (!platform || typeof value !== 'string') return value

                const result = normaliseDestination(platform, value)
                return result.ok ? result.value : value
              },
            ],
          },
        },
        {
          name: 'handle',
          type: 'text',
          required: true,
          label: 'Displayed handle',
          admin: {
            description:
              'What customers see beneath the platform name, e.g. “@aurum”. This is a label — it does not have to match the account above.',
          },
        },
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: true,
          label: 'Offer this messenger',
          admin: {
            description: 'Untick to hide the row from customers without losing the account details.',
          },
        },
      ],
    },
    {
      name: 'messageTemplate',
      type: 'textarea',
      defaultValue: DEFAULT_MESSAGE_TEMPLATE,
      label: 'Message wording',
      admin: {
        description:
          'The message customers arrive with. {{items}} is replaced by their selection, {{total}} by the total, and {{customer}} by their name and delivery address when they are signed in and have saved them — it disappears when they have not. Leave {{items}} in, or the seller receives an empty request.',
        rows: 10,
      },
      /**
       * A template without `{{items}}` produces a message naming nothing the customer wanted
       * (FR-040). Refused rather than repaired: silently appending the items would leave the owner
       * believing the wording they wrote is the wording being sent.
       */
      validate: (value: unknown) => {
        if (typeof value !== 'string' || value.trim() === '') return true
        return value.includes('{{items}}')
          ? true
          : 'Leave {{items}} in the message, or the seller receives a request with nothing in it.'
      },
    },
  ],
}
