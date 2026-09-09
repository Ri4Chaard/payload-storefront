import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Button } from '@/components/ui/button'
import type { MessengerLink } from '@/lib/messengers/links'

import { HandoffModal } from './handoff-modal'

/**
 * Nodes `590:13108` (1920), `590:13775` (1024), `590:13875` (390).
 *
 * The copy affordance is in every story because it is in every handoff (FR-024, SC-017) — a page
 * cannot detect whether a messenger will open, so a fallback that waits for failure never reaches
 * the customer who needed it.
 */
const MESSAGE = `Hello Aurum, I would like to order:

1 × Paragon Emerald Cut Diamond Engagement Ring — Lab 1.5 ct D VS1, size 6 — $38,320
2 × Butterfly Diamond Pendant — $49,800

Total: $88,120

Name: Aisha Karimova
Delivery address: Mangilik el 22, Astana, 010000, Kazakhstan`

const link = (
  platform: MessengerLink['platform'],
  label: string,
  carriesMessage = true,
): MessengerLink => ({
  platform,
  label,
  handle: '@aurum',
  href: 'https://example.com',
  carriesMessage,
})

const ALL: MessengerLink[] = [
  link('instagram', 'Instagram', false),
  link('telegram', 'Telegram'),
  link('whatsapp', 'WhatsApp'),
]

/** The shop's own details, which the modal offers to whoever would rather write or call. */
const CONTACT = {
  email: 'hello@aurum.example',
  phone: '+1 (555) 010 20-30',
  phoneHref: 'tel:+15550102030',
}

const meta = {
  title: 'Commerce/HandoffModal',
  component: HandoffModal,
  parameters: { layout: 'fullscreen' },
  args: { open: true, onClose: () => {}, message: MESSAGE, messengers: ALL, contact: CONTACT },
  /** The modal is fixed, so a story needs something behind it to look like a page. */
  render: function Render(args) {
    const [open, setOpen] = React.useState(args.open)
    return (
      <div className="bg-background-bg min-h-screen p-10">
        <Button type="button" variant="primary" onClick={() => setOpen(true)}>
          Checkout
        </Button>
        <HandoffModal {...args} open={open} onClose={() => setOpen(false)} />
      </div>
    )
  },
} satisfies Meta<typeof HandoffModal>

export default meta
type Story = StoryObj<typeof meta>

/** All three, as drawn. Instagram notes that it cannot carry the message. */
export const ThreeMessengers: Story = {}

/** One configured account — the others unticked in the admin. */
export const OneMessenger: Story = {
  args: { messengers: [link('whatsapp', 'WhatsApp')] },
}

/**
 * None configured. The copy affordance is not a fallback that appears here — it was always there;
 * this is simply what is left, and the wording changes to suit.
 */
export const NoneConfigured: Story = {
  args: { messengers: [] },
}

/** Only the row that cannot pre-fill, so its note and the clipboard path are both visible. */
export const InstagramOnly: Story = {
  args: { messengers: [link('instagram', 'Instagram', false)] },
}
