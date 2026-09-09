import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { CartEmpty } from './cart-empty'

/**
 * Nothing is drawn for the empty cart (FR-015), so this is derived rather than transcribed — the
 * same gap, and the same reasoning, as `ListingEmpty`.
 */
const meta = {
  title: 'Commerce/CartEmpty',
  component: CartEmpty,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CartEmpty>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
