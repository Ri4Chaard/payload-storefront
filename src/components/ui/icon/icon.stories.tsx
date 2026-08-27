import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Icon } from './icon'
import { iconNames } from '@/lib/icon-registry'

/**
 * FR-030, FR-032 — the whole set, at every size, so a mismatched glyph is visible rather than
 * discovered at the call site.
 */
const meta = {
  title: 'UI/Icon',
  component: Icon,
  parameters: { layout: 'padded' },
  args: { name: 'search' },
  argTypes: {
    name: { control: 'select', options: iconNames },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Icon>

export default meta
type Story = StoryObj<typeof meta>

export const Single: Story = {}

/** Every icon in the registry. Uneven optical weight here is the viewBox spread, not a bug. */
export const AllIcons: Story = {
  render: () => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-6">
      {iconNames.map((name) => (
        <div key={name} className="flex flex-col items-center gap-2 text-center">
          <Icon name={name} size="lg" />
          <code className="text-caption text-neutral-secondary break-all">{name}</code>
        </div>
      ))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-6">
      <Icon {...args} size="sm" />
      <Icon {...args} size="md" />
      <Icon {...args} size="lg" />
    </div>
  ),
}

/** Colour is inherited, never set. These are the same icon in three text colours. */
export const InheritsColour: Story = {
  render: (args) => (
    <div className="flex items-center gap-6">
      <span className="text-neutral-primary">
        <Icon {...args} size="lg" />
      </span>
      <span className="text-primary-default">
        <Icon {...args} size="lg" />
      </span>
      <span className="bg-background-base text-neutral-white p-3">
        <Icon {...args} size="lg" />
      </span>
    </div>
  ),
}

/** With a label the icon is a graphic; without one it is hidden from assistive tech. */
export const Labelled: Story = { args: { name: 'cart', label: 'Cart', size: 'lg' } }
