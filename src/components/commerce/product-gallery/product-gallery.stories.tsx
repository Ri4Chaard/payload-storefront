import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import type { CatalogImage } from '@/lib/catalog/types'

import { ProductGallery } from './product-gallery'

/**
 * Nodes `297:4567` (1920), `410:7300` (1024), `410:7635` (390).
 *
 * The three arrangements are ONE component and CSS, so the way to see them is the viewport
 * toolbar rather than three stories. What the stories below cover is the thing CSS cannot show:
 * how many photographs there are, and therefore which controls exist at all.
 */
const PHOTOGRAPHS: CatalogImage[] = [
  {
    src: '/photography/product-ring-packshot.webp',
    width: 1274,
    height: 1600,
    alt: 'Paragon emerald cut diamond engagement ring',
  },
  {
    src: '/photography/product-ring-jacket.webp',
    width: 1000,
    height: 1000,
    alt: 'The ring worn with a tailored jacket',
  },
  {
    src: '/photography/product-ring-arm.webp',
    width: 1000,
    height: 1000,
    alt: 'The ring on a resting hand',
  },
  {
    src: '/photography/product-ring-portrait.webp',
    width: 1274,
    height: 1600,
    alt: 'The ring worn, in portrait',
  },
  {
    src: '/photography/product-ring-denim.webp',
    width: 1274,
    height: 1600,
    alt: 'The ring against denim',
  },
]

const meta = {
  title: 'Commerce/ProductGallery',
  component: ProductGallery,
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
  args: {
    images: PHOTOGRAPHS,
    label: 'Paragon Emerald Cut Diamond Engagement Ring',
  },
} satisfies Meta<typeof ProductGallery>

export default meta
type Story = StoryObj<typeof meta>

/**
 * The drawn set of five. The rail at 1280 and up, the row at 768, the dots below it, and the
 * previous/next arrows beneath the rail — which loop, so the fifth photograph's "next" is the
 * first.
 */
export const Default: Story = {}

/**
 * One photograph, which is the state that decides whether a control is an affordance or a lie.
 * No rail, no dots, no arrows — and the photograph still opens full screen.
 */
export const SinglePhotograph: Story = {
  args: { images: PHOTOGRAPHS.slice(0, 1) },
}

/** Two, where the dots and the rail appear but the rail has nothing to page. */
export const TwoPhotographs: Story = {
  args: { images: PHOTOGRAPHS.slice(0, 2) },
}

/**
 * More photographs than the rail can show at once.
 *
 * The arrows do not change: they page the PHOTOGRAPHS, here as everywhere. What this story shows is
 * the rail keeping up — step past the fifth and it scrolls itself so the current thumbnail stays in
 * view, which is why it needs no scroll control of its own.
 */
export const LongerThanTheRail: Story = {
  args: { images: [...PHOTOGRAPHS, ...PHOTOGRAPHS].map((image, index) => ({ ...image, alt: `${image.alt} (${index + 1})` })) },
}

/**
 * A piece the owner has not photographed yet. Not a broken image and not a "no photo" sign: a
 * neutral box that holds the column's shape so the information beside it does not move.
 */
export const NoPhotography: Story = {
  args: { images: [] },
}

/**
 * Advancing on its own every 1.2s — quick here so it is visible without waiting; the product page
 * uses five seconds.
 *
 * The pause covers the WHOLE gallery, not just the photograph: hover the rail, tab to a thumbnail,
 * and it holds. Choose one and it stops for good, because being moved off the photograph you just
 * picked is the failure this exists to avoid. It never starts at all if your system asks for
 * reduced motion.
 */
export const AutoAdvancing: Story = {
  args: { autoAdvance: 1200 },
}
