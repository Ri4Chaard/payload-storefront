import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { homeContent } from '@/mocks'

import { Hero } from './hero'

/**
 * Nodes 138:309, 440:12503, 440:13458. One component, three drawn heights — resize rather than
 * looking for three components.
 */
const meta = {
  title: 'Sections/Hero',
  component: Hero,
  parameters: { layout: 'fullscreen' },
  args: homeContent.hero,
} satisfies Meta<typeof Hero>

export default meta
type Story = StoryObj<typeof meta>

/** Node 138:309 — 950px tall, text against the lower edge. */
export const Desktop: Story = {}

/** Node 440:12503 — the tall 1226px frame. */
export const Tablet: Story = { globals: { viewport: { value: 'lg' } } }

/** Node 440:13458 — 754px, with the sentence a step smaller. */
export const Mobile: Story = { globals: { viewport: { value: 'mobile' } } }

/**
 * The scrim off, which is what a photograph known to be dark should do. The supplied one is
 * near-black velvet, so the two stories look almost identical — that is the point. Swap in a pale
 * image and only one of them stays readable.
 */
export const WithoutScrim: Story = { args: { scrim: false } }

/** A headline and a sentence longer than the drawing's, to prove the band grows rather than clips. */
export const WithLongerCopy: Story = {
  args: {
    headline: 'The beauty of lab-grown diamonds, cut and certified in the Emirates',
    lede:
      'Each diamond is created with care for the future, without compromising on quality or ' +
      'brilliance. Modern luxury that combines flawless craftsmanship, sustainability and ' +
      'affordability — with every stone independently graded, and every setting finished by hand ' +
      'in our own workshop.',
  },
}
