import type { CollectionConfig } from 'payload'

import { isAdmin } from '@/lib/access'

/**
 * People who shop. A door frame, not a door.
 *
 * This collection exists in THIS spec for one structural reason: the e-commerce plugin's
 * `customers.slug` is a required config key, and its carts collection builds a relationship field
 * against it. Payload will not boot without the collection existing (003/research.md R5).
 *
 * The alternative — pointing the plugin at `admins` — would make every customer a possible
 * admin-panel login, rejected only by an access function returning the right boolean forever. Spec
 * 001 created two collections precisely so that boundary holds by construction. It still does: this
 * is never `admin.user`.
 *
 * **What is deliberately absent**: registration, verification codes, password reset, profile
 * screens, public sign-up. Those are the customer accounts spec. `create` is admin-only until it
 * lands, so nobody can register through an API that has no flow behind it yet.
 */
export const Customers: CollectionConfig = {
  slug: 'customers',
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'createdAt'],
    group: 'Shop',
  },
  access: {
    // Opened to the public by the customer accounts spec, not before.
    create: isAdmin,
    read: ({ req }) => {
      if (req.user?.collection === 'admins') return true
      if (req.user?.collection === 'customers') return { id: { equals: req.user.id } }
      return false
    },
    update: ({ req }) => {
      if (req.user?.collection === 'admins') return true
      if (req.user?.collection === 'customers') return { id: { equals: req.user.id } }
      return false
    },
    delete: isAdmin,
    // No `admin` key: a customer is never an admin-panel identity.
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Name',
      admin: { description: 'How the seller addresses them in the conversation.' },
    },
  ],
}
