import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import sampleA from '@/components/ui/image-carousel/sample-1.webp'
import sampleB from '@/components/ui/image-carousel/sample-2.webp'

import { CartItem } from './cart-item'

/** Node 255:3556. The row is a `<li>`, so the stories put it in a list. */
const meta = {
  title: 'Commerce/CartItem',
  component: CartItem,
  parameters: { layout: 'padded' },
  args: {
    name: 'PRODUCT 3',
    price: '$ 24,900',
    image: { src: sampleB.src },
    quantity: 1,
    href: '/products/product-3',
    onQuantityChange: () => {},
    onRemove: () => {},
  },
  decorators: [
    (Story) => (
      <ul className="w-165 max-w-full">
        <Story />
      </ul>
    ),
  ],
  render: function Render(args) {
    const [quantity, setQuantity] = React.useState(args.quantity)
    return <CartItem {...args} quantity={quantity} onQuantityChange={setQuantity} />
  },
} satisfies Meta<typeof CartItem>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** A name long enough to prove it truncates instead of shoving the stepper off the row. */
export const LongName: Story = {
  args: {
    name: 'Product 6 with a much longer name – Collection A, Option B, Material, Weight and Origin',
    image: { src: sampleA.src },
  },
}

/** At the stock ceiling: the plus is disabled rather than able to over-order. */
export const AtTheStockLimit: Story = { args: { quantity: 3, max: 3 } }

/** A basket. Every control's name carries its row, or three rows offer three identical bins. */
export const ABasket: Story = {
  render: function Render(args) {
    const [rows, setRows] = React.useState([
      { id: 'a', name: 'PRODUCT 3', price: '$ 24,900', src: sampleB.src, qty: 1 },
      { id: 'b', name: 'PRODUCT 6', price: '$ 18,400', src: sampleA.src, qty: 2 },
    ])
    // No `<ul>` here — the meta decorator already supplies one, and nesting them puts a list
    // directly inside a list, which is invalid and which the axe sweep caught.
    return (
      <>
        {rows.map((row) => (
          <CartItem
            {...args}
            key={row.id}
            name={row.name}
            price={row.price}
            image={{ src: row.src }}
            quantity={row.qty}
            onQuantityChange={(qty) =>
              setRows((current) => current.map((r) => (r.id === row.id ? { ...r, qty } : r)))
            }
            onRemove={() => setRows((current) => current.filter((r) => r.id !== row.id))}
          />
        ))}
      </>
    )
  },
}
