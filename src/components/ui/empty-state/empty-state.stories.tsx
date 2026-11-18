import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Chip } from '@/components/ui/chip'

import { EmptyState } from './empty-state'

/**
 * Undrawn in both features that use it (catalogue spec inconsistency 8; no empty frame in the blog
 * section either). Up to three things in the order they help: that there is nothing, what was asked
 * for, and how to get out.
 *
 * The three stories below are the three shapes that actually ship — a listing that filtered itself
 * to nothing, a category with nothing in it, and a blog before its first article. The last one is
 * why `action` is optional: there is nothing a visitor could press that would help.
 */
const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
  args: {
    title: 'Nothing matches those filters',
    description:
      'A narrow search can come up empty. Widening it usually helps.',
    action: { href: '/all-products', label: 'Clear all filters' },
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** With the filters that produced it, which is what `children` is for. */
export const WithActiveFilters: Story = {
  render: (args) => (
    <EmptyState {...args}>
      <ul className="flex flex-wrap justify-center gap-2.5">
        {['Category 1', 'Green', 'Under $2,000'].map((filter) => (
          <li key={filter}>
            <Chip>{filter}</Chip>
          </li>
        ))}
      </ul>
    </EmptyState>
  ),
}

/** A category with nothing published in it yet — no filters to clear, so it offers the whole shop. */
export const EmptyCategory: Story = {
  args: {
    title: 'Nothing here yet',
    description: 'This category has no products published. There is plenty elsewhere.',
    action: { href: '/all-products', label: 'See all products' },
  },
}

/**
 * A blog with nothing published. No action, because there is nowhere to send anybody —
 * a button here would be a control that admits it cannot help.
 */
export const NoActionAvailable: Story = {
  args: {
    title: 'Nothing published yet',
    description: 'The first stories are being written. Check back soon.',
    action: undefined,
  },
}
