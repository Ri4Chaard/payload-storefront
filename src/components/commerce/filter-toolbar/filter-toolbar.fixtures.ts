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
    option('rings', 'Rings', 8),
    option('bracelets', 'Bracelets', 6),
    option('earrings', 'Earrings', 7),
    option('necklaces', 'Necklaces', 8),
  ],
  collections: [
    option('deia', 'Deia'),
    option('marvel', 'Marvel'),
    option('molten', 'Molten'),
    option('spartan', 'Spartan', 0),
  ],
  sizes: [
    option('2', '2'),
    option('2.25', '2.25'),
    option('2.5', '2.5'),
    option('2.75', '2.75'),
    option('3', '3'),
  ],
  colours: [
    option('black', 'Black'),
    option('clear', 'Clear'),
    option('green', 'Green'),
    option('multicolor', 'Multicolor', 0),
  ],
  shapes: [
    option('round', 'Round'),
    option('oval', 'Oval'),
    option('emerald', 'Emerald'),
    option('pear', 'Pear'),
    option('marquise', 'Marquise'),
    option('princess', 'Princess'),
    option('baguette', 'Baguette', 0),
  ],
  price: { min: 50_000, max: 2_490_000 },
}

export const storyCategories = storyFacets.categories.map((entry) => ({
  slug: entry.value,
  href: `/${entry.value}`,
}))

export const storyFilters: FilterState = { ...DEFAULT_FILTERS }
