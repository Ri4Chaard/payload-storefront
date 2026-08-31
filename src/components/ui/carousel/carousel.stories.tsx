import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Carousel } from './carousel'

/**
 * The scroll-snap mechanism behind `ImageCarousel` and the home page's jewelry row. Shown here with
 * plain panels, because the point of the component is the track and the arrows, not the contents.
 */
function Panel({ n }: { n: number }) {
  return (
    <div className="bg-background-container text-neutral-primary text-heading-2 grid h-50 place-items-center">
      {n}
    </div>
  )
}

const meta = {
  title: 'UI/Carousel',
  component: Carousel,
  parameters: { layout: 'padded' },
  args: {
    label: 'Example panels',
    prevLabel: 'Show previous panels',
    nextLabel: 'Show more panels',
    trackClassName: 'gap-5',
    itemClassName: 'w-50 snap-start',
    items: Array.from({ length: 8 }, (_, i) => <Panel key={i} n={i + 1} />),
  },
} satisfies Meta<typeof Carousel>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Clamped, which is the default. Page to the end and the forward arrow leaves; page back and the
 * backward one does. Focus the track and use the arrow keys — that is what `tabIndex` buys.
 */
export const Default: Story = {}

/**
 * Nothing overflows, so no arrow ever appears. This is the state the home page's desktop frame is
 * in with four pieces, and why its drawn scroll control sits at `hidden`.
 */
export const NothingToPage: Story = {
  args: { items: Array.from({ length: 2 }, (_, i) => <Panel key={i} n={i + 1} />) },
}

/**
 * Wrapping, which is what a strip of photographs of ONE product wants: three that stop dead on the
 * third read as broken. Both arrows are always present here — there is always somewhere to go.
 */
export const Wrapping: Story = { args: { wrap: true } }

/** Arrows held back until the surrounding `group` is hovered or focused. Touch always shows them. */
export const ControlsOnHover: Story = {
  args: { controls: 'hover' },
  render: (args) => (
    <div className="group">
      <Carousel {...args} />
    </div>
  ),
}

/**
 * Pages itself every 1.2s — quick here so the behaviour is visible without waiting.
 *
 * Try to catch it out: hover the track and it holds, tab into it and it holds, and the moment you
 * page it yourself — a press, a key, a wheel, a swipe — it gives up for good rather than fighting
 * you for the scroll position. It also never starts at all if your system asks for reduced motion,
 * which is the one case with no way to demonstrate it other than turning that setting on.
 */
export const AutoAdvancing: Story = {
  args: { autoAdvance: 1200 },
}

/**
 * No ends. Swipe or drag past the last panel and the first is already there — the track itself
 * loops, not just the arrows, which is what `wrap` cannot do.
 *
 * The copies at either end are `inert`, so the eight panels are still eight things to a screen
 * reader and eight tab stops, however many are painted.
 */
export const Looping: Story = {
  args: { loop: true },
}
