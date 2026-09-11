import { HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { adminOrPublishedStatus, isAdmin } from '@/lib/access'

import { rejectDuplicateSlug } from './policy-hooks'

/**
 * The site's legal and informational pages (spec 009, FR-001 – FR-016).
 *
 * **A list, not four fixed pages** (FR-015). The footer has linked *Privacy Policy*,
 * *Terms & Conditions*, *Cookie Policy* and *Shipping & Returns* since spec 001 and all four were
 * 404s until this collection existed — but modelling exactly those four as four globals would have
 * been four copies of one shape, and would have made a fifth policy a deployment. The owner can
 * create one here and it gets an address, a footer slot and a sitemap row with nobody's help.
 *
 * **Served under `/legal/`, and the prefix is load-bearing** (009/research.md R1). Next permits one
 * dynamic segment per path position and the site's root one belongs to `(shop)/[category]` —
 * `/rings`, `/bracelets`, and the 404 for every unrecognised single segment. Putting policies at
 * bare root addresses would have meant replacing that route with a resolver trying category first
 * and policy second, re-routing the catalogue as a side effect of shipping legal pages. A prefix
 * costs four `href`s in the footer and removes all of it. Nothing under `src/app/(frontend)/(shop)/`
 * is touched by this feature.
 *
 * **No revalidation hooks, and that is deliberate rather than forgotten.** `/legal/[slug]` is
 * `force-dynamic`, so no policy page is cached and there is nothing to invalidate — publishing is
 * visible to the very next visitor (FR-056). The shared `invalidate()` in `src/lib/revalidate.ts`
 * walks every product slug, so attaching it here would evict the entire catalogue because somebody
 * fixed a typo in a paragraph. `questions.ts` and `articles.ts` both record the same trap.
 *
 * **`effectiveDate` is never written by a hook** (FR-008). A policy's effective date is a legal
 * claim the owner makes on purpose; a `beforeChange` that bumped it on save would silently restate
 * that claim every time somebody corrected a comma.
 */
export const Policies: CollectionConfig = {
  slug: 'policies',
  labels: { singular: 'Policy', plural: 'Policies' },
  defaultSort: 'footerOrder',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'footerPlacement', 'effectiveDate', '_status'],
    group: 'Content',
    description:
      'Privacy, terms, cookies, shipping — and anything else you need a page for. Each one appears at /legal/ plus its slug. The cookie categories these pages describe live in Cookies → Cookie banner.',
  },
  versions: { drafts: true },
  access: {
    /*
      A draft is unreachable rather than hidden, the same constraint `articles` sets: the rule is in
      the query, so a direct request to `/api/policies` for an unpublished policy finds nothing. A
      route-level `notFound()` cannot give this, because the REST API never reaches the route.
    */
    read: adminOrPublishedStatus,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [rejectDuplicateSlug],
  },
  fields: [
    slugField({ from: 'title' }),
    {
      name: 'effectiveDate',
      type: 'date',
      label: 'Effective date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'MMMM dd, yyyy' },
        description:
          'When this version of the policy takes effect. Yours to set — correcting a typo does not change it. Not drawn on the page; the line under the title is the “Subtitle” field.',
      },
    },
    {
      name: 'footerPlacement',
      type: 'select',
      required: true,
      defaultValue: 'legal',
      label: 'Footer placement',
      options: [
        { label: 'Legal row (bottom of the footer)', value: 'legal' },
        { label: 'Customer care column', value: 'customer-care' },
        { label: 'Not in the footer', value: 'hidden' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Where the link to this page appears. Unpublishing a policy removes its link wherever it was.',
      },
    },
    {
      name: 'footerOrder',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: 'Footer order',
      admin: {
        position: 'sidebar',
        description: 'Lowest first, within whichever footer group you chose above.',
      },
    },
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
      label: 'Title',
      admin: {
        description:
          'The heading on the page, and the wording of the link in the footer. Drawn in capitals — type it normally.',
      },
    },
    {
      /*
       * Free text rather than a formatted date, and the design is why (FR-007): three of the four
       * drawn pages read `Last Updated: August 2026` here and Shipping & Returns reads
       * `Enjoy complimentary shipping and returns on all orders`. A date field would render one of
       * those four correctly.
       */
      name: 'subtitle',
      type: 'text',
      localized: true,
      label: 'Subtitle',
      admin: {
        description:
          'The small line under the title. Free text — “Last Updated: August 2026”, or a sentence, or nothing.',
      },
    },
    {
      name: 'body',
      type: 'richText',
      localized: true,
      label: 'Body',
      /*
       * Headings are KEPT, and narrowed to two levels.
       *
       * **Kept**, unlike `src/collections/articles.ts`, which removes the heading feature entirely
       * so a chapter body cannot hide a section from the contents rail. A policy has no rail and
       * its whole structure is headed sections — INFORMATION WE COLLECT, HOW WE USE IT, YOUR
       * PRIVACY RIGHTS — so copying that filter would strip the one feature this content needs
       * most (009/research.md R8).
       *
       * **Narrowed to `h2` and `h3`**, because the page already owns its `h1`: the title above the
       * body is the document's only top-level heading, and a second one typed into a policy would
       * break the outline a screen reader follows. Constitution IV asks for validation that makes
       * invalid content impossible to save; this is that rule applied to structure — the toolbar
       * simply does not offer the levels that would be wrong, the same way `articles` does not
       * offer headings at all.
       */
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures.filter((feature) => feature.key !== 'heading'),
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
        ],
      }),
      admin: {
        description:
          'The policy itself. Use Heading 2 for each section — it is drawn bold and capitalised, as the design does. Paragraphs, bullet and numbered lists, bold, italic and links all work.',
      },
    },
    seoField(),
  ],
}
