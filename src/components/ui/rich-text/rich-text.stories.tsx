import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { RichText } from './rich-text'

/**
 * Promoted out of the product page in spec 006, when FAQ answers became its second consumer.
 *
 * Every story here is HTML as the lexical serialiser actually emits it — bare tags with no classes
 * — because that is the input this component exists to style. Hand-tidied markup would test a case
 * that never occurs.
 */
const meta = {
  title: 'UI/RichText',
  component: RichText,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof RichText>

export default meta
type Story = StoryObj<typeof meta>

/** One paragraph — the shape most answers take. */
export const Paragraph: Story = {
  args: { html: '<p>Yes. We ship worldwide, and shipping costs are confirmed at checkout.</p>' },
}

/** Two paragraphs, to show the spacing the reset would otherwise have removed. */
export const Paragraphs: Story = {
  args: {
    html:
      '<p>We ship all over the world. Shipping costs will apply, and will be added at checkout.</p>' +
      '<p>We run discounts and promotions all year, so stay tuned for exclusive deals.</p>',
  },
}

/** A link and a list — the two things FR-029 promises an answer can contain. */
export const LinkAndList: Story = {
  args: {
    html:
      '<p>Every stone arrives with paperwork. You can expect:</p>' +
      '<ul><li>An independent grading report</li><li>A certificate of authenticity</li>' +
      '<li>Care instructions, or <a href="/contact">ask our team</a></li></ul>',
  },
}

/** Bold inside a paragraph, which the serialiser emits as a bare `<strong>`. */
export const Emphasis: Story = {
  args: { html: '<p>Returns are free within <strong>30 days</strong> of delivery.</p>' },
}

/**
 * The empty case renders nothing at all rather than an empty box.
 *
 * The data layer already returns `null` for an empty document, so a caller should close the layout
 * over it — this story exists to show that reaching here anyway is harmless.
 */
export const Empty: Story = { args: { html: '' } }
