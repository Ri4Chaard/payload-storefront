import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { CookiePreferences } from './cookie-preferences'

/**
 * The chooser behind *Configure All Cookies*.
 *
 * **Nothing in Figma draws this surface** — the button is drawn, its destination is not — so these
 * stories are where its states are actually reviewable.
 *
 * It renders a `Modal` from `md` up and a `Drawer` below, chosen by a media query rather than by CSS
 * so that only one dialog is ever mounted. Resize the preview to see the other one.
 */
const NECESSARY = {
  key: 'necessary',
  name: 'Strictly necessary',
  purpose:
    'These cookies are what let the website do what you asked of it: keep you signed in, remember what is in your shopping bag, and remember this choice. The site cannot work without them, so they cannot be switched off.',
  necessary: true,
}

const ANALYTICS = {
  key: 'analytics',
  name: 'Analytics',
  purpose: 'Help us understand which pages are read and which are not, so we can improve them.',
  necessary: false,
}

const MARKETING = {
  key: 'marketing',
  name: 'Marketing',
  purpose: 'Let us show you our products on other websites you visit.',
  necessary: false,
}

const meta = {
  title: 'UI/CookiePreferences',
  component: CookiePreferences,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      /*
        A sized surface behind the dialog, and not only so the scrim has something to darken.
        Both dialogs are `position: fixed`, so without an element in normal flow the story's root
        collapses to zero height — which reads as "nothing rendered" to anything measuring
        visibility, including the accessibility sweep in `tests/a11y/ui-kit.spec.ts`.
      */
      <div className="bg-background-base h-svh">
        <Story />
      </div>
    ),
  ],
  args: {
    open: true,
    categories: [NECESSARY],
    initialSelection: ['necessary'],
    onSave: () => {},
    onClose: () => {},
  },
} satisfies Meta<typeof CookiePreferences>

export default meta
type Story = StoryObj<typeof meta>

/**
 * **The state every visitor actually meets today**, because this site sets nothing optional.
 *
 * One category, shown as permanently on with the reason beneath it, and a plain sentence saying
 * there is nothing to choose. Not an edge case — the default.
 */
export const NothingOptional: Story = {}

/** The same, as a drawer on a phone. */
export const NothingOptionalMobile: Story = { globals: { viewport: { value: 'mobile' } } }

/**
 * The day analytics arrives: a switch appears, off until somebody turns it on (FR-030).
 *
 * Note that the necessary row still has no switch. A control that refuses to move is worse than no
 * control — it invites a press, ignores it, and explains nothing.
 */
export const WithOptionalCategories: Story = {
  args: { categories: [NECESSARY, ANALYTICS, MARKETING], initialSelection: ['necessary'] },
}

/**
 * A visitor who has agreed to some of it, reopening from the footer.
 *
 * The switches start from what they chose, not from nothing — which is the difference between
 * reviewing a decision and being made to take it again.
 */
export const PreviouslyDecided: Story = {
  args: {
    categories: [NECESSARY, ANALYTICS, MARKETING],
    initialSelection: ['necessary', 'analytics'],
  },
}

/** Several categories at a phone width, where the panel has to scroll. */
export const ManyCategoriesMobile: Story = {
  args: { categories: [NECESSARY, ANALYTICS, MARKETING], initialSelection: ['necessary'] },
  globals: { viewport: { value: 'mobile' } },
}
