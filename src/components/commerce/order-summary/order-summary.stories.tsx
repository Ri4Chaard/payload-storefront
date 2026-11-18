import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import type { CartView } from '@/lib/cart/types'

import { OrderSummary } from './order-summary'

/**
 * Nodes `255:3868` (1920), `425:11228` (768), `425:11327` (390).
 *
 * Every amount arrives formatted from the server; this component has no integers and adds nothing
 * up. The stories therefore just describe carts.
 */
const cart = (over: Partial<CartView> = {}): CartView => ({
  lines: [],
  itemCount: 2,
  subtotal: '$49,800',
  shipping: '$0',
  currency: 'USD',
  issues: [],
  empty: false,
  ...over,
})

const meta = {
  title: 'Commerce/OrderSummary',
  component: OrderSummary,
  parameters: { layout: 'padded' },
  args: { cart: cart() },
  decorators: [
    (Story) => (
      <div className="w-125 max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OrderSummary>

export default meta
type Story = StoryObj<typeof meta>

/** As drawn. Press CHECKOUT without ticking the agreement to see the refusal. */
export const Default: Story = {}

/** One product, so the row reads "1 item" rather than "1 items". */
export const SingleItem: Story = {
  args: { cart: cart({ itemCount: 1, subtotal: '$24,900' }) },
}

/**
 * Lines changed underneath the customer. The first press of CHECKOUT is refused and says
 * what happened; the second is the acknowledgement and proceeds.
 */
export const BlockedByChanges: Story = {
  args: { blocked: true },
}
