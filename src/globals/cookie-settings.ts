import type { GlobalConfig } from 'payload'

import { isAdmin } from '@/lib/access'

/**
 * What the cookie banner asks, and when (spec 009, FR-026, FR-042, FR-045 – FR-051).
 *
 * **Deliberately small, and the smallness is the record of a decision.** There are no copy fields
 * here. The banner's heading, its paragraph and its three button labels are fixed in
 * `src/components/ui/cookie-banner/copy.ts` at the owner's explicit instruction (FR-025) — a
 * Constitution I exception recorded in `specs/009-policy-pages-cookie-consent/plan.md` under
 * Complexity Tracking, not taken by omission. If you are here looking for the field that changes
 * the banner's wording, it does not exist and its absence is on purpose; changing that wording is a
 * release.
 *
 * **There is no script field, no snippet field and no measurement ID field, and none may be added**
 * (FR-048). This site runs no analytics, no tag manager and no third-party script of any kind, and
 * this feature deliberately does not build the machinery to gate one — a gate built before the
 * thing it gates is code with no consumer. An admin field accepting a script is also a stored-XSS
 * vector by design on a site with customer accounts and addresses, which is why it is refused
 * rather than merely deferred. When analytics is genuinely wanted: add a category below, advance
 * `consentVersion`, and have a developer wire the provider against
 * `isAllowed()` in `src/lib/consent/record.ts`.
 *
 * **Categories are content, not machinery.** Nothing here loads or blocks anything. They exist so
 * that what the chooser offers and what the Cookie Policy describes cannot drift apart (FR-050),
 * and so that the consent record can be keyed per category — which is what makes adding a category
 * later ask everybody again instead of inheriting an old *Agree* (FR-040, and see `categories.key`).
 */
export const CookieSettings: GlobalConfig = {
  slug: 'cookie-settings',
  label: 'Cookie banner',
  admin: {
    group: 'Cookies',
    description:
      'Whether the banner is shown, and when to ask everyone again. The wording of the Cookie Policy itself lives in Content → Policies. The banner’s own wording is fixed and changing it needs a developer.',
  },
  versions: { drafts: true },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      label: 'Show the cookie banner',
      admin: {
        description:
          'Turn this off and no banner appears. Nothing optional is treated as agreed to while it is off, and decisions people have already made are kept — turning it back on does not ask them again.',
      },
    },
    {
      name: 'consentVersion',
      type: 'number',
      required: true,
      defaultValue: 1,
      min: 1,
      label: 'Consent version',
      admin: {
        description:
          'Raise this by one to ask EVERY visitor again — do that when the Cookie Policy changes materially, not for a typo. Their previous answers are filled in for them.',
      },
    },
    {
      name: 'policy',
      type: 'relationship',
      relationTo: 'policies',
      label: 'Cookie Policy page',
      admin: {
        description:
          'Where the banner’s “Cookie Policy” link goes. If this is empty, the banner still works — it just has no link.',
      },
    },
    {
      name: 'categories',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Cookie categories',
      labels: { singular: 'Category', plural: 'Categories' },
      /*
       * Row order is display order, with no position field to sort by — the same convention
       * `contact-settings.messengers` sets, and for the same reason: a second source of order is a
       * second thing that can disagree with what the admin shows.
       */
      admin: {
        description:
          'What the chooser lists. Keep these saying the same thing as the Cookie Policy page. Today there is one, because this site only sets cookies it cannot work without.',
        initCollapsed: false,
      },
      validate: (rows: unknown) => {
        if (!Array.isArray(rows) || rows.length === 0) return 'Add at least one category.'

        const keys = rows.map((row) => (row as { key?: string }).key).filter(Boolean)
        if (new Set(keys).size !== keys.length) return 'Two categories share an identifier.'

        const hasNecessary = rows.some((row) => (row as { necessary?: boolean }).necessary)
        if (!hasNecessary) {
          return 'At least one category must be strictly necessary — this site cannot run without its session and cart cookies, and the chooser must not offer them as optional.'
        }

        return true
      },
      fields: [
        {
          name: 'key',
          type: 'text',
          required: true,
          label: 'Identifier',
          /*
           * Stored inside every visitor's consent record. Re-using a key for a different purpose
           * would silently convert consent given for one thing into consent for another, which is
           * the single worst failure this feature can have — hence the warning in the description
           * rather than a quiet note in a comment.
           */
          validate: (value: unknown) =>
            typeof value === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)
              ? true
              : 'Lowercase letters, numbers and hyphens only — for example “analytics”.',
          admin: {
            description:
              'A short code, never shown to visitors. This is stored in each visitor’s saved choice, so NEVER re-use one for a different purpose — people’s past answers would be read as agreement to the new thing.',
          },
        },
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Name',
          admin: { description: 'What the chooser calls it, e.g. “Strictly necessary”.' },
        },
        {
          name: 'purpose',
          type: 'textarea',
          required: true,
          label: 'What it is for',
          admin: {
            description:
              'Plain language, written for a visitor rather than for a developer. One or two sentences.',
          },
        },
        {
          name: 'necessary',
          type: 'checkbox',
          required: true,
          defaultValue: false,
          label: 'Strictly necessary',
          admin: {
            description:
              'Ticked: always on, and the chooser explains why it cannot be switched off. Unticked: off until the visitor turns it on.',
          },
        },
      ],
    },
  ],
}
