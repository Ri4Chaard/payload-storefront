import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { localeAlternates } from '@/lib/i18n/alternates'
import { currentLocale } from '@/i18n/locale'
import { ProductDetails, ProductGallery, ProductPurchase } from '@/components/commerce'
import { addToCart, buyNow } from '@/lib/cart/actions'
import { JewelryCarousel } from '@/components/sections'
import { Container, FeatureStrip } from '@/components/ui'
import { minorUnitDigits } from '@/lib/catalog/price'
import { prerenderable } from '@/lib/catalog/prerender'
import { getProduct, getProductSlugs, getRelated, getShopContent } from '@/lib/catalog/queries'
import type { ProductDetail } from '@/lib/catalog/types'
import { SHOP_PROMISES } from '@/lib/shop-promises'

/**
 * One piece (003/T264, T266–T268). Nodes `231:1901` (1920), `410:7283` (1024), `410:7626` (390).
 *
 * **The information column is composed here, not in a component.** Everything on it that repeats —
 * the gallery, the accordions, the related row — is a component with its own stories; what is left
 * is an eyebrow, a heading, a price and a paragraph, arranged in the order FR-035 fixes. Wrapping
 * four elements in a `ProductInfo` would add a name without adding a reason to reuse it, and would
 * put the page's only `h1` somewhere other than the page.
 *
 * The selectors and the two actions belong between the price and the accordions. They are spec 003
 * Phase 8 (US6) and are deliberately absent rather than stubbed: a disabled ADD TO CART that hands
 * nothing anywhere is worse than no button, and FR-041's seam is what makes it real.
 *
 * **`null` from `getProduct` is the branded 404 and says nothing else.** A missing slug and a draft
 * asked for anonymously are indistinguishable from out here on purpose — telling a stranger that an
 * unpublished piece exists is the leak FR-009 is written against, and the loader is where that
 * decision is made, not this file.
 */
/**
 * **Every published piece is prerendered** (003/T294), and stays fresh because publishing says so.
 *
 * This is the route the performance budget is written about (SC-008): the photograph above the
 * fold is the LCP element, and prerendering means it is already in the HTML that the first byte
 * carries rather than waiting on a query. The catalogue is tens of pieces, so the whole set costs
 * a few seconds of build.
 *
 * **A piece published after the build is still served.** `dynamicParams` is left at its default, so
 * a slug that is not in this list renders on demand and is cached from then on — the list decides
 * what is ready before the first visitor, not what exists. That is also why `prerenderable` can
 * hand back nothing when the container image is built with no database to read: the list empties,
 * and every page takes the path a newly published piece already takes.
 *
 * Both halves of that would go stale on their own. `src/lib/revalidate.ts` is the other half: a
 * write in the admin marks this whole route pattern for regeneration, so the prerendered page and
 * the on-demand one are invalidated by the same signal.
 */
