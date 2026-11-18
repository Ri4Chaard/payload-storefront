import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { MessengerRow } from './messenger-row'

/**
 * Node `590:13188`. The whole row is the link, so hover and focus belong to one element rather than
 * to a card containing a smaller target.
 */
const meta = {
  title: 'UI/MessengerRow',
  component: MessengerRow,
  parameters: { layout: 'padded' },
  args: {
    icon: 'whatsapp',
    label: 'WhatsApp',
    handle: '@aurum',
    href: 'https://example.com',
  },
  decorators: [
    (Story) => (
      <div className="bg-background-container w-110 max-w-full p-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MessengerRow>

export default meta
type Story = StoryObj<typeof meta>

export const WhatsApp: Story = {}

export const Telegram: Story = {
  args: { icon: 'telegram', label: 'Telegram' },
}

/**
 * A platform that cannot carry the message.
 *
 * Instagram has no documented way to pre-fill a direct message, and the note is how the row admits
 * it — a customer who arrives at an empty chat believing their order travelled has been misled by
 * the interface, not by Instagram (FR-021).
 */
export const CannotCarryTheMessage: Story = {
  args: {
    icon: 'instagram',
    label: 'Instagram',
    note: 'Opens an empty chat — copy your order below first.',
  },
}

/** A long handle truncates rather than pushing the chevron off the row. */
export const LongHandle: Story = {
  args: { handle: '@aurum-online-store-a-very-long-handle-example' },
}
