import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Link } from '@/components/ui/link'

import { TextInput } from './text-input'

/**
 * FR-030, FR-032 — every state node 196:1344 draws, plus the label the design omits.
 */
const meta = {
  title: 'UI/TextInput',
  component: TextInput,
  parameters: { layout: 'padded' },
  args: { label: 'Email', placeholder: 'text' },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Filled: Story = { args: { defaultValue: 'hello@aurum.example' } }
export const WithIcons: Story = { args: { iconStart: 'mail', iconEnd: 'close' } }
export const WithDescription: Story = {
  args: { description: 'We only use this to send your order confirmation.' },
}
export const WithError: Story = {
  args: { error: 'Enter an email address so we can reach you.', defaultValue: 'not-an-email' },
}
export const Required: Story = { args: { required: true } }
export const Disabled: Story = { args: { disabled: true, defaultValue: 'hello@aurum.example' } }

/** The design's password row: a link living inside the control's box (node 196:1335). */
export const WithTrailingLink: Story = {
  args: {
    label: 'Password',
    type: 'password',
    iconStart: 'certificate',
    trailing: (
      <Link href="/reset" variant="standalone" className="shrink-0">
        Forgot password?
      </Link>
    ),
  },
}

/** Where the surrounding layout already names the control — a search bar, say. */
export const HiddenLabel: Story = {
  args: { label: 'Search', hideLabel: true, iconStart: 'search', placeholder: 'Search' },
}

export const AllStates: Story = {
  decorators: [],
  render: (args) => (
    <div className="flex max-w-sm flex-col gap-6">
      <TextInput {...args} label="Normal" />
      <TextInput {...args} label="With icons" iconStart="mail" iconEnd="close" />
      <TextInput {...args} label="Filled" defaultValue="hello@aurum.example" />
      <TextInput {...args} label="Error" error="Enter an email address so we can reach you." />
      <TextInput {...args} label="Disabled" disabled />
    </div>
  ),
}

/** The footer's newsletter field (node 196:577) — white-on-dark with a white/30 hairline. */
export const InverseTone: Story = {
  args: { label: 'Email address', hideLabel: true, tone: 'inverse', placeholder: 'EMAIL' },
  decorators: [
    (Story) => (
      <div className="bg-background-base max-w-sm p-8">
        <Story />
      </div>
    ),
  ],
}
