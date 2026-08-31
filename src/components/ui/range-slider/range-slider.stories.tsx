import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { RangeSlider } from './range-slider'

/**
 * Node 225:1369 — the PRICE control in the filter drawer. Controlled: the caller owns the pair, the
 * way the listing route owns the filter state it came from.
 *
 * Amounts are integer minor units throughout, which is what `formatValue` is for.
 */
const money = (minorUnits: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(minorUnits / 100)

const meta = {
  title: 'UI/RangeSlider',
  component: RangeSlider,
  parameters: { layout: 'centered' },
  args: {
    min: 0,
    max: 5000000,
    step: 10000,
    value: [500000, 3000000] as [number, number],
    label: 'Price',
    formatValue: money,
    onChange: () => {},
  },
  render: function Render(args) {
    const [value, setValue] = React.useState<[number, number]>([...args.value] as [number, number])
    return (
      <div className="w-76 flex flex-col gap-4">
        <RangeSlider {...args} value={value} onChange={setValue} />
        <p className="text-body-small text-neutral-secondary text-center">
          {money(value[0])} – {money(value[1])}
        </p>
      </div>
    )
  },
} satisfies Meta<typeof RangeSlider>

export default meta
type Story = StoryObj<typeof meta>

/** As drawn — 304px wide, both handles inside the rail. */
export const Default: Story = {}

/** The full span selected: the bar covers the rail and only the end ticks show past it. */
export const FullRange: Story = { args: { value: [0, 5000000] } }

/**
 * Both handles on the same value. This is the state that a naive implementation cannot leave —
 * pull from either side and the nearer handle is the one that moves.
 */
export const Collapsed: Story = { args: { value: [2500000, 2500000] } }

export const Disabled: Story = { args: { disabled: true } }

/**
 * With names, the pair is two ordinary form controls and the drawer submits without JavaScript
 * (FR-029). Submitting this story appends `?minPrice=…&maxPrice=…` exactly as the drawer does.
 */
export const InAForm: Story = {
  args: { nameMin: 'minPrice', nameMax: 'maxPrice' },
  render: function Render(args) {
    const [value, setValue] = React.useState<[number, number]>([...args.value] as [number, number])
    return (
      <form className="w-76 flex flex-col gap-4">
        <RangeSlider {...args} value={value} onChange={setValue} />
      </form>
    )
  },
}
