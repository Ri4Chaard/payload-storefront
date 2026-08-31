import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Chip } from '@/components/ui/chip'

import { ListingEmpty } from './listing-empty'

/**
 * Undrawn (spec inconsistency 8). Three things in the order they help: that there is nothing, what
 * was asked for, and how to widen it.
 */
const meta = {
  title: 'Commerce/ListingEmpty',
  component: ListingEmpty,
  parameters: { layout: 'fullscreen' },
  args: { clearHref: '/all-jewelry' },
} satisfies Meta<typeof ListingEmpty>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** With the filters that produced it. US4 supplies these; the slot is here so it need not change. */
export const WithActiveFilters: Story = {
  render: (args) => (
    <ListingEmpty {...args}>
      <ul className="flex flex-wrap justify-center gap-2.5">
        {['Diamond Rings', 'Green', 'Under $2,000'].map((filter) => (
          <li key={filter}>
            <Chip>{filter}</Chip>
          </li>
        ))}
      </ul>
    </ListingEmpty>
  ),
}

/** A category with nothing published in it yet — no filters to clear, so it offers the whole shop. */
export const EmptyCategory: Story = {
  args: {
    title: 'Nothing here yet',
    description: 'This category has no pieces published. There is plenty elsewhere.',
    clearLabel: 'See all jewelry',
  },
}
