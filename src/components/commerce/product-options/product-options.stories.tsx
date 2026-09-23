import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { ProductOptions } from './product-options'

/**
 * Nodes `301:5008` (1920), `410:7314` (1024), `410:7647` (390) — side by side at 1280 and up,
 * stacked below it.
 *
 * The stories vary what the CATALOGUE offers: a piece may offer a choice of stone or none at all.
 * Sizes were the second axis until spec 011 deprecated them.
 */
const DIAMONDS = [
  { id: 1, label: 'Lab 1.0 ct D VS1', price: '$24,900', priceMinor: 2490000, available: true, attributes: [] },
  {
    id: 2,
    label: 'Lab 1.5 ct D VS1 With Halo',
    price: '$38,320',
    priceMinor: 3832000,
    available: true,
    attributes: [],
  },
  { id: 3, label: 'Lab 2.0 ct D VVS2', price: '$52,600', priceMinor: 5260000, available: false, attributes: [] },
]


function Demo(props: React.ComponentProps<typeof ProductOptions>) {
  const [diamond, setDiamond] = React.useState<number | null>(null)
  return (
    <ProductOptions
      {...props}
      diamond={diamond}
      onDiamondChange={setDiamond}
    />
  )
}

const meta = {
  title: 'Commerce/ProductOptions',
  component: ProductOptions,
  parameters: { layout: 'padded' },
  args: {
    diamonds: DIAMONDS,
    diamond: null,
    onDiamondChange: () => {},
  },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof ProductOptions>

export default meta
type Story = StoryObj<typeof meta>

/** The stone list, as the ring is drawn. The third stone is out of stock and cannot be picked. */
export const Default: Story = {}

/*
  There is deliberately NO story for a piece with no stones.

  The component returns `null` in that case — an empty select is a control that cannot be used, so
  nothing is drawn at all — and a story of nothing renders an empty canvas that the accessibility
  sweep waits on until it times out. The state is covered where it can be seen: `product.spec.ts`
  asserts the pendant's page offers no selector.

  It previously existed as `SizeOnly`, which rendered because sizes filled the gap. Spec 011
  deprecated sizes and the gap became the whole component.
*/

/** A piece that cannot be ordered. The controls are drawn and inert rather than removed. */
export const Disabled: Story = {
  args: { disabled: true },
}
