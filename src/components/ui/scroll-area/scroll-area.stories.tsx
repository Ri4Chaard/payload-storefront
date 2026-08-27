import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { ScrollArea } from './scroll-area'

/**
 * The scrollbar is the platform's own, restyled — see the note in scroll-area.tsx for why the two
 * carets the design draws are not reproduced.
 */
const meta = {
  title: 'UI/ScrollArea',
  component: ScrollArea,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ScrollArea>

export default meta
type Story = StoryObj<typeof meta>

export const Vertical: Story = {
  args: { label: 'Available sizes', className: 'h-44 max-w-xs bg-background-container' },
  render: (args) => (
    <ScrollArea {...args}>
      <ul className="text-body-base flex flex-col gap-3 p-5">
        {Array.from({ length: 20 }, (_, index) => (
          <li key={index}>Size {index + 1}</li>
        ))}
      </ul>
    </ScrollArea>
  ),
}

export const Horizontal: Story = {
  args: {
    label: 'Collection',
    orientation: 'horizontal',
    className: 'max-w-md bg-background-container',
  },
  render: (args) => (
    <ScrollArea {...args}>
      <div className="flex gap-4 p-5">
        {Array.from({ length: 12 }, (_, index) => (
          <div
            key={index}
            className="text-body-small bg-background-subtle grid size-32 shrink-0 place-items-center"
          >
            {index + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}
