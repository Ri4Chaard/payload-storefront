import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import earrings from '@/components/ui/image-carousel/sample-earrings.webp'
import pendant from '@/components/ui/image-carousel/sample-pendant.webp'

import { ProductCard } from './product-card'

/**
 * Node 144:947. Figma's Default and Variant2 are one card and a hover — hover it for the arrows and
 * the CTA. Variant3 is the compact size.
 */
const NAME =
  'Fancy Vivid Pink Heart Lab Grown Category 3 – Rare Shades Collection, 18k Rose Gold, IGI Certified'

const IMAGES = [{ src: earrings.src }, { src: pendant.src }]

const meta = {
  title: 'Commerce/ProductCard',
  component: ProductCard,
  parameters: { layout: 'centered' },
  args: { name: NAME, price: '$24,900', href: '/products/pink-heart-earrings', images: IMAGES },
  decorators: [
    (Story) => (
      <div className="w-104 max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductCard>

export default meta
type Story = StoryObj<typeof meta>

/** Nodes 144:946 and 144:948 — the CTA and the arrows arrive on hover. */
export const Default: Story = {}

/** Node 440:13588 — 174px, no CTA. */
export const Compact: Story = {
  args: { size: 'compact' },
  decorators: [
    (Story) => (
      <div className="w-43.5 max-w-full">
        <Story />
      </div>
    ),
  ],
}

/** One photograph: the carousel drops its arrows rather than offering dead controls. */
export const SingleImage: Story = { args: { images: [{ src: pendant.src }] } }

export const ShortName: Story = { args: { name: 'Butterfly diamond pendant' } }

/** How they appear in a listing — and where the hidden CTA has to behave. */
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
      <ProductCard {...args} />
      <ProductCard {...args} name="Butterfly diamond pendant" images={[{ src: pendant.src }]} />
    </div>
  ),
}

/**
 * The listing's card (nodes 412:7714 at 768, 412:7860 at 375). The action is solid at every width
 * rather than absent below `xl`, and it is a link to the piece — marked `aria-hidden` so the tile
 * stays one control for a keyboard and a screen reader.
 */
export const OnAListing: Story = {
  args: {
    cta: 'Buy now',
    ctaVisibility: 'always',
    ctaHref: '/products/paragon-emerald-cut-diamond-engagement-ring',
  },
}
