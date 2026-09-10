import React from 'react'

import { Accordion } from '@/components/ui/accordion'
import { RichText } from '@/components/ui/rich-text'

/**
 * A column of expandable questions (spec 008, T010).
 *
 * **Promoted out of `FaqBandBlock` on its third consumer.** `/about` draws these beside a column of
 * copy, `/contact` draws them centred under a heading, and `/faq` is nothing else. Constitution II
 * makes the second consumer the trigger to promote rather than duplicate; this is the third, and
 * every rule below is one a second caller would otherwise have had to re-derive.
 *
 * **`Accordion` is used as it ships, and its default is the behaviour these need.** `single` is off,
 * so opening one question does not close another (FR-035) — a visitor comparing delivery against
 * returns should not have to hold one of them in their head.
 *
 * **`icon={null}` — no leading glyph.** `Accordion` defaults to the dash it was drawn with on the
 * product page, where three rows share a column with spec tables and the mark helps them read as a
 * list. Here the questions are the only thing in their column and each one is a sentence, so a dash
 * in front of every row is decoration that has to be skipped over rather than a cue.
 *
 * **The heading level arrives as a prop and is never chosen here.** "Am I one level below the page's
 * title, or two?" is a question about the page, and each of the three answers it once — the story
 * page through its mapper, the other two directly.
 *
 * The answers are owner-written rich text, rendered through the kit's `RichText` — the component
 * spec 006 promoted rather than copied, for exactly this reason.
 */
export interface QuestionListItem {
  id: number
  question: string
  answerHtml: string
}

export interface QuestionListProps extends React.ComponentProps<'div'> {
  questions: QuestionListItem[]
  /** The level each question's own heading renders at. Decided by the page, never here. */
  headingLevel: 2 | 3
  /** Ids open on first render. The design draws one open on `/faq`. */
  defaultOpen?: number[]
}

export function QuestionList({
  questions,
  headingLevel,
  defaultOpen,
  ...props
}: QuestionListProps) {
  return (
    <Accordion
      icon={null}
      headingLevel={headingLevel}
      {...(defaultOpen ? { defaultOpen: defaultOpen.map(String) } : {})}
      items={questions.map((question) => ({
        id: String(question.id),
        title: question.question,
        content: <RichText html={question.answerHtml} />,
      }))}
      {...props}
    />
  )
}
