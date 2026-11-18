import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { aboutFixture } from '../sections.fixtures'

import { AboutBand } from './about-band'

/** Nodes 158:402, 440:12764, 440:13678. Side by side above `md`, stacked below it. */
const meta = {
  title: 'Sections/AboutBand',
  component: AboutBand,
  parameters: { layout: 'fullscreen' },
  args: aboutFixture,
} satisfies Meta<typeof AboutBand>

export default meta
type Story = StoryObj<typeof meta>

/** Node 158:402 — a 709px column of copy beside the photograph. */
export const Desktop: Story = {}

/** Node 440:12764 — an even split. */
export const Tablet: Story = { globals: { viewport: { value: 'lg' } } }

/** Node 440:13678 — the photograph stacks above the copy. */
export const Mobile: Story = { globals: { viewport: { value: 'mobile' } } }

/** A third paragraph the drawing never shows. The band must grow, not clip. */
export const WithLongerCopy: Story = {
  args: {
    body: [
      ...aboutFixture.body,
      'A third paragraph about your store, which the drawing never shows, so the band has ' +
        'to grow to hold it.',
    ],
  },
}
