import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import React from 'react'

import { currentLocale } from '@/i18n/locale'
import { AboutBand, CategoryBand, Hero, ProductCarousel } from '@/components/sections'
import { FeatureStrip } from '@/components/ui'
import { getCategories, getFeatured } from '@/lib/catalog/queries'
import { getHomeContent } from '@/lib/home/queries'
import { shopPromises } from '@/lib/shop-promises'

/**
 * The home page (002/T108), from Figma node 255:3353.
 *
 * **This file is the only thing on the route that reads content.** Every band below takes what it
 * renders as props — which is what let the featured row swap from fixtures to Payload (003/T290) by
 * changing one prop here, with `ProductCarousel` untouched. A section that imported the mocks
 * itself would have made that a rewrite.
 *
 * **Every word on this page now comes from Payload** (spec 010). The hero, the two band headings
 * and the about band read `home-page`; the tiles and the pieces read the catalogue. `src/mocks/`
 * is gone, and with it the last of the fixture content spec 002 opened — `payload.config.ts`,
 * `story-page.ts` and the catalogue-boundary lint rule each named it as the outstanding one.
 *
 * Spec 010 is what forced it. A string in a TypeScript constant has no locale, so the drawn
 * headline stayed English on `/ru` however much of the interface moved; the only way to translate
 * it was to give it somewhere to be translated.
 *
 * **The page still renders without that global.** `getHomeContent` returns `null` when there is no
 * database, and each band below is written to be absent rather than empty in that case — the same
 * rule the catalogue bands already followed.
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

export async function generateMetadata(): Promise<Metadata> {
  const t_meta = await getTranslations('meta')
  return {
    // Not the layout's `%s | Aurum` template: on the home page that would read "Aurum | Aurum".
    title: { absolute: t_meta('homeTitle') },
    description: t_meta('homeDescription'),
  }
}

export default async function HomePage() {
  const locale = await currentLocale()
  const t_product = await getTranslations('product')
  /*
    Per-tile copy the schema does not hold. One sentence, identical on every tile, drawn at node
    138:492 — a field for it would be four copies of the same words for an owner to keep in step.
    It moved out of a module constant when it became a translation (spec 010).
  */
  const CATEGORY_CTA = (await getTranslations('catalog'))('viewCollectionShort')
  const [content, pieces, shopCategories] = await Promise.all([
    getHomeContent(locale),
    getFeatured(locale),
    getCategories(locale),
  ])

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
      {/*
        Absent rather than empty without a photograph, like every other band on this page. `Hero` is
        a full-bleed picture with the headline over its lower edge; drawn with no picture it is a
        black rectangle, which reads as a broken page rather than as a shorter one. `pnpm seed`
        uploads it, so this is the state after somebody deletes it in the admin.
      */}
      {content?.hero.image ? <Hero {...content.hero} image={content.hero.image} /> : null}

      {/*
        Real categories, in the order the owner arranged them. The heading is still fixture copy;
        the tiles are the catalogue. Absent rather than empty when none of them is photographed,
        for the same reason the featured row is.
      */}
      {content && tiles.length > 0 ? (
        <CategoryBand heading={content.categoriesHeading} items={tiles} />
      ) : null}

      {/*
        Real pieces, with the band's copy still coming from the fixtures. `ProductCarousel` takes
        the shape it always did, so nothing about the component changed — the swap is this prop.

        Absent rather than empty when the catalogue is: a heading and a "View all" over no pieces
        advertises a shop with nothing in it, which is worse than a page that is one band shorter.
      */}
      {content && pieces.length > 0 ? (
        <ProductCarousel
          {...content.featured}
          items={pieces.map((piece) => ({
            name: piece.title,
            price: piece.price,
            href: piece.href,
            images: piece.images,
          }))}
        />
      ) : null}

      {content?.about.image ? <AboutBand {...content.about} image={content.about.image} /> : null}

      {/*
        The service promises are spec 001's component, consumed unchanged — which is the point of
        having built it there. Its copy is still its own default; it moves into the content source
        when there is a reason for an editor to change it.

        Its position is load-bearing, not incidental. The strip is a labelled region whose cards are
        `h3`, so placing it above the about band's `h2` — as an earlier revision did — produced an
        outline that jumped h1 → h3 and skipped a level (FR-026). The drawn order puts it here
        anyway; the heading hierarchy is the reason to keep it here.
      */}
      <FeatureStrip items={shopPromises(t_product)} label={t_product('whyShopWithUs')} />
    </>
  )
}

