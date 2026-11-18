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
 * A figure is a `word` and a `caption` — `CERTIFIED` over `selected materials` — and not a number
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
      localized: true,
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
      /*
        **Required, but not in every language** (spec 010, T110).

        A row in this array is shared across all three locales — arrays are not localized, the words
        inside them are — so a `required` localized child has to be filled in EVERY language before
        the document can be saved in ANY of them. An editor who opened a product in Russian to change
        its title met "This field is required" on a row they had not touched, and could not save at
        all. The seed script hit it first, which is the only reason it was found before an editor
        did.

        Dropping `required` restores the intent: the row must have a value, and the English one is
        what every other language falls back to until somebody translates it.
      */
      fields: [{ name: 'label', type: 'text', label: 'Text', localized: true }],
    },
    {
      name: 'figures',
      type: 'array',
      label: 'Figures',
      labels: { singular: 'Figure', plural: 'Figures' },
      admin: { description: 'A word over a caption, e.g. “QUALITY” / “in every detail”.' },
      /*
        `word` is localized for the same reason `caption` is: it is copy, not a key. Left shared, it
        was one value across all three locales, so saving the page in Russian rewrote the English
        word and the other way round. Not `required`, for the reason the chip label above records —
        a required localized child in an array blocks saving in every language until all are filled.
      */
      fields: [
        { name: 'word', type: 'text', label: 'Word', localized: true },
        { name: 'caption', type: 'text', label: 'Caption', localized: true },
      ],
    },
    mediaSlot({ label: 'Side media', description: 'Sits beside the copy at desktop, below it on a phone.' }),
  ],
}
