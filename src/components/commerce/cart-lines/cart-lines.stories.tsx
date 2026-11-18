import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import sampleB from '@/components/ui/image-carousel/sample-2.webp'
import sampleA from '@/components/ui/image-carousel/sample-1.webp'
import type { CartLineView } from '@/lib/cart/types'

import { CartLines } from './cart-lines'

/**
 * Nodes `258:3930` (1920), `425:11175` (768), `425:11276` (390).
 *
 * **No actions are passed**, so the stepper and the bin are inert and the confirmation's primary is
 * disabled. They are Server Actions in the real page; a story has no server, and a stub that always
 * succeeded would document behaviour that does not exist. What these show is the arrangement — the
 * options line, the line total appearing at `xl`, and the stale-line wording.
 */
const line = (over: Partial<CartLineView> = {}): CartLineView => ({
  id: 'row-1',
  title: 'PRODUCT 3',
  href: '/products/product-3',
  image: { src: sampleB.src, width: 800, height: 800 },
  variantChoice: null,
  unitPrice: '$24,900',
  lineTotal: '$24,900',
  unitMinor: 2490000,
  quantity: 1,
  maxQuantity: undefined,
  available: true,
  ...over,
})

const meta = {
  title: 'Commerce/CartLines',
  component: CartLines,
  parameters: { layout: 'padded' },
  args: { lines: [line()] },
} satisfies Meta<typeof CartLines>

export default meta
type Story = StoryObj<typeof meta>

/** One product, no choices to make — the simplest row the cart can hold. */
export const SingleLine: Story = {}

/** Three rows, two of them carrying a chosen option. */
export const Filled: Story = {
  args: {
    lines: [
      line({
        id: 'a',
        title: 'PRODUCT 1',
        variantChoice: 'Option A',
        unitPrice: '$38,320',
        lineTotal: '$76,640',
        quantity: 2,
        image: { src: sampleA.src, width: 800, height: 800 },
      }),
      line({ id: 'b' }),
      line({
        id: 'c',
        title: 'PRODUCT 4',
        variantChoice: 'Option B',
        unitPrice: '$38,000',
        lineTotal: '$38,000',
        image: { src: sampleA.src, width: 800, height: 800 },
      }),
    ],
  },
}

/**
 * Something changed underneath the cart. The row stays, says why in words rather than in
 * colour alone, and the summary beside it leaves it out of the total.
 */
export const StaleLine: Story = {
  args: {
    lines: [
      line({ id: 'a' }),
      line({
        id: 'b',
        title: 'PRODUCT 4',
        available: false,
        lineTotal: '$0',
        image: { src: sampleA.src, width: 800, height: 800 },
      }),
    ],
    issues: [
      {
        lineId: 'b',
        kind: 'unavailable',
        message: 'This item is no longer available and has been left out of your total.',
      },
    ],
  },
}

/** A product the owner has withdrawn entirely — named, unlinked, still removable. */
export const WithdrawnPiece: Story = {
  args: {
    lines: [
      line({
        id: 'gone',
        title: 'This item is no longer available',
        href: null,
        image: null,
        available: false,
        unitPrice: '$0',
        lineTotal: '$0',
      }),
    ],
    issues: [
      {
        lineId: 'gone',
        kind: 'unpublished',
        message: 'This item is no longer on sale and has been left out of your total.',
      },
    ],
  },
}
