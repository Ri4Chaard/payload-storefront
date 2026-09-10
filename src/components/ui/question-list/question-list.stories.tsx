import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { QuestionList } from './question-list'

/**
 * The shop's questions, as `/about`, `/contact` and `/faq` all draw them (008/T029).
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
    question: 'How long will it take to get my order?',
    answerHtml:
      '<p>Insured delivery within the UAE takes two working days. International orders take ' +
      'between five and ten.</p>',
  },
  {
    id: 3,
    question: 'Can I customise a piece?',
    answerHtml:
      '<p>Almost always. Write to us with what you have in mind and we will tell you what is ' +
      'possible.</p>',
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
 * `single` is off, deliberately (FR-035) — a visitor comparing delivery against returns should not
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
        question: 'How do you choose your diamonds?',
        answerHtml:
          '<p>Every stone is selected in person against four criteria, and we reject far more ' +
          'than we keep.</p><ul><li>Cut, which decides how the stone returns light</li>' +
          '<li>Colour, graded against master stones in controlled light</li>' +
          '<li>Clarity, assessed under 10x magnification</li>' +
          '<li>Carat, chosen to suit the setting rather than to hit a number</li></ul>' +
          '<p>Each diamond arrives with its own certificate, and we are happy to walk you ' +
          'through it.</p>',
      },
      ...QUESTIONS.slice(1),
    ],
  },
}

/** A shop with one answer written is still a list, not a special case. */
export const SingleQuestion: Story = {
  args: { questions: [QUESTIONS[0]!] },
}
