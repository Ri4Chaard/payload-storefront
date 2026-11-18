import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { heroFixture } from '../sections.fixtures'

import { Hero } from './hero'

/**
 * Nodes 138:309, 440:12503, 440:13458. One component that is as tall as the screen it is on, so
 * resize the canvas rather than looking for three components.
 *
 * The band subtracts the banner and header above it (`--site-chrome`), and neither is on the
 * Storybook canvas — so every story here sits that much short of the frame. The proportion to judge
 * is the one in the app.
 */
const meta = {
  title: 'Sections/Hero',
  component: Hero,
  parameters: { layout: 'fullscreen' },
  args: heroFixture,
} satisfies Meta<typeof Hero>

export default meta
type Story = StoryObj<typeof meta>

/** Node 138:309 — the desktop proportion, text against the lower edge. */
export const Desktop: Story = {}

/** Node 440:12503 — the 1024-wide frame, drawn 1226px tall and now as tall as the viewport. */
export const Tablet: Story = { globals: { viewport: { value: 'lg' } } }

/** Node 440:13458 — the phone, with the sentence a step smaller. */
export const Mobile: Story = { globals: { viewport: { value: 'mobile' } } }

/**
 * The scrim off, which is what a photograph known to be dark should do. The supplied one is
 * near-black velvet, so the two stories look almost identical — that is the point. Swap in a pale
 * image and only one of them stays readable.
 */
export const WithoutScrim: Story = { args: { scrim: false } }

/**
 * A headline and a sentence longer than the drawing's. The band is a *minimum* height, so this is
 * what proves it grows past the screen rather than clipping — resize the canvas short to see it.
 */
export const WithLongerCopy: Story = {
  args: {
    headline: 'A headline about your store, much longer than the drawing allows',
    lede:
      'A short sentence under the headline that says what your store offers, followed by a ' +
      'second, longer sentence that keeps going well past the length of the drawing, so the ' +
      'band has to grow taller than the screen to hold it rather than clipping its own copy ' +
      'at the bottom edge.',
  },
}
