import type { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import type { Field } from 'payload'

import { stampAvailability } from '@/collections/product-hooks'
import { revalidateOnChange, revalidateOnDelete } from '@/lib/revalidate'

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
/**
 * The plugin's `inventory` field, shown only where a number means something (spec 011, FR-001).
 *
 * A made-to-order stone has no quantity to hold, and an editable field whose value is ignored is
 * worse than no field: it invites the owner to type a number and believe it matters. The condition
 * reads the stone's OWN `availability` — mirrored from the parent by `stampAvailability` — because
 * `admin.condition` is synchronous and cannot fetch the parent to ask (011/research.md R5).
 *
 * The same narrowing `adjustInventory` does on products, and for the same reason: `Field` is a union
 * of sixty-odd shapes, and spreading one without narrowing produces a type assignable to none of
 * them.
 */
const adjustInventory = (field: Field): Field => {
  if (field.type !== 'number' || field.name !== 'inventory') return field

  return {
    ...field,
    admin: {
      ...field.admin,
      condition: (data) => data?.availability === 'stock-tracked',
      description:
        'How many of this stone exist. At zero it is shown as unavailable. Made-to-order pieces do not ask.',
    },
  }
}

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

  /**
   * Publishing invalidates the cached routes (003/T294).
   *
   * **Appended to the plugin's own hooks rather than replacing them.** `defaultCollection.hooks`
   * is where the e-commerce plugin keeps its inventory and price bookkeeping; spreading it and
   * adding to the two arrays leaves that intact, where an object literal would silently drop it.
   */
  hooks: {
    ...defaultCollection.hooks,
    // Stamps this stone with its parent's availability as it is created, so one added to a piece
    // that is already made to order is right immediately (spec 011, FR-001).
    beforeChange: [...(defaultCollection.hooks?.beforeChange ?? []), stampAvailability],
    afterChange: [...(defaultCollection.hooks?.afterChange ?? []), revalidateOnChange],
    afterDelete: [...(defaultCollection.hooks?.afterDelete ?? []), revalidateOnDelete],
  },

  fields: [
    ...defaultCollection.fields.map(adjustInventory),

    /**
     * What this stone is, where it differs from the piece it sits in (spec 011, US2, FR-009).
     *
     * **The product's own array, copied rather than reinvented.** Two stones in one ring have
     * different carat weights and different certificates — properties that describe the stone, not
     * the setting — and an owner meeting an identically-shaped row wherever they set one is the
     * point of copying it. The merge rule lives in `src/lib/catalog/mappers.ts`: a stone's value
     * replaces the piece's for the same attribute, and an attribute only the stone carries is
     * appended.
     *
     * The piece's own "Product details" prose and its short description stay on the piece and do
     * NOT vary by stone (011/spec.md FR-009a). A stone differs from its siblings in carat, clarity
     * and certificate; prose that changed underneath a customer comparing two stones would make
     * them harder to compare, not easier.
     */
    {
      name: 'attributes',
      type: 'array',
      label: 'Attributes',
      labels: { singular: 'Attribute', plural: 'Attributes' },
      admin: {
        description:
          'Only what differs from the piece — carat weight, certificate. Anything left out is inherited from the product.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'attribute',
              type: 'relationship',
              relationTo: 'attributes',
              required: true,
              label: 'Attribute',
            },
      /*
        **Required, but not in every language** (spec 010, T110) — the same trap as on the product,
        and the reason this is copied verbatim rather than tightened.

        A row in this array is shared across all three locales — arrays are not localized, the words
        inside them are — so a `required` localized child has to be filled in EVERY language before
        the document can be saved in ANY of them. An editor who opened a stone in Russian to change
        one word met "This field is required" on a row they had not touched, and could not save at
        all.

        Dropping `required` restores the intent: the row must have a value, and the English one is
        what every other language falls back to until somebody translates it.
      */
            { name: 'value', type: 'text', label: 'Value', localized: true },
          ],
        },
      ],
    },

    /**
     * The piece's availability, mirrored (spec 011, US1, FR-001; research R5).
     *
     * **This exists for the admin form and for nothing else.** `admin.condition` is synchronous and
     * receives only the document being edited (`payload/dist/fields/config/types.d.ts:111`), so a
     * stone holding its parent as an id cannot ask what mode that parent is in. Without a value on
     * the stone itself, the quantity field below cannot hide — and FR-001 says it must.
     *
     * **It is never the storefront's source of truth.** `mappers.ts` has the parent product in hand
     * when it maps its variants and reads availability from there, so a stale mirror can misdraw an
     * admin form but can never sell something that should not be for sale. That constraint is what
     * makes a denormalised column acceptable here; see 011/plan.md Complexity Tracking.
     *
     * Kept in step by `cascadeAvailability` and `stampAvailability` in `./product-hooks.ts`.
     */
    {
      name: 'availability',
      type: 'select',
      label: 'Availability',
      options: [
        { label: 'Made to order — always available', value: 'made-to-order' },
        { label: 'Stock tracked — available while the quantity lasts', value: 'stock-tracked' },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'Follows the product. Set it on the piece, not here — every stone of a made-to-order piece is made to order.',
      },
    },

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
