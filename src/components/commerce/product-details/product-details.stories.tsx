import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ProductDetails } from './product-details'

/**
 * Nodes `242:2478` (1920), `410:7377` (1024), `410:7709` (390).
 *
 * `Accordion` from the kit with three rows whose copy comes from Payload — the product's own rich
 * text, then two fields of the `shop` global (FR-036). The stories vary what the owner has filled
 * in, because that is the only thing about this component that varies.
 */
const DETAILS = `<p>Set by hand in 18ct white gold, with a brilliant-cut centre stone.</p><ul><li>Hallmarked at the Assay Office</li><li>Presented in an Aurum case</li></ul>`
const WARRANTY = `<p>Every piece carries a three-year warranty against manufacturing defects. Returns are free within 30 days.</p>`
const DELIVERY = `<p>Free shipping on all orders. Standard delivery takes 5 to 7 business days; express is available at checkout.</p>`

const meta = {
  title: 'Commerce/ProductDetails',
  component: ProductDetails,
  parameters: { layout: 'padded' },
  args: {
    detailsHtml: DETAILS,
    attributes: [
      { name: 'metal', label: 'Metal', value: '18ct white gold' },
      { name: 'carat', label: 'Total carat weight', value: '1.20ct' },
      { name: 'setting', label: 'Setting', value: 'Claw' },
    ],
    warrantyHtml: WARRANTY,
    deliveryHtml: DELIVERY,
  },
} satisfies Meta<typeof ProductDetails>

export default meta
type Story = StoryObj<typeof meta>

/** All three rows, as drawn. */
export const Default: Story = {}

/** A piece whose details are attributes alone — no prose written, properties still worth showing. */
export const AttributesOnly: Story = {
  args: { detailsHtml: null },
}

/** Prose alone, which is the commoner case for a piece with nothing to tabulate. */
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
