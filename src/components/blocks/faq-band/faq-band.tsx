import React from 'react'

import { Button, Container, QuestionList, type QuestionListItem } from '@/components/ui'
import { cn } from '@/lib/cn'

/**
 * The questions band (006/T055), from nodes `310:6776`, `413:7754`, `413:8053` — and, in its
 * centred form, `312:8689` / `419:10802` / `419:10882` (008/T011).
 *
 * **Two arrangements of one band, not two bands** (008/FR-034). `split` is `/about`: copy and a
 * button in a left column, the questions on the right at desktop, stacked below `xl`. `centred` is
 * `/contact`: a centred heading over a single column of questions, no intro and no button. The
 * `banner` block already established that two drawn arrangements of one construction are a variant
 * set rather than a second component (006/FR-048), and Constitution II is explicit about the
 * alternative.
 *
 * **The props are a plain interface, not `Extract<StoryBlock, …>`** (008/T011). They were the latter
 * until `/contact` needed this band, at which point rendering it would have dragged `src/lib/story`
 * into a route that has nothing to do with the story page. `PageHeaderBlock` met the identical
 * problem in spec 007 and its doc comment records the same fix; the story renderer still passes the
 * same fields.
 *
 * **The questions themselves are `QuestionList`**, promoted to the UI kit on its third consumer
 * (008/T010). Everything about how a question behaves — any number open at once, no leading glyph,
 * the heading level passed down — lives there now, where `/faq` reads it too.
 */
export interface FaqBandBlockProps {
  heading: string
  body?: string
  cta?: { label: string; href: string }
  questions: QuestionListItem[]
  /** Decided by the composition, never here. `1` when this band owns the page's title. */
  headingLevel: 1 | 2 | 3
  /** `split` is the drawn `/about` band; `centred` is `/contact`. */
  variant?: 'centred' | 'split'
}

export function FaqBandBlock({
  heading,
  body,
  cta,
  questions,
  headingLevel,
  variant = 'split',
}: FaqBandBlockProps) {
  const Heading = `h${headingLevel}` as const
  const centred = variant === 'centred'

  return (
    <Container as="section" className="py-10 xl:py-12.5">
      <div
        className={cn(
          'flex flex-col gap-10',
          centred ? 'items-center' : 'xl:flex-row xl:gap-20',
        )}
      >
        <div className={cn(centred ? 'w-full text-center' : 'xl:flex-1')}>
          <Heading className="text-display text-neutral-primary uppercase">{heading}</Heading>
          {body ? (
            <p
              className={cn(
                'text-body-medium text-neutral-primary/80 mt-5 max-w-160',
                centred && 'mx-auto',
              )}
            >
              {body}
            </p>
          ) : null}
          {cta ? (
            <Button href={cta.href} className="mt-7.5">
              {cta.label}
            </Button>
          ) : null}
        </div>

        {/*
          The drawn centred column is 850 inside a 1720 band — `max-w-212.5`. Display type and a
          column of sentences set full-bleed is a wall, which is the same reason `PageHeaderBlock`
          caps its own measure rather than letting the container decide.
        */}
        <div className={cn(centred ? 'w-full max-w-212.5' : 'xl:flex-1')}>
          <QuestionList
            questions={questions}
            headingLevel={headingLevel === 1 ? 2 : 3}
          />
        </div>
      </div>
    </Container>
  )
}
