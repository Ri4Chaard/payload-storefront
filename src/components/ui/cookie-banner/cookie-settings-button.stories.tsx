import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { CookieSettingsButton } from './cookie-settings-button'

/**
 * The footer's way back to the cookie chooser.
 *
 * **The design draws no re-entry point anywhere** — once the drawn banner is answered it is gone
 * for good. This exists because a decision somebody cannot revisit is a decision they cannot
 * revoke, and withdrawal has to be as available as consent was.
 *
 * It sits in the footer's legal row beside the policy links, so the stories render it on the
 * footer's own dark surface — on a light background its `inverse` colouring would be invisible and
 * the contrast unreviewable.
 *
 * Pressing it here does nothing visible: it dispatches a window event that `CookieBanner` listens
 * for, and no banner is mounted in this story. `UI/CookieBanner` is where the pair is exercised
 * together.
 */
const meta = {
  title: 'UI/CookieSettingsButton',
  component: CookieSettingsButton,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="bg-background-base flex items-center justify-center p-12.5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CookieSettingsButton>

export default meta
type Story = StoryObj<typeof meta>

/** Hover and focus it — the focus ring has to be visible against the near-black footer. */
export const Default: Story = {}
