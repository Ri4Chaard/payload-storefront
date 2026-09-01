import type { Metadata } from 'next'
import React from 'react'

import { AboutBand, CategoryBand, Hero, JewelryCarousel } from '@/components/sections'
import { FeatureStrip } from '@/components/ui'
import { getCategories, getFeatured } from '@/lib/catalog/queries'
import { SHOP_PROMISES } from '@/lib/shop-promises'
import { homeContent } from '@/mocks'

/**
 * The home page (002/T108), from Figma node 255:3353.
 *
 * **This file is the only thing on the route that reads content.** Every band below takes what it
 * renders as props — which is what let the featured row swap from fixtures to Payload (003/T290) by
 * changing one prop here, with `JewelryCarousel` untouched. A section that imported the mocks
 * itself would have made that a rewrite.
 *
 * **The categories and the featured pieces are real; the rest of this page is not, yet.** The hero
 * and the about band are not modelled in Payload at all, so they still read `homeContent` — this is
 * the one file the T293 lint rule still lets do that, named rather than covered by a wildcard so
 * that how much is left stays visible.
 *
 * The two bands' HEADINGS stay with the fixtures for the same reason: "Shop by category" and the
 * "View all" link are copy, and copy has no home in the schema yet. What came from Payload is the
 * part an owner changes weekly — which pieces are shown, which categories exist, and the
 * photograph on each tile.
 *
 * The heading hierarchy is decided here rather than inside the bands, because it is a property of
 * the page: the hero owns the only `h1`, and every band heading is an `h2` beneath it (FR-026).
 */
/**
 * **Rendered per request, deliberately** — this page reads the catalogue, and the container image is
 * built with no database to read (see `src/lib/catalog/prerender.ts`).
 *
 * The two dynamic routes degrade by prerendering nothing and rendering on demand instead, which
 * costs the first visitor one render and nothing after that. A page with no dynamic segment has no
 * such middle ground: Next prerenders it at build if it can, so a build with no database would bake
 * a home page with no categories and no featured pieces, and it would stay that way until somebody
 * happened to edit something in the admin. An empty band that never heals is worse than two queries.
 *
 * Those two queries are the whole cost — the categories and the first few products, both small,
 * both from a database in the same process. The photographs, which is what the visitor actually
 * waits for, are unaffected.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  // Not the layout's `%s — Aurum` template: on the home page that would read "Aurum — Aurum".
  title: { absolute: 'Aurum — Lab-grown diamond jewelry' },
  description:
    'Lab-grown diamond rings, bracelets, earrings and necklaces. Exceptional brilliance and ' +
    'refined luxury, made with a responsible approach.',
}

/**
 * Per-tile copy the schema does not hold. One sentence, identical on every tile, drawn at node
 * 138:492 — a field for it would be four copies of the same words for an owner to keep in step.
 */
const CATEGORY_CTA = 'View collection'

export default async function HomePage() {
  const { hero, categories, featured, about } = homeContent
  const [pieces, shopCategories] = await Promise.all([getFeatured(), getCategories()])

  /**
   * Only the categories that have a photograph. `CategoryCard` is a picture with a title over it,
   * so a tile without one is not a smaller tile — it is a hole. A category the owner has not
   * photographed yet stays out of the band and keeps its listing route, and adding the photograph
   * in the admin is what puts it back.
   */
  const tiles = shopCategories
    .filter((category) => category.image !== null)
    .map((category) => ({
      title: category.title,
      href: category.href,
      cta: CATEGORY_CTA,
      image: category.image!,
    }))

  return (
    <>
      <Hero {...hero} />

      {/*
        Real categories, in the order the owner arranged them. The heading is still fixture copy;
        the tiles are the catalogue. Absent rather than empty when none of them is photographed,
        for the same reason the featured row is.
      */}
      {tiles.length > 0 ? <CategoryBand heading={categories.heading} items={tiles} /> : null}

      {/*
        Real pieces, with the band's copy still coming from the fixtures. `JewelryCarousel` takes
        the shape it always did, so nothing about the component changed — the swap is this prop.

        Absent rather than empty when the catalogue is: a heading and a "View all" over no pieces
        advertises a shop with nothing in it, which is worse than a page that is one band shorter.
      */}
      {pieces.length > 0 ? (
        <JewelryCarousel
          {...featured}
          items={pieces.map((piece) => ({
            name: piece.title,
            price: piece.price,
            href: piece.href,
            images: piece.images,
          }))}
        />
      ) : null}

      <AboutBand {...about} />

      {/*
        The service promises are spec 001's component, consumed unchanged — which is the point of
        having built it there. Its copy is still its own default; it moves into the content source
        when there is a reason for an editor to change it.

        Its position is load-bearing, not incidental. The strip is a labelled region whose cards are
        `h3`, so placing it above the about band's `h2` — as an earlier revision did — produced an
        outline that jumped h1 → h3 and skipped a level (FR-026). The drawn order puts it here
        anyway; the heading hierarchy is the reason to keep it here.
      */}
      <FeatureStrip items={SHOP_PROMISES} />
    </>
  )
}

