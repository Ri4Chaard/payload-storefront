import type { Block } from 'payload'

import { mediaSlot } from '@/fields/media-slot'

/**
 * A numbered sequence — how raw material becomes a product (spec 006, FR-012).
 *
 * Drawn at nodes `312:6940` / `413:7725` / `413:8024`: a centred heading over three tiles, each a
 * picture with an ordinal, a title and a caption. Three across at desktop and tablet, stacked on a
 * phone.
 *
 * **There is no ordinal field, on purpose.** The `01` / `02` / `03` is the row's position, not
 * something an editor types (FR-012). A number field here would eventually hold a list running
 * 1, 2, 2 — and the fix for that is to not offer the mistake.
 *
 * The drawing shows three steps and the model caps nothing. Two is a shorter band; five wraps to a
 * second row. A layout that only works at exactly three would be a layout that breaks the first
 * time somebody adds a step.
 */
export const processSteps: Block = {
  slug: 'process-steps',
  labels: { singular: 'Numbered steps', plural: 'Numbered steps' },
  fields: [
    {
      name: 'heading',
      type: 'text',
      localized: true,
      required: true,
      label: 'Heading',
      admin: { description: 'Centred above the steps, e.g. “HOW IT WORKS”.' },
    },
    {
      name: 'steps',
      type: 'array',
      label: 'Steps',
      labels: { singular: 'Step', plural: 'Steps' },
      admin: {
        description: 'Numbered in the order they appear here — drag to renumber them.',
      },
      fields: [
        mediaSlot({ label: 'Picture', description: 'The tile above the step’s title.' }),
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
        { name: 'title', type: 'text', label: 'Title', localized: true },
        { name: 'caption', type: 'text', label: 'Caption', localized: true },
      ],
    },
  ],
}
