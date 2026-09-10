import React from 'react'

import { Accordion, Button, Container, RichText } from '@/components/ui'
import type { StoryBlock } from '@/lib/story/types'

/**
 * The questions band (006/T055), from nodes `310:6776`, `413:7754`, `413:8053`.
 *
 * Copy and a button on the left, the expandable questions on the right at desktop; stacked below
 * `xl`.
 *
 * **`Accordion` is used as it ships, and its default is the behaviour this band needs.** `single`
 * is off, so opening one question does not close another (FR-035) — a visitor comparing delivery
 * against returns should not have to hold one of them in their head. The component already exposes
 * `aria-expanded` and an `aria-controls` panel, so nothing about the state is invented here.
 *
 * **`headingLevel={3}` because the band's own heading is the `h2`.** Passing the level down rather
 * than letting the accordion guess is what keeps the outline intact when an editor drags this band
 * to the top of the page and the mapper promotes its heading to `h1`.
 *
 * The answers are owner-written rich text, rendered through the kit's `RichText` — the component
 * this feature promoted out of the product page rather than copying.
 */
export type FaqBandBlockProps = Extract<StoryBlock, { type: 'faq' }>

export function FaqBandBlock({ heading, body, cta, questions, headingLevel }: FaqBandBlockProps) {
  const Heading = `h${headingLevel}` as const

  return (
    <Container as="section" className="py-10 xl:py-12.5">
      <div className="flex flex-col gap-10 xl:flex-row xl:gap-20">
        <div className="xl:flex-1">
          <Heading className="text-display text-neutral-primary uppercase">{heading}</Heading>
          {body ? (
            <p className="text-body-medium text-neutral-primary/80 mt-5 max-w-160">{body}</p>
          ) : null}
          {cta ? (
            <Button href={cta.href} className="mt-7.5">
              {cta.label}
            </Button>
          ) : null}
        </div>

        <div className="xl:flex-1">
          <Accordion
            headingLevel={headingLevel === 1 ? 2 : 3}
            items={questions.map((question) => ({
              id: String(question.id),
              title: question.question,
              content: <RichText html={question.answerHtml} />,
            }))}
          />
        </div>
      </div>
    </Container>
  )
}
