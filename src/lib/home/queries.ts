import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import { DEFAULT_LOCALE, type Locale } from '@/i18n/routing'
import { isDatabaseUnreachable } from '@/lib/catalog/prerender'

import { toHomeContent } from './mappers'
import type { HomeContent } from './types'

/**
 * Reading the home page's copy.
 *
 * **`null` when there is no database, never a thrown build.** `/` is `force-dynamic`, so this is
 * not reached during the container build — but `generateMetadata` is, and the same rule the story
 * and blog readers follow keeps one unreachable database from failing an image build. The page
 * renders its bands from the catalogue and omits the ones this would have supplied.
 *
 * **`fallbackLocale: DEFAULT_LOCALE`**, so a headline translated only into English still renders on
 * `/ru` rather than leaving the first screen blank.
 */
export const getHomeContent = cache(async (locale: Locale): Promise<HomeContent | null> => {
  try {
    const payload = await getPayload({ config })
    const page = await payload.findGlobal({
      locale,
      fallbackLocale: DEFAULT_LOCALE,
      slug: 'home-page',
      depth: 1,
      overrideAccess: false,
      draft: false,
    })
    return toHomeContent(page)
  } catch (error) {
    if (!isDatabaseUnreachable(error)) throw error
    console.warn('  ⚠ No database — the home page renders its catalogue bands only.')
    return null
  }
})
