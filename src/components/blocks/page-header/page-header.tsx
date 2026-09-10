import React from 'react'

import { Container } from '@/components/ui'
import type { StoryBlock } from '@/lib/story/types'
import { cn } from '@/lib/cn'

/**
 * The page's opening statement (006/T028), from nodes `310:6501`, `413:7676`, `413:7981`.
 *
 * Centred at desktop and tablet, left-aligned on a phone — which is what the drawing does, and not
 * a simplification: a 358px-wide column of centred display type is hard to read, and the mobile
 * frame moves both lines to the gutter for exactly that reason.
 *
 * **The heading level arrives as a prop and is never chosen here.** An editor can drag this band
 * anywhere, delete it, or add a second one, so "am I the page's title?" is a question about the
 * composition. `src/lib/story/mappers.ts` answers it once, for all six block types.
 */
export type PageHeaderBlockProps = Extract<StoryBlock, { type: 'page-header' }>

export function PageHeaderBlock({ eyebrow, heading, headingLevel }: PageHeaderBlockProps) {
  const Heading = `h${headingLevel}` as const

  return (
    <Container as="section" className="py-10 xl:py-12.5">
      <div className="md:text-center">
        {eyebrow ? (
          <p className="text-label text-neutral-secondary uppercase">{eyebrow}</p>
        ) : null}
        <Heading
          className={cn(
            'text-display text-neutral-primary mt-5 uppercase',
            // The drawn measure is 668px inside a 1720px band — display type set full-bleed is a
            // wall. Centred bands cap the line length; the phone uses the gutter instead.
            'md:mx-auto md:max-w-167',
          )}
        >
          {heading}
        </Heading>
      </div>
    </Container>
  )
}
