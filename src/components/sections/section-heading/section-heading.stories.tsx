import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { SectionHeading } from './section-heading'

/** Nodes 138:456 and 144:840 — the heading that opens a band. */
const meta = {
  title: 'Sections/SectionHeading',
  component: SectionHeading,
  parameters: { layout: 'padded' },
  args: { children: 'Shop by category' },
} satisfies Meta<typeof SectionHeading>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** The two-tone treatment the about band uses — one heading, one accessible name. */
export const TwoTone: Story = {
  args: {
    children: (
      <>
        About <span className="text-primary-default">Aurum</span>
      </>
    ),
  },
}
