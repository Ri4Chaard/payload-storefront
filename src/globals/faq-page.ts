import type { GlobalConfig } from 'payload'

import { seoField } from '@/fields/seo'
import { isAdmin } from '@/lib/access'

/**
 * The `/faq` page's own copy.
 *
 * **Deliberately tiny, and that is the design.** The page's content is the questions themselves —
 * everything here is what wraps them. Four fields for a whole page looks thin next to
 * `contact-page`; it is thin because `src/collections/questions.ts` was written in spec 006 to
 * carry this page's content before the page existed, and it does.
 *
 * **There is no question-selection field, and there must not be**. `/about` and `/contact`
 * each pick a subset because a band of five questions is part of a longer page; `/faq` is the list.
 * Publishing a question is the only action needed for it to appear here, which is what the
 * collection's `order` field description has promised since spec 006: "Lowest first, in this list
 * and on the FAQ page."
 *
 * **The empty pair is not an afterthought.** Every page on this site links here from its footer, so
 * a `/faq` with nothing published must render a heading and a plain message rather than a 404 —
 * answering a link the site itself publishes with "not found" is worse than a thin page. Mirrors
 * `src/globals/blog-page.ts`, which reached the same conclusion for `/blog`.
 *
 * **No revalidation hook**, for the reason `src/collections/questions.ts` records: the route is
 * `force-dynamic`, so nothing is cached, and the shared `invalidate()` would evict the whole
 * catalogue over a heading edit.
 */
export const FaqPage: GlobalConfig = {
  slug: 'faq-page',
  label: 'FAQ page',
  admin: {
    group: 'Content',
    description:
      'The heading above the questions, and what the page says when none are published. The questions themselves live in Content → FAQ.',
  },
  versions: { drafts: true },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'heading',
      type: 'textarea',
      localized: true,
      required: true,
      defaultValue: 'Frequently Asked Questions',
      label: 'Headline',
      admin: { description: 'The page’s title, drawn centred.' },
    },
    {
      name: 'emptyTitle',
      type: 'text',
      localized: true,
      required: true,
      defaultValue: 'Nothing here yet',
      label: 'Empty heading',
      admin: { description: 'Shown in place of the questions when none are published.' },
    },
    {
      name: 'emptyDescription',
      type: 'textarea',
      localized: true,
      required: true,
      defaultValue:
        'We’re writing the answers to the questions we’re asked most. In the meantime, our team is a message away.',
      label: 'Empty message',
      admin: { description: 'The sentence under the empty heading above.' },
    },
    seoField(),
  ],
}
