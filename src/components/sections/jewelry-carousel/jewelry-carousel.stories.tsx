import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { homeContent } from '@/mocks'

import { JewelryCarousel } from './jewelry-carousel'

/**
 * Nodes 144:839, 440:12540, 440:13525. Four cards fill the desktop content width exactly, which is
 * why the drawing parks its scroll control at `hidden` — see `MoreThanFits` for the other case.
 */
const meta = {
  title: 'Sections/JewelryCarousel',
  component: JewelryCarousel,
  parameters: { layout: 'fullscreen' },
  args: homeContent.featured,
} satisfies Meta<typeof JewelryCarousel>

export default meta
type Story = StoryObj<typeof meta>

/** Node 144:839 — four across, no arrows, because there is nowhere to page. */
export const Desktop: Story = {}

/** Node 440:12540 — 400px cards overflowing a 976px frame. */
export const Tablet: Story = { globals: { viewport: { value: 'lg' } } }

/** Node 440:13525 — 174px cards, no action on the card at all. */
export const Mobile: Story = { globals: { viewport: { value: 'mobile' } } }

/**
 * Eight pieces on a desktop. This is the state the drawn-but-hidden control exists for: the arrows
 * appear, they clamp at both ends rather than wrapping, and each disappears when its side runs out.
 */
export const MoreThanFits: Story = {
  args: {
    items: [
      ...homeContent.featured.items,
      ...homeContent.featured.items.map((item) => ({ ...item, href: `${item.href}-2` })),
    ],
  },
}

/** Two pieces. Nothing overflows at any width above a phone, so no arrow ever appears. */
export const Few: Story = {
  args: { items: homeContent.featured.items.slice(0, 2) },
}
