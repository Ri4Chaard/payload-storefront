import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import { DEFAULT_LOCALE, type Locale } from '@/i18n/routing'
import { isDatabaseUnreachable } from '@/lib/catalog/prerender'

import { toContactPage } from './mappers'
import type { ContactPage } from './types'

/**
 * Reading the contact page.
 *
 * **One function, and it does not return the channel cards.** WhatsApp, Telegram, Instagram and the
 * shop's email come from `src/lib/messengers/settings.ts` — `getSocialLinks()` and
 * `getContactDetails()`, which already serve the footer and the checkout modal. FR-008 forbids a
 * second place to write the shop's own accounts, and reusing those readers rather than adding
 * fields here is what makes that structural instead of a convention somebody has to keep.
 *
 * **`depth: 2` is the number the shape needs, not Payload's default arriving by luck.** The form's
 * photograph and the FAQ band's questions relationship both resolve at depth 1; a question's own
 * fields are plain and a media document's are too, so nothing needs a third hop. This is also what
 * makes a separate question query unnecessary — the selection arrives resolved.
 *
 * **Deduplicated per request, not cached across requests.** `cache()` collapses the two reads a
 * single render makes — the page body and `generateMetadata` — into one. Anything longer-lived
 * would need an invalidation story, and this route deliberately has none: it is `force-dynamic`
 *, so a publish is visible to the next visitor because nothing was stored.
 */

const client = cache(async () => getPayload({ config }))

/**
 * **Tolerates a build with no database**, which is not an edge case here — it is how the production
 * image is made. `next build` runs inside the container before the migrations, so nothing is
 * reachable; `src/lib/catalog/prerender.ts` records the whole chicken-and-egg and
 * `src/lib/messengers/settings.ts` records spec 005 meeting it in the root layout.
 *
 * Only a CONNECTION failure is tolerated. A schema mismatch, a bad query or a mapper throwing must
 * still fail the build, or the day the database is misconfigured looks exactly like the day nobody
 * has written the page.
 */
export const getContactPage = cache(async (locale: Locale): Promise<ContactPage | null> => {
  try {
    const payload = await client()
    const document = await payload.findGlobal({
      locale,
      fallbackLocale: DEFAULT_LOCALE,
      slug: 'contact-page',
      depth: 2,
      // The access rules do the work: `adminOrPublishedStatus` on `questions` makes a draft
      // unreachable rather than filtered, so there is no status check anywhere in this tier.
      overrideAccess: false,
      draft: false,
    })

    return toContactPage(document)
  } catch (error) {
    if (!isDatabaseUnreachable(error)) throw error

    console.warn(
      '  ⚠ No database at build time — /contact renders empty. This is expected when building the ' +
        'container image; the first request reads the real page.',
    )
    return null
  }
})
