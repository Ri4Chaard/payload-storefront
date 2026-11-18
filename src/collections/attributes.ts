import type {
  CollectionBeforeDeleteHook,
  CollectionConfig,
  TextFieldSingleValidation,
} from 'payload'

import { isAdmin } from '@/lib/access'
import { KEBAB_CASE, RESERVED_FILTER_KEYS } from '@/lib/catalog/reserved-keys'
import { revalidateOnChange, revalidateOnDelete } from '@/lib/revalidate'

/**
 * A property a product can have: colour, material, shape, frame size, collection, origin.
 *
 * **The single definition of every descriptive and filterable property in the shop.** There is no
 * colour field and no collection field on a product; there are attributes the owner defines here,
 * and the core never learns their names (Constitution VII).
 *
 * Two kinds, by `type`:
 *
 *   `list`           a closed vocabulary. The values are documents of their own in `attribute-values`
 *                    ("Black", "Collection A"), a product picks them in its `values` field, and the
 *                    attribute can be a filter, can be shown in the product details, and can relate
 *                    products to each other.
 *   `text`/`number`  free per-product words or numbers ("1.2 kg"), written in the product's
 *                    `attributes` rows and overridable per variant. Shown in the details; never a
 *                    filter, because a filter over free text is a filter over typos.
 *
 * `name` is the URL query key a filter writes — `?colour=black` — so it is validated as kebab-case
 * and kept clear of the keys the listing already owns.
 */

const validateName: TextFieldSingleValidation = (value) => {
  if (typeof value !== 'string' || value === '') return 'A name is required.'
  if (!KEBAB_CASE.test(value)) {
    return 'Use lowercase letters, digits and single hyphens only, e.g. "frame-size".'
  }
  if ((RESERVED_FILTER_KEYS as readonly string[]).includes(value)) {
    return `"${value}" is already used by the listing's own controls. Choose another name.`
  }
  return true
}

/**
 * An attribute that is still in use cannot be deleted.
 *
 * Letting it go would orphan every value under it — rows in `attribute-values` pointing at nothing,
 * still picked on products, still in shared filter links — or leave product rows naming an attribute
 * that no longer exists. Removing those first is a deliberate act the owner can see the consequences
 * of, and the message says how many are in the way.
 */
const refuseWhileInUse: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const [values, rows] = await Promise.all([
    req.payload.count({
      collection: 'attribute-values',
      overrideAccess: true,
      req,
      where: { attribute: { equals: id } },
    }),
    req.payload.count({
      collection: 'products',
      overrideAccess: true,
      req,
      where: { 'attributes.attribute': { equals: id } },
    }),
  ])

  if (values.totalDocs > 0) {
    throw new Error(
      `This attribute still has ${values.totalDocs} value${values.totalDocs === 1 ? '' : 's'}. ` +
        'Delete them under Attribute values first.',
    )
  }
  if (rows.totalDocs > 0) {
    throw new Error(
      `This attribute is still filled in on ${rows.totalDocs} product${rows.totalDocs === 1 ? '' : 's'}. ` +
        'Remove it from them first.',
    )
  }
}

export const Attributes: CollectionConfig = {
  slug: 'attributes',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'name', 'type', 'filterable', 'order'],
    group: 'Catalogue properties',
    description:
      'Every property a product can have — colour, material, shape, size. A "list" attribute has its values under Attribute values and can be a filter; a text or number attribute is typed on each product.',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  // Publishing invalidates the cached routes. An attribute's label is a filter heading on every
  // listing and a row label in every product's details.
  hooks: {
    afterChange: [revalidateOnChange],
    afterDelete: [revalidateOnDelete],
    beforeDelete: [refuseWhileInUse],
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      localized: true,
      required: true,
      label: 'Label',
      admin: {
        description:
          'What the customer reads — the filter heading and the row label in the product details, e.g. "Colour".',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Name',
      validate: validateName,
      admin: {
        description:
          'The key in the address bar when this attribute is filtered on — "colour" in ?colour=black. Lowercase and hyphenated. Changing it breaks filter links that already exist.',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'text',
      label: 'Type',
      options: [
        { label: 'List of values', value: 'list' },
        { label: 'Text', value: 'text' },
        { label: 'Number', value: 'number' },
      ],
      admin: {
        description:
          'List: the values are defined once under Attribute values and picked on each product (Categorisation tab) — only a list can be a filter. Text or number: typed on each product (Details tab), and an option can override it.',
      },
    },
    {
      name: 'filterable',
      type: 'checkbox',
      defaultValue: false,
      label: 'Show as a filter',
      admin: {
        condition: (data) => data?.type === 'list',
        description:
          'Adds a group of checkboxes to the catalogue filters, one per value. Groups appear in this attribute’s order.',
      },
    },
    {
      name: 'showInDetails',
      type: 'checkbox',
      defaultValue: true,
      label: 'Show in product details',
      admin: {
        description:
          'Lists this attribute and the product’s value(s) in the "Product details" section of the product page.',
      },
    },
    {
      name: 'relatesProducts',
      type: 'checkbox',
      defaultValue: false,
      label: 'Relates products',
      admin: {
        condition: (data) => data?.type === 'list',
        description:
          'Products sharing a value of this attribute are suggested under "You may also like" on each other’s pages. When a product shares none, products from its category are suggested instead.',
      },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Order',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lowest first — among the filters and among the rows in the product details.',
      },
    },
  ],
}
