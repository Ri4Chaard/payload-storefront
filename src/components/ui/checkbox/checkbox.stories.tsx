import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Checkbox } from './checkbox'

/**
 * FR-030, FR-032 — both shapes, both states, plus the states the design does not draw.
 *
 * `shape="round"` is the component the design calls "Multiselectable". It is the same control; see
 * the note in Checkbox.tsx for why it is a prop and not a second component.
 */
const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  parameters: { layout: 'padded' },
  args: { label: 'Label' },
  argTypes: { shape: { control: 'inline-radio', options: ['square', 'round'] } },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Square: Story = { args: { defaultChecked: true } }
export const Round: Story = { args: { shape: 'round', defaultChecked: true } }

/** The four cells the design draws: each shape, on and off. */
export const AllStates: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-8">
        <Checkbox {...args} shape="square" defaultChecked label="Square, on" />
        <Checkbox {...args} shape="square" label="Square, off" />
      </div>
      <div className="flex items-center gap-8">
        <Checkbox {...args} shape="round" defaultChecked label="Round, on" />
        <Checkbox {...args} shape="round" label="Round, off" />
      </div>
    </div>
  ),
}

export const Disabled: Story = {
  render: (args) => (
    <div className="flex items-center gap-8">
      <Checkbox {...args} disabled defaultChecked label="Disabled, on" />
      <Checkbox {...args} disabled label="Disabled, off" />
    </div>
  ),
}

/** The label stays in the accessibility tree; only its box is removed from the layout. */
export const HiddenLabel: Story = { args: { hideLabel: true, label: 'Select this option' } }

/** Wrapping label text stays aligned to the top of the box rather than centring against it. */
export const LongLabel: Story = {
  render: (args) => (
    <div className="max-w-prose">
      <Checkbox
        {...args}
        label="Include a printed certificate of authenticity with the order, dispatched separately from the product itself."
      />
    </div>
  ),
}
