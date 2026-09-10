import type { GlobalConfig } from 'payload'

import { seoField } from '@/fields/seo'
import { isAdmin } from '@/lib/access'

/**
 * The `/about` page (spec 006).
 *
 * **The first page on this site whose COMPOSITION comes out of Payload.** Spec 002 shipped the home
 * page reading `src/mocks/home.ts` for its hero and about band, and named that as the last of the
 * deviation it opened. This page is drawn with seven bands and roughly forty distinct strings, and
 * Constitution I does not permit any of them to live in a component — nor, once the requester asked
 * for it, the arrangement either.
 *
 * **A global, not a collection.** One record, not a list: nothing in the design or the brief
 * suggests a second page of this shape, and a `pages` collection with routing of its own is
 * explicitly out of scope. Globals in Payload 3.88 carry drafts and versions like any collection, so
 * FR-015 costs nothing extra.
 *
 * **`blocks: []` beside `blockReferences` is required, not an oversight.** Payload types `blocks` as
 * mandatory on the field even when the definitions arrive by slug from `config.blocks`. Passing the
 * definitions in both places would defeat the point of referencing them.
 *
 * **The order and the membership are the editor's.** There is no fixed set of bands here — the page
 * is whatever blocks are in `body`, in whatever order they sit. An earlier draft of this spec
 * modelled seven named fields instead, and carried a declared Constitution I exception for it; the
 * requester chose the blocks, and the exception disappeared rather than being justified.
 *
 * **No revalidation hook**, for the reason `src/collections/questions.ts` records at length: the
 * route is `force-dynamic`, so nothing is cached, and the shared `invalidate()` would evict every
 * product page in the shop over a paragraph edit.
 */
export const StoryPage: GlobalConfig = {
  slug: 'story-page',
  label: 'Story page',
  admin: {
    group: 'Content',
    description: 'The /about page. Add, remove and reorder the bands below.',
  },
  versions: { drafts: true },
  access: {
    // Public, deliberately, exactly as `shop` and `contact-settings` are. Draft protection is the
    // loader's `draft: false`, not this rule — a global's drafts are a version query, not a row
    // filter, so there is nothing here for a `Where` to constrain.
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'body',
      type: 'blocks',
      label: 'Bands',
      blockReferences: [
        'page-header',
        'media-plate',
        'closer-look',
        'banner',
        'process-steps',
        'faq',
      ],
      blocks: [],
      admin: {
        description:
          'The page, top to bottom. Drag to reorder. A band left unfilled does not appear on the page.',
      },
    },
    seoField(),
  ],
}
