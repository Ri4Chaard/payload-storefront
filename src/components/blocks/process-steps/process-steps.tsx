import React from 'react'

import { Container, Media } from '@/components/ui'
import { SectionHeading } from '@/components/sections/section-heading'
import type { StoryBlock } from '@/lib/story/types'

/**
 * A numbered sequence (006/T032), from nodes `312:6940`, `413:7725`, `413:8024`.
 *
 * Three across at desktop and tablet, stacked on a phone.
 *
 * **The ordinal is the position, computed here, never stored.** FR-012: a number field would
 * eventually hold a list running 1, 2, 2, and the fix for that is to not offer the mistake. It is
 * `aria-hidden` because "01" beside "SELECT" tells a screen reader nothing the list structure does
 * not already convey — an ordered list announces its own numbering.
 *
 * **The grid is `auto-fit`, not a hard three.** The drawing shows three steps and the model caps
 * nothing; two is a shorter row and five wraps. A layout that only worked at exactly three would
 * break the first time an editor added a step, which is the kind of breakage that gets discovered
 * in production.
 */
export type ProcessStepsBlockProps = Extract<StoryBlock, { type: 'process-steps' }>

export function ProcessStepsBlock({ heading, steps, headingLevel }: ProcessStepsBlockProps) {
  return (
    <Container as="section" className="py-10 xl:py-12.5">
      <SectionHeading as={headingLevel === 1 ? 'h1' : 'h2'}>{heading}</SectionHeading>

      <ol className="mt-7.5 grid gap-5 md:grid-cols-3 xl:gap-10">
        {steps.map((step, index) => (
          <li key={step.title}>
            {step.media ? (
              <Media
                media={step.media}
                sizes="(min-width: 768px) 30vw, 100vw"
                className="h-35 w-full rounded-md md:h-40 xl:h-75"
              />
            ) : null}

            <div className="mt-5 flex gap-4">
              <span aria-hidden className="text-heading-1 text-primary-default">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <h3 className="text-heading-2 text-neutral-primary uppercase">{step.title}</h3>
                {step.caption ? (
                  <p className="text-body-small text-neutral-secondary mt-1">{step.caption}</p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Container>
  )
}
