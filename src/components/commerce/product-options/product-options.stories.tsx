import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { ProductOptions } from './product-options'

/**
 * Nodes `301:5008` (1920), `410:7314` (1024), `410:7647` (390) — side by side at 1280 and up,
 * stacked below it.
 *
 * The stories vary what the CATALOGUE offers, because that is what varies: a piece may have stones
 * and no sizes, sizes and no stones, or neither.
 */
const DIAMONDS = [
  { id: 1, label: 'Lab 1.0 ct D VS1', price: '$24,900', priceMinor: 2490000, available: true },
  { id: 2, label: 'Lab 1.5 ct D VS1 With Halo', price: '$38,320', priceMinor: 3832000, available: true },
  { id: 3, label: 'Lab 2.0 ct D VVS2', price: '$52,600', priceMinor: 5260000, available: false },
]

const SIZES = [
  { id: 1, label: '3', value: '3' },
  { id: 2, label: '3.5', value: '3.5' },
  { id: 3, label: '4', value: '4' },
  { id: 4, label: '4.5', value: '4.5' },
]

function Demo(props: React.ComponentProps<typeof ProductOptions>) {
  const [diamond, setDiamond] = React.useState<number | null>(null)
  const [size, setSize] = React.useState<string | null>(null)
  return (
    <ProductOptions
      {...props}
      diamond={diamond}
      size={size}
      onDiamondChange={setDiamond}
      onSizeChange={setSize}
    />
  )
}

const meta = {
  title: 'Commerce/ProductOptions',
  component: ProductOptions,
  parameters: { layout: 'padded' },
  args: {
    diamonds: DIAMONDS,
    sizes: SIZES,
    diamond: null,
    size: null,
    onDiamondChange: () => {},
    onSizeChange: () => {},
  },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof ProductOptions>

export default meta
type Story = StoryObj<typeof meta>

/** Both choices, as the ring is drawn. The third stone is out of stock and cannot be picked. */
export const Default: Story = {}

/** A piece sold in one stone. The size stays, the stone list does not appear at all. */
export const SizeOnly: Story = {
  args: { diamonds: [] },
}

/** A pendant: one size, several stones. */
export const DiamondOnly: Story = {
  args: { sizes: [] },
}

/** A piece that cannot be ordered. The controls are drawn and inert rather than removed. */
export const Disabled: Story = {
  args: { disabled: true },
}
