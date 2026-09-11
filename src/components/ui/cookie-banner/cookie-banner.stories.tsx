import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { CookieBanner } from './cookie-banner'

/**
 * The consent banner, from Figma `255:3381` and its tablet and mobile frames.
 *
 * **Each story clears the consent cookie before it renders.** The banner reads the visitor's
 * decision after mount and draws nothing once one exists — so without this, every story would go
 * blank the moment somebody pressed a button in a previous one, and stay blank.
 *
 * The copy is fixed in `./copy.ts` rather than passed in, which is why no story varies it. See that
 * file for the Constitution I exception that makes it so, and for the rule that keeps it safe.
 */
const clearDecision = () => {
  document.cookie = 'aurum-consent=; path=/; max-age=0'
}

const NECESSARY = {
  key: 'necessary',
  name: 'Strictly necessary',
  purpose:
    'These cookies are what let the website do what you asked of it: keep you signed in, remember what is in your shopping bag, and remember this choice.',
  necessary: true,
}

const ANALYTICS = {
  key: 'analytics',
  name: 'Analytics',
  purpose: 'Help us understand which pages are read, so we can improve them.',
  necessary: false,
}

const meta = {
  title: 'UI/CookieBanner',
  component: CookieBanner,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => {
      clearDecision()
      // The banner is fixed to the bottom of the viewport, so a story needs something to sit over
      // or it renders against nothing and its shadow and contrast cannot be judged.
      return (
        <div className="bg-background-base h-svh">
          <Story />
        </div>
      )
    },
  ],
  args: {
    settings: {
      enabled: true,
      consentVersion: 1,
      categories: [NECESSARY],
      policyHref: '/legal/cookies',
    },
  },
} satisfies Meta<typeof CookieBanner>

export default meta
type Story = StoryObj<typeof meta>

/** What the site actually ships: one necessary category and nothing optional. */
export const Desktop: Story = {}

export const Tablet: Story = { globals: { viewport: { value: 'md' } } }

/** The three actions stack full-width here, in the drawn order — frame `544:16200`. */
export const Mobile: Story = { globals: { viewport: { value: 'mobile' } } }

/**
 * The day somebody adds analytics.
 *
 * Nothing about the banner changes — the three buttons are the three buttons — which is the point.
 * What changes is behind *Configure All Cookies*, and what the record then means.
 */
export const WithAnOptionalCategory: Story = {
  args: {
    settings: {
      enabled: true,
      consentVersion: 1,
      categories: [NECESSARY, ANALYTICS],
      policyHref: '/legal/cookies',
    },
  },
}

/**
 * No Cookie Policy linked, or the linked one unpublished.
 *
 * The banner must still be usable and must not render a dead link (FR-022). Worth a story because
 * the failure is silent: a link to a 404 looks exactly like a link.
 */
export const WithoutAPolicyLink: Story = {
  args: {
    settings: { enabled: true, consentVersion: 1, categories: [NECESSARY] },
  },
}

/**
 * Switched off in the admin (FR-026).
 *
 * Renders nothing at all. The story exists so that "nothing" is a checked outcome rather than an
 * assumption — and note that nothing optional is treated as consented while it is off, which is a
 * property of `isAllowed()` rather than of this component.
 */
export const Disabled: Story = {
  args: {
    settings: { enabled: false, consentVersion: 1, categories: [NECESSARY] },
  },
}
