import type { Block } from 'payload'

import { mediaSlot } from '@/fields/media-slot'

/**
 * A numbered sequence — how a stone becomes a piece (spec 006, FR-012).
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
      admin: { description: 'Centred above the steps, e.g. “FROM DIAMOND TO JEWEL”.' },
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
        { name: 'title', type: 'text', required: true, label: 'Title', localized: true },
        { name: 'caption', type: 'text', label: 'Caption', localized: true },
      ],
    },
  ],
}
