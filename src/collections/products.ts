import type { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import type { Field } from 'payload'

import { seoTab } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { cascadeAvailability } from '@/collections/product-hooks'
import { revalidateOnChange, revalidateOnDelete } from '@/lib/revalidate'

/**
 * The plugin's own `inventory` field, shown only when it means something.
 *
 * It is meaningless on a made-to-order product, and meaningless on a product whose variants each carry
 * their own count, so it appears for neither.
 *
 * It is NOT hidden from public reads. An earlier draft of data-model.md put `adminOnlyFieldAccess`
 * on it — which would strip the field from the same access-controlled query the storefront uses to
 * decide whether a product is orderable, leaving the page unable to tell. A stock count is not
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
      description: 'How many exist. At zero the product is shown as unavailable.',
    },
  }
}

const isInventory = (field: Field) => field.type === 'number' && field.name === 'inventory'

/**
 * The variants table under "Available variants" shows the PRICE by default.
 *
 * Left alone, the join renders whatever the variants collection nominates, which is its title — so
 * the one column that matters most is the one the owner has to add by hand, on every visit, for
 * every product. A variant exists to carry a price; a table of variants that does not show prices
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
      // The option, what it costs, and how many there are — the three things a variant IS.
      defaultColumns: ['title', 'priceInUSD', 'inventory'],
    },
  }
}

/**
 * A product in the catalogue.
 *
 * The e-commerce plugin's own `products` collection is **nearly empty** — it contributes
 * `inventory`, `enableVariants`, `variantTypes`, a `variants` join, and one price group per
 * currency, and nothing else. No title, no slug, no photographs, no description. Every content
 * field below is ours.
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
 * the accordion beneath it, **Categorisation** is its category and every attribute value it carries, and
 * **Price & options** is the two selectors and what they cost.
 *
 * Three fields stay outside the tabs, in the sidebar, because they are the document's status rather
 * than its content: the slug, whether it is made to order, and how many exist.
 */
export const productsCollectionOverride: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,

  /**
   * Publishing invalidates the cached routes.
   *
   * **Appended to the plugin's own hooks rather than replacing them.** `defaultCollection.hooks`
   * is where the e-commerce plugin keeps its own bookkeeping; spreading it and adding to the two
   * arrays leaves that intact, where an object literal would silently drop it.
   */
  hooks: {
    ...defaultCollection.hooks,
    afterChange: [
      ...(defaultCollection.hooks?.afterChange ?? []),
      revalidateOnChange,
      // Carries `availability` down to every variant, so the quantity field can hide itself on one
      //. See `./product-hooks.ts` for why a variant cannot just ask its parent.
      cascadeAvailability,
    ],
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
          'Made to order ignores the quantity entirely. Stock tracked shows the product as unavailable at zero — visible, but not orderable.',
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
                  'Typed properties — material, weight, origin. Define new text or number attributes under Attributes and they appear here with no deployment. List attributes (colour, collection…) are picked in the Categorisation tab instead.',
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
                      // List attributes are picked as values in the Categorisation tab; a row here
                      // is for the typed ones only.
                      filterOptions: { type: { not_equals: 'list' } },
                    },
      /*
        **Required, but not in every language**.

        A row in this array is shared across all three locales — arrays are not localized, the words
        inside them are — so a `required` localized child has to be filled in EVERY language before
        the document can be saved in ANY of them. An editor who opened a product in Russian to change
        its title met "This field is required" on a row they had not touched, and could not save at
        all. The seed script hit it first, which is the only reason it was found before an editor
        did.

        Dropping `required` restores the intent: the row must have a value, and the English one is
        what every other language falls back to until somebody translates it.
      */
                    { name: 'value', type: 'text', label: 'Value', localized: true },
                  ],
                },
              ],
            },
          ],
        },

        {
          label: 'Categorisation',
          description: 'Where the product is shelved, and every value it can be filtered by.',
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
                  'Exactly one. Decides which listing the product appears on and the label above its name.',
              },
            },
            {
              /*
                Every value of every LIST attribute the product has, in one field: its colours, its
                collection, its shape. The attribute each value belongs to is on the value itself, so
                the core never learns which properties a shop has (Constitution VII). Free-text
                properties (weight, origin) stay in the Details tab's rows instead.
              */
              name: 'values',
              type: 'relationship',
              relationTo: 'attribute-values',
              hasMany: true,
              index: true,
              label: 'Attribute values',
              admin: {
                description:
                  'Pick every value that describes this product — e.g. "Colour: Black", "Collection: Collection A". Each attribute’s settings decide whether its values are filters, are listed in the product details, or suggest related products. Manage the lists under Attributes and Attribute values.',
              },
            },
          ],
        },

        {
          label: 'Price & options',
          description:
            'The price, and the options a customer chooses between. Add options under "Available variants" — each carries its own price and quantity.',
          // Everything the plugin contributes except `inventory`, which is in the sidebar above.
          fields: defaultCollection.fields.filter((field) => !isInventory(field)).map(adjustVariantsJoin),
        },

        seoTab(),
      ],
    },
  ],
})
