import React from 'react'

import { Button, Container, Media } from '@/components/ui'
import type { StoryBlock } from '@/lib/story/types'
import { cn } from '@/lib/cn'

/**
 * A plate with a column of text laid over it (006/T031).
 *
 * **One component, drawn twice.** "THE AURUM STANDARD" (`312:6926`) and "CRAFTED TO LAST"
 * (`312:6967`) read as two bands and are one construction differing in three optional properties:
 * an eyebrow, a button, and which side the text sits on. Constitution II's rule against
 * `ProductCard` / `ProductCardNew` applies here, and the payoff is that a third banner is now
 * something an editor composes rather than something a developer writes.
 *
 * **`textSide` applies above `lg` only, and the design is why.** At 1920 the two banners sit on
 * opposite sides; at 768 and 390 both frames put the text left, because there is no room for
 * anything else. Honouring the property at every width would produce a phone layout nobody drew.
 *
 * **The media is a backdrop, so it carries a scrim and no alt text of its own.** The copy over it
 * says what the band is about; describing the photograph as well would make a screen reader
 * announce the same subject twice. `Media` adds the gradient — see its note on why that is not a
 * decision a designer can make in advance.
 */
export type BannerBlockProps = Extract<StoryBlock, { type: 'banner' }>

export function BannerBlock({
  eyebrow,
  heading,
  body,
  cta,
  media,
  textSide,
  headingLevel,
}: BannerBlockProps) {
  const Heading = `h${headingLevel}` as const

  return (
    <section className="relative isolate min-h-95 md:min-h-90 xl:min-h-132.5">
      {media ? (
        <Media
          media={media}
          background
          scrimFrom={textSide}
          className="absolute inset-0 -z-10 h-full w-full"
        />
      ) : (
        // No plate yet. The band keeps its drawn height and its copy stays legible on the page's
        // own ground, rather than collapsing to a strip the first time an editor saves early.
        <div aria-hidden className="bg-background-subtle absolute inset-0 -z-10" />
      )}

      <Container className="flex min-h-95 flex-col justify-center py-10 md:min-h-90 xl:min-h-132.5">
        <div
          className={cn(
            'max-w-160',
            textSide === 'right' ? 'xl:ml-auto xl:text-left' : '',
          )}
        >
          {eyebrow ? (
            <p
              className={cn(
                'text-label uppercase',
                media ? 'text-neutral-white/80' : 'text-neutral-secondary',
              )}
            >
              {eyebrow}
            </p>
          ) : null}

          <Heading
            className={cn(
              'text-display mt-5 uppercase',
              media ? 'text-neutral-white' : 'text-neutral-primary',
            )}
          >
            {heading}
          </Heading>

          {body ? (
            <p
              className={cn(
                'text-body-medium mt-5 max-w-120',
                media ? 'text-neutral-white/80' : 'text-neutral-primary/80',
              )}
            >
              {body}
            </p>
          ) : null}

          {cta ? (
            <Button variant="inverse" href={cta.href} className="mt-7.5">
              {cta.label}
            </Button>
          ) : null}
        </div>
      </Container>
    </section>
  )
}
