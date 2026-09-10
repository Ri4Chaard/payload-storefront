import React from 'react'

import { Chip, Container, Media } from '@/components/ui'
import type { StoryBlock } from '@/lib/story/types'

/**
 * The band that says what the shop is about (006/T030), from nodes `205:1870`, `413:7680`,
 * `413:7985`.
 *
 * Copy on the left and a picture on the right at desktop; stacked on a phone, with the picture
 * last. The three parts of the copy column — paragraph, chips, figures — each disappear when empty
 * rather than leaving a gap, which is what lets an editor use this band for a paragraph alone.
 *
 * **The chips are labels, not controls.** `Chip` renders a `<button>` by default because its first
 * consumer was the filter row; a pill here does nothing when pressed, and shipping a control that
 * does nothing is an accessibility defect rather than a cosmetic one. `as="span"` is the variant
 * that closes that — Constitution II's "extend it with props, do not copy it into a sibling".
 *
 * **The chip row wraps and has no cap.** The drawing shows six at desktop and four on mobile, which
 * is the narrower frame running out of room rather than a rule about how many exist.
 */
export type CloserLookBlockProps = Extract<StoryBlock, { type: 'closer-look' }>

export function CloserLookBlock({ body, chips, figures, media }: CloserLookBlockProps) {
  return (
    <Container as="section" className="py-10 xl:py-12.5">
      <div className="flex flex-col gap-10 xl:flex-row xl:items-center xl:gap-20">
        <div className="flex-1">
          {body ? <p className="text-heading-2 text-neutral-primary uppercase">{body}</p> : null}

          {chips.length > 0 ? (
            <ul className="mt-7.5 flex flex-wrap gap-2.5">
              {chips.map((label) => (
                <li key={label}>
                  <Chip as="span">{label}</Chip>
                </li>
              ))}
            </ul>
          ) : null}

          {figures.length > 0 ? (
            <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6">
              {figures.map((figure) => (
                <div key={figure.word}>
                  {/*
                    A description list, because that is what a word over its gloss is. The word is
                    the term and the caption defines it — reading them as two unrelated paragraphs
                    is what a screen reader would otherwise be handed.
                  */}
                  <dt className="text-heading-1 text-neutral-primary uppercase">{figure.word}</dt>
                  <dd className="text-body-small text-neutral-secondary">{figure.caption}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {media ? (
          <Media
            media={media}
            sizes="(min-width: 1280px) 45vw, 100vw"
            className="h-50 w-full rounded-md md:h-75 xl:h-123.75 xl:flex-1"
          />
        ) : null}
      </div>
    </Container>
  )
}
