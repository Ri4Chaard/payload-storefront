import type { CollectionConfig } from 'payload'

import { slugField } from '@/fields/slug'
import { isAdmin } from '@/lib/access'
import { revalidateOnChange, revalidateOnDelete } from '@/lib/revalidate'

/**
 * A merchandising grouping a piece belongs to: Deia, Marvel, Molten, Spartan. Zero or more per
 * product, unlike a category, of which there is exactly one.
 *
 * Read by the COLLECTION filter group and by "Complete the Collection" on a product page.
 *
 * **On the name.** This is `src/collections/collections.ts`, and its generated type is `Collection`
 * next to Payload's own `CollectionConfig`. The clash is real and it is accepted: the drawer says
 * COLLECTION, the URL says `?collection=`, and data-model.md says `collections`. Constitution IV
 * asks that one concept keep one name everywhere, and inventing a different one here to dodge an
 * awkward filename would break that in four other places.
 */
export const Collections: CollectionConfig = {
  slug: 'collections',
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
  // Publishing invalidates the cached routes (003/T294). A collection decides what _Complete the Collection_ shows beside a piece.
  hooks: {
    afterChange: [revalidateOnChange],
    afterDelete: [revalidateOnDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Title',
      admin: { description: 'The collection’s name, e.g. "Molten".' },
    },
    slugField(),
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: { description: 'Optional. Not shown on the listing today.' },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Order',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Lowest first in the filter drawer.' },
    },
  ],
}
