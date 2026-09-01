import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ProductPurchase } from './product-purchase'

/**
 * Node `301:5028` — the price, the description, the two choices and the two actions, which share a
 * state because the price follows the chosen stone (FR-039).
 *
 * Both actions are disabled on purpose. The seam they hand to is FR-041 and belongs to spec 004;
 * until it exists a live button would either do nothing or lie about what it did.
 */
const DIAMONDS = [
  { id: 1, label: 'Lab 1.0 ct D VS1', price: '$24,900', priceMinor: 2490000, available: true },
  { id: 2, label: 'Lab 1.5 ct D VS1 With Halo', price: '$38,320', priceMinor: 3832000, available: true },
  { id: 3, label: 'Lab 2.0 ct D VVS2', price: '$52,600', priceMinor: 5260000, available: false },
]

const meta = {
  title: 'Commerce/ProductPurchase',
  component: ProductPurchase,
  parameters: { layout: 'padded' },
  args: {
    price: '$24,900',
    fromPrice: '$24,900',
    description:
      'Available in a variety of carat weights, every stone is set by hand. Size, carat weight and stone quantities vary slightly from one ring to another.',
    diamonds: DIAMONDS,
    sizes: [
      { id: 1, label: '3', value: '3' },
      { id: 2, label: '3.5', value: '3.5' },
      { id: 3, label: '4', value: '4' },
    ],
    available: true,
  },
} satisfies Meta<typeof ProductPurchase>

export default meta
type Story = StoryObj<typeof meta>

/** Stones that differ in price, so the label reads "From …" until one is chosen. */
export const Default: Story = {}

/** One price for the piece however it is made, so no range and no "from". */
export const SinglePrice: Story = {
  args: { fromPrice: null, diamonds: [DIAMONDS[1]!] },
}

/** A piece with no choices at all — just a price and the two actions. */
export const NoOptions: Story = {
  args: { fromPrice: null, diamonds: [], sizes: [] },
}

/** Sold out. The reason is in TEXT, not in colour, and the controls go with it (FR-040). */
export const Unavailable: Story = {
  args: { available: false },
}

/** A piece the owner has not described yet. The layout closes over the gap. */
export const NoDescription: Story = {
  args: { description: null },
}
