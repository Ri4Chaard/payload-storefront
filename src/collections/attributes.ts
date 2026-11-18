import type { CollectionConfig } from 'payload'

import { isAdmin } from '@/lib/access'
import { revalidateOnChange, revalidateOnDelete } from '@/lib/revalidate'

/**
 * A descriptive property the owner invents: material, weight, finish, provenance, dimensions.
 *
 * This is the collection that keeps the brief's promise — the owner defines a new attribute, applies
 * it to a product, and it appears on the storefront with no code change and no deployment. The
 * definition lives here; the value lives in each product's `attributes` array.
 *
 * **Attributes are descriptive, not selectable, and not filterable.** The six filters the design
 * draws — category, collection, colour, price, size, shape — are first-class indexed fields
 * on the product instead. Making every attribute filterable means a join per active filter on the
 * query that runs on every listing page view, under a 2.5s LCP budget.
 *
 * Promoting an attribute to a filter later is a bounded developer change: a field, a filter group, a
 * migration. That it is a developer change is recorded here rather than discovered in a hurry.
 */
export const Attributes: CollectionConfig = {
  slug: 'attributes',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'name', 'type', 'order'],
    group: 'Shop',
    description: 'Descriptive properties shown in a product’s details. Not filters.',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  // Publishing invalidates the cached routes. An attribute supplies the labels in the product-details accordion.
  hooks: {
    afterChange: [revalidateOnChange],
    afterDelete: [revalidateOnDelete],
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      localized: true,
      required: true,
      label: 'Label',
      admin: { description: 'What the customer reads, e.g. "Material".' },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Name',
      admin: {
        description:
          'A short machine-readable key, e.g. "material". Renaming it is safe; deleting it is not.',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'text',
      label: 'Type',
      options: [
        { label: 'Text', value: 'text' },
        { label: 'Number', value: 'number' },
        { label: 'One of a list', value: 'select' },
      ],
      admin: { description: 'How the value is entered on a product.' },
    },
    {
      name: 'options',
      type: 'array',
      label: 'Allowed values',
      admin: {
        condition: (data) => data?.type === 'select',
        description: 'The values a product may choose from.',
      },
      /*
        The row's `value` is the machine key a filter matches on, so it is NOT localized —
        translating it would mean a Russian visitor's filter matched nothing. The human-readable
        label above it is the localized half.
      */
      fields: [{ name: 'value', type: 'text', required: true, label: 'Value' }],
    },
    {
      name: 'order',
      type: 'number',
      label: 'Order',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Lowest first within the product details.' },
    },
  ],
}
