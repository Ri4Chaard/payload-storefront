import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Field } from './field'

/**
 * Field is the wrapper every form control shares, shown here around a bare input so the ARIA wiring
 * is visible on its own. In practice you reach for `TextInput`, which composes it.
 */
function Control({
  id,
  describedBy,
  disabled,
}: {
  id: string
  describedBy?: string
  disabled?: boolean
}) {
  return (
    <input
      id={id}
      aria-describedby={describedBy}
      disabled={disabled}
      className="text-body-medium text-neutral-primary h-13 border border-black/10 px-5"
    />
  )
}

const meta = {
  title: 'UI/Field',
  component: Field,
  parameters: { layout: 'padded' },
  args: { id: 'demo', label: 'Label', children: <Control id="demo" /> },
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithDescription: Story = {
  args: {
    description: 'We only use this to send your order confirmation.',
    descriptionId: 'demo-description',
    children: <Control id="demo" describedBy="demo-description" />,
  },
}

/** Error text is neutral-primary. The red lives on the control's border — see the note in field.tsx. */
export const WithError: Story = {
  args: {
    error: 'Enter an email address so we can reach you.',
    errorId: 'demo-error',
    children: <Control id="demo" describedBy="demo-error" />,
  },
}

export const Required: Story = { args: { required: true } }
export const Disabled: Story = {
  args: { disabled: true, children: <Control id="demo" disabled /> },
}
export const HiddenLabel: Story = { args: { hideLabel: true } }
