import type { Metadata } from 'next'
import React from 'react'

import { ActiveFilters, type RemovableFilter } from '@/components/commerce/active-filters'
import { FilterToolbar } from '@/components/commerce/filter-toolbar'
import { ProductGrid } from '@/components/commerce/product-grid'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadMore } from '@/components/ui/load-more'
import { ListingHeader } from '@/components/sections/listing-header'
import { Container } from '@/components/ui/container'
import {
  dropIdlePriceEnds,
  hasActiveFilters,
  parseFilters,
  removeFilter,
} from '@/lib/catalog/filters'
import { listingHref } from '@/lib/catalog/listing-url'
import { getCategories, getFilterFacets, getListing } from '@/lib/catalog/queries'
import type { DroppedFilter, FilterState } from '@/lib/catalog/types'

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
 * `?category=rings`. Every URL written from here — the chips, the pagination, everything the
 * toolbar commits — goes through `listingHref`, which is the one place that knows a single category
 * belongs in the path. Six callers assembling `basePath + toQueryString(...)` themselves is six
 * chances to write the category twice.
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
  const seeded: FilterState = categorySlug ? { ...filters, category: [categorySlug] } : filters

  const [categories, facets] = await Promise.all([
    getCategories(),
    // Scoped to the category being looked at, so SIZE offers ring sizes on `/rings`. More than one
    // category applied has no single scope, and the whole catalogue is the honest answer.
    getFilterFacets(seeded.category.length === 1 ? seeded.category[0] : undefined),
  ])

  /**
   * The facets are read BEFORE the listing rather than beside it, because one of them decides what
   * the listing is asked for: a price handle sitting on the catalogue's own end is the slider where
   * it started, not a filter, and both ends arrive on every no-JavaScript submit. Dropping them
   * here means the grid, the chips and every link this page writes agree that nothing was narrowed
   * — including the next address the visitor follows, which is where the redundant pair disappears.
   */
  const applied = dropIdlePriceEnds(seeded, facets.price)
  const result = await getListing(applied)

  const ignored: DroppedFilter[] = [...dropped, ...result.ignored]

  /**
   * Each chip, with the address that drops it (FR-025).
   *
   * Built here rather than in the component for the reason the whole data layer exists: knowing
   * which key to strip and whether the result is a path or a query is catalogue arithmetic, and
   * `ActiveFilters` is a drawing. `removeFilter` returns to page one, and `listingHref` decides
   * that dropping the last category means `/all-jewelry` rather than `/rings` with nothing on it.
   */
  const chips: RemovableFilter[] = result.appliedChips.map((chip) => ({
    id: `${chip.key}:${chip.value}`,
    label: chip.label,
    href: listingHref(removeFilter(applied, chip.key, chip.value), categories),
  }))

  return (
    <>
      <ListingHeader title={title} subtitle={subtitle} />

      <FilterToolbar
        filters={applied}
        facets={facets}
        categories={categories}
        clearHref={basePath}
        // Everything the visitor can remove, which is exactly what the chip row beneath draws. The
        // route's own category counts: on `/rings` it is applied, it is dismissible, and a trigger
        // reading "Filters" above a chip reading "Rings" would be two answers to one question.
        appliedCount={chips.length}
      />

      {/* Beneath the strip rather than inside it — neither narrow frame puts chips on the white. */}
      {chips.length > 0 ? (
        <Container className="pt-4 xl:pt-5">
          <ActiveFilters filters={chips} />
        </Container>
      ) : null}

      {ignored.length > 0 ? (
        <Container className="pt-4 pb-4 xl:pt-0 xl:pb-5">
          {/*
            FR-030. A shared link can name a colour we stopped stocking or a collection that was
            renamed, and an empty grid is the wrong answer to it — it reads as "we sell none of
            these" rather than "that part of the link is stale". `role="status"` so a screen reader
            hears it when the listing re-renders around it.
          */}
          <p className="text-body-small text-neutral-secondary" role="status">
            {`Ignored ${ignored.length === 1 ? 'one filter' : `${ignored.length} filters`} this shop does not have: ${ignored
              .map((entry) => `${entry.key} “${entry.value}”`)
              .join(', ')}.`}
          </p>
        </Container>
      ) : null}

      {result.products.length === 0 ? (
        <EmptyState {...emptyState(categorySlug, basePath, hasActiveFilters(filters))} />
      ) : (
        <>
          <ProductGrid className="pt-4 xl:pt-5" products={result.products} label={title} />

          <Container className="py-10 xl:py-15">
            <LoadMore
              shown={result.products.length}
              total={result.total}
              // `result.page`, not the URL's — a page past the end is clamped by `getListing`,
              // and building the next address from an unclamped one would offer 100 after 99.
              moreHref={
                result.hasMore
                  ? listingHref({ ...applied, page: result.page + 1 }, categories)
                  : null
              }
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
 *
 * **Both strings used to be defaults inside the component** and moved here when `ListingEmpty`
 * became the kit's `EmptyState` (007/T007). That is the right side of the line: the copy is this
 * page's, and a kit component holding a sentence about jewellery is user-visible copy in a
 * component, which Constitution I permits only for developer-facing errors.
 */
function emptyState(categorySlug: string | null, basePath: string, narrowed: boolean) {
  if (categorySlug !== null && !narrowed) {
    return {
      title: 'Nothing here yet',
      description: 'This category has no pieces published. There is plenty elsewhere.',
      action: { href: '/all-jewelry', label: 'See all jewelry' },
    }
  }

  return {
    title: 'Nothing matches those filters',
    description:
      'Every piece is made in small numbers, so a narrow search can come up empty. Widening it usually helps.',
    action: {
      href: categorySlug ? basePath : '/all-jewelry',
      label: 'Clear all filters',
    },
  }
}

/**
 * Per-route metadata (003/T256, Constitution V).
 *
 * **The canonical URL is the bare route.** A filtered listing is a view of a catalogue rather than
 * a page of its own, and letting every combination of five filter groups become its own indexable
 * address is how a shop of forty pieces reports ten thousand pages.
 *
 * `page` goes the same way, and that is a change from the numbered pagination this replaced. Under
 * LOAD MORE the deeper views are not separate pages — `?page=3` CONTAINS `?page=1`, so indexing
 * both would file the same twelve pieces twice. The control is a real `<a href>`, so a crawler
 * still walks the whole catalogue by following it; it simply reports one address for the listing
 * it walked.
 */
export function listingMetadata({
  title,
  subtitle,
  basePath,
}: {
  title: string
  subtitle: string | null
  basePath: string
}): Metadata {
  return {
    title,
    ...(subtitle ? { description: subtitle } : {}),
    alternates: { canonical: basePath },
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
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(trail) }}
    />
  )
}
