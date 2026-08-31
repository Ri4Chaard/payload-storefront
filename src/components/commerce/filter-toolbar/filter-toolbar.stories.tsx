import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { storyCategories, storyFacets, storyFilters } from './filter-toolbar.fixtures'
import { FilterToolbar } from './filter-toolbar'

/**
 * The listing's control strip (nodes `225:1437` at 1920, `412:7738` at 1024, `412:7873` at 390).
 *
 * What each width carries is what each width draws: everything at `xl`, three controls at `md`, and
 * two triggers on a phone. Resize the preview rather than reading three stories — the drop is a
 * media query, not a variant.
 */
const meta = {
  title: 'Commerce/FilterToolbar',
  component: FilterToolbar,
  // `useRouter` needs the App Router mock, which Storybook only mounts when it is told the
  // component belongs to `app/` rather than `pages/`.
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
  args: {
    filters: storyFilters,
    facets: storyFacets,
    categories: storyCategories,
    clearHref: '/all-jewelry',
    appliedCount: 0,
  },
} satisfies Meta<typeof FilterToolbar>

export default meta
type Story = StoryObj<typeof meta>

/** Nothing applied. The FILTERS trigger carries no count and the chip row above is absent. */
export const Default: Story = {}

/**
 * Three filters applied. The phone trigger reads `FILTERS (3)` (FR-028, node `412:7875`), an oval
 * stone is marked in the shape row, and the price slider sits inside the catalogue's ends.
 */
export const WithFiltersApplied: Story = {
  args: {
    appliedCount: 3,
    filters: {
      ...storyFilters,
      category: ['rings'],
      shape: ['oval'],
      minPrice: 120_000,
      maxPrice: 730_000,
      inStock: true,
      sort: 'price-asc',
    },
  },
}

/**
 * A catalogue with one price in it. The slider is absent rather than drawn with its two handles
 * stuck together — a control that cannot move is not a filter.
 */
export const WithoutAPriceRange: Story = {
  args: { facets: { ...storyFacets, price: { min: 240_000, max: 240_000 } } },
}
