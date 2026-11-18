import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Chip } from './chip'

const meta = {
  title: 'UI/Chip',
  component: Chip,
  parameters: { layout: 'padded' },
  args: { children: 'text' },
} satisfies Meta<typeof Chip>

export default meta
type Story = StoryObj<typeof meta>

export const Unselected: Story = {}
export const Selected: Story = { args: { selected: true } }

/** Node 255:2983 — both states, as the design draws them. */
export const AllStates: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Chip {...args} selected>
        selected
      </Chip>
      <Chip {...args}>unselected</Chip>
      <Chip {...args} disabled>
        disabled
      </Chip>
    </div>
  ),
}

/** The shape this is drawn for: a row of suggested searches. */
export const AsASearchSuggestionRow: Story = {
  render: () => (
    <div className="flex max-w-prose flex-wrap items-center gap-3">
      {['category 1', 'option a', 'made to order', 'collection a', 'gift under 1000'].map(
        (term, index) => (
          <Chip key={term} selected={index === 1}>
            {term}
          </Chip>
        ),
      )}
    </div>
  ),
}
