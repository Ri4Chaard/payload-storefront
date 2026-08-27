import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { MenuOption } from './menu-option'

const meta = {
  title: 'UI/MenuOption',
  component: MenuOption,
  parameters: { layout: 'padded' },
  args: { children: '6' },
  decorators: [
    (Story) => (
      <div className="bg-background-container max-w-xs">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MenuOption>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { meta: 'In stock' } }
export const WithoutMeta: Story = {}
export const Selected: Story = { args: { meta: 'In stock', selected: true } }
export const Disabled: Story = { args: { meta: 'Made to order', disabled: true } }

/** Node 301:5920 stacked, which is the only place the collapsed rule reads correctly. */
export const AsAList: Story = {
  decorators: [],
  render: () => (
    <div className="bg-background-container max-w-xs">
      {['5', '6', '7', '8'].map((size, index) => (
        <MenuOption
          key={size}
          meta={index === 3 ? 'Made to order' : 'In stock'}
          selected={index === 1}
        >
          {size}
        </MenuOption>
      ))}
    </div>
  ),
}
