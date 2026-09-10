import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import { isDatabaseUnreachable } from '@/lib/catalog/prerender'

import { toStoryPage } from './mappers'
import type { StoryPage } from './types'

/**
 * Reading the story page (spec 006, T022, contracts/story-loader.md).
 *
 * **The only module that knows this page came from Payload.** Everything above it sees the view
 * models in `./types.ts` — the same seam `src/lib/catalog/queries.ts` is for the catalogue, and the
 * reason a lint rule keeps documents out of components.
 *
 * **One function, deliberately.** There is no `getQuestions()` here. Questions reach the page only
 * through the FAQ band's own selection, resolved by the `depth` below rather than by a query of
 * their own — a second entry point would let a future caller show questions the editor did not
 * choose.
 *
 * **`/faq` did not add its function to this file** (008/T009), which is what this comment used to
 * predict. It reads every published question rather than a chosen subset, so it needs a query this
 * page must never have; and by then the questions were shared by three pages, so the view model and
 * its mapper had moved to `@/lib/questions/` and the loader followed them there. The prediction was
 * right that `/faq` was coming and wrong about where it would live.
 *
 * **`depth: 2` is the number the shape needs, not a guess.** The blocks hold uploads and a
 * questions relationship at depth 1; a question's own fields are plain, so nothing needs a third
 * hop. Leaving it at Payload's default of 2 would work by luck rather than by decision, which
 * Constitution IV rules out.
 *
 * **Deduplicated per request, not cached across requests.** `cache()` collapses the two reads a
 * single render makes — the page body and `generateMetadata` — into one. Anything longer-lived
 * would need an invalidation story, and this route deliberately has none: it is `force-dynamic`
 * (006/research.md R6), so a publish is visible to the next visitor because nothing was stored.
 */

const client = cache(async () => getPayload({ config }))

/**
 * **Tolerates a build with no database**, which is not an edge case here — it is how the production
 * image is made. `src/lib/catalog/prerender.ts` records the whole chicken-and-egg, and
 * `src/lib/messengers/settings.ts` already does this for the root layout.
 *
 * Only a CONNECTION failure is tolerated. A schema mismatch, a bad query or a mapper throwing must
 * still fail the build, or the day the database is misconfigured looks exactly like the day the
 * shop has no About page.
 */
export const getStoryPage = cache(async (): Promise<StoryPage | null> => {
  try {
    const payload = await client()
    const document = await payload.findGlobal({
      slug: 'story-page',
      depth: 2,
      // The access rules do the work: `adminOrPublishedStatus` on `questions` makes a draft
      // unreachable rather than filtered, so there is no status check anywhere in this tier.
      overrideAccess: false,
      draft: false,
    })

    return toStoryPage(document)
  } catch (error) {
    if (!isDatabaseUnreachable(error)) throw error

    console.warn(
      '  ⚠ No database at build time — /about renders empty. This is expected when building the ' +
        'container image; the first request reads the real page.',
    )
    return null
  }
})
