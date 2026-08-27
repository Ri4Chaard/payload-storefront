import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Switch } from './switch'

/**
 * FR-030, FR-032 — both drawn states, plus disabled and hidden-label, which the design omits.
 */
const meta = {
  title: 'UI/Switch',
  component: Switch,
  parameters: { layout: 'padded' },
  args: { label: 'Label' },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const On: Story = { args: { defaultChecked: true } }
export const Off: Story = {}

export const AllStates: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-6">
      <Switch {...args} defaultChecked label="On" />
      <Switch {...args} label="Off" />
      <Switch {...args} disabled defaultChecked label="Disabled, on" />
      <Switch {...args} disabled label="Disabled, off" />
    </div>
  ),
}

export const HiddenLabel: Story = { args: { hideLabel: true, label: 'Made to order' } }
