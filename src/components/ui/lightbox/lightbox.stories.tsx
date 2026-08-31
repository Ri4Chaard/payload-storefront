import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Button } from '@/components/ui/button'

import { Lightbox } from './lightbox'

/**
 * Node 308:6392 — the product gallery opened full screen. Controlled on both `open` and `index`, so
 * the gallery underneath stays on whatever photograph the viewer was closed on.
 *
 * Open by default: a story of a closed viewer is a story of an empty iframe, and the accessibility
 * sweep has to see the dialog to audit it.
 */
const RING = [
  { src: '/photography/product-ring-packshot.webp', alt: 'The ring, photographed on white' },
  { src: '/photography/product-ring-jacket.webp', alt: 'The ring worn with a tailored jacket' },
  { src: '/photography/product-ring-arm.webp', alt: 'The ring on a resting hand' },
  { src: '/photography/product-ring-portrait.webp', alt: 'The ring worn, in portrait' },
  { src: '/photography/product-ring-denim.webp', alt: 'The ring against denim' },
]

const meta = {
  title: 'UI/Lightbox',
  component: Lightbox,
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onClose: () => {},
    onIndexChange: () => {},
    images: RING,
    index: 0,
    label: 'Paragon Emerald Cut Diamond Engagement Ring',
  },
  render: function Render(args) {
    const [open, setOpen] = React.useState(args.open)
    const [index, setIndex] = React.useState(args.index)
    const triggerRef = React.useRef<HTMLButtonElement>(null)

    return (
      <div className="min-h-svh p-10">
        <Button ref={triggerRef} variant="outline" onClick={() => setOpen(true)}>
          Open the photograph
        </Button>
        <Lightbox
          {...args}
          open={open}
          index={index}
          onIndexChange={setIndex}
          onClose={() => setOpen(false)}
          triggerRef={triggerRef}
        />
      </div>
    )
  },
} satisfies Meta<typeof Lightbox>

export default meta
type Story = StoryObj<typeof meta>

/** As drawn — the first photograph, an arrow at each side, close at the top right. */
export const Default: Story = {}

/** Mid-sequence. The arrows wrap, so neither end is a dead press. */
export const MidSequence: Story = { args: { index: 2 } }

/** One photograph: the arrows are not drawn at all rather than drawn and inert. */
export const SinglePhotograph: Story = { args: { images: [RING[0]!] } }

/** Closed: `display: none`, so it is out of the tab order and the accessibility tree. */
export const Closed: Story = { args: { open: false } }
