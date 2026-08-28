import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Container } from './container'

/**
 * A gutter is invisible on its own, so every story here draws the edge it creates: the tinted block
 * is the container's content box, and the gap either side of it is the measure under review.
 *
 * Resize the frame to see it step — 16px, then 24px at 768, then 100px at 1280.
 */
const meta = {
  title: 'UI/Container',
  component: Container,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Container>

export default meta
type Story = StoryObj<typeof meta>

const Fill = () => (
  <div className="bg-background-subtle text-body-small text-neutral-primary p-5">
    The tinted area is the content box. The space to its left and right is the gutter.
  </div>
)

export const Default: Story = {
  render: (args) => (
    <Container {...args}>
      <Fill />
    </Container>
  ),
}

/**
 * Stacked containers are how a page is built, and the point of them is that the two blocks share
 * one edge. If these ever fail to line up, the measure has been written down twice somewhere.
 */
export const Stacked: Story = {
  render: () => (
    <div className="flex flex-col gap-2.5 py-5">
      <Container>
        <Fill />
      </Container>
      <Container>
        <Fill />
      </Container>
    </div>
  ),
}

/**
 * `as` exists because a gutter usually belongs to a band, and a band is rarely a `<div>`. This one
 * is the real thing: a `<section>` that names itself, so it is a navigable region rather than a
 * silent wrapper.
 */
export const AsSection: Story = {
  args: { as: 'section', 'aria-labelledby': 'container-story-heading' },
  render: (args) => (
    <Container {...args} className="py-7.5">
      <h2 id="container-story-heading" className="text-heading-2 text-neutral-primary pb-5">
        A band
      </h2>
      <Fill />
    </Container>
  ),
}
