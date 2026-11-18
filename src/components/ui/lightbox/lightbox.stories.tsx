import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Image from 'next/image'
import React from 'react'

import { Button } from '@/components/ui/button'

import { Lightbox } from './lightbox'

/**
 * Node 308:6392 — the product gallery opened full screen, on PhotoSwipe (003/R11).
 *
 * Controlled on both `open` and `index`, so the gallery underneath stays on whatever photograph the
 * viewer was closed on. The viewer renders into the document rather than into the story, which is
 * why every story here draws a trigger: there is nothing else to press.
 *
 * Dimensions are real. PhotoSwipe computes the fitted size and the zoom ceiling from them, and a
 * wrong pair produces a photograph that zooms to the wrong place.
 */
const PHOTOS = [
  { src: '/photography/product-1-a.webp', width: 1274, height: 1600, alt: 'Product 1, photograph 1' },
  { src: '/photography/product-1-c.webp', width: 1000, height: 1000, alt: 'Product 1, photograph 2' },
  { src: '/photography/product-1-d.webp', width: 1000, height: 1000, alt: 'Product 1, photograph 3' },
  { src: '/photography/product-1-b.webp', width: 1274, height: 1600, alt: 'Product 1, photograph 4' },
  { src: '/photography/product-1-e.webp', width: 1274, height: 1600, alt: 'Product 1, photograph 5' },
]

const meta = {
  title: 'UI/Lightbox',
  component: Lightbox,
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onClose: () => {},
    onIndexChange: () => {},
    images: PHOTOS,
    index: 0,
    label: 'Product 1',
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

/**
 * As drawn — the first photograph, an arrow at each side, close at the top right, and no fourth
 * control. Zoom is pinch, double-tap, the wheel, and `+`/`-` for a keyboard.
 */
export const Default: Story = {}

/** Mid-sequence. The arrows wrap, so neither end is a dead press. */
export const MidSequence: Story = { args: { index: 2 } }

/** One photograph: the arrows are not drawn at all rather than drawn and inert. */
export const SinglePhotograph: Story = { args: { images: [PHOTOS[0]!] } }

/**
 * With `thumbnailFor`, the viewer grows out of the picture that was pressed instead of fading in.
 * This is what the gallery on the product page will pass, and it is why the callback returns a live
 * node rather than a measurement — the page may have scrolled while the viewer was open.
 */
export const FromAThumbnail: Story = {
  render: function Render(args) {
    const [open, setOpen] = React.useState(false)
    const [index, setIndex] = React.useState(0)
    const thumbnails = React.useRef<(HTMLButtonElement | null)[]>([])

    return (
      <div className="flex min-h-svh flex-wrap gap-4 p-10">
        {PHOTOS.map((image, position) => (
          <button
            key={image.src}
            ref={(node) => {
              thumbnails.current[position] = node
            }}
            type="button"
            onClick={() => {
              setIndex(position)
              setOpen(true)
            }}
            className="relative size-30 overflow-hidden"
          >
            <Image src={image.src} alt={image.alt} fill sizes="120px" className="object-cover" />
          </button>
        ))}
        <Lightbox
          {...args}
          open={open}
          index={index}
          onIndexChange={setIndex}
          onClose={() => setOpen(false)}
          thumbnailFor={(position) => thumbnails.current[position] ?? null}
        />
      </div>
    )
  },
}

/** Closed: PhotoSwipe is not in the document at all, so there is nothing to reach. */
export const Closed: Story = { args: { open: false } }
