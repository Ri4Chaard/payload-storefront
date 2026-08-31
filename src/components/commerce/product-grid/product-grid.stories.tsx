import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import type { ProductSummary } from '@/lib/catalog/types'

import { ProductGrid } from './product-grid'

/**
 * Nodes 222:982 (1920, four columns) · 412:7764 (768, three) · 412:7881 (375, two).
 *
 * Twelve pieces, because twelve is a page — three complete rows of the widest layout, which is what
 * the 1920 frame draws and what `PAGE_SIZE` is set to.
 */
const PHOTOGRAPHS = [
  { src: '/photography/product-ring-packshot.webp', width: 1274, height: 1600 },
  { src: '/photography/product-bracelet.webp', width: 830, height: 830 },
  { src: '/photography/product-ear-climbers.webp', width: 830, height: 830 },
  { src: '/photography/product-pendant.webp', width: 830, height: 830 },
  { src: '/photography/product-mini-pendant.webp', width: 830, height: 830 },
]

const NAMES = [
  'Paragon Emerald Cut Diamond Engagement Ring',
  'Pavé Butterfly Diamond Bracelet',
  'Butterfly Ruby, Pink Sapphire and Diamond Ear Climbers',
  'Butterfly Diamond Pendant',
  'Butterfly Ruby, Pink Sapphire and Diamond Mini Pendant',
  'Halo Solitaire Ring',
  'Baguette Eternity Band',
  'Tennis Bracelet',
  'Round Stud Earrings',
  'Riviera Necklace',
  'Marquise Cluster Ring',
  'Oval Drop Earrings',
]

const PRODUCTS: ProductSummary[] = NAMES.map((title, index) => ({
  id: index + 1,
  slug: `piece-${index + 1}`,
  title,
  href: `/products/piece-${index + 1}`,
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
  args: { products: PRODUCTS, label: 'Diamond Rings' },
} satisfies Meta<typeof ProductGrid>

export default meta
type Story = StoryObj<typeof meta>

/** A full page. Four columns at 1920, three from `md`, two below it. */
export const Default: Story = {}

/** A ragged last row — the columns hold their width rather than stretching to fill. */
export const PartialRow: Story = { args: { products: PRODUCTS.slice(0, 7) } }

/** One piece. The card must not grow to the width of the grid. */
export const SingleProduct: Story = { args: { products: PRODUCTS.slice(0, 1) } }

/**
 * A stock-tracked piece at zero is still shown — the owner wants it seen. Nothing on the card says
 * so, because nothing is drawn that does; its own page is where that is said.
 */
export const WithAnUnavailablePiece: Story = { args: { products: PRODUCTS.slice(3, 7) } }
