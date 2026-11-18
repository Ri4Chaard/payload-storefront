import type {
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
  TextFieldSingleValidation,
} from 'payload'

import { isAdmin } from '@/lib/access'
import { KEBAB_CASE } from '@/lib/catalog/reserved-keys'
import { revalidateOnChange, revalidateOnDelete } from '@/lib/revalidate'

/**
 * One value of a list attribute: "Black" of Colour, "Collection A" of Collection, "Round" of Shape.
 *
 * A document rather than a row in an array on the attribute, for the same reasons categories are
 * documents: a product points at it with a relationship (referential integrity, a picker, localized
 * labels for free), and the filters count products by it.
 *
 * `value` is what a filter link carries — `?colour=black` — so it is kebab-case, never localized,
 * and unique within its attribute (two attributes may both have a value called `large`).
 */

/** The attribute this row belongs to, as an id, whichever shape the form or the API sent it in. */
const attributeIdOf = (value: unknown): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return undefined
}

const validateValue: TextFieldSingleValidation = async (value, { data, id, req }) => {
  if (typeof value !== 'string' || value === '') return 'A value is required.'
  if (!KEBAB_CASE.test(value)) {
    return 'Use lowercase letters, digits and single hyphens only, e.g. "light-blue".'
  }

  const attribute = attributeIdOf((data as { attribute?: unknown } | undefined)?.attribute)
  // The attribute is required on its own; without one there is nothing to be unique within yet.
  if (attribute === undefined || !req?.payload) return true

  const { totalDocs } = await req.payload.count({
    collection: 'attribute-values',
    overrideAccess: true,
    req,
    where: {
      and: [
        { attribute: { equals: attribute } },
        { value: { equals: value } },
        ...(id !== undefined ? [{ id: { not_equals: id } }] : []),
      ],
    },
  })

  return totalDocs > 0 ? `This attribute already has a value "${value}".` : true
}

/**
 * The admin title: "Colour: Black". Without the attribute's name, a product's value picker would
 * offer "Large" twice and leave the owner to guess which one is a size.
 *
 * Written in the language being saved, so the Russian admin reads "Цвет: Чёрный".
 */
const fillTitle: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const attributeId = attributeIdOf(data.attribute ?? originalDoc?.attribute)
  const label = typeof data.label === 'string' ? data.label : originalDoc?.label

  let attributeLabel = ''
  if (attributeId !== undefined) {
    try {
      const attribute = await req.payload.findByID({
        collection: 'attributes',
        id: attributeId,
        depth: 0,
        locale: req.locale ?? undefined,
        overrideAccess: true,
        req,
      })
      attributeLabel = attribute.label
    } catch {
      // A missing attribute is reported by the required relationship; the title just goes without.
    }
  }

  return { ...data, title: attributeLabel ? `${attributeLabel}: ${label ?? ''}` : (label ?? '') }
}

/**
 * A value still picked on a product cannot be deleted — the product would keep pointing at
 * something that no longer exists, and silently stripping it is a content change nobody asked for.
 */
const refuseWhileInUse: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { totalDocs } = await req.payload.count({
    collection: 'products',
    overrideAccess: true,
    req,
    where: { values: { equals: id } },
  })

  if (totalDocs > 0) {
    throw new Error(
      `This value is still used by ${totalDocs} product${totalDocs === 1 ? '' : 's'}. ` +
        'Remove it from them first — deleting it here would leave those products pointing at a value that no longer exists.',
    )
  }
}

export const AttributeValues: CollectionConfig = {
  slug: 'attribute-values',
  labels: { singular: 'Attribute value', plural: 'Attribute values' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'value', 'attribute', 'order'],
    group: 'Catalogue properties',
    description:
      'The values of each list attribute — Black, Green, Collection A. Products pick them in their Categorisation tab; a filterable attribute offers every value as a checkbox.',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  // Publishing invalidates the cached routes. A value is a filter option, a chip label and a line in
  // the product details.
  hooks: {
    beforeChange: [fillTitle],
    afterChange: [revalidateOnChange],
    afterDelete: [revalidateOnDelete],
    beforeDelete: [refuseWhileInUse],
  },
  indexes: [{ fields: ['attribute', 'value'], unique: true }],
  fields: [
    {
      name: 'attribute',
      type: 'relationship',
      relationTo: 'attributes',
      required: true,
      index: true,
      label: 'Attribute',
      filterOptions: { type: { equals: 'list' } },
      admin: {
        description: 'Which property this is a value of. Only "list" attributes are offered.',
      },
    },
    {
      name: 'label',
      type: 'text',
      localized: true,
      required: true,
      label: 'Label',
      admin: { description: 'What the customer reads, e.g. "Black".' },
    },
    {
      name: 'value',
      type: 'text',
      required: true,
      index: true,
      label: 'Value',
      validate: validateValue,
      admin: {
        description:
          'What appears in the address bar when this value is filtered on — "black" in ?colour=black. Lowercase and hyphenated, unique within its attribute. Changing it breaks links that already exist.',
      },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Order',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Lowest first among this attribute’s values.' },
    },
    {
      name: 'title',
      type: 'text',
      localized: true,
      label: 'Title',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Filled in on save — "Attribute: Label" — so pickers can tell values apart.',
      },
    },
  ],
}
