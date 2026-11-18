import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { QuestionList } from './question-list'

/**
 * The shop's questions, as `/about`, `/contact` and `/faq` all draw them.
 *
 * Every state below is one a real page reaches: a collapsed list is `/contact` on arrival, one open
 * is what `/faq` is drawn with, and the long answer is the case that proves a row expands in place
 * rather than pushing the page around.
 */
const QUESTIONS = [
  {
    id: 1,
    question: 'Do you ship overseas?',
    answerHtml:
      '<p>Yes, we ship all over the world. Shipping costs will apply, and will be added at ' +
      'checkout. We run discounts and promotions all year, so stay tuned for exclusive deals.</p>',
  },
  {
    id: 2,
    question: 'Question 2?',
    answerHtml:
      '<p>A short answer to the second question.</p>',
  },
  {
    id: 3,
    question: 'Question 3?',
    answerHtml:
      '<p>A short answer to the third question.</p>',
  },
]

const meta = {
  title: 'UI/QuestionList',
  component: QuestionList,
  parameters: { layout: 'padded' },
  args: { questions: QUESTIONS, headingLevel: 2 },
} satisfies Meta<typeof QuestionList>

export default meta
type Story = StoryObj<typeof meta>

/** How a visitor first meets the list. */
export const Collapsed: Story = {}

/** `/faq` is drawn with its first question open. */
export const OneOpen: Story = {
  args: { defaultOpen: [1] },
}

/**
 * `single` is off, deliberately — a visitor comparing delivery against returns should not
 * have to hold one of them in their head.
 */
export const SeveralOpen: Story = {
  args: { defaultOpen: [1, 2, 3] },
}

/** An answer long enough to run past the fold. It expands in place; nothing below it is obscured. */
export const LongAnswer: Story = {
  args: {
    defaultOpen: [1],
    questions: [
      {
        id: 1,
        question: 'Question 1, with a much longer answer?',
        answerHtml:
          '<p>A long answer that runs past the fold, so the list has something to expand ' +
          'in place.</p><ul><li>Point one, with a sentence of explanation</li>' +
          '<li>Point two, with a sentence of explanation</li>' +
          '<li>Point three, with a sentence of explanation</li>' +
          '<li>Point four, with a sentence of explanation</li></ul>' +
          '<p>A closing paragraph that ends the answer.</p>',
      },
      ...QUESTIONS.slice(1),
    ],
  },
}

/** A shop with one answer written is still a list, not a special case. */
export const SingleQuestion: Story = {
  args: { questions: [QUESTIONS[0]!] },
}
