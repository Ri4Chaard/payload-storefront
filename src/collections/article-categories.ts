import type { CollectionConfig } from 'payload'

import { slugField } from '@/fields/slug'
import { isAdmin } from '@/lib/access'

/**
 * What an article is *about* — Diamonds, Jewelry, Guides, Stories (spec 007, FR-013, FR-014,
 * FR-039 – FR-041).
 *
 * **Not the shop's `categories`, and the distinction is load-bearing.** That collection answers
 * *what is this piece* — rings, bracelets, earrings, necklaces — and each of its rows drives three
 * things that have nothing to do with writing: a `/rings` route, the eyebrow above a product, and
 * the CATEGORY group in the filter drawer. Adding `Guides` there would give it a product listing at
 * `/guides` and put it in the drawer beside "Bracelets". `src/collections/categories.ts` already
 * records the same reasoning from the other direction, in its note about why "All jewelry" is not a
 * row.
 *
 * **A tab is a filter, not a page.** The slug is what appears in `?category=…` on `/blog`, which is
 * where 007/research.md R11 settles the difference: the shop puts a single category in the path
 * because a category listing there is a merchandising page with its own copy and SEO, while a blog
 * tab narrows one grid.
 *
 * **No drafts, no versions.** A taxonomy row has nothing to draft — there is no state in which
 * "Guides" is written but not ready.
 *
 * **No revalidation hook.** The only page that draws these is `/blog`, which is `force-dynamic`
 * (007/research.md R6), so there is nothing cached to invalidate. Copying `revalidateOnChange` from
 * `categories.ts` would have been the unthinking move and would evict the entire product catalogue
 * because somebody renamed a blog tab.
 */
export const ArticleCategories: CollectionConfig = {
  slug: 'article-categories',
  // A top-level property, not an admin one — `admin.defaultSort` type-checks nowhere.
  defaultSort: 'order',
  labels: { singular: 'Article category', plural: 'Article categories' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'order'],
    group: 'Content',
    description: 'The subjects the blog is organised by. Each becomes a tab on the blog.',
  },
  access: {
    // Public read: the tab strip is drawn for anonymous visitors on every blog page.
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
      label: 'Title',
      admin: {
        description:
          'The tab label, e.g. “Guides”. Type it normally — the blog draws it in capitals for you.',
      },
    },
    slugField({ from: 'title' }),
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: 'Order',
      admin: {
        position: 'sidebar',
        description: 'Lowest first, in this list and in the tab strip on the blog.',
      },
    },
  ],
}
