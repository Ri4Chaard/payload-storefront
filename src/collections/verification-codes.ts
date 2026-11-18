import type { CollectionConfig } from 'payload'

/**
 * The six digits a customer types, and the Payload token they stand for.
 *
 * **Why this exists.** Payload's email verification and password reset are link-based: it mints a
 * token and mails a URL containing it. The brief and the design both want a code. The tempting move
 * is to build a parallel credential — generate our own secret, compare it, expire it, and flip
 * `_verified` ourselves — which means reimplementing the one part of this feature most worth not
 * writing twice.
 *
 * So a row here is an ALIAS, not a credential of its own standing. Payload still mints the token,
 * still owns the cryptography, and still performs the state transition through `verifyEmail` and
 * `resetPassword`. This collection only remembers which six digits point at which token, and for
 * how long.
 *
 * **Access is `false` in every direction, for everyone.** Not "admins only" — nobody. No customer,
 * no admin, no anonymous request reaches this collection through REST, GraphQL or the admin panel.
 * The only thing that touches it is `src/lib/auth/codes.ts`, using the Local API with
 * `overrideAccess: true`. Constitution IV asks for access to be a deliberate decision rather than a
 * default; this one is deliberate, and the decision is "nobody", because the rows are live
 * credentials in flight.
 *
 * **The code is stored hashed.** FR-038 keeps codes out of logs, and storing them recoverably in a
 * table would make that promise half-hearted — a database dump would hand over every code in
 * flight. Comparison happens against the hash.
 */
export const VerificationCodes: CollectionConfig = {
  slug: 'verification-codes',
  admin: {
    // Not merely tidy: there is nothing here an editor can act on, and a code visible in the panel
    // is a code that has been shoulder-surfed.
    hidden: true,
    useAsTitle: 'email',
  },
  access: {
    create: () => false,
    delete: () => false,
    read: () => false,
    update: () => false,
  },
  fields: [
    {
      name: 'email',
      type: 'text',
      required: true,
      index: true,
      label: 'Email address',
      admin: {
        description:
          'The address the code was issued to. Every lookup and every throttle is keyed on this rather than on the customer, so a code can still be refused after the account it belonged to is purged.',
      },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      label: 'Customer',
      admin: {
        description: 'Convenience for support. Never the lookup key — see the email field.',
      },
    },
    {
      name: 'purpose',
      type: 'select',
      required: true,
      index: true,
      label: 'Purpose',
      options: [
        { label: 'Verify email address', value: 'verify-email' },
        { label: 'Reset password', value: 'reset-password' },
      ],
      admin: {
        description:
          'Part of every lookup. A code minted to verify an address must never be able to complete a password reset.',
      },
    },
    {
      name: 'codeHash',
      type: 'text',
      required: true,
      label: 'Code hash',
      admin: { description: 'The hash of the six digits. The digits themselves are never stored.' },
    },
    {
      name: 'token',
      type: 'text',
      required: true,
      label: 'Payload token',
      admin: {
        description:
          'The verification or reset token Payload minted. This is what the code is an alias for.',
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      index: true,
      label: 'Expires at',
    },
    {
      name: 'attempts',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: 'Failed attempts',
      admin: { description: 'The code is burned once this reaches the configured limit.' },
    },
    {
      name: 'consumedAt',
      type: 'date',
      label: 'Consumed at',
      admin: { description: 'Set on success. A code is single-use.' },
    },
    {
      name: 'supersededAt',
      type: 'date',
      label: 'Superseded at',
      admin: {
        description: 'Set when a newer code is issued for the same address and purpose.',
      },
    },
  ],
  timestamps: true,
}
