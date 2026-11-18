import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/routing'
import { isDatabaseUnreachable } from '@/lib/catalog/prerender'

/**
 * Which languages visitors are offered, right now.
 *
 * **Read in the render, never in `src/proxy.ts`.** Next's proxy documentation says that file
 * "should not attempt relying on shared modules or globals", and it may run at a CDN edge with no
 * database within reach. So the proxy routes all three languages and the render decides which of
 * them are actually offered — which is also why `/language/reset` exists.
 *
 * **A Local API global read is not a request-time API**, so calling this from the root layout does
 * not opt every route into dynamic rendering. `src/lib/policies/queries.ts` records the same
 * property for the same reason; this is the fifth reader on those terms.
 *
 * **All three when the database cannot be reached.** The production image runs `next build` before
 * the migrations, so during a container build there is genuinely no database — and a build that
 * decided the site had one language would bake that into every prerendered page.
 */
export const getEnabledLocales = cache(async (): Promise<Locale[]> => {
  try {
    const payload = await getPayload({ config })
    const settings = await payload.findGlobal({
      slug: 'language-settings',
      depth: 0,
      overrideAccess: false,
    })

    return LOCALES.filter((locale) => {
      // English is never switchable — it has no field, because FR-029 makes the attempt impossible
      // rather than merely refused.
      if (locale === DEFAULT_LOCALE) return true
      /*
        Indexed by a computed field name, because the fields are generated from the locale list —
        so the generated interface has `ruEnabled`/`ukEnabled` as known keys and no index signature.
        The cast is the narrow price of having one definition of "the three languages" instead of
        two that can disagree.
      */
      const value = (settings as unknown as Record<string, unknown>)[`${locale}Enabled`]
      // `undefined` means the owner has never opened the global. A site that has just been deployed
      // offers what it was configured with, rather than silently hiding two languages.
      return value === undefined ? true : value === true
    })
  } catch (error) {
    if (!isDatabaseUnreachable(error)) throw error
    return [...LOCALES]
  }
})

/** Whether one language is offered. The switcher asks this; so does the route guard. */
export async function isLocaleEnabled(locale: Locale): Promise<boolean> {
  return (await getEnabledLocales()).includes(locale)
}
