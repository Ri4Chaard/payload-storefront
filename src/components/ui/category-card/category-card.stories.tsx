import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { CategoryCard } from './category-card'
import sampleImage from './sample-image.webp'

/**
 * Figma's "Default" and "Hover" frames are one component — hover the card for the zoom. The
 * photograph is a fixture for the guide; in the app it comes from the CMS.
 */
// No `alt`: the card is one link, and alt text would be read out ahead of the title.
const IMAGE = { src: sampleImage.src }

const meta = {
  title: 'UI/CategoryCard',
  component: CategoryCard,
  parameters: { layout: 'centered' },
  args: { title: 'Rings', href: '/rings', image: IMAGE },
  decorators: [
    (Story) => (
      <div className="w-104 max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CategoryCard>

export default meta
type Story = StoryObj<typeof meta>

/** Node 138:509 at the drawn size — 415x480, 30px inset. */
export const Default: Story = {}

export const LongerTitle: Story = { args: { title: 'Engagement rings' } }

/**
 * The scrim is not in the drawing. It is on by default because the image comes from the CMS, and
 * white text on a pale photograph is a contrast failure no automated check can catch.
 */
export const WithoutScrim: Story = { args: { scrim: false } }

/** How they actually appear — a row of tiles sharing one grid. */
export const InAGrid: Story = {
  decorators: [
    (Story) => (
      <div className="w-212 max-w-full">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <div className="grid grid-cols-2 gap-5">
      <CategoryCard {...args} title="Rings" href="/rings" />
      <CategoryCard {...args} title="Bracelets" href="/bracelets" />
    </div>
  ),
}

/**
 * The drawn LANDSCAPE proportion of the 1024 frame (node 440:12515). Resize to see the card change
 * shape rather than merely scale.
 */
export const Tablet: Story = { globals: { viewport: { value: 'lg' } } }

/**
 * The compact frame below `md` (node 440:13490) — 16px inset, the title a step down, and a call to
 * action across the tile because 142px of usable width cannot hold the desktop one.
 */
export const Mobile: Story = { globals: { viewport: { value: 'mobile' } } }

/**
 * The escape hatch: a caller whose layout wants a different proportion passes one through
 * `className`, and `tailwind-merge` resolves it over all three defaults at once.
 */
export const CustomProportion: Story = {
  args: { className: 'aspect-square' },
}
