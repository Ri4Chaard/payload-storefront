import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import type { Question as QuestionDocument } from '@/payload-types'

import type { Question } from './types'

/**
 * Question documents to view models (spec 008, T008).
 *
 * **Moved here from `src/lib/story/mappers.ts` rather than rewritten.** The rules below were worked
 * out for the FAQ band on `/about` and are now shared by three pages; a second copy would be two
 * places for "what counts as a usable question" to drift apart.
 */

/** A relationship field is an id until Payload resolves it at depth. */
const resolved = <T>(value: number | T | null | undefined): T | null =>
  value && typeof value === 'object' ? (value as T) : null

/** Trim to `undefined`, so "the editor left it empty" and "the editor typed spaces" agree. */
const text = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/** `null` where the answer is empty, matching the catalogue's rich-text convention. */
export const answerHtml = (value: QuestionDocument['answer']): string | null => {
  if (!value) return null

  // The generated type describes the same document `SerializedEditorState` does, one field at a
  // time, and the two descriptions are not assignable to each other. The cast is the seam between
  // Payload's generated shape and lexical's own; it is not hiding an unknown.
  const output = convertLexicalToHTML({
    data: value as unknown as SerializedEditorState,
    disableContainer: true,
  }).trim()

  return output === '' ? null : output
}

/**
 * One question document, or nothing.
 *
 * Both halves are required: a question with no answer renders a control that expands to nothing,
 * which is the failure `src/collections/questions.ts` makes both fields required to prevent. This is
 * the second line of defence, for a row that predates that rule.
 */
export const toQuestion = (document: QuestionDocument | null): Question | null => {
  if (!document) return null

  const question = text(document.question)
  const html = answerHtml(document.answer)
  if (!question || !html) return null

  return { id: document.id, question, answerHtml: html }
}

/**
 * A list of question documents or ids, mapped and de-duplicated.
 *
 * **De-duplicated by id, keeping the first position** (FR-031). Payload will happily let an editor
 * pick the same question twice; the page shows it once, where they first put it.
 *
 * Unpublished questions never arrive here at all — every loader reads with `overrideAccess: false`
 * and `adminOrPublishedStatus` constrains the query, so a draft is absent rather than filtered
 * (FR-033). There is deliberately no status check in this file: the rule lives in the access
 * function, and repeating it here would put it in two places.
 */
export const toQuestions = (
  value: (number | QuestionDocument)[] | null | undefined,
): Question[] => {
  const seen = new Set<number>()
  const output: Question[] = []

  for (const entry of value ?? []) {
    const mapped = toQuestion(resolved<QuestionDocument>(entry))
    if (!mapped || seen.has(mapped.id)) continue

    seen.add(mapped.id)
    output.push(mapped)
  }

  return output
}
