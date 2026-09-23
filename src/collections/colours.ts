import type { CollectionBeforeDeleteHook, CollectionConfig } from 'payload'

import { isAdmin } from '@/lib/access'
import { revalidateOnChange, revalidateOnDelete } from '@/lib/revalidate'

/**
 * A colour a piece can be, and a customer can filter by (spec 011, US3, FR-017).
 *
 * **This used to be four values in a `select`**, which meant adding rose gold was a developer task
 * and a deployment — the one arrangement every other descriptive vocabulary in this shop avoids.
 * Now it is the owner's.
 *
 * **Modelled on `categories`, deliberately NOT on the departing `sizes`** (011/research.md R1).
 * `sizes` had two halves this codebase never separated: a small owner-managed vocabulary, and a
 * load-bearing role on the product — a required selector before add-to-cart, and part of cart-line
 * identity. Colour needs the first half and must never acquire the second. What it copies is
 * therefore the shape `categories` and `collections` already have: a relationship target resolved
 * through `Reference` in `queries.ts` and matched on a stable slug.
 *
 * **Not an `attributes` row**, for one word in that file: attributes are deliberately NOT
 * filterable (003/research.md R4), because making every attribute a filter is a join per active
 * filter on the query that runs on every listing view. Colour is a filter and stays one.
 */

/**
 * A colour still in use cannot be deleted (FR-023).
 *
 * The two alternatives are both worse. Letting it go leaves published pieces pointing at a row that
 * no longer exists — the exact state a relationship is here to prevent, and one that would show as
 * a filter value nothing can match. Silently stripping the colour from those pieces is a content
 * change the owner did not ask for and would not see.
 *
 * So it refuses, and says how many pieces are in the way, because "cannot delete" without a number
 * is an error message that sends somebody hunting.
 */
const refuseWhileInUse: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { totalDocs } = await req.payload.count({
    collection: 'products',
    overrideAccess: true,
    req,
    where: { colour: { equals: id } },
  })

  if (totalDocs > 0) {
    throw new Error(
      `This colour is still used by ${totalDocs} product${totalDocs === 1 ? '' : 's'}. ` +
        'Remove it from them first — deleting it here would leave those products pointing at a colour that no longer exists.',
    )
  }
}

export const Colours: CollectionConfig = {
  slug: 'colours',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'value', 'order'],
    group: 'Shop',
    description: 'The colours a piece can be filtered by. Renaming a label never changes its link.',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  // Publishing invalidates the cached routes (003/T294). A colour is a filter option and a chip
  // label on every listing.
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
      admin: { description: 'What the customer reads in the filter, e.g. "Black".' },
    },
    {
      name: 'value',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Value',
      admin: {
        description:
          'What appears in the address bar when this colour is filtered on. Keep it lowercase and hyphenated — "rose-gold". Changing it breaks links that already exist.',
      },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Order',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Lowest first in the filter drawer.' },
    },
  ],
}
