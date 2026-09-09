import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Footer } from './footer'

/**
 * One footer across three breakpoints. Resize rather than looking for three stories.
 *
 * The year is pinned so the story does not change on New Year's Day; in the app it comes from the
 * build.
 */
/**
 * The shop's accounts now come from the `contact-settings` global (spec 005, FR-052), so a story
 * supplies them rather than the component defaulting to a hardcoded list. The list it used to
 * default to pointed at bare `wa.me/` and `instagram.com/` roots on every page of the site.
 */
/** The shop's own details. The components no longer carry a hardcoded pair — see their props. */
const CONTACT = {
  email: 'hello@aurum.example',
  phone: '+1 (555) 010 20-30',
  phoneHref: 'tel:+15550102030',
  address: '12 Market Street, Old Town, Example City',
  openingHours: 'Daily · 10:00 AM–9:00 PM',
  mapsHref: 'https://www.google.com/maps/search/?api=1&query=Example%20City',
}

const SOCIAL = [
  { icon: 'whatsapp' as const, label: 'WhatsApp', href: 'https://wa.me/15550102030' },
  { icon: 'instagram' as const, label: 'Instagram', href: 'https://instagram.com/aurum' },
  { icon: 'telegram' as const, label: 'Telegram', href: 'https://t.me/aurum' },
]

const meta = {
  title: 'Layout/Footer',
  component: Footer,
  parameters: { layout: 'fullscreen' },
  args: {
    social: SOCIAL,
    ...CONTACT, year: 2026 },
} satisfies Meta<typeof Footer>

export default meta
type Story = StoryObj<typeof meta>

export const Desktop: Story = {}

export const Tablet: Story = { globals: { viewport: { value: 'md' } } }

export const Mobile: Story = { globals: { viewport: { value: 'mobile' } } }

/** Hover SUBSCRIBE for the reveal, and the column links for the rule that grows. */
export const WithoutSocialLinks: Story = { args: { social: [] } }

/** A short group list, to show the grid does not collapse when a column is missing. */
export const FewerGroups: Story = {
  args: {
    groups: [
      {
        title: 'About',
        links: [
          { label: 'Our Story', href: '/about' },
          { label: 'Our Blog', href: '/blog' },
        ],
      },
    ],
  },
}
