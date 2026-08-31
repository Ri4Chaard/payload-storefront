import type { CollectionConfig } from 'payload'

import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { isAdmin } from '@/lib/access'

/**
 * What a piece is: rings, bracelets, earrings, necklaces. Exactly one per product.
 *
 * Drives three things at once — the `/rings` route, the eyebrow above a product's name, and the
 * CATEGORY group in the filter drawer.
 *
 * **"All jewelry" is not a row here.** The drawer draws it as a fifth checkbox, but it means "no
 * category filter", and it is the `/all-jewelry` route. Storing it would give it a slug, a subtitle
 * and an image it should never have.
 */
export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'order'],
    group: 'Shop',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Title',
      admin: { description: 'The heading on the category listing, e.g. "Diamond Rings".' },
    },
    slugField(),
    {
      name: 'subtitle',
      type: 'text',
      label: 'Subtitle',
      admin: {
        description:
          'The sentence beneath the heading, e.g. "Timeless brilliance, made for every moment".',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Photograph',
      admin: { description: 'Used by the home page’s category band.' },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Order',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lowest first, in navigation and in the filter drawer.',
      },
    },
    seoField(),
  ],
}
