import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { currentLocale } from '@/i18n/locale'
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
 *
 * **It renders per request, and it has no `generateStaticParams`.** It carried one from T253 until
 * the deployment work, where it turned out to be doing nothing: the page reads `searchParams`, so
 * a category listing can never be prerendered, and every build had already marked this route
 * dynamic — the list was a query at build time whose answer was thrown away.
 *
 * Worse than useless, in fact. When the container image is built with no database the list comes
 * back empty, and an EMPTY list is what tells Next the route is static: it then has nothing to
 * discover the `searchParams` read from, marks the route SSG, and every category answers 500
 * `DYNAMIC_SERVER_USAGE` at request time. Saying so explicitly is what stops that from depending on
 * whether a database happened to be reachable during a build.
 */
export const dynamic = 'force-dynamic'

async function resolve(slug: string) {
  const locale = await currentLocale()
  const categories = await getCategories(locale)
  return categories.find((category) => category.slug === slug) ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const locale = await currentLocale()
  const { category: slug } = await params
  const category = await resolve(slug)
  if (!category) return {}

  const shop = await getShopContent(locale)

  return listingMetadata({
    locale,
    title: category.title,
    subtitle: category.subtitle ?? shop.listingSubtitle,
    basePath: category.href,
  })
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const locale = await currentLocale()
  const { category: slug } = await params
  const category = await resolve(slug)
  if (!category) notFound()

  const shop = await getShopContent(locale)

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
