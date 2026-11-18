import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ProductDetails } from './product-details'

/**
 * Nodes `242:2478` (1920), `410:7377` (1024), `410:7709` (390).
 *
 * `Accordion` from the kit with three rows whose copy comes from Payload — the product's own rich
 * text, then two fields of the `shop` global (FR-036). The stories vary what the owner has filled
 * in, because that is the only thing about this component that varies.
 */
const DETAILS = `<p>Short product description.</p><ul><li>Detail one</li><li>Detail two</li></ul>`
const WARRANTY = `<p>A short paragraph about your warranty and returns.</p>`
const DELIVERY = `<p>A short paragraph about delivery.</p>`

const meta = {
  title: 'Commerce/ProductDetails',
  component: ProductDetails,
  parameters: { layout: 'padded' },
  args: {
    detailsHtml: DETAILS,
    attributes: [
      { name: 'material', label: 'Material', value: 'Material A' },
      { name: 'weight', label: 'Weight', value: '1.2 kg' },
      { name: 'origin', label: 'Origin', value: 'Country A' },
    ],
    warrantyHtml: WARRANTY,
    deliveryHtml: DELIVERY,
  },
} satisfies Meta<typeof ProductDetails>

export default meta
type Story = StoryObj<typeof meta>

/** All three rows, as drawn. */
export const Default: Story = {}

/** A product whose details are attributes alone — no prose written, properties still worth showing. */
export const AttributesOnly: Story = {
  args: { detailsHtml: null },
}

/** Prose alone, which is the commoner case for a product with nothing to tabulate. */
export const ProseOnly: Story = {
  args: { attributes: [] },
}

/**
 * The owner has not written the shop-wide copy yet. Two rows would open onto blank space, so they
 * are not drawn — an accordion that expands onto nothing is a control that lied.
 */
export const ShopCopyMissing: Story = {
  args: { warrantyHtml: null, deliveryHtml: null },
}
