import type { Block } from 'payload'

/**
 * The page's opening statement — an eyebrow over a headline (spec 006, FR-009).
 *
 * Drawn at nodes `310:6501` / `413:7676` / `413:7981`: `OUR STORY` in small caps above
 * `IMMORTALIZING MEMORIES AND EMOTIONS IN EXTRAORDINARY, TIMELESS CREATIONS`, centred at desktop
 * and left-aligned on a phone.
 *
 * **This block owns the page's only top-level heading**, where the composition has one. That is not
 * a property of the block, though — it is a property of its position, and it is decided in
 * `src/lib/story/mappers.ts` rather than here, because an editor can reorder the page and can
 * delete this block entirely. See 006/research.md R7 for the rule.
 *
 * The headline is a `textarea` rather than a `text` field: it is drawn over two lines at every
 * width and an editor needs to see the whole of it while writing.
 */
export const pageHeader: Block = {
  slug: 'page-header',
  labels: { singular: 'Page header', plural: 'Page headers' },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Eyebrow',
      admin: { description: 'The small line above the headline, e.g. “OUR STORY”.' },
    },
    {
      name: 'heading',
      type: 'textarea',
      required: true,
      label: 'Headline',
      admin: { description: 'The page’s main statement. Drawn over two lines.' },
    },
  ],
}
