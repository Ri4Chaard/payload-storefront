import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { NavLink } from './nav-link'

const meta = {
  title: 'UI/NavLink',
  component: NavLink,
  parameters: { layout: 'padded' },
  args: { href: '/rings', children: 'Rings' },
} satisfies Meta<typeof NavLink>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Current: Story = { args: { current: true } }

/** A row, so the 2px rule can be seen not to shift its neighbours on hover. */
export const InANavigation: Story = {
  render: () => (
    <nav aria-label="Primary">
      <ul className="flex items-center gap-6">
        <li>
          <NavLink href="/rings" current>
            Rings
          </NavLink>
        </li>
        <li>
          <NavLink href="/necklaces">Necklaces</NavLink>
        </li>
        <li>
          <NavLink href="/earrings">Earrings</NavLink>
        </li>
        <li>
          <NavLink href="/about">About</NavLink>
        </li>
      </ul>
    </nav>
  ),
}
