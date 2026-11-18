import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Header } from './header'

/**
 * One header across three breakpoints. Resize the viewport rather than looking for three stories —
 * the whole point is that there is one component.
 */
const BREADCRUMBS = [
  { label: 'Home', href: '/' },
  { label: 'Category 1', href: '/category-1' },
  { label: 'Subcategory', href: '/category-1/subcategory' },
  { label: 'Product 1' },
]

/**
 * The shop's accounts come from the `contact-settings` global (spec 005, FR-052), so the story
 * supplies them. The component no longer falls back to a hardcoded list: the one it used to fall
 * back to pointed at a bare `wa.me/` on every page of the site, which looks like a working link.
 */
/** The shop's own details. The components no longer carry a hardcoded pair — see their props. */
const CONTACT = {
  email: 'hello@aurum.example',
  phone: '+1 (555) 010 20-30',
  phoneHref: 'tel:+15550102030',
}

const SOCIAL = [
  { icon: 'whatsapp' as const, label: 'WhatsApp', href: 'https://wa.me/15550102030' },
  { icon: 'instagram' as const, label: 'Instagram', href: 'https://instagram.com/aurum' },
  { icon: 'telegram' as const, label: 'Telegram', href: 'https://t.me/aurum' },
]

const meta = {
  title: 'Layout/Header',
  component: Header,
  parameters: { layout: 'fullscreen' },
  args: { social: SOCIAL, ...CONTACT },
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

export const Desktop: Story = {}

export const WithBreadcrumbs: Story = { args: { breadcrumbs: BREADCRUMBS } }

/** Node 355:6868 — the basket gains a count. The count is in the button's name, not just the badge. */
export const WithItemsInCart: Story = { args: { cartCount: 2 } }

export const Tablet: Story = {
  globals: { viewport: { value: 'md' } },
  args: { breadcrumbs: BREADCRUMBS, cartCount: 2 },
}

/**
 * Node 440:13435 — the corrected mobile header: hamburger, centred wordmark, cart and account.
 * No language switcher, which is what the superseded Variant3 got wrong.
 */
export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
  args: { cartCount: 2 },
}

export const MobileWithBreadcrumbs: Story = {
  globals: { viewport: { value: 'mobile' } },
  args: { breadcrumbs: BREADCRUMBS },
}

/** Enough page beneath the header to show the mobile panel overlaying content rather than pushing it. */
export const OnAPage: Story = {
  args: { breadcrumbs: BREADCRUMBS, cartCount: 3 },
  render: (args) => (
    <div>
      <Header {...args} />
      <main className="p-8">
        <h1 className="text-heading-1">Category 1</h1>
        <p className="text-body-base text-neutral-secondary mt-4 max-w-prose">
          Placeholder content, so the header has something to sit above.
        </p>
      </main>
    </div>
  ),
}
