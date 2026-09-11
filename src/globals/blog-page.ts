import type { GlobalConfig } from 'payload'

import { seoField } from '@/fields/seo'
import { isAdmin } from '@/lib/access'

/**
 * The blog index's own copy (spec 007, FR-003, FR-012, FR-042).
 *
 * **Flat fields, not a block composition — and that is a deliberate departure from `/about`.**
 * `story-page` is `blockReferences` because that page is seven bands whose order is genuinely the
 * editor's. The blog index is one page header above a mosaic, and **the mosaic cannot be a block**:
 * it is the page's purpose rather than a band somebody can move or delete. A `body: blocks` field
 * here would offer an editor the ability to reorder a header against a grid that is not in the
 * list, which is a worse admin than four labelled fields. 007/research.md R2 records the
 * alternative in full, including what it would have bought.
 *
 * **The defaults are content, not code.** A `defaultValue` applies until the global is first saved,
 * so a fresh install renders the drawn page rather than a blank one — and every string here stays
 * something an editor can change without a deploy, which is what Constitution I actually asks for.
 * The same mechanism `story-page` uses, for the same reason.
 *
 * **No revalidation hook.** `/blog` is `force-dynamic` (007/research.md R6), so there is nothing
 * cached to invalidate, and the shared `invalidate()` would evict every product page in the shop
 * over a heading edit.
 */
export const BlogPage: GlobalConfig = {
  slug: 'blog-page',
  label: 'Blog page',
  admin: {
    group: 'Content',
    description: 'The heading above the blog, and what it says when nothing is published.',
  },
  versions: { drafts: true },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      localized: true,
      defaultValue: 'OUR BLOG',
      label: 'Eyebrow',
      admin: { description: 'The small line above the headline, e.g. “OUR BLOG”.' },
    },
    {
      name: 'heading',
      type: 'textarea',
      localized: true,
      required: true,
      defaultValue: 'Stories of diamonds, craftsmanship, and timeless beauty',
      label: 'Headline',
      admin: { description: 'The blog’s main statement. Drawn over two lines.' },
    },
    {
      name: 'emptyTitle',
      type: 'text',
      localized: true,
      required: true,
      defaultValue: 'Nothing published yet',
      label: 'Empty heading',
      admin: {
        description: 'Shown in place of the articles when none are published, or none match a tab.',
      },
    },
    {
      name: 'emptyDescription',
      type: 'textarea',
      localized: true,
      required: true,
      defaultValue: 'The first stories are being written. Check back soon.',
      label: 'Empty message',
      admin: { description: 'The sentence under the empty heading above.' },
    },
    seoField(),
  ],
}
