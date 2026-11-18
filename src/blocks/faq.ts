import type { Block } from 'payload'

import { ctaField } from '@/fields/cta'

/**
 * The questions band.
 *
 * Drawn at nodes `310:6776` / `413:7754` / `413:8053`: a heading, an intro paragraph and a button
 * beside a column of expandable questions.
 *
 * **The questions are chosen, not owned.** This block holds a relationship to the `questions`
 * collection — never a copy of their text — which is what makes the shared model real rather than
 * nominal. Unpublish a question and it leaves this page with no edit here at all;
 * the standalone `/faq` page, when it arrives, reads the same rows.
 *
 * **Row order is display order.** `hasMany` relationships keep the order the editor arranged them
 * in, so there is no position number two rows could share and therefore nothing that can disagree
 * with what the admin shows. The collection's own `order` field is a different question
 * for a different page — see `src/collections/questions.ts`.
 *
 * The drawing shows seven questions at desktop, four at tablet and three on a phone. That is layout
 * fill, not a rule: the band shows what the editor chose at every width rather than hiding
 * questions on small screens, which would make the page say less to the visitor most likely to be
 * standing in a shop.
 */
export const faq: Block = {
  slug: 'faq',
  labels: { singular: 'FAQ band', plural: 'FAQ bands' },
  fields: [
    {
      name: 'heading',
      type: 'text',
      localized: true,
      required: true,
      label: 'Heading',
      admin: { description: 'e.g. “EVERY DETAIL, ANSWERED”.' },
    },
    {
      name: 'body',
      type: 'textarea',
      localized: true,
      label: 'Intro paragraph',
    },
    ctaField(),
    {
      name: 'questions',
      type: 'relationship',
      relationTo: 'questions',
      hasMany: true,
      label: 'Questions',
      admin: {
        description:
          'Pick the questions this band shows, in the order you want them. Write them in the FAQ tab first.',
      },
    },
  ],
}
