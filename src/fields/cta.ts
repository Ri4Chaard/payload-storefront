import type { Field } from 'payload'

/**
 * An optional call to action — a label and where it goes (spec 006, FR-011, FR-013).
 *
 * Shared rather than repeated. Constitution II names repeated field groups as the thing that must
 * become a reusable config, and two blocks need this one: the banner's "EXPLORE THE COLLECTION"
 * and the FAQ band's "CONTACT US".
 *
 * **Both halves are optional, and both empty means no button.** The design draws a button on the
 * Standard banner and none on "Crafted to last" — one block, two uses (FR-048) — so absence has to
 * be expressible rather than worked around with an empty label that renders an empty control.
 *
 * **The destination is the editor's, including when it is wrong.** A CTA pointing at a page that
 * does not exist yet is an editing mistake to make visible, not a crash to guard against: the
 * footer has shipped a link to `/faq` since spec 001 and the site is none the worse for it.
 */
export const ctaField = (): Field => ({
  name: 'cta',
  type: 'group',
  label: 'Button',
  admin: {
    description: 'Leave both fields empty for a band with no button.',
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      localized: true,
      label: 'Button text',
      admin: { description: 'e.g. “EXPLORE THE COLLECTION”. Empty means no button.' },
    },
    {
      name: 'href',
      type: 'text',
      label: 'Button link',
      admin: { description: 'Where the button goes, e.g. /all-jewelry.' },
    },
  ],
})
