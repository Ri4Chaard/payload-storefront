import type { CollectionConfig } from 'payload'

import {
  captureCustomerCarts,
  composeCustomerName,
  deleteCustomerCarts,
  stampMarketingConsent,
  syncMarketingChoice,
} from '@/collections/customer-hooks'
import { DEFAULT_LOCALE, LOCALES, LOCALE_LABELS } from '@/i18n/routing'
import { isAdmin, publicAccess } from '@/lib/access'
import { generateResetEmailHTML, generateResetEmailSubject } from '@/lib/auth/reset-email'
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

    /**
     * Reset is code-based too; same interception, same reason. FR-018.
     *
     * Wiring this is not only for our own screens. Payload publishes
     * `POST /api/customers/forgot-password` for every auth collection, and its DEFAULT email links
     * to `/admin/reset/<token>` — a panel customers have no access to. Left unset, that endpoint
     * mails a customer a broken URL carrying a live reset credential. Set, every route through
     * `forgotPassword` produces the same six-digit code email.
     */
    forgotPassword: {
      generateEmailHTML: generateResetEmailHTML,
      generateEmailSubject: generateResetEmailSubject,
    },

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
    /**
     * `afterChange`, so the mirror only ever reflects a write that actually landed. Running it
     * before would announce a consent change to Resend that a later validation error could still
     * roll back.
     */
    afterChange: [syncMarketingChoice],
    /**
     * The customer's cart goes with them (spec 005, FR-049).
     *
     * Two hooks because `carts.customer_id` is `ON DELETE SET NULL`: the ids have to be captured
     * while the relationship still exists, and deleted only once the customer actually went. See
     * the hooks for the version that looked right and did nothing.
     */
    beforeDelete: [captureCustomerCarts],
    afterDelete: [deleteCustomerCarts],
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
    /**
     * The customer's saved delivery addresses, read from the other side of the relationship.
     *
     * **Not stored here.** A `join` is a virtual field: the rows live in `addresses`, which the
     * e-commerce plugin creates with `admin.hidden: true` because an address on its own is not a
     * thing anybody browses — it is a fact about a customer. Hidden kept it out of the navigation
     * and, until this field existed, out of the panel altogether: nothing linked a customer to
     * their addresses, so the one place a seller needs them was the one place they could not be
     * seen. That was an omission rather than a decision — spec 004 scoped the storefront profile
     * and never asked what the admin side should look like.
     *
     * It matters because of how this shop actually works: an order is a conversation on WhatsApp or
     * Telegram, and the seller fulfilling it needs the address the customer already typed. Asking
     * them for it again is the thing saved addresses exist to prevent (FR-027).
     *
     * **Default first**, then oldest, so the address that will be used at checkout is the one at
     * the top and the rest keep a stable order (FR-031). `createdAt` is the tiebreak because two
     * non-default addresses would otherwise come back in whatever order the database chose.
     *
     * `allowCreate` is left on. A seller taking a new address down mid-conversation should be able
     * to save it against the account, and the collection's own hooks hold FR-031 for that write
     * exactly as they do for the customer's own — which is the reason those hooks are in the
     * collection and not in the form.
     */
    {
      name: 'addresses',
      type: 'join',
      collection: 'addresses',
      on: 'customer',
      label: 'Delivery addresses',
      defaultSort: ['-isDefault', 'createdAt'],
      admin: {
        defaultColumns: ['country', 'city', 'addressLine1', 'postalCode', 'isDefault'],
        description:
          'Saved by the customer on their profile. Exactly one is the default; marking another moves it.',
      },
    },
    {
      /*
        The language this customer reads the site in (spec 010, FR-044).

        Recorded at registration from the page they registered on. Two uses: marketing campaigns can
        be segmented by it — which is what FR-044 asks for — and it is the fallback for any mail sent
        to them outside a request, where no page can say.

        NOT localized: it is a fact about a person, like their email address, and it must read the
        same whichever language an administrator is viewing the admin in.
      */
      name: 'locale',
      type: 'select',
      defaultValue: DEFAULT_LOCALE,
      options: LOCALES.map((code) => ({ label: LOCALE_LABELS[code].label, value: code })),
      label: 'Language',
      admin: {
        description: 'The language this customer was reading the site in when they registered.',
        position: 'sidebar',
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
