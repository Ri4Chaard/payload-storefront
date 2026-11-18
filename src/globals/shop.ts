import type { GlobalConfig } from 'payload'

import { isAdmin } from '@/lib/access'
import { revalidateGlobalOnChange } from '@/lib/revalidate'

/**
 * Shop-wide copy that is not per-product.
 *
 * A product page draws three accordions. "Product details" differs for every product and lives on the
 * product. "3 year warranty + free returns" and "Delivery" are the same words on every product in
 * the store — and hardcoding them in a component would be exactly the hardcoded user-visible content
 * Constitution I forbids, converting an editor task into a deployment.
 *
 * One global, edited once, read by the same loader layer as everything else (spec FR-036).
 */
export const Shop: GlobalConfig = {
  slug: 'shop',
  label: 'Shop settings',
  admin: { group: 'Shop' },
  access: {
    read: () => true,
    update: isAdmin,
  },
  // Publishing invalidates the cached routes (003/T294). These words are on every product
  // page, so a change here is a change to all of them.
  hooks: {
    afterChange: [revalidateGlobalOnChange],
  },
  fields: [
    /**
     * The three accordion HEADINGS (003/T292a).
     *
     * This global originally modelled the bodies and not the headings, on the reasoning that the
     * headings never move. "3 year warranty + free returns" is a claim about how the shop
     * operates, though, and Constitution I does not let a claim like that need a deployment to
     * change — if the warranty becomes two years, the owner must be able to say so.
     *
     * Defaults are the drawn strings, so an untouched install renders exactly what Figma shows.
     */
    {
      name: 'detailsTitle',
      type: 'text',
      localized: true,
      label: 'Product details heading',
      defaultValue: 'PRODUCT DETAILS',
      admin: { description: 'The first accordion’s heading on every product page.' },
    },
    {
      name: 'warrantyTitle',
      type: 'text',
      localized: true,
      label: 'Warranty heading',
      defaultValue: 'WARRANTY AND RETURNS',
      admin: {
        description:
          'The second accordion’s heading. It states the warranty length, so it is editable.',
      },
    },
    {
      name: 'deliveryTitle',
      type: 'text',
      localized: true,
      label: 'Delivery heading',
      defaultValue: 'DELIVERY',
      admin: { description: 'The third accordion’s heading.' },
    },
    {
      name: 'warranty',
      type: 'richText',
      localized: true,
      label: 'Warranty and returns',
      admin: {
        description: 'The "Warranty and returns" accordion, shown on every product.',
      },
    },
    {
      name: 'delivery',
      type: 'richText',
      localized: true,
      label: 'Delivery',
      admin: { description: 'The "Delivery" accordion, shown on every product.' },
    },
    {
      name: 'listingSubtitle',
      type: 'text',
      localized: true,
      label: 'Default listing subtitle',
      admin: {
        description:
          'The sentence beneath a listing heading when a category has not set its own, and on "All products".',
      },
    },
  ],
}
