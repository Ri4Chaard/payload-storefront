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

/**
 * Policy links, as the layout now supplies them from published content (spec 009, FR-015b).
 *
 * A story rather than a component default, for the same reason `SOCIAL` is: a default that renders
 * plausible-looking links is what made an unconfigured site look configured. The component ships
 * with an empty legal row, and `WithoutPolicies` below is what that looks like.
 */
const LEGAL = [
  { label: 'Privacy Policy', href: '/legal/privacy' },
  { label: 'Terms & Conditions', href: '/legal/terms' },
  { label: 'Cookie Policy', href: '/legal/cookies' },
]

/** Policies the owner filed under Customer Care rather than in the legal row. */
const CUSTOMER_CARE = [{ label: 'Shipping & Returns', href: '/legal/shipping' }]

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
    legalLinks: LEGAL,
    customerCareLinks: CUSTOMER_CARE,
    ...CONTACT,
    year: 2026,
  },
} satisfies Meta<typeof Footer>

export default meta
type Story = StoryObj<typeof meta>

export const Desktop: Story = {}

export const Tablet: Story = { globals: { viewport: { value: 'md' } } }

export const Mobile: Story = { globals: { viewport: { value: 'mobile' } } }

/** Hover SUBSCRIBE for the reveal, and the column links for the rule that grows. */
export const WithoutSocialLinks: Story = { args: { social: [] } }

/**
 * Nothing published yet — a fresh site, or a container build that could not reach the database.
 *
 * The legal row disappears entirely rather than falling back to three links that go nowhere, and
 * CUSTOMER CARE closes over the missing *Shipping & Returns* instead of leaving a gap. Worth a
 * story because it is the state a first deploy is actually in.
 */
export const WithoutPolicies: Story = { args: { legalLinks: [], customerCareLinks: [] } }

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
