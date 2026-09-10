import type { CollectionConfig } from 'payload'

import { adminOrPublishedStatus, isAdmin } from '@/lib/access'

/**
 * The shop's frequently asked questions (spec 006, FR-028 – FR-038).
 *
 * **Its own collection, and that is the whole point of it.** The questions are drawn at the bottom
 * of the Our Story page, and modelling them as fields on that page would have been the shorter
 * route. It would also have guaranteed a second copy: a standalone `/faq` page is coming — the
 * footer has linked it since spec 001 — and it would have had to either read another page's
 * internals or have the questions typed again. Constitution II's rule against duplication is
 * usually about components; this is the same rule applied to content, and the requester asked for
 * it in those words: "we should make faq as separate tab in the admin panel".
 *
 * **The admin tab really does say FAQ.** Payload's navigation renders a collection's plural label,
 * so `plural: 'FAQ'` is literally the tab that was asked for. The slug stays `questions` because
 * Constitution IV requires plural collection slugs, and because `/api/questions` reads like an
 * address while `/api/faq` reads like a page.
 *
 * **Both fields are required, because an unanswerable question is not content.** FR-030: a row with
 * an empty answer renders a control that expands to nothing. Constitution IV asks for validation at
 * the field level so invalid content cannot be published in the first place, rather than a renderer
 * coping with it later.
 *
 * **`order` is for the list and for the page that does not exist yet.** The Our Story page does NOT
 * sort by it — the FAQ block holds a relationship to the questions it shows, and that relationship's
 * row order is the display order (FR-032), the same reasoning `contact-settings.ts` records for the
 * messenger array. This field is the default sort in the admin and the order the standalone `/faq`
 * page will take when it arrives. Payload 3.88 does offer `orderable: true` with drag handles, but
 * it is annotated experimental with "frequent breaking changes", which is not a foundation to put an
 * editor's workflow on when `categories.order` already works.
 *
 * **No revalidation hook, deliberately.** Every other content collection here carries
 * `revalidateOnChange`, and copying it would have been the unthinking move. `/about` is
 * `force-dynamic` (006/research.md R6), so there is nothing cached to invalidate — and
 * `invalidate()` walks every product slug, so a hook here would evict the entire catalogue because
 * somebody fixed a typo in an answer.
 */
export const Questions: CollectionConfig = {
  slug: 'questions',
  labels: { singular: 'Question', plural: 'FAQ' },
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['question', 'order', '_status'],
    group: 'Content',
    description: 'Questions and answers. Shown wherever a page asks for them.',
  },
  versions: { drafts: true },
  access: {
    // A draft is unreachable rather than hidden: the constraint is part of the query, so a direct
    // API request for an unpublished question finds nothing (FR-033).
    read: adminOrPublishedStatus,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'question',
      type: 'text',
      required: true,
      label: 'Question',
      admin: { description: 'As a visitor would ask it, e.g. “Do you ship internationally?”.' },
    },
    {
      name: 'answer',
      type: 'richText',
      required: true,
      label: 'Answer',
      admin: { description: 'Links and lists are supported.' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: 'Order',
      admin: {
        position: 'sidebar',
        description:
          'Lowest first, in this list and on the FAQ page. A page that picks its own questions uses its own order instead.',
      },
    },
  ],
}
