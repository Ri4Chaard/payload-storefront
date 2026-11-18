import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ProductPurchase } from './product-purchase'

/**
 * Node `301:5028` — the price, the description, the two choices and the two actions, which share a
 * state because the price follows the chosen option.
 *
 * **No `onAddToCart` here, so ADD TO CART is inert.** The action is a Server Action handed down by
 * the route; there is no server behind a story, and a stub that always succeeded would document a
 * screen that does not exist. What these stories are for is the presentational states — the price
 * following the option, the sold-out wording, the layout with and without options — and those are
 * all reachable without one. The live behaviour is covered by the integration suite and by the e2e
 * walk, which have a server to talk to.
 */
const VARIANTS = [
  { id: 1, label: 'Option A', price: '$24,900', priceMinor: 2490000, available: true, attributes: [] },
  {
    id: 2,
    label: 'Option B',
    price: '$38,320',
    priceMinor: 3832000,
    available: true,
    // What an option says about itself, where it differs from its product.
    attributes: [{ name: 'weight', label: 'Weight', value: '1.5 kg', order: 4 }],
  },
  { id: 3, label: 'Option C', price: '$52,600', priceMinor: 5260000, available: false, attributes: [] },
]

const meta = {
  title: 'Commerce/ProductPurchase',
  component: ProductPurchase,
  parameters: { layout: 'padded' },
  args: {
    productId: 1,
    price: '$24,900',
    fromPrice: '$24,900',
    description:
      'Short product description.',
    variantChoices: VARIANTS,
    available: true,
  },
} satisfies Meta<typeof ProductPurchase>

export default meta
type Story = StoryObj<typeof meta>

/** Options that differ in price, so the label reads "From …" until one is chosen. */
export const Default: Story = {}

/** One price for the product however it is made, so no range and no "from". */
export const SinglePrice: Story = {
  args: { fromPrice: null, variantChoices: [VARIANTS[1]!] },
}

/** A product with no choices at all — just a price and the two actions. */
export const NoOptions: Story = {
  args: { fromPrice: null, variantChoices: [] },
}

/** Sold out. The reason is in TEXT, not in colour, and the controls go with it. */
export const Unavailable: Story = {
  args: { available: false },
}

/** A product the owner has not described yet. The layout closes over the gap. */
export const NoDescription: Story = {
  args: { description: null },
}

/**
 * With an action wired, which is what the route does. Resolves as a refusal so the message row
 * is visible in the guide without a server: it is the state most easily got wrong and least
 * often seen.
 */
export const RefusedByTheServer: Story = {
  args: {
    onAddToCart: async () => ({ ok: false, reason: 'unavailable', field: 'variant' }),
  },
}
