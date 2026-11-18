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
      '<p>An answer with a list. You can expect:</p>' +
      '<ul><li>Point one</li><li>Point two</li>' +
      '<li>Care instructions, or <a href="/contact">ask our team</a></li></ul>',
  },
}

/** Bold inside a paragraph, which the serialiser emits as a bare `<strong>`. */
export const Emphasis: Story = {
  args: { html: '<p>Returns are free within <strong>30 days</strong> of delivery.</p>' },
}

/*
 * There is deliberately no `Empty` story.
 *
 * It rendered nothing, which is correct behaviour and useless as a story: the accessibility sweep
 * in `tests/a11y/ui-kit.spec.ts` visits every story and waits for a visible root element, so a
 * story that renders an empty div fails it with a timeout rather than a violation.
 *
 * Nothing is lost. The data layer returns `null` for an empty document — see `html()` in
 * `src/lib/story/mappers.ts` — so a caller closes the layout over it and this component is never
 * handed an empty string in the first place.
 */
