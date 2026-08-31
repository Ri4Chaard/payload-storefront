import type { CollectionConfig } from 'payload'

import { isAdmin } from '@/lib/access'

/**
 * A value a piece can be made in — ring sizes, bracelet lengths, chain lengths.
 *
 * **A collection rather than a `select`** for two reasons. The vocabulary differs by category: a
 * ring size of 2.25 and a necklace length of 45cm are not the same list, and a single select would
 * have to hold both. And the SIZE group in the filter drawer must offer real, typo-free values —
 * which a free-text array on the product could not guarantee.
 *
 * **Size is not a variant.** It never moves the price, so it is a field on the product rather than
 * a row in the variant matrix. Modelling it as a variant type would multiply every stone by every
 * size — five by fifteen is seventy-five documents the owner maintains by hand (003/research.md R3).
 */
export const Sizes: CollectionConfig = {
  slug: 'sizes',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'category', 'order'],
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
      name: 'label',
      type: 'text',
      required: true,
      label: 'Label',
      admin: { description: 'What the customer reads in the selector, e.g. "2.25" or "45 cm".' },
    },
    {
      name: 'value',
      type: 'text',
      required: true,
      index: true,
      label: 'Value',
      admin: {
        description:
          'What appears in the address bar when this size is filtered on. Keep it unique within a category — "2.25", "45cm".',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      label: 'Category',
      admin: {
        description: 'Which kind of piece this size applies to. Leave empty if it applies to all.',
      },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Order',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Lowest first in the selector and the drawer.' },
    },
  ],
}
