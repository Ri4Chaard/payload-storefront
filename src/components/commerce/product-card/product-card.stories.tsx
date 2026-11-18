import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import sampleA from '@/components/ui/image-carousel/sample-1.webp'
import sampleB from '@/components/ui/image-carousel/sample-2.webp'

import { ProductCard } from './product-card'

/**
 * Node 144:947. Figma's Default and Variant2 are one card and a hover — hover it for the arrows and
 * the CTA. Variant3 is the compact size.
 */
const NAME =
  'Product 6 with a much longer name – Collection A, Option B, Material, Weight and Origin'

const IMAGES = [{ src: sampleA.src }, { src: sampleB.src }]

const meta = {
  title: 'Commerce/ProductCard',
  component: ProductCard,
  parameters: { layout: 'centered' },
  args: { name: NAME, price: '$24,900', href: '/products/product-6', images: IMAGES },
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
export const SingleImage: Story = { args: { images: [{ src: sampleB.src }] } }

export const ShortName: Story = { args: { name: 'Product 3' } }

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
      <ProductCard {...args} name="Product 3" images={[{ src: sampleB.src }]} />
    </div>
  ),
}

/**
 * The listing's card (nodes 412:7714 at 768, 412:7860 at 375). The action is solid at every width
 * rather than absent below `xl`, and it is a link to the product — marked `aria-hidden` so the tile
 * stays one control for a keyboard and a screen reader.
 */
export const OnAListing: Story = {
  args: {
    cta: 'Buy now',
    ctaVisibility: 'always',
    ctaHref: '/products/product-1',
  },
}
