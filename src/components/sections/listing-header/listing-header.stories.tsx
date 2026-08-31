import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ListingHeader } from './listing-header'

/** Nodes 222:709 (1920) · 412:7735 (768) · 412:7870 (375). */
const meta = {
  title: 'Sections/ListingHeader',
  component: ListingHeader,
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Diamond Rings',
    subtitle: 'Timeless brilliance, made for every moment',
  },
} satisfies Meta<typeof ListingHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** `/all-jewelry` — the same block, a different name. Node 355:7142. */
export const AllJewelry: Story = { args: { title: 'All jewelry' } }

/** No sentence set on the category and none in shop settings: the block closes over it. */
export const WithoutSubtitle: Story = { args: { subtitle: null } }

/** The measure is what stops a centred sentence running the full 1720px at 1920. */
export const LongSubtitle: Story = {
  args: {
    subtitle:
      'Timeless brilliance and exquisite designs, handcrafted for every milestone — each stone ' +
      'chosen by hand, set by hand, and certified before it ever reaches you.',
  },
}
