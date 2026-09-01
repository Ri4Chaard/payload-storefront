import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { OtpInput } from './otp-input'

/**
 * Nodes `428:11924` (registration) and `429:12404` (password reset) — one control, not the two
 * sizes the design draws.
 *
 * The behaviour worth exercising by hand here is the paste: copy `482913` and press ⌘V or Ctrl+V
 * with the focus on ANY of the six boxes. All six fill. So does `Your Aurum code is 482913`,
 * which is what people actually copy out of a mail client.
 */
const meta = {
  title: 'UI/OtpInput',
  component: OtpInput,
  args: {
    label: 'Verification code',
    name: 'code',
  },
} satisfies Meta<typeof OtpInput>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

/** Mid-entry, as the design draws it — three of six typed. */
export const PartiallyFilled: Story = {
  args: { value: '482' },
}

export const Complete: Story = {
  args: { value: '482913' },
}

/** Node `429:12685`. The message is wired through `aria-describedby`, so it is announced, not just drawn. */
export const WithError: Story = {
  args: { value: '482913', error: 'Invalid code. Please try again.' },
}

export const Disabled: Story = {
  args: { value: '4829', disabled: true },
}

/** Uncontrolled, for pressing keys at. This is the one to paste into. */
export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = React.useState('')
    return (
      <div className="flex flex-col items-center gap-5">
        <OtpInput {...args} value={value} onChange={setValue} />
        <p className="text-body-s text-neutral-secondary">Value: {value || '(empty)'}</p>
      </div>
    )
  },
}
