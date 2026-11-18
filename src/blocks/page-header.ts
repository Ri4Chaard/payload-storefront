import type { Block } from 'payload'

/**
 * The page's opening statement — an eyebrow over a headline.
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
      localized: true,
      label: 'Eyebrow',
      admin: { description: 'The small line above the headline, e.g. “OUR STORY”.' },
    },
    {
      name: 'heading',
      type: 'textarea',
      localized: true,
      required: true,
      label: 'Headline',
      admin: { description: 'The page’s main statement. Drawn over two lines.' },
    },
    /**
     * The intro paragraph beneath the headline, drawn at `312:7502` on the contact
     * page — `Questions, custom requests, or styling advice…`.
     *
     * **Added to this band rather than given one of its own.** The spec requires it to be an
     * addition to the page header, not a second band that draws the same thing. Optional, so
     * `/about` and `/blog` are unchanged by it, and available to both should an editor want it.
     */
    {
      name: 'body',
      type: 'textarea',
      localized: true,
      label: 'Intro paragraph',
      admin: {
        description: 'Optional. One or two sentences under the headline.',
      },
    },
  ],
}
