import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ActiveFilters } from './active-filters'

/**
 * The applied filters, drawn beneath the toolbar (nodes `225:1482`, `I355:7627;355:7602`).
 *
 * Every pill is a link to the listing WITHOUT that filter, which is why the row keeps working with
 * scripting off and why the whole pill is the target rather than the 12px cross inside it.
 */
const meta = {
  title: 'Commerce/ActiveFilters',
  component: ActiveFilters,
  parameters: { layout: 'padded' },
  args: {
    filters: [
      { id: 'category:category-1', label: 'Category 1', href: '/all-products' },
      { id: 'maxPrice:730000', label: 'Up to $7,300', href: '/category-1' },
      { id: 'sort:price-asc', label: 'Price Ascending', href: '/category-1' },
    ],
  },
} satisfies Meta<typeof ActiveFilters>

export default meta
type Story = StoryObj<typeof meta>

/** The drawn row: a category, a price range and the ordering. */
export const Default: Story = {}

/** One filter. The row is the same component, and nothing about it is a list of three. */
export const Single: Story = {
  args: { filters: [{ id: 'colour:green', label: 'Green', href: '/all-products' }] },
}

/**
 * Enough filters to wrap. It wraps rather than scrolling sideways — a row that ran off the edge
 * would hide the last chips behind nothing that says they are there.
 */
export const Wrapping: Story = {
  args: {
    filters: [
      'Category 1',
      'Category 4',
      'Deia',
      'Molten',
      'Emerald',
      'Pear',
      'Green',
      'Multicolor',
      'Oval',
      'Emerald',
      '$1,200 – $7,300',
      'In stock only',
    ].map((label, index) => ({ id: `chip-${index}`, label, href: '#' })),
  },
}

/** Nothing applied renders nothing — not an empty strip above the grid. */
export const Empty: Story = {
  args: { filters: [] },
  render: (args) => (
    <div className="text-body-small text-neutral-secondary">
      <ActiveFilters {...args} />
      (renders nothing)
    </div>
  ),
}
