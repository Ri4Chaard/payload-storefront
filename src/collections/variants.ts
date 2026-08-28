import type { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'

/**
 * A stone a customer can choose — one row per option under "Choose Your Diamond:".
 *
 * **This is the price-bearing row.** The plugin's variant model is a matrix of option combinations,
 * and the combination is what carries price and inventory. Diamond is the only variant type on this
 * store, so a variant is a stone: its own price, its own availability, its own photograph.
 *
 * **Size is deliberately not a variant type.** Making it one would multiply every stone by every
 * size — five stones and fifteen ring sizes is seventy-five documents the owner creates by hand, in
 * a Payload version with no bulk generator, for an axis that never changes the price
 * (003/research.md R3). Size is a field on the product instead.
 *
 * Only one field is added. The plugin already supplies `title`, `product`, `options`, `inventory`
 * and the price group, along with drafts, trash and published-only public reads.
 */
export const variantsCollectionOverride: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,

  /**
   * **`admin` is deliberately left alone — do not give this collection a nav group.**
   *
   * The plugin sets `admin.group: false`, which in Payload means "hide from the navigation", and it
   * means it: a variant can only be created from inside its product, through the `variants` join
   * field, because that is what fills in `product`. The field is `readOnly` and sidebar-positioned,
   * so there is no way to set it by hand.
   *
   * Putting the collection in the sidebar makes "Create new variant" reachable with no product, and
   * `VariantOptionsSelector` — which calls `findByID({ id: data.product })` unconditionally — throws
   * `NotFound` before the form renders. That is not a plugin bug; it is a collection that was never
   * meant to have a front door.
   */

  fields: [
    ...defaultCollection.fields,
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Photograph',
      admin: {
        description:
          'Optional. A photograph of this particular stone, shown when it is selected. Falls back to the product gallery.',
      },
    },
  ],
})
