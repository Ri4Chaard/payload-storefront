import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { MenuOption } from '@/components/ui/menu-option'

import { Menu } from './menu'

/**
 * The disclosure behaviour is the point here, and it is keyboard behaviour — open the trigger and
 * try Escape, the arrow keys, Home/End and Tab.
 */
const meta = {
  title: 'UI/Menu',
  component: Menu,
  parameters: { layout: 'padded' },
  args: {
    label: 'Language',
    trigger: <span className="text-body-medium">EN</span>,
    children: (
      <>
        <MenuOption divider={false} selected>
          EN
        </MenuOption>
        <MenuOption divider={false}>RU</MenuOption>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div className="min-h-52">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Menu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Menu {...args}>
      <MenuOption divider={false} selected>
        EN
      </MenuOption>
      <MenuOption divider={false}>RU</MenuOption>
    </Menu>
  ),
}

/** Aligned to the trigger's right edge, which is what a menu near the viewport edge needs. */
export const AlignedToEnd: Story = {
  args: { align: 'end' },
  render: (args) => (
    <div className="flex justify-end">
      <Menu {...args}>
        <MenuOption divider={false} selected>
          EN
        </MenuOption>
        <MenuOption divider={false}>RU</MenuOption>
      </Menu>
    </div>
  ),
}

/** Rows carrying metadata — the size list of node 301:5920 in a menu rather than inline. */
export const WithMetadata: Story = {
  args: { label: 'Size', trigger: <span className="text-body-medium">Choose a size</span> },
  render: (args) => (
    <Menu {...args} className="w-64">
      {['5', '6', '7', '8'].map((size, index) => (
        <MenuOption key={size} meta={index === 3 ? 'Made to order' : 'In stock'}>
          {size}
        </MenuOption>
      ))}
    </Menu>
  ),
}
