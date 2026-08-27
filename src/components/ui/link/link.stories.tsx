import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Link } from './link'

const onDark: Decorator = (Story) => (
  <div className="bg-background-base p-8">
    <Story />
  </div>
)

const meta = {
  title: 'UI/Link',
  component: Link,
  parameters: { layout: 'padded' },
  args: { href: '/collections', children: 'Text' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['inline', 'standalone', 'muted', 'inverse'] },
  },
} satisfies Meta<typeof Link>

export default meta
type Story = StoryObj<typeof meta>

/** Underlined at rest — inside a paragraph, colour alone is not an affordance. */
export const Inline: Story = {
  render: (args) => (
    <p className="text-body-base max-w-prose">
      Every piece is made to order in our atelier. <Link {...args} /> to read how we work.
    </p>
  ),
}

export const Standalone: Story = { args: { variant: 'standalone' } }
export const Muted: Story = { args: { variant: 'muted' } }

/** Node 312:8748 — the footer link. Hover to draw the rule. */
export const Inverse: Story = { args: { variant: 'inverse' }, decorators: [onDark] }

export const AllVariants: Story = {
  parameters: { layout: 'fullscreen' },
  render: (args) => (
    <div>
      <div className="flex flex-col items-start gap-4 p-8">
        <Link {...args} variant="inline" />
        <Link {...args} variant="standalone" />
        <Link {...args} variant="muted" />
      </div>
      <div className="bg-background-base flex flex-col items-start gap-4 p-8">
        <Link {...args} variant="inverse" />
        <Link {...args} variant="inverse" />
      </div>
    </div>
  ),
}

/** An absolute href is detected as external: it opens in a new tab, with `rel` and a spoken warning. */
export const External: Story = {
  args: { href: 'https://example.com', children: 'Our care guide', variant: 'standalone' },
}
