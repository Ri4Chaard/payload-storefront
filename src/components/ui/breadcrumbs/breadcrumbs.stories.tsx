import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Breadcrumbs } from './breadcrumbs'

const meta = {
  title: 'UI/Breadcrumbs',
  component: Breadcrumbs,
  parameters: { layout: 'padded' },
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Rings', href: '/rings' },
      { label: 'Engagement', href: '/rings/engagement' },
      { label: 'Solitaire in 18ct gold' },
    ],
  },
} satisfies Meta<typeof Breadcrumbs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** The shortest useful trail. A single crumb is the current page and renders no separators. */
export const TwoLevels: Story = {
  args: { items: [{ label: 'Home', href: '/' }, { label: 'Rings' }] },
}

/** Long trails wrap rather than forcing the page to scroll sideways (SC-007). */
export const Wrapping: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Fine jewelry', href: '/jewelry' },
      { label: 'Engagement rings', href: '/rings/engagement' },
      { label: 'Ceylon sapphire solitaire in eighteen-carat gold' },
    ],
  },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
}
