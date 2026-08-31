import type { GlobalConfig } from 'payload'

import { isAdmin } from '@/lib/access'

/**
 * Shop-wide copy that is not per-product.
 *
 * A product page draws three accordions. "Product details" differs for every piece and lives on the
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
  fields: [
    {
      name: 'warranty',
      type: 'richText',
      label: 'Warranty and returns',
      admin: {
        description: 'The "3 year warranty + free returns" accordion, shown on every product.',
      },
    },
    {
      name: 'delivery',
      type: 'richText',
      label: 'Delivery',
      admin: { description: 'The "Delivery" accordion, shown on every product.' },
    },
    {
      name: 'listingSubtitle',
      type: 'text',
      label: 'Default listing subtitle',
      admin: {
        description:
          'The sentence beneath a listing heading when a category has not set its own, and on "All jewelry".',
      },
    },
  ],
}
