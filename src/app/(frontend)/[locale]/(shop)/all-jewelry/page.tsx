import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import React from 'react'

import { currentLocale } from '@/i18n/locale'
import { dropIdlePriceEnds, parseFilters } from '@/lib/catalog/filters'
import { canonicalListing } from '@/lib/catalog/listing-url'
import { getCategories, getFilterFacets, getShopContent } from '@/lib/catalog/queries'

import { Listing, ListingBreadcrumbs, listingMetadata } from '../listing'

/**
 * The whole shop (003/T254). Node `355:7139` — the same frame as a category listing with a
 * different name in the title block and no category applied.
 *
 * A static sibling of `/[category]`, so Next resolves it first and "all-jewelry" is never mistaken
 * for a category slug.
 */
const TITLE = 'All jewelry'
const BASE = '/all-jewelry'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale()
  const shop = await getShopContent(locale)

  return listingMetadata({
    locale,
    title: TITLE,
    subtitle: shop.listingSubtitle,
    basePath: BASE,
  })
}

export default async function AllJewelryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const locale = await currentLocale()
  const query = await searchParams

  /**
   * `?category=rings&minPrice=…&maxPrice=…` is `/rings` (003/T274).
   *
   * The drawer is a `<form method="GET">`, and a form cannot choose its own path from what is
   * ticked inside it — so without scripting it always posts here, with the category as a parameter
   * and with both ends of the price slider attached whether or not anyone moved them. Sending that
   * visitor on to the address a scripted one would have produced is what makes FR-029's "the same
   * URL" literally true rather than approximately.
   *
   * It also tidies a hand-typed or advertised link, which is worth having on its own.
   * `canonicalListing` refuses to move anything whose query carried a value the catalogue rejected,
   * because rewriting the query from the parsed state is exactly how that report would be lost.
   */
  const { filters, dropped } = parseFilters(query)
  const [categories, facets] = await Promise.all([
    getCategories(locale),
    getFilterFacets(locale, filters.category.length === 1 ? filters.category[0] : undefined),
  ])
  const canonical = canonicalListing(filters, dropIdlePriceEnds(filters, facets.price), categories, dropped)
  if (canonical) redirect(canonical)

  const shop = await getShopContent(locale)

  return (
    <>
      <ListingBreadcrumbs title={TITLE} basePath={BASE} />
      <Listing
        categorySlug={null}
        title={TITLE}
        subtitle={shop.listingSubtitle}
        basePath={BASE}
        searchParams={query}
      />
    </>
  )
}
