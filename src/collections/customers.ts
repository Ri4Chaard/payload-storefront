import type { CollectionConfig } from 'payload'

import { composeCustomerName, stampMarketingConsent } from '@/collections/customer-hooks'
import { isAdmin, publicAccess } from '@/lib/access'
import {
  generateVerificationEmailHTML,
  generateVerificationEmailSubject,
} from '@/lib/auth/verification-email'
import { LOGIN_LOCK_MS, LOGIN_MAX_ATTEMPTS, SESSION_TTL_SECONDS } from '@/lib/auth/config'

/**
 * People who shop. **The door, now — spec 004 fitted it to the frame.**
 *
 * This collection arrived in 003 for one structural reason: the e-commerce plugin's
 * `customers.slug` is a required config key, and its carts collection builds a relationship field
 * against it. Payload will not boot without the collection existing (003/research.md R5). It sat
 * there with `create: isAdmin` and a single `name` field, and its comment listed registration,
 * verification, password reset and profile screens as "deliberately absent … those are the customer
 * accounts spec". Those have landed.
 *
 * The alternative — pointing the plugin at `admins` — would make every customer a possible
 * admin-panel login, rejected only by an access function returning the right boolean forever. Spec
 * 001 created two collections precisely so that boundary holds by construction. It still does: this
 * is never `admin.user`, and there is no `admin` key below.
 *
 * **What is still deliberately absent**: `phone` and a messenger handle. The brief lists them among
 * editable contact details, but no frame in the profile design draws either, and a messenger handle
 * is only used by the request-and-handoff spec — which is where they belong. Fields that no screen
 * fills are how a content model rots.
 */
export const Customers: CollectionConfig = {
  slug: 'customers',
  auth: {
    /**
     * An address must be proved before the account works (FR-004, FR-008).
     *
     * Turning this on is also what makes `login` throw `UnverifiedEmail` rather than succeeding
     * (`payload/dist/auth/operations/login.js:184`), which is the mechanism behind FR-011's one
     * permitted disclosure: an unverified customer is routed to the verification step instead of
     * being told nothing.
     *
     * `generateEmailHTML` is where the link becomes a six-digit code — see
     * `src/lib/auth/verification-email.ts` and 004/research.md R3.
     */
    verify: {
      generateEmailHTML: generateVerificationEmailHTML,
      generateEmailSubject: generateVerificationEmailSubject,
    },

    /** Reset is code-based too; same interception, same reason. FR-018. */
    forgotPassword: {},

    /** FR-014. Payload owns the counter and the lock; it throws `LockedAuth` when tripped. */
    lockTime: LOGIN_LOCK_MS,
    maxLoginAttempts: LOGIN_MAX_ATTEMPTS,

    /**
     * FR-012. Payload's default is 7200 seconds — two hours — which would sign a customer out
     * between one visit and the next and fail the requirement outright.
     */
    tokenExpiration: SESSION_TTL_SECONDS,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'createdAt'],
    group: 'Shop',
  },
  access: {
    /**
     * Public, as of this spec. This is the door opening, and it is the only public write in the
     * feature — everything else requires the session that registering eventually produces.
     */
    create: publicAccess,
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
  hooks: {
    beforeChange: [composeCustomerName, stampMarketingConsent],
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      label: 'First name',
      admin: { description: 'Set by the customer on their profile.' },
    },
    {
      name: 'lastName',
      type: 'text',
      label: 'Last name',
      admin: { description: 'Set by the customer on their profile.' },
    },
    {
      name: 'name',
      type: 'text',
      label: 'Full name',
      admin: {
        readOnly: true,
        description:
          'Composed from the first and last name by a hook. Kept because the admin list, the title and the seller’s view of a customer were all built on it.',
      },
    },
    {
      name: 'marketingEmail',
      type: 'checkbox',
      defaultValue: false,
      label: 'Marketing email',
      admin: {
        description:
          'Opt-in, and off unless the customer said otherwise. Turning this off must never stop a verification code or a password-change notice — those are transactional and travel a different path entirely.',
      },
    },
    {
      name: 'marketingEmailUpdatedAt',
      type: 'date',
      label: 'Consent last changed',
      admin: {
        readOnly: true,
        description:
          'Written by a hook, which discards whatever the request supplied. This is the evidence that consent was given or withdrawn, and when.',
      },
    },
    {
      name: 'marketingEmailSource',
      type: 'select',
      label: 'Consent given at',
      options: [
        { label: 'Registration', value: 'registration' },
        { label: 'Profile', value: 'profile' },
      ],
      admin: {
        readOnly: true,
        description: 'Written by the same hook. Where the current choice was made.',
      },
    },
  ],
}
