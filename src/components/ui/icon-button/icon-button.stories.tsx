import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { IconButton } from './icon-button'

/**
 * FR-030, FR-032. `social` renders on `background-base` — it is a white glyph and has nowhere to
 * live on the page ground.
 */
const onDark: Decorator = (Story) => (
  <div className="bg-background-base p-8">
    <Story />
  </div>
)

const meta = {
  title: 'UI/IconButton',
  component: IconButton,
  parameters: { layout: 'padded' },
  args: { icon: 'plus', label: 'Add' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['filled', 'outline', 'bare', 'social'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Filled: Story = { args: { variant: 'filled' } }
export const Outline: Story = { args: { variant: 'outline', icon: 'chevron-right', label: 'Next' } }
export const Bare: Story = { args: { variant: 'bare', icon: 'trash', label: 'Remove' } }
export const Social: Story = {
  args: { variant: 'social', icon: 'whatsapp', label: 'WhatsApp', size: 'lg' },
  decorators: [onDark],
}

export const AllVariants: Story = {
  parameters: { layout: 'fullscreen' },
  render: (args) => (
    <div>
      <div className="flex flex-wrap items-center gap-6 p-8">
        <IconButton {...args} variant="filled" />
        <IconButton {...args} variant="outline" icon="chevron-right" label="Next" />
        <IconButton {...args} variant="bare" icon="trash" label="Remove" />
      </div>
      <div className="bg-background-base flex flex-wrap items-center gap-6 p-8">
        <IconButton {...args} variant="social" icon="whatsapp" label="WhatsApp" size="lg" />
        <IconButton {...args} variant="social" icon="telegram" label="Telegram" size="lg" />
        <IconButton {...args} variant="social" icon="instagram" label="Instagram" size="lg" />
      </div>
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-6">
      <IconButton {...args} size="sm" />
      <IconButton {...args} size="md" />
      <IconButton {...args} size="lg" />
    </div>
  ),
}

/** Node 144:1045 — hover to send the glyph out of the left edge as its twin arrives from the right. */
export const SlideOnHover: Story = {
  args: { variant: 'outline', icon: 'chevron-right', label: 'Next', hoverEffect: 'slide' },
}

export const Disabled: Story = { args: { disabled: true } }
