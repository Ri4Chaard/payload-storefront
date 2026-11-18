import { describe, expect, it } from 'vitest'

import { toQuestion, toQuestions } from '@/lib/questions/mappers'
import type { Question as QuestionDocument } from '@/payload-types'

/**
 * The shared question mapper.
 *
 * **This file's real job is to prove the promotion was a move.** The rules below were worked out in
 * spec 006 for the FAQ band on `/about`; they now serve three pages from `src/lib/questions/`, and
 * a refactor that quietly changed one of them would be invisible in a diff and visible on a live
 * page. `tests/unit/story-mappers.test.ts` still passes unchanged, which is the other half of the
 * same check.
 */

/** Lexical's document shape. One paragraph, which is all any of these need. */
const answer = (text: string): QuestionDocument['answer'] =>
  ({
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          children: [{ type: 'text', format: 0, style: '', text, version: 1, detail: 0, mode: 'normal' }],
        },
      ],
    },
  }) as unknown as QuestionDocument['answer']

const question = (id: number, text = 'Do you ship overseas?'): QuestionDocument =>
  ({
    id,
    question: text,
    answer: answer('Yes, worldwide.'),
    order: 0,
    updatedAt: '2026-09-10T00:00:00.000Z',
    createdAt: '2026-09-10T00:00:00.000Z',
  }) as QuestionDocument

describe('toQuestion', () => {
  it('serialises the answer out of lexical', () => {
    expect(toQuestion(question(1))).toEqual({
      id: 1,
      question: 'Do you ship overseas?',
      answerHtml: expect.stringContaining('Yes, worldwide.'),
    })
  })

  it('is nothing when there is no document', () => {
    expect(toQuestion(null)).toBeNull()
  })

  /*
    Both halves are required. A question with no answer renders a control that expands to nothing —
    the failure `src/collections/questions.ts` makes both fields required to prevent. This is the
    second line of defence, for a row written before that rule existed.
  */
  it('drops a question with no text', () => {
    expect(toQuestion({ ...question(1), question: '   ' })).toBeNull()
  })

  it('drops a question with an empty answer', () => {
    // `answer` is non-nullable on the generated type, but a row written before the field was
    // required can still hold nothing. That is exactly the case this guard is for.
    expect(toQuestion({ ...question(1), answer: null } as unknown as QuestionDocument)).toBeNull()
  })
})

describe('toQuestions', () => {
  it('maps a resolved list in order', () => {
    const rows = toQuestions([question(1, 'First'), question(2, 'Second')])
    expect(rows.map((row) => row.question)).toEqual(['First', 'Second'])
  })

  /*
    FR-031. Payload will happily let an editor pick the same question twice; the page shows it once,
    where they first put it.
  */
  it('de-duplicates by id, keeping the first position', () => {
    const rows = toQuestions([question(1, 'First'), question(2, 'Second'), question(1, 'First')])
    expect(rows.map((row) => row.id)).toEqual([1, 2])
  })

  /*
    An unresolved relationship is an id. It reaches here when the loader read at too shallow a
    depth, and a number is not a question — dropping it is better than rendering `[object Object]`.
  */
  it('drops entries that are still ids', () => {
    expect(toQuestions([1, 2])).toEqual([])
  })

  it('is an empty list for nothing at all', () => {
    expect(toQuestions(null)).toEqual([])
    expect(toQuestions(undefined)).toEqual([])
    expect(toQuestions([])).toEqual([])
  })
})
