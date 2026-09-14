import type { CatalogImage } from '@/lib/catalog/types'

/**
 * What the home page renders, with no Payload document in sight (spec 010).
 *
 * **The shapes are the components' props, not the global's fields.** `Hero`, `CategoryBand`,
 * `JewelryCarousel` and `AboutBand` were built against `src/mocks/home.ts` and are unchanged by this
 * move — which is the point of a mapper. A view model that mirrored the global would have made
 * replacing the fixtures a rewrite of four components rather than a rewrite of one file.
 *
 * The `href`s are absent for the same reason: they are routes, decided in code, and an editor who
 * could repoint the hero's button at anything could point it at a page that does not exist.
 */

export interface HomeLink {
  label: string
  href: string
}

export interface HomeContent {
  hero: {
    headline: string
    lede: string
    cta: HomeLink
    image: CatalogImage | null
  }
  categoriesHeading: string
  featured: {
    heading: string
    cta: HomeLink
  }
  about: {
    /** The drawn heading is two-tone: the first word in ink, the name in the brand colour. */
    heading: { lead: string; emphasis: string }
    body: string[]
    cta: HomeLink
    image: CatalogImage | null
  }
}
