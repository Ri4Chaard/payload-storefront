import type { Block } from 'payload'

import { mediaSlot } from '@/fields/media-slot'

/**
 * The band that says what the shop is about, in detail (spec 006, FR-010).
 *
 * Drawn at nodes `205:1870` / `413:7680` / `413:7985`: a paragraph, a wrapping row of subject
 * chips, three figures — a word over a caption — and a media panel beside them at desktop, beneath
 * them on a phone.
 *
 * **Every list here is open-ended, including empty.** The drawing shows six chips at desktop and
 * four on mobile, which is layout fill rather than a rule; the mobile frame simply had less room.
 * So the chip row takes any number and wraps, and disappears entirely at zero rather than reserving
 * its height (spec Edge Cases). The same goes for the figures.
 *
 * A figure is a `word` and a `caption` — `CERTIFIED` over `selected diamonds` — and not a number
 * and a unit. Nothing here is a statistic, and modelling it as one would invite an editor to type
 * “99%” into a field designed for “EXCEPTIONAL”.
 */
export const closerLook: Block = {
  slug: 'closer-look',
  labels: { singular: 'Detail band', plural: 'Detail bands' },
  fields: [
    {
      name: 'body',
      type: 'textarea',
      label: 'Paragraph',
      admin: { description: 'The band’s main copy.' },
    },
    {
      name: 'chips',
      type: 'array',
      label: 'Subject labels',
      labels: { singular: 'Label', plural: 'Labels' },
      admin: {
        description: 'Small pills beneath the paragraph. Any number, or none — the row wraps.',
      },
      fields: [{ name: 'label', type: 'text', required: true, label: 'Text' }],
    },
    {
      name: 'figures',
      type: 'array',
      label: 'Figures',
      labels: { singular: 'Figure', plural: 'Figures' },
      admin: { description: 'A word over a caption, e.g. “CERTIFIED” / “selected diamonds”.' },
      fields: [
        { name: 'word', type: 'text', required: true, label: 'Word' },
        { name: 'caption', type: 'text', required: true, label: 'Caption' },
      ],
    },
    mediaSlot({ label: 'Side media', description: 'Sits beside the copy at desktop, below it on a phone.' }),
  ],
}
