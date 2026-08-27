import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Button } from './button'

/**
 * FR-030, FR-032 — every variant and every state, in the same change as the component.
 *
 * The `inverse` variants render on `background-base`. That is not decoration: white-on-light is an
 * axe colour-contrast failure, and the a11y addon is configured to error, so a story that showed
 * them on the default ground would fail CI for a bug that is not in the component.
 */

/** The real `plus` glyph from src/assets/icons/plus.svg, inlined until `Icon` (T057) exists. */
function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 2V18M2 10H18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const onDark: Decorator = (Story) => (
  <div className="bg-background-base p-8">
    <Story />
  </div>
)

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: { layout: 'padded' },
  args: { children: 'Text' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'inverse', 'inverse-outline'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = { args: { variant: 'primary' } }
export const Secondary: Story = { args: { variant: 'secondary' } }
export const Outline: Story = { args: { variant: 'outline' } }
export const Inverse: Story = { args: { variant: 'inverse' }, decorators: [onDark] }
export const InverseOutline: Story = {
  args: { variant: 'inverse-outline' },
  decorators: [onDark],
}

/** All five as drawn — the top three on the page ground, the inverse pair on a dark surface. */
export const AllVariants: Story = {
  parameters: { layout: 'fullscreen' },
  render: (args) => (
    <div>
      <div className="flex flex-wrap items-center gap-4 p-8">
        <Button {...args} variant="primary" />
        <Button {...args} variant="secondary" />
        <Button {...args} variant="outline" />
      </div>
      <div className="bg-background-base flex flex-wrap items-center gap-4 p-8">
        <Button {...args} variant="inverse" />
        <Button {...args} variant="inverse-outline" />
      </div>
    </div>
  ),
}

/** `md` is the drawn size. `sm` and `lg` are provisional — see the note in Button.tsx. */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      <Button {...args} size="sm" />
      <Button {...args} size="md" />
      <Button {...args} size="lg" />
    </div>
  ),
}

export const WithIcons: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      <Button {...args} iconStart={<PlusIcon />} />
      <Button {...args} iconEnd={<PlusIcon />} />
      <Button {...args} iconStart={<PlusIcon />} iconEnd={<PlusIcon />} />
    </div>
  ),
}

/** Activation is blocked and `aria-busy` is set, so assistive tech announces the pending state. */
export const Loading: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      <Button {...args} loading variant="primary" />
      <Button {...args} loading variant="secondary" />
      <Button {...args} loading variant="outline" />
    </div>
  ),
}

export const Disabled: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      <Button {...args} disabled variant="primary" />
      <Button {...args} disabled variant="secondary" />
      <Button {...args} disabled variant="outline" />
    </div>
  ),
}

export const FullWidth: Story = {
  args: { fullWidth: true },
  render: (args) => (
    <div className="max-w-prose">
      <Button {...args} />
    </div>
  ),
}
