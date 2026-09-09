import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Header } from '@/components/layout/header'

import { ContactBanner } from './contact-banner'

/**
 * Two drawn widths and a third state that is "not there". Resize rather than looking for three
 * stories — below `md` the strip is `display: none`, which the Mobile story shows as an empty
 * canvas. That is the correct result, not a broken story.
 */
/**
 * The shop's accounts now come from the `contact-settings` global (spec 005, FR-052), so a story
 * supplies them rather than the component defaulting to a hardcoded list. The list it used to
 * default to pointed at bare `wa.me/` and `instagram.com/` roots on every page of the site.
 */
const SOCIAL = [
  { icon: 'whatsapp' as const, label: 'WhatsApp', href: 'https://wa.me/15550102030' },
  { icon: 'instagram' as const, label: 'Instagram', href: 'https://instagram.com/aurum' },
  { icon: 'telegram' as const, label: 'Telegram', href: 'https://t.me/aurum' },
]

const meta = {
  args: { social: SOCIAL },
  title: 'Layout/ContactBanner',
  component: ContactBanner,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ContactBanner>

export default meta
type Story = StoryObj<typeof meta>

/** Node 196:868 — 70px tall, 100px gutter, 32px glyphs. */
export const Desktop: Story = {}

/** Node 440:12226 — 60px tall, 24px gutter, 24px glyphs. */
export const Tablet: Story = { globals: { viewport: { value: 'md' } } }

/** Nothing renders, by design. Every item here is repeated in the footer. */
export const Mobile: Story = { globals: { viewport: { value: 'mobile' } } }

/** A shop with no social accounts yet — the row disappears, the contacts stay left-aligned. */
export const WithoutSocialLinks: Story = { args: { social: [] } }

/** How it actually sits on a page: the strip, then the header, sharing the same gutters. */
export const AboveTheHeader: Story = {
  render: (args) => (
    <div>
      <ContactBanner {...args} />
      <Header cartCount={2} />
    </div>
  ),
}
