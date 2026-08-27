import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Accordion, AccordionItem } from './accordion'

/**
 * Figma calls this "item info" (node 242:2382). Its three variants are two states and a hover —
 * hover a row for the maroon rule that Variant3 draws.
 */
const ITEMS = [
  {
    id: 'description',
    title: 'Description',
    content:
      'A solitaire in 18ct gold, set with a 1.2ct brilliant-cut diamond. Each stone is chosen in ' +
      'person and comes with its own certificate.',
  },
  {
    id: 'delivery',
    title: 'Delivery & returns',
    content: 'Insured delivery within the UAE in two working days. Returns accepted for 30 days.',
  },
  {
    id: 'warranty',
    title: 'Warranty',
    content: 'Lifetime warranty against manufacturing defects.',
  },
]

const meta = {
  title: 'UI/Accordion',
  component: Accordion,
  parameters: { layout: 'padded' },
  args: { items: ITEMS },
  decorators: [
    (Story) => (
      <div className="w-212 max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

/** All closed — node 242:2380 stacked. */
export const Default: Story = {}

/** Node 242:2381: one row open, showing the description beneath it. */
export const WithARowOpen: Story = { args: { defaultOpen: ['description'] } }

/** `single` closes the others when one opens. Without it, rows are independent. */
export const OnlyOneOpenAtATime: Story = {
  args: { single: true, defaultOpen: ['description'] },
}

export const WithADisabledRow: Story = {
  args: { items: ITEMS.map((item, i) => (i === 2 ? { ...item, disabled: true } : item)) },
}

/** A single row on its own, uncontrolled — the Figma component by itself. */
export const OneRowAlone: Story = {
  render: () => (
    <AccordionItem title="Description" defaultOpen>
      A solitaire in 18ct gold, set with a 1.2ct brilliant-cut diamond.
    </AccordionItem>
  ),
}
