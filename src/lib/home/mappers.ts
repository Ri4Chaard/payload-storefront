import type { HomePage } from '@/payload-types'

import { toCatalogImage } from '@/lib/catalog/mappers'

import type { HomeContent } from './types'

/**
 * The home page global, as the four bands want it.
 *
 * **The addresses are here rather than in the admin.** `/all-products` and `/about` are routes this
 * application defines; an editor who could retype them could point the hero at a 404 and would have
 * no way to discover they had. The words beside them are theirs, which is the half that was stuck
 * in a fixture file until now.
 */
export function toHomeContent(page: HomePage): HomeContent {
  return {
    hero: {
      headline: page.hero.headline,
      lede: page.hero.lede,
      cta: { label: page.hero.ctaLabel, href: '/all-products' },
      image: toCatalogImage(page.hero.photo),
    },
    categoriesHeading: page.categoriesHeading,
    featured: {
      heading: page.featuredHeading,
      cta: { label: page.featuredCtaLabel, href: '/all-products' },
    },
    about: {
      heading: { lead: page.about.headingLead, emphasis: page.about.headingEmphasis },
      /*
        Empty paragraphs are dropped rather than rendered. An editor who clears a box and saves has
        removed that paragraph; drawing an empty `<p>` at the band's measure leaves a gap they
        cannot see the cause of, and `fallback.spec.ts` counts empty blocks as a defect.
      */
      body: (page.about.body ?? [])
        .map((entry) => entry.text?.trim() ?? '')
        .filter((text) => text !== ''),
      cta: { label: page.about.ctaLabel, href: '/about' },
      image: toCatalogImage(page.about.photo),
    },
  }
}
