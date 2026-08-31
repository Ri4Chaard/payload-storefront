import type { Metadata } from 'next'
import React from 'react'

import { getShopContent } from '@/lib/catalog/queries'

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

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const { page } = await searchParams
  const shop = await getShopContent()

  return listingMetadata({
    title: TITLE,
    subtitle: shop.listingSubtitle,
    basePath: BASE,
    page: Number(page) > 1 ? Number(page) : 1,
  })
}

export default async function AllJewelryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const shop = await getShopContent()

  return (
    <>
      <ListingBreadcrumbs title={TITLE} basePath={BASE} />
      <Listing
        categorySlug={null}
        title={TITLE}
        subtitle={shop.listingSubtitle}
        basePath={BASE}
        searchParams={await searchParams}
      />
    </>
  )
}
