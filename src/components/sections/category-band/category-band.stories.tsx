import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { categoryBandFixture } from '../sections.fixtures'

import { CategoryBand } from './category-band'

/**
 * Nodes 144:835, 440:12512, 440:13487. Four across at `xl`, two-by-two below — and the tiles change
 * proportion with the arrangement, portrait to landscape to portrait.
 */
const meta = {
  title: 'Sections/CategoryBand',
  component: CategoryBand,
  parameters: { layout: 'fullscreen' },
  args: categoryBandFixture,
} satisfies Meta<typeof CategoryBand>

export default meta
type Story = StoryObj<typeof meta>

/** Node 144:835 — one row of four, 415x480 each. */
export const Desktop: Story = {}

/** Node 440:12512 — 2x2, and the tiles turn LANDSCAPE at 478x350. */
export const Tablet: Story = { globals: { viewport: { value: 'lg' } } }

/** Node 440:13487 — 2x2 at 174x242, compact inset, call to action across the tile. */
export const Mobile: Story = { globals: { viewport: { value: 'mobile' } } }

/** A collection name long enough to prove the tile is not sized by its title. */
export const WithLongerNames: Story = {
  args: {
    items: categoryBandFixture.items.map((item, index) =>
      index === 0 ? { ...item, title: 'Engagement rings' } : item,
    ),
  },
}
