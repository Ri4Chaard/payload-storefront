import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ChannelGrid } from './channel-grid'

/**
 * The ways to reach the shop, from nodes `312:8535`, `419:10765`, `419:10847`.
 *
 * **The counts are what these stories are for.** The drawing shows exactly four cards, which is
 * layout fill rather than a rule — an owner may save one messenger or six, and FR-014 requires the
 * band to stay coherent either way. Four across at `xl`, two at `md`, one below.
 */
const CARD = {
  whatsapp: {
    icon: 'whatsapp' as const,
    label: 'WhatsApp',
    value: '+1 (555) 010 20-30',
    href: 'https://wa.me/15550102030',
  },
  telegram: {
    icon: 'telegram' as const,
    label: 'Telegram',
    value: '@aurum',
    href: 'https://t.me/aurum',
  },
  instagram: {
    icon: 'instagram' as const,
    label: 'Instagram',
    value: '@aurum',
    href: 'https://instagram.com/aurum',
  },
  email: {
    icon: 'mail' as const,
    label: 'Email Us',
    value: 'hello@aurum.example',
    href: 'mailto:hello@aurum.example',
  },
}

const meta = {
  title: 'Contact/ChannelGrid',
  component: ChannelGrid,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ChannelGrid>

export default meta
type Story = StoryObj<typeof meta>

/** The drawn arrangement: three messengers and the email address. */
export const AsDrawn: Story = {
  args: { items: [CARD.whatsapp, CARD.telegram, CARD.instagram, CARD.email] },
}

/** A shop that publishes only an address. The email card is always present and always last. */
export const EmailOnly: Story = {
  args: { items: [CARD.email] },
}

/** Two, which is the awkward count — it must not stretch to fill four columns. */
export const TwoChannels: Story = {
  args: { items: [CARD.whatsapp, CARD.email] },
}

export const ThreeChannels: Story = {
  args: { items: [CARD.whatsapp, CARD.telegram, CARD.email] },
}

/**
 * More than drawn. An owner may add a second Telegram account for support; the band wraps onto a
 * second row rather than shrinking the cards past legibility.
 */
export const SixChannels: Story = {
  args: {
    items: [
      CARD.whatsapp,
      CARD.telegram,
      CARD.instagram,
      { ...CARD.telegram, value: '@aurum_support' },
      { ...CARD.whatsapp, value: '+1 (555) 010 20-31' },
      CARD.email,
    ],
  },
}
