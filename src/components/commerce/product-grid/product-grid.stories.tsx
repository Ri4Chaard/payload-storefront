import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import type { ProductSummary } from '@/lib/catalog/types'

import { ProductGrid } from './product-grid'

/**
 * Nodes 222:982 (1920, four columns) · 412:7764 (768, three) · 412:7881 (375, two).
 *
 * Twelve products, because twelve is a page — three complete rows of the widest layout, which is what
 * the 1920 frame draws and what `PAGE_SIZE` is set to.
 */
const PHOTOGRAPHS = [
  { src: '/photography/product-1-a.webp', width: 1274, height: 1600 },
  { src: '/photography/product-2.webp', width: 830, height: 830 },
  { src: '/photography/product-4.webp', width: 830, height: 830 },
  { src: '/photography/product-3.webp', width: 830, height: 830 },
  { src: '/photography/product-5.webp', width: 830, height: 830 },
]

const NAMES = [
  'Product 1',
  'Product 2',
  'Product 3',
  'Product 4',
  'Product 5',
  'Product 6',
  'Product 7',
  'Product 8',
  'Product 9',
  'Product 10',
  'Product 11',
  'Product 12',
]

const PRODUCTS: ProductSummary[] = NAMES.map((title, index) => ({
  id: index + 1,
  slug: `product-${index + 1}`,
  title,
  href: `/products/product-${index + 1}`,
  price: `$${(2400 + index * 1950).toLocaleString('en-US')}`,
  images: [
    { ...PHOTOGRAPHS[index % PHOTOGRAPHS.length]!, alt: title },
    { ...PHOTOGRAPHS[(index + 1) % PHOTOGRAPHS.length]!, alt: title },
  ],
  available: index !== 4,
}))

const meta = {
  title: 'Commerce/ProductGrid',
  component: ProductGrid,
  parameters: { layout: 'fullscreen' },
  args: { products: PRODUCTS, label: 'Category 1' },
} satisfies Meta<typeof ProductGrid>

export default meta
type Story = StoryObj<typeof meta>

/** A full page. Four columns at 1920, three from `md`, two below it. */
export const Default: Story = {}

/**
 * The action is drawn under every card and is solid below `xl` — nodes 412:7714 and 412:7860.
 * At 1920 it is the same card the home row uses, revealed on hover.
 */
export const WithTheAction: Story = { args: { products: PRODUCTS.slice(0, 4) } }

/** A ragged last row — the columns hold their width rather than stretching to fill. */
export const PartialRow: Story = { args: { products: PRODUCTS.slice(0, 7) } }

/** One product. The card must not grow to the width of the grid. */
export const SingleProduct: Story = { args: { products: PRODUCTS.slice(0, 1) } }

/**
 * A stock-tracked product at zero is still shown — the owner wants it seen. Nothing on the card says
 * so, because nothing is drawn that does; its own page is where that is said.
 */
export const WithAnUnavailablePiece: Story = { args: { products: PRODUCTS.slice(3, 7) } }
