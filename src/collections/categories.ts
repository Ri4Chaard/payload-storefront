import type { CollectionConfig } from 'payload'

import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { isAdmin } from '@/lib/access'
import { revalidateOnChange, revalidateOnDelete } from '@/lib/revalidate'

/**
 * What a piece is: rings, bracelets, earrings, necklaces. Exactly one per product.
 *
 * Drives three things at once — the `/category-1` route, the eyebrow above a product's name, and the
 * CATEGORY group in the filter drawer.
 *
 * **"All jewelry" is not a row here.** The drawer draws it as a fifth checkbox, but it means "no
 * category filter", and it is the `/all-products` route. Storing it would give it a slug, a subtitle
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
  // Publishing invalidates the cached routes (003/T294). A category is the band on the home page and the eyebrow above every product in it.
  hooks: {
    afterChange: [revalidateOnChange],
    afterDelete: [revalidateOnDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
      label: 'Title',
      admin: { description: 'The heading on the category listing, e.g. "Category 1".' },
    },
    slugField(),
    {
      name: 'subtitle',
      type: 'text',
      localized: true,
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
