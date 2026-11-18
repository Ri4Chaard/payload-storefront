/**
 * Page bands — compositions of the kit, one tier above it (002/T102).
 *
 * Three tiers, and the boundaries are not stylistic:
 *
 *   ui/         the kit. Contract-bound: `check:stories` requires a stories file for everything in
 *               it, and the kit contract forbids it from knowing about products, prices or carts.
 *   commerce/   domain components built FROM the kit — they know what a product is.
 *   sections/   here. Page-level bands with copy-shaped props: a heading, a sentence, a list of
 *               things, a link. They know what a *page* looks like, which is neither of the above.
 *
 * Putting these in `ui/` would put page layout under the kit contract; putting them in `commerce/`
 * would call the hero a commerce concept. They still ship with stories, because that is how the
 * accessibility sweep reaches them.
 *
 * **Sections never read content.** They receive it. The route-level loader is the only thing that
 * reads it — which is what kept the swap from fixtures to Payload at one file per route (FR-003,
 * SC-008), and is why spec 010 could retire `src/mocks/` by rewriting one page and none of these.
 * `sections.fixtures.ts` is what remains of those fixtures: specimen props for the stories.
 */
export { AboutBand, type AboutBandProps } from './about-band'
export { CategoryBand, type CategoryBandProps } from './category-band'
export { Hero, type HeroProps } from './hero'
export { ListingHeader, type ListingHeaderProps } from './listing-header'
export {
  ProductCarousel,
  type ProductCarouselProps,
} from './product-carousel'
export { SectionHeading, type SectionHeadingProps } from './section-heading'
