import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import { DEFAULT_BANNER_BODY_HTML } from '@/globals/cookie-settings'
import { isDatabaseUnreachable } from '@/lib/catalog/prerender'

import { toCookieSettings, toPolicy, toPolicyLink } from './mappers'
import type { CookieSettings, FooterPolicies, Policy } from './types'

/**
 * Reading policies and the cookie settings (spec 009, T013).
 *
 * **Server-only, cached per request.** The root layout asks for the footer's policies and the
 * cookie settings on every page; `cache()` collapses a repeat ask within one request.
 *
 * **A Local API read is not a request-time API**, which is the property this whole feature leans on.
 * `src/lib/messengers/settings.ts` records it: unlike `cookies()`, calling these from the root
 * layout does not opt every route into dynamic rendering, so the prerendered catalogue survives the
 * banner being added to the chrome (009/research.md R3, R5).
 *
 * **Every read tolerates an unreachable database.** That is not defensive padding — the production
 * image runs `next build` before the migrations, so the database genuinely does not exist during a
 * build. Spec 005 discovered this when a root-layout read broke the container build on
 * `/forgot-password`, a page with nothing to do with the thing being read.
 *
 * **No status filter anywhere below.** `adminOrPublishedStatus` on the collection makes a draft
 * unreachable rather than merely filtered, so a second check here would put the publication rule in
 * two places — and the one nobody looks at is where it drifts.
 */

const client = cache(async () => getPayload({ config }))

/** One published policy, or `null` — which the route turns into a 404. */
export const getPolicyBySlug = cache(async (slug: string): Promise<Policy | null> => {
  try {
    const payload = await client()
    const found = await payload.find({
      collection: 'policies',
      where: { slug: { equals: slug } },
      limit: 1,
      // The SEO image is an upload relationship and has to be resolved to be rendered.
      depth: 1,
      overrideAccess: false,
      draft: false,
    })

    return toPolicy(found.docs[0])
  } catch (error) {
    if (!isDatabaseUnreachable(error)) throw error
    return null
  }
})

/**
 * The footer's policy links, split by where they belong (FR-015b, FR-015c).
 *
 * Unpublishing removes a policy from this result, and therefore from the footer, with nothing else
 * to remember — which is the whole point of the footer reading content instead of a constant.
 */
export const getFooterPolicies = cache(async (): Promise<FooterPolicies> => {
  const empty: FooterPolicies = { legal: [], customerCare: [] }

  try {
    const payload = await client()
    const found = await payload.find({
      collection: 'policies',
      where: { footerPlacement: { not_equals: 'hidden' } },
      sort: 'footerOrder',
      limit: 0,
      depth: 0,
      overrideAccess: false,
      draft: false,
    })

    return found.docs.reduce<FooterPolicies>((groups, document) => {
      const link = toPolicyLink(document)
      if (!link) return groups

      if (document.footerPlacement === 'legal') groups.legal.push(link)
      else if (document.footerPlacement === 'customer-care') groups.customerCare.push(link)

      return groups
    }, empty)
  } catch (error) {
    if (!isDatabaseUnreachable(error)) throw error

    console.warn(
      '  ⚠ No database at build time — the footer shows no policy links. This is expected when ' +
        'building the container image; the first real request reads them.',
    )
    return empty
  }
})

/** Published slugs, for the sitemap. Mirrors `getArticleSlugs()`. */
export const getPolicySlugs = cache(async (): Promise<string[]> => {
  const payload = await client()
  const found = await payload.find({
    collection: 'policies',
    limit: 0,
    depth: 0,
    select: { slug: true },
    overrideAccess: false,
    draft: false,
  })

  return found.docs.map((document) => document.slug).filter(Boolean)
})

/**
 * The banner's configuration.
 *
 * **`depth: 1` so the linked Cookie Policy resolves to a document** — the banner needs its slug to
 * build a link, and an unresolved id would leave it linking nowhere. An unpublished target does not
 * resolve, which is exactly right: the banner renders without a link rather than pointing at a 404
 * (FR-022).
 *
 * A failure returns the disabled shape rather than throwing. A site that cannot read its cookie
 * settings must not show a consent banner it cannot describe.
 */
export const getCookieSettings = cache(async (): Promise<CookieSettings> => {
  try {
    const payload = await client()
    const document = await payload.findGlobal({
      slug: 'cookie-settings',
      depth: 1,
      overrideAccess: false,
      draft: false,
    })

    return toCookieSettings(document)
  } catch (error) {
    if (!isDatabaseUnreachable(error)) throw error
    return {
      enabled: false,
      consentVersion: 1,
      bannerBodyHtml: DEFAULT_BANNER_BODY_HTML,
      categories: [],
    }
  }
})
