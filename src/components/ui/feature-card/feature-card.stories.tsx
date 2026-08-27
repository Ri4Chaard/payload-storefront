import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { FeatureCard, FeatureStrip } from './feature-card'

/**
 * Node 440:12774. Three drawn variants, three breakpoints — resize rather than looking for three
 * stories. Below `md` the row becomes a sideways scroller, which is what four 250px cards that do
 * not shrink inside a 390px frame can only mean.
 */
const ITEMS = [
  {
    icon: 'shipping' as const,
    title: 'Free shipping',
    description: 'Carefully packaged and delivered with guaranteed protection',
  },
  {
    icon: 'seal-check' as const,
    title: 'Quality guarantee',
    description:
      'If your piece doesn’t meet your expectations, we’ll assist you with a return or exchange',
  },
  {
    icon: 'customer-support' as const,
    title: 'Personal support',
    description: 'Our specialists will help you choose the perfect piece and answer any questions',
  },
  {
    icon: 'secure-payment' as const,
    title: 'Secure payments',
    description: 'Your information is protected with modern encryption technology',
  },
]

const meta = {
  title: 'UI/FeatureCard',
  component: FeatureStrip,
  parameters: { layout: 'fullscreen' },
  args: { items: ITEMS },
} satisfies Meta<typeof FeatureStrip>

export default meta
type Story = StoryObj<typeof meta>

/** Node 355:7774 — four across. */
export const Desktop: Story = {}

/** Node 440:12775 — the 2x2 grid. */
export const Tablet: Story = { globals: { viewport: { value: 'md' } } }

/** Node 440:13717 — 250px cards in a sideways scroller. Drag it, or focus it and press right. */
export const Mobile: Story = { globals: { viewport: { value: 'mobile' } } }

/** Copy long enough to prove the drawn height is a floor and not a ceiling. */
export const WithLongerCopy: Story = {
  args: {
    items: ITEMS.map((item, index) =>
      index === 0
        ? {
            ...item,
            description:
              'Every order is packed by hand in a lined case, insured for its full value, and ' +
              'delivered by a courier who will wait for a signature — anywhere in the Emirates, ' +
              'within two working days.',
          }
        : item,
    ),
  },
}

/** A single card, outside the strip. `as="div"` for the layouts that are not a list. */
export const OneCard: Story = {
  render: () => (
    <div className="p-7.5">
      <FeatureCard
        as="div"
        icon="seal-check"
        title="Quality guarantee"
        description="If your piece doesn’t meet your expectations, we’ll assist you with a return or exchange"
        className="max-w-104"
      />
    </div>
  ),
}
