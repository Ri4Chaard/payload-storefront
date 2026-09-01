import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'

import { Modal } from './modal'

/**
 * Nodes `583:12968` (Add address), `426:11616` (Change password) and `525:13319` (Full name).
 *
 * Open by default, because a story of a closed modal is a story of an empty iframe — and because
 * the sweep in `tests/a11y/ui-kit.spec.ts` has to see the panel to audit it. The content here
 * stands in for what the four consumers put inside; the primitive knows nothing about any of them.
 */
const meta = {
  title: 'UI/Modal',
  component: Modal,
  parameters: { layout: 'fullscreen' },
  /**
   * Every story renders the page behind the dialog.
   *
   * Not decoration. `Modal` returns only fixed-position elements, so on its own it gives its
   * wrapper no layout at all — which reads as "nothing visible" to the accessibility sweep and
   * hangs it. It is also simply what a modal is: a thing over a page.
   *
   * The wrapper deliberately carries NO background class, matching `Drawer`'s stories. Painting one
   * puts an opaque colour under the scrim, and axe then resolves the panel's own background against
   * that composite and reports contrast failures for text that is in fact sitting on white.
   */
  decorators: [
    (Story) => (
      <div className="min-h-svh p-10">
        <p className="text-body-base text-neutral-primary">The page behind the dialog.</p>
        <Story />
      </div>
    ),
  ],
  args: {
    open: true,
    onClose: () => {},
    title: 'FULL NAME',
  },
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof meta>

const Actions = () => (
  <>
    <Button variant="outline">Cancel</Button>
    <Button variant="primary">Save</Button>
  </>
)

/** The Full name modal — two fields side by side, the smallest of the four. */
export const Default: Story = {
  args: {
    footer: <Actions />,
    children: (
      <div className="grid grid-cols-2 gap-5 pb-2">
        <TextInput label="First name" placeholder="First name" hideLabel />
        <TextInput label="Last name" placeholder="Last name" hideLabel />
      </div>
    ),
  },
}

/** The address modal, which is the tallest thing this has to hold at the drawn width. */
export const Tall: Story = {
  args: {
    title: 'ADD ADDRESS',
    footer: <Actions />,
    children: (
      <div className="flex flex-col gap-5 pb-2">
        <TextInput label="Address line 1" placeholder="Address line 1" hideLabel />
        <TextInput label="Address line 2" placeholder="Address line 2 (optional)" hideLabel />
        <TextInput label="Apartment" placeholder="Apartment, suite, etc (optional)" hideLabel />
        <div className="grid grid-cols-2 gap-5">
          <TextInput label="City" placeholder="City" hideLabel />
          <TextInput label="Postcode" placeholder="Postcode" hideLabel />
        </div>
      </div>
    ),
  },
}

/**
 * Enough content to exceed the panel. Only the body scrolls — the heading stays put and the actions
 * stay reachable, which is the property that makes a long form usable inside a locked page.
 */
export const Scrolling: Story = {
  args: {
    title: 'A LONG FORM',
    footer: <Actions />,
    children: (
      <div className="flex flex-col gap-5 pb-2">
        {Array.from({ length: 12 }, (_, i) => (
          <TextInput key={i} label={`Field ${i + 1}`} placeholder={`Field ${i + 1}`} hideLabel />
        ))}
      </div>
    ),
  },
}

/** `sm` — a confirmation with one sentence in it, rather than the drawn 800px box. */
export const Small: Story = {
  args: {
    title: 'DELETE ADDRESS',
    size: 'sm',
    footer: <Actions />,
    children: <p className="text-body-base text-neutral-primary pb-2">Delete this address?</p>,
  },
}

/**
 * Closed. The panel stays in the document with `display: none`, so the exit transition has an
 * element to play on — the same decision `Drawer` and `MobileNav` record. Only the page behind it
 * should be reachable.
 */
export const Closed: Story = {
  args: {
    open: false,
    children: <p>The dialog is closed; this should not be reachable.</p>,
  },
}
