import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { getCategories, getShopContent } from '@/lib/catalog/queries'

import { Listing, ListingBreadcrumbs, listingMetadata } from '../listing'

/**
 * A category listing — `/rings`, `/bracelets`, `/earrings`, `/necklaces` (003/T253). Node
 * `222:706`.
 *
 * **The segment is validated against the catalogue, not against a list in this file.** A category
 * is a Payload document the owner can add, so a hardcoded union here would mean a deployment every
 * time they created one — which is the whole promise this project is built on. An unknown segment
 * is the branded 404.
 *
 * **This route sits at the root of the site**, so `/[category]` matches any single segment. That is
 * deliberate: every unrecognised one-segment address should 404, and this is where that happens.
 * `/all-jewelry` is a static sibling and Next resolves it first.
 */
async function resolve(slug: string) {
  const categories = await getCategories()
  return categories.find((category) => category.slug === slug) ?? null
}

export async function generateStaticParams() {
  // Prerenders the four categories that exist at build time. A category added afterwards is still
  // served — the segment is validated at request time, not against this list.
  const categories = await getCategories()
  return categories.map((category) => ({ category: category.slug }))
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const { category: slug } = await params
  const category = await resolve(slug)
  if (!category) return {}

  const { page } = await searchParams
  const shop = await getShopContent()

  return listingMetadata({
    title: category.title,
    subtitle: category.subtitle ?? shop.listingSubtitle,
    basePath: category.href,
    page: Number(page) > 1 ? Number(page) : 1,
  })
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { category: slug } = await params
  const category = await resolve(slug)
  if (!category) notFound()

  const shop = await getShopContent()

  return (
    <>
      <ListingBreadcrumbs title={category.title} basePath={category.href} />
      <Listing
        categorySlug={category.slug}
        title={category.title}
        // The category's own sentence, or the one shop settings supplies for every listing.
        subtitle={category.subtitle ?? shop.listingSubtitle}
        basePath={category.href}
        searchParams={await searchParams}
      />
    </>
  )
}
