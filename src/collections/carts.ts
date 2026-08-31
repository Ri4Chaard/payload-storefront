import { defaultCartItemMatcher } from '@payloadcms/plugin-ecommerce'
import type { CartItemMatcher } from '@payloadcms/plugin-ecommerce'
import type { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import type { Field } from 'payload'

/**
 * A customer's selection.
 *
 * Enabled in this spec but unused by its pages: the cart interface, the request record and the
 * messenger handoff are all spec 004. What lands here is the table and the one adjustment the
 * catalogue's shape forces, so that 004 starts against a schema that already fits.
 *
 * **Why an extra field is needed at all.** The plugin's cart item is `{ product, quantity, variant }`
 * — there is nowhere for a selection that is not a variant. Because size is a product field rather
 * than a variant type (003/research.md R3), a chosen size would be lost between the product page and
 * the seller's message. So the item gains `size`.
 */
const addSizeToItems = (fields: Field[]): Field[] =>
  fields.map((field) => {
    if (field.type !== 'array' || field.name !== 'items') return field

    return {
      ...field,
      fields: [
        ...field.fields,
        {
          name: 'size',
          type: 'relationship',
          relationTo: 'sizes',
          label: 'Size',
          admin: { description: 'The size the customer chose, where the piece offers a choice.' },
        },
      ],
    }
  })

export const cartsCollectionOverride: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  admin: {
    ...defaultCollection.admin,
    group: 'Shop',
  },
  fields: addSizeToItems(defaultCollection.fields),
})

/**
 * Two lines are the same line only if the product, the stone AND the size match.
 *
 * Without this, the plugin's default matcher sees the same ring in a size 6 and a size 7 as one item
 * and merges them into a quantity of two — which the seller then cannot fulfil. The plugin documents
 * this exact extension point using a delivery option as its example, so this is the intended seam
 * rather than a workaround.
 */
export const cartItemMatcher: CartItemMatcher = ({ existingItem, newItem }) => {
  if (!defaultCartItemMatcher({ existingItem, newItem })) return false

  const existingSize =
    existingItem.size && typeof existingItem.size === 'object'
      ? (existingItem.size as { id: unknown }).id
      : existingItem.size

  return newItem.size ? existingSize === newItem.size : !existingSize
}
