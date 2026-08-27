import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { SearchField } from './search-field'

/**
 * Node 255:3167. "default" and "active" are the empty and filled states of one field — type into
 * it to move between them.
 */
const meta = {
  title: 'UI/SearchField',
  component: SearchField,
  parameters: { layout: 'padded' },
  args: { label: 'Search the catalogue' },
  decorators: [
    (Story) => (
      <div className="w-212 max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchField>

export default meta
type Story = StoryObj<typeof meta>

/** Empty — the placeholder, and the maroon caret the drawing shows as a bar. */
export const Default: Story = {}

/** Filled: the clear affordance appears. Escape clears it too. */
export const WithAValue: Story = { args: { defaultValue: 'Rings' } }

export const Disabled: Story = { args: { defaultValue: 'Rings', disabled: true } }

/** Controlled, which is how a real search page drives it. */
export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = React.useState('Diamond')
    return (
      <div className="flex flex-col gap-5">
        <SearchField
          {...args}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onClear={() => setValue('')}
        />
        <p className="text-body-small text-neutral-secondary">
          Query: {value === '' ? '(empty)' : value}
        </p>
      </div>
    )
  },
}