export async function generateStaticParams() {
  const slugs = await prerenderable('product pages', getProductSlugs)
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const locale = await currentLocale()
  const { slug } = await params
  const product = await getProduct(slug, locale)
  if (!product) return {}

  const title = product.seo.title ?? product.title
  const description = product.seo.description ?? product.description

  return {
    title,
    ...(description ? { description } : {}),
    // Canonical plus every language this page exists in, filtered to what is on offer.
    alternates: await localeAlternates(product.href, locale),
    openGraph: {
      type: 'website',
      title,
      ...(description ? { description } : {}),
      url: product.href,
      ...(product.seo.image
        ? {
            images: [
              {
                url: product.seo.image.src,
                width: product.seo.image.width,
                height: product.seo.image.height,
                ...(product.seo.image.alt ? { alt: product.seo.image.alt } : {}),
              },
            ],
          }
        : {}),
    },
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const locale = await currentLocale()
  const { slug } = await params
  const product = await getProduct(slug, locale)
  if (!product) notFound()

  const [shop, related] = await Promise.all([getShopContent(locale), getRelated(product.id, locale)])

  return (
    <>
      <ProductSchema product={product} />

      <Container className="py-6 md:py-8 xl:py-12.5">
        <div className="grid gap-6 md:grid-cols-[400fr_272fr] md:gap-8 xl:grid-cols-[990fr_680fr] xl:gap-12.5">
          {/*
            Full-bleed at 390, where the design runs the photograph to both edges (`410:7636` is
            the frame's full 390px). The negative margin cancels the container's gutter rather than
            moving the gallery out of the grid, so the column below it still lines up.
          */}
          <ProductGallery
            images={product.gallery}
            label={product.title}
            priority
            // Five seconds, and it yields the moment anyone engages: the whole gallery pauses
            // under a pointer or focus, and the first press, key or swipe stops it for good.
            autoAdvance={5000}
            className="-mx-4 md:mx-0"
          />

          <div className="flex flex-col">
            {/*
              The eyebrow is the category, and it is TEXT rather than a link. The design draws no
              link, and the breadcrumb that would carry a visitor back to the category is the
              `BreadcrumbList` below — a listing is one tap away in the header at every width.
            */}
            <p className="text-caption text-primary-default font-semibold tracking-[0.04em] uppercase xl:text-body-medium xl:font-medium xl:tracking-normal">
              {product.categoryName}
            </p>

            {/* The page's only first-level heading (FR-035). */}
            <h1 className="text-heading-1 text-neutral-primary mt-1.5 uppercase md:mt-2 xl:mt-5">
              {product.title}
            </h1>

            {/*
              The price down to BUY NOW, in one client component. They share the visitor's choice:
              FR-039 makes the price follow the selected stone, and the description sits between the
              two in the drawn order — so the run is contiguous and belongs together.

              The description is drawn at 1920 (`231:2339`) and absent from the 1024 and 390 frames,
              which stop after the price. FR-035 puts it in the column at every width, and the
              visitor on a phone is the one least able to go and find it elsewhere.
            */}
            <ProductPurchase
              productId={product.id}
              price={product.price}
              fromPrice={product.fromPrice}
              description={product.description}
              diamonds={product.diamondOptions}
              sizes={product.sizes}
              available={product.available}
              maxQuantity={product.maxQuantity}
              onAddToCart={addToCart}
              onBuyNow={buyNow}
            />

            <ProductDetails
              detailsHtml={product.detailsHtml}
              attributes={product.attributes}
              warrantyHtml={shop.warrantyHtml}
              deliveryHtml={shop.deliveryHtml}
              // Headings from the shop global since T292a. The component still defaults them to the
              // drawn strings, so it renders correctly in a story with no Payload behind it.
              detailsTitle={shop.detailsTitle}
              warrantyTitle={shop.warrantyTitle}
              deliveryTitle={shop.deliveryTitle}
              className="mt-2 xl:mt-7.5"
            />
          </div>
        </div>
      </Container>

      {/*
        _Complete the Collection_ (FR-037) — the home page's band, consumed unchanged apart from
        the button it does not draw here. Absent rather than empty: a piece in no collection, or the
        only piece in its collection, gets no strip at all rather than a heading over nothing.
      */}
      {related.length > 0 ? (
        <JewelryCarousel
          heading="Complete the Collection"
          headingId="complete-the-collection"
          trackLabel="More from this collection"
          // Five seconds. The row is a shop window beside a piece the visitor is already reading
          // about, so it offers rather than demands: it never starts for someone who asked for
          // reduced motion, holds while it is hovered or focused, and stops for good the moment
          // anyone pages it themselves.
          autoAdvance={5000}
          items={related.map((item) => ({
            name: item.title,
            price: item.price,
            href: item.href,
            images: item.images,
          }))}
        />
      ) : null}

      <FeatureStrip items={SHOP_PROMISES} />
    </>
  )
}

/**
 * `Product` and its `Offer` (Constitution V), plus the trail back to the category.
 *
 * The amount is `priceMinor` divided by its own currency's exponent rather than the drawn string:
 * `"$38,320"` is not a number, and a crawler quoting a parsed one is how a shop ends up advertising
 * a price it does not charge.
 *
 * Availability is the same boolean the page draws, so the two cannot disagree. `offerCount` and the
 * low/high pair appear only where the stones actually differ — an `AggregateOffer` over one price
 * is noise.
 */
function ProductSchema({ product }: { product: ProductDetail }) {
  const prices = product.diamondOptions.map((option) => option.priceMinor)
  const varies = prices.length > 1 && Math.min(...prices) !== Math.max(...prices)
  const availability = `https://schema.org/${product.available ? 'InStock' : 'OutOfStock'}`
  // Not `/ 100`. The exponent belongs to the currency — two digits for USD, none for JPY, three
  // for BHD — and `price.ts` already asks `Intl` rather than assuming.
  const digits = minorUnitDigits(product.currency)
  const amount = (minor: number) => (minor / 10 ** digits).toFixed(digits)

  const offers = varies
    ? {
        '@type': 'AggregateOffer',
        priceCurrency: product.currency,
        lowPrice: amount(Math.min(...prices)),
        highPrice: amount(Math.max(...prices)),
        offerCount: prices.length,
        availability,
      }
    : {
        '@type': 'Offer',
        priceCurrency: product.currency,
        price: amount(product.priceMinor),
        availability,
      }

  const document = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      ...(product.description ? { description: product.description } : {}),
      image: product.gallery.map((image) => image.src),
      category: product.categoryName,
      url: product.href,
      offers,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
        { '@type': 'ListItem', position: 2, name: product.categoryName, item: `/${product.categorySlug}` },
        { '@type': 'ListItem', position: 3, name: product.title, item: product.href },
      ],
    },
  ]

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(document) }}
    />
  )
}
