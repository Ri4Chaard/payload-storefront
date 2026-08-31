import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { ListingEmpty } from '@/components/commerce/listing-empty'
import { ProductGrid } from '@/components/commerce/product-grid'
import { ListingHeader } from '@/components/sections/listing-header'
import { Container } from '@/components/ui/container'
import { Pagination } from '@/components/ui/pagination'
import { parseFilters, toQueryString } from '@/lib/catalog/filters'
import { PAGE_SIZE, getListing } from '@/lib/catalog/queries'
import type { DroppedFilter } from '@/lib/catalog/types'

/**
 * The listing, shared by `/[category]` and `/all-jewelry` (003/T253, T254).
 *
 * The two routes differ in exactly two ways — the name in the title block, and whether a category
 * is seeded — so they are one renderer and two thin `page.tsx` files rather than two pages that
 * drift apart. Node `222:706` (a category) · node `355:7139` (all jewelry), which are the same
 * frame with a different heading.
 *
 * **This file reads content; nothing below it does.** `getListing` is called once, and every
 * component beneath receives view models as props. That is the rule from 002 and the mechanism
 * behind SC-010 — spec 004 rewrites `queries.ts` and this file does not change.
 *
 * **The route's category is not a query parameter.** `/rings` seeds `category: ['rings']` from the
 * segment, so the address stays `/rings?colour=black` rather than growing a redundant
 * `?category=rings`. Every URL this page writes — the pagination especially — is built from the
 * parsed filters WITHOUT that seed, which is what keeps one listing at one address.
 */
interface ListingProps {
  /** The slug this route is fixed to, or `null` for the whole shop. */
  categorySlug: string | null
  title: string
  subtitle: string | null
  /** The route's own address, which every page link is built from. */
  basePath: string
  searchParams: Record<string, string | string[] | undefined>
}

export async function Listing({
  categorySlug,
  title,
  subtitle,
  basePath,
  searchParams,
}: ListingProps) {
  const { filters, dropped } = parseFilters(searchParams)
  const applied = categorySlug ? { ...filters, category: [categorySlug] } : filters

  const result = await getListing(applied)
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))

  // A page past the end is a stale link or a crawler walking off the edge. 404 rather than an
  // endless run of empty pages that all render successfully and all get indexed.
  if (result.total > 0 && applied.page > totalPages) notFound()

  const ignored: DroppedFilter[] = [...dropped, ...result.ignored]

  return (
    <>
      <ListingHeader title={title} subtitle={subtitle} />

      {/*
        The filter toolbar belongs here, between the title and the grid (node 355:7627). It arrives
        complete in US4 and gains sort in US5; the space it occupies is deliberately empty until
        then rather than filled with a placeholder that has to be removed.
      */}

      {ignored.length > 0 ? (
        <Container className="pb-5">
          {/*
            Plain prose for now. US4 draws the chip row that names each of these and offers to
            remove it; until a visitor can produce a filtered URL from the interface, this exists so
            that a hand-typed or stale one is answered rather than silently ignored (FR-030).
          */}
          <p className="text-body-small text-neutral-secondary" role="status">
            {`Ignored ${ignored.length === 1 ? 'a filter' : `${ignored.length} filters`} this shop does not have: ${ignored
              .map((entry) => entry.value)
              .join(', ')}.`}
          </p>
        </Container>
      ) : null}

      {result.products.length === 0 ? (
        <ListingEmpty {...emptyState(categorySlug, basePath, hasNarrowing(filters))} />
      ) : (
        <>
          <ProductGrid products={result.products} label={title} />

          <Container className="py-10 xl:py-15">
            <Pagination
              page={result.page}
              totalPages={totalPages}
              hrefFor={(page) => `${basePath}${toQueryString({ ...filters, page })}`}
              label={`${title} pages`}
            />
          </Container>
        </>
      )}
    </>
  )
}

/**
 * Two different empty listings wearing one component.
 *
 * A category with filters on it came up empty BECAUSE of the filters, so the way out is to clear
 * them and stay. A category with nothing in it at all is not the visitor's doing and clearing
 * nothing would change nothing — so that one says so plainly and offers the rest of the shop.
 */
function emptyState(categorySlug: string | null, basePath: string, narrowed: boolean) {
  if (categorySlug !== null && !narrowed) {
    return {
      clearHref: '/all-jewelry',
      title: 'Nothing here yet',
      description: 'This category has no pieces published. There is plenty elsewhere.',
      clearLabel: 'See all jewelry',
    }
  }

  return { clearHref: categorySlug ? basePath : '/all-jewelry' }
}

/** Whether anything beyond the route's own category is narrowing the result. */
function hasNarrowing(filters: ReturnType<typeof parseFilters>['filters']): boolean {
  return (
    filters.category.length > 0 ||
    filters.collection.length > 0 ||
    filters.size.length > 0 ||
    filters.colour.length > 0 ||
    filters.shape.length > 0 ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.inStock
  )
}

/**
 * Per-route metadata (003/T256, Constitution V).
 *
 * **The canonical URL drops the filters and keeps the page.** A filtered listing is a view of a
 * catalogue rather than a page of its own, and letting every combination of five filter groups
 * become its own indexable address is how a shop of forty pieces reports ten thousand pages. Page
 * two of a category IS its own page, so that part is kept.
 */
export function listingMetadata({
  title,
  subtitle,
  basePath,
  page,
}: {
  title: string
  subtitle: string | null
  basePath: string
  page: number
}): Metadata {
  const canonical = page > 1 ? `${basePath}?page=${page}` : basePath

  return {
    title: page > 1 ? `${title} — page ${page}` : title,
    ...(subtitle ? { description: subtitle } : {}),
    alternates: { canonical },
  }
}

/**
 * `BreadcrumbList` for the listing. Emitted as JSON-LD rather than drawn: the design has no visible
 * breadcrumb on a listing, but the trail is real and a search result is where it shows.
 */
export function ListingBreadcrumbs({ title, basePath }: { title: string; basePath: string }) {
  const trail = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
      { '@type': 'ListItem', position: 2, name: title, item: basePath },
    ],
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(trail) }} />
  )
}
