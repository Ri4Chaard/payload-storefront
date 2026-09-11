import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { TextArea } from './text-area'

/**
 * The multi-line control, drawn on the contact form at `312:8666`.
 *
 * Its states are `TextInput`'s states, because it shares that control's box treatment — which is
 * the whole reason it lives in the kit rather than beside the one form that uses it.
 */
const meta = {
  title: 'UI/TextArea',
  component: TextArea,
  parameters: { layout: 'padded' },
  args: { label: 'Message', placeholder: 'Message' },
  decorators: [
    (Story) => (
      <div className="max-w-160">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextArea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Filled: Story = {
  args: {
    defaultValue:
      'I am looking for an emerald-cut solitaire, around 1.5ct, and I would like to know what you have available.',
  },
}

/** The drawn height at desktop is 134px, which is about four rows. */
export const AsDrawn: Story = {
  args: { rows: 4 },
}

export const WithError: Story = {
  args: { error: 'Please tell us what you would like to ask.' },
}

export const WithDescription: Story = {
  args: { description: 'Up to 5000 characters.' },
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Sending…' },
}

/**
 * The dark-surface tone, kept in step with `TextInput` so the two never diverge.
 *
 * **`bg-background-base` is the dark ground**, not a light one — the token is named for the site's
 * base surface, which is `#130000`. A first draft of this story reached for `bg-background-inverse`,
 * which is not a token at all, so the class did nothing and the white label sat on a light
 * background. The accessibility sweep caught it as a contrast violation, which is exactly the
 * failure a non-existent utility class produces and the reason `pnpm check:styles` cannot: it looks
 * for magic values, not for classes that do not exist.
 */
export const Inverse: Story = {
  args: { tone: 'inverse' },
  decorators: [
    (Story) => (
      <div className="bg-background-base max-w-160 p-10">
        <Story />
      </div>
    ),
  ],
}
