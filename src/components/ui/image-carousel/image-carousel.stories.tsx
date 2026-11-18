import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { ImageCarousel } from './image-carousel'
import sampleA from './sample-1.webp'
import sampleB from './sample-2.webp'

/**
 * A scroll-snap track rather than a carousel library — see the note on the component for why
 * PhotoSwipe and Swiper are both the wrong tool at this size. Swipe it, or use the arrows, or focus
 * the strip and press the arrow keys.
 */
const IMAGES = [{ src: sampleA.src }, { src: sampleB.src }, { src: sampleA.src }]

const meta = {
  title: 'UI/ImageCarousel',
  component: ImageCarousel,
  parameters: { layout: 'centered' },
  args: { images: IMAGES, label: 'Product 6' },
  decorators: [
    (Story) => (
      <div className="w-104 max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ImageCarousel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Node 144:948 — inside a card, the arrows wait for the card to be hovered. */
export const ControlsOnHover: Story = {
  args: { controls: 'hover' },
  decorators: [
    (Story) => (
      <div className="group w-104 max-w-full">
        <Story />
      </div>
    ),
  ],
}

/** One photograph: no arrows, and nothing to scroll. */
export const SingleImage: Story = { args: { images: [{ src: sampleA.src }] } }
