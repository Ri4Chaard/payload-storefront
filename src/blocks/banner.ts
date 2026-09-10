import type { Block } from 'payload'

import { ctaField } from '@/fields/cta'
import { mediaSlot } from '@/fields/media-slot'

/**
 * A full-bleed plate with a column of text laid over it (spec 006, FR-011, FR-048).
 *
 * **One block, drawn twice.** "THE AURUM STANDARD" (`312:6926`) and "CRAFTED TO LAST"
 * (`312:6967`) look like two bands and are one construction. Read side by side they differ in
 * exactly three properties: whether an eyebrow renders, whether the band ends in a button, and
 * which side the text column sits on. Three optional properties is a variant set, not a second
 * block — Constitution II's rule about `ProductCard` / `ProductCardNew` applies to blocks as
 * directly as to components, and a third banner is now composition rather than code (FR-049).
 *
 * **`textSide` is a desktop-only property, and the design is why.** At 1920 the Standard banner
 * puts its text left and Crafted-to-last puts it right. At 768 and at 390 both put it left — there
 * is no room for anything else. So the renderer applies this above `lg` and ignores it below,
 * rather than producing a phone layout nobody drew.
 *
 * The media slot here is the band's BACKDROP, which is the one place in this feature where a video
 * plays under text. `background` is not a field: it is a property of this block, passed at render
 * time, because an editor toggling "lay text over this" on a band that always does would be a
 * setting with one correct value.
 */
export const banner: Block = {
  slug: 'banner',
  labels: { singular: 'Banner', plural: 'Banners' },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Eyebrow',
      admin: { description: 'The small line above the headline. Leave empty to omit it.' },
    },
    {
      name: 'heading',
      type: 'textarea',
      required: true,
      label: 'Headline',
    },
    {
      name: 'body',
      type: 'textarea',
      label: 'Paragraph',
    },
    ctaField(),
    mediaSlot({
      label: 'Background media',
      description: 'The plate behind the text. Keep the subject clear of the text column.',
    }),
    {
      name: 'textSide',
      type: 'select',
      required: true,
      defaultValue: 'left',
      label: 'Text sits on',
      options: [
        { label: 'The left', value: 'left' },
        { label: 'The right', value: 'right' },
      ],
      admin: {
        description: 'Applies on wide screens only. Narrower screens always put the text on the left.',
      },
    },
  ],
}
