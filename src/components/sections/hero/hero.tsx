import Image from 'next/image'
import React from 'react'

import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'

/**
 * The first band (002/T103–T105), from Figma nodes 138:309, 440:12503 and 440:13458 — a full-bleed
 * photograph with the headline, a sentence and one way in stacked against its lower edge.
 *
 * **The headline is real text, and that is the whole point of the task.** It would have been
 * cheaper to export the drawn frame as one picture — the design reads as a poster — and it would
 * have cost the page its `h1`, its translations, its selectable text and its search result.
 *
 * **Heights are drawn, and the tablet one is drawn tall.** 754px, then 1226px, then 950px. The
 * 1226 arrives at `lg` rather than `md` on purpose: it comes from the 1024-wide frame, where it is
 * about 90% of an iPad's height, and applying it from 768px instead would put a hero and a fifth of
 * a screen more between a visitor and everything below it. Between 768 and 1023 the phone height
 * holds, which is the drawn proportion for the width.
 *
 * **The scrim defaults on.** White text over a photograph is a contrast question no automated check
 * can answer, because contrast cannot be measured against an image — the same reasoning already
 * recorded on `CategoryCard`. The supplied photograph is near-black velvet and needs none of it;
 * the next one to come out of a CMS may not be, and a gradient behind the text costs nothing on a
 * dark photograph and rescues a light one. `scrim={false}` opts out when the image is known.
 *
 * The photograph is `priority` because it is unambiguously this route's largest contentful paint
 * element (FR-007). It is also decorative: it sits behind a headline that already says what it
 * shows, so an `alt` here would be a second copy of the headline read out first.
 */
export interface HeroProps extends React.ComponentProps<'section'> {
  headline: string
  lede: string
  cta: { label: string; href: string }
  image: { src: string; alt?: string }
  scrim?: boolean
}

export function Hero({ headline, lede, cta, image, scrim = true, className, ...props }: HeroProps) {
  return (
    <section
      className={cn(
        'relative isolate flex flex-col items-center justify-end overflow-hidden',
        'h-188.5 lg:h-306.5 xl:h-237.5',
        'gap-5 px-4 pb-7.5 md:gap-7.5 md:px-6 md:pb-12.5',
        className,
      )}
      {...props}
    >
      <Image
        src={image.src}
        alt={image.alt ?? ''}
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />

      {scrim ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-t from-black/65 via-black/25 to-transparent"
        />
      ) : null}

      {/*
        Widths are the drawn measures — 508px for the headline, 804px for the sentence — expressed
        as maxima so that below those widths the text simply fills the column instead of overflowing
        a phone.
      */}
      <h1 className="text-display text-neutral-white w-full max-w-127 text-center text-balance">
        {headline}
      </h1>

      <p className="text-body-small md:text-body-medium text-neutral-white w-full max-w-201 text-center">
        {lede}
      </p>

      <Button href={cta.href} variant="inverse" className="uppercase">
        {cta.label}
      </Button>
    </section>
  )
}
