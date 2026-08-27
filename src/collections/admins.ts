import type { CollectionConfig } from 'payload'

/**
 * Store staff — the identity Payload's admin panel authenticates against.
 *
 * Named `admins`, not `users`, deliberately. Customers arrive in spec 003 as their OWN collection,
 * and both have passwords, so "users" would read as "everyone" while meaning "staff".
 *
 * The separation is structural, not a role check. Payload designates exactly one collection as the
 * admin-panel identity (`admin.user`); keeping customers out of it means a customer has no row here
 * at all, so the brief's "customer accounts MUST NOT grant any access to the admin area" holds by
 * construction rather than by every access-control function returning the right boolean forever.
 *
 * Access control is stated explicitly rather than left to Payload's defaults. Constitution IV
 * requires the decision to be deliberate: a collection relying on defaults must say so on purpose.
 */
export const Admins: CollectionConfig = {
  slug: 'admins',
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email'],
    group: 'System',
  },
  access: {
    // Only authenticated admins touch this collection, in every direction.
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
    admin: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Name',
      admin: { description: 'Shown in the admin panel and on audit entries.' },
    },
  ],
}
