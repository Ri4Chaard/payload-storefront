import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { QuantityStepper } from './quantity-stepper'

/** Node 255:3545, from the cart row. Controlled — the caller owns the count. */
const meta = {
  title: 'UI/QuantityStepper',
  component: QuantityStepper,
  parameters: { layout: 'centered' },
  args: { value: 1, onChange: () => {}, label: 'quantity' },
  render: function Render(args) {
    const [value, setValue] = React.useState(args.value)
    return <QuantityStepper {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof QuantityStepper>

export default meta
type Story = StoryObj<typeof meta>

/** At the floor: the minus is disabled rather than able to reach zero. */
export const Default: Story = {}

export const MidRange: Story = { args: { value: 3, max: 8 } }

/** At the ceiling — usually the stock level. */
export const AtTheMaximum: Story = { args: { value: 5, max: 5 } }

export const Disabled: Story = { args: { value: 2, disabled: true } }
