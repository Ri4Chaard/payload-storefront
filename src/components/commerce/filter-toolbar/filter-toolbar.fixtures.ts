import { DEFAULT_FILTERS } from '@/lib/catalog/filters'
import type { FilterFacets, FilterState } from '@/lib/catalog/types'

/**
 * Facets and a filter state for the stories of both filter components.
 *
 * Written out rather than read from `src/mocks/catalog.ts` so the stories exercise a KNOWN shape —
 * a zero-count option, a wide price range, the full set of shapes — instead of whatever the fixture
 * catalogue happens to contain this week. The drawer's job is to draw what it is handed.
 */
const option = (value: string, label: string, count = 3) => ({ value, label, count })

export const storyFacets: FilterFacets = {
  categories: [
    option('category-1', 'Category 1', 8),
    option('category-2', 'Category 2', 6),
    option('category-3', 'Category 3', 7),
    option('category-4', 'Category 4', 8),
  ],
  collections: [
    option('collection-a', 'Collection A'),
    option('collection-b', 'Collection B'),
    option('collection-c', 'Collection C'),
    option('collection-d', 'Collection D', 0),
  ],
  colours: [
    option('black', 'Black'),
    option('clear', 'Clear'),
    option('green', 'Green'),
    option('multicolor', 'Multicolor', 0),
  ],
  price: { min: 50_000, max: 2_490_000 },
}

export const storyCategories = storyFacets.categories.map((entry) => ({
  slug: entry.value,
  href: `/${entry.value}`,
}))

export const storyFilters: FilterState = { ...DEFAULT_FILTERS }
