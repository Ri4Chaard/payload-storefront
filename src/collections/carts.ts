import type { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'

/**
 * A customer's selection.
 *
 * **It used to add a `size` to each item, and spec 011 took it back out.** The plugin's cart item is
 * `{ product, quantity, variant }` and size was not a variant type, so a chosen
 * size had nowhere to live and the item gained a field for it. Sizes are deprecated as of 011: the
 * selector is gone from the product page, the vocabulary is gone from the admin, and the column
 * would only be somewhere for a value nothing can produce.
 *
 * **`cartItemMatcher` went with it, and that is the part worth noticing.** Two lines used to be the
 * same line only if the product, the variant AND the size matched — the plugin's own extension point,
 * used so that one product in two sizes could not merge into a quantity of two the seller could not
 * fulfil. With size gone the plugin's default matcher is correct again, so the override is deleted
 * rather than left as a function that compares one fewer thing. A line saved before this change
 * keeps working; two lines that differed only by size merge on their next meeting, which is the
 * right answer once the difference no longer exists.
 */
export const cartsCollectionOverride: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  admin: {
    ...defaultCollection.admin,
    group: 'Shop',
  },
})
