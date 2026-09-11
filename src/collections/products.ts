import type { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import type { Field } from 'payload'

import { seoTab } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { revalidateOnChange, revalidateOnDelete } from '@/lib/revalidate'

/**
 * The plugin's own `inventory` field, shown only when it means something.
 *
 * It is meaningless on a made-to-order piece, and meaningless on a product whose stones each carry
 * their own count, so it appears for neither.
 *
 * It is NOT hidden from public reads. An earlier draft of data-model.md put `adminOnlyFieldAccess`
 * on it — which would strip the field from the same access-controlled query the storefront uses to
 * decide whether a piece is orderable, leaving the page unable to tell. A stock count is not
 * personal data, and "unavailable" has to be derived from something.
 *
 * Narrowing on `type === 'number'` before spreading is not defensive noise: `Field` is a union of
 * sixty-odd shapes, and spreading one without narrowing produces a type assignable to none of them.
 */
const adjustInventory = (field: Field): Field => {
  if (field.type !== 'number' || field.name !== 'inventory') return field

  return {
    ...field,
    label: 'Quantity',
    admin: {
      ...field.admin,
      position: 'sidebar',
      condition: (data) => data?.availability === 'stock-tracked' && !data?.enableVariants,
      description: 'How many exist. At zero the piece is shown as unavailable.',
    },
  }
}

const isInventory = (field: Field) => field.type === 'number' && field.name === 'inventory'

/**
 * The stones table under "Available variants" shows the PRICE by default.
 *
 * Left alone, the join renders whatever the variants collection nominates, which is its title — so
 * the one column that matters most is the one the owner has to add by hand, on every visit, for
 * every product. A stone exists to carry a price; a table of stones that does not show prices
 * cannot answer "is this ladder right" at a glance, which is the whole reason to look at it.
 *
 * Set on the JOIN rather than on the variants collection deliberately. That collection's `admin` is
 * load-bearing — the plugin sets `group: false` to keep it out of the navigation, and a variant
 * created outside a product throws before its form renders (see `variants.ts`). Configuring the
 * field touches none of that.
 *
 * `defaultColumns` is a default, not a lock: the owner can still add or remove columns from the
 * table's own control. This decides what they see before they touch anything.
 */
const adjustVariantsJoin = (field: Field): Field => {
  if (field.type !== 'join' || field.name !== 'variants') return field

  return {
    ...field,
    admin: {
      ...field.admin,
      // The stone, what it costs, and how many there are — the three things a variant IS.
      defaultColumns: ['title', 'priceInUSD', 'inventory'],
    },
  }
}

/**
 * A piece of jewelry.
 *
 * The e-commerce plugin's own `products` collection is **nearly empty** — it contributes
 * `inventory`, `enableVariants`, `variantTypes`, a `variants` join, and one price group per
 * currency, and nothing else. No title, no slug, no photographs, no description. Every content
 * field below is ours (003/research.md R1).
 *
 * That is the whole shape of the bargain: the plugin handles money in integer minor units, variant
 * resolution and inventory; the content model is designed here.
 *
 * What arrives free with the plugin and is deliberately kept: autosaving drafts, trash, and
 * `read: adminOrPublishedStatus`. Together they are spec FR-009 — a draft is unreachable by URL
 * rather than merely hidden — satisfied by configuration instead of code.
 *
 * **The form is tabbed, and the tabs are UNNAMED except SEO.** An unnamed tab is presentation only:
 * the data stays flat, so grouping these twenty-odd fields cost no migration and changed no
 * generated type. The one named tab is `seo`, which nests under `seo` exactly as the group it
 * replaced did.
 *
 * The four tabs follow the storefront rather than the schema, because that is what an editor is
 * looking at while they fill the form in: **Content** is everything above the fold, **Details** is
 * the accordion beneath it, **Categorisation** is every filter the piece answers to, and
 * **Price & stones** is the two selectors and what they cost.
 *
 * Three fields stay outside the tabs, in the sidebar, because they are the document's status rather
 * than its content: the slug, whether it is made to order, and how many exist.
 */
export const productsCollectionOverride: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,

  /**
   * Publishing invalidates the cached routes (003/T294).
   *
   * **Appended to the plugin's own hooks rather than replacing them.** `defaultCollection.hooks`
   * is where the e-commerce plugin keeps its own bookkeeping; spreading it and adding to the two
   * arrays leaves that intact, where an object literal would silently drop it.
   */
  hooks: {
    ...defaultCollection.hooks,
    afterChange: [...(defaultCollection.hooks?.afterChange ?? []), revalidateOnChange],
    afterDelete: [...(defaultCollection.hooks?.afterDelete ?? []), revalidateOnDelete],
  },

  admin: {
    ...defaultCollection.admin,
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'availability', 'priceInUSD', '_status'],
    group: 'Shop',
  },

  fields: [
    // ---- sidebar: what the document IS, not what it says -------------------------------------
    slugField(),

    {
      name: 'availability',
      type: 'select',
      required: true,
      defaultValue: 'made-to-order',
      index: true,
      label: 'Availability',
      options: [
        { label: 'Made to order — always available', value: 'made-to-order' },
        { label: 'Stock tracked — available while the quantity lasts', value: 'stock-tracked' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Made to order ignores the quantity entirely. Stock tracked shows the piece as unavailable at zero — visible, but not orderable.',
      },
    },

    ...defaultCollection.fields.filter(isInventory).map(adjustInventory),

    // ---- the form ------------------------------------------------------------------------------
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          description: 'What a customer reads first, above the fold.',
          fields: [
            {
              name: 'title',
              type: 'text',
              localized: true,
              required: true,
              label: 'Name',
              admin: {
                description:
                  'The full name, however long. The listing card clamps it to one line, but screen readers and the product page get all of it.',
              },
            },
            {
              name: 'description',
              type: 'textarea',
              localized: true,
              label: 'Description',
              admin: {
                description:
                  'The paragraph beneath the price. Leave it empty and the layout closes over it.',
              },
            },
            {
              name: 'gallery',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              required: true,
              label: 'Photographs',
              admin: {
                description:
                  'In order. THE FIRST ONE is what the listing shows and what the gallery opens on. Alternative text lives on each image, authored once.',
              },
            },
          ],
        },

        {
          label: 'Details',
          description: 'The "Product details" accordion on the product page.',
          fields: [
            {
              name: 'details',
              type: 'richText',
              localized: true,
              label: 'Product details',
              admin: {
                description:
                  'Per-product. Warranty and delivery are the same on every product and live in Shop settings instead.',
              },
            },
            {
              name: 'attributes',
              type: 'array',
              label: 'Attributes',
              labels: { singular: 'Attribute', plural: 'Attributes' },
              admin: {
                description:
                  'Metal, carat weight, provenance. Define new ones under Attributes and they appear here with no deployment.',
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
                    { name: 'value', type: 'text', required: true, label: 'Value', localized: true },
                  ],
                },
              ],
            },
          ],
        },

        {
          label: 'Categorisation',
          description: 'Everything the piece can be filtered by.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'category',
                  type: 'relationship',
                  relationTo: 'categories',
                  required: true,
                  index: true,
                  label: 'Category',
                  admin: {
                    description:
                      'Exactly one. Decides which listing the piece appears on and the label above its name.',
                  },
                },
                {
                  name: 'collections',
                  type: 'relationship',
                  relationTo: 'collections',
                  hasMany: true,
                  label: 'Collections',
                  admin: {
                    description: 'Zero or more. Drives "Complete the Collection".',
                  },
                },
              ],
            },
            {
              name: 'sizes',
              type: 'relationship',
              relationTo: 'sizes',
              hasMany: true,
              label: 'Sizes',
              admin: {
                description:
                  'The sizes this piece is made in. Leave empty and no size selector is shown. Sizes never change the price — stones do.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'colour',
                  type: 'select',
                  hasMany: true,
                  index: true,
                  label: 'Colour',
                  options: [
                    { label: 'Black', value: 'black' },
                    { label: 'Clear', value: 'clear' },
                    { label: 'Green', value: 'green' },
                    { label: 'Multicolor', value: 'multicolor' },
                  ],
                  admin: { description: 'Filterable, and shown in the product details.' },
                },
                {
                  name: 'diamondShape',
                  type: 'select',
                  hasMany: true,
                  index: true,
                  label: 'Diamond shape',
                  options: [
                    { label: 'Round', value: 'round' },
                    { label: 'Oval', value: 'oval' },
                    { label: 'Emerald', value: 'emerald' },
                    { label: 'Pear', value: 'pear' },
                    { label: 'Marquise', value: 'marquise' },
                    { label: 'Princess', value: 'princess' },
                    { label: 'Baguette', value: 'baguette' },
                  ],
                  admin: { description: 'A piece may set more than one.' },
                },
              ],
            },
          ],
        },

        {
          label: 'Price & stones',
          description:
            'The price, and the stones a customer chooses between. Add stones under "Available variants" — each carries its own price and quantity.',
          // Everything the plugin contributes except `inventory`, which is in the sidebar above.
          fields: defaultCollection.fields.filter((field) => !isInventory(field)).map(adjustVariantsJoin),
        },

        seoTab(),
      ],
    },
  ],
})
