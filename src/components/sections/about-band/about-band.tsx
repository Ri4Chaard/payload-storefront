import Image from 'next/image'
import React from 'react'

import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'

import { SectionHeading } from '../section-heading'

/**
 * The brand band (002/T106), from Figma nodes 158:402, 440:12764 and 440:13678 — a photograph
 * beside the company's own paragraph, side by side above `md` and stacked below it.
 *
 * **The heading is two-tone but one name.** The drawing puts "ABOUT" in ink and "AURUM" in the
 * brand colour. Colour is the only difference, so it is a `<span>` inside one heading rather than
 * two headings or two text nodes: an assistive technology reads "About Aurum" as a single string,
 * which is what it is, and the split leaves no trace in the accessible name (FR-021).
 *
 * **Heights are minima, not fixed.** The drawn 750 and 567 are what this exact paragraph happens to
 * need; a translation, or a second sentence, must push the band taller instead of overflowing it —
 * the same rule already learned on `FeatureCard`, where the drawn height became a floor.
 *
 * The photograph here is NOT decorative, unlike the hero's and the category tiles'. Those sit
 * behind text that already says what they show. This one stands beside copy that never mentions
 * it, so it carries its own description.
 */
export interface AboutBandProps extends React.ComponentProps<'section'> {
  heading: { lead: string; emphasis: string }
  body: string[]
  cta: { label: string; href: string }
  image: { src: string; alt?: string }
  /** The band labels itself with this. Constant because the band appears once on a page. */
  headingId?: string
}

export function AboutBand({
  heading,
  body,
  cta,
  image,
  headingId = 'about-heading',
  className,
  ...props
}: AboutBandProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex flex-col gap-5 md:flex-row md:items-stretch md:gap-0',
        'md:min-h-141.75 xl:min-h-187.5',
        className,
      )}
      {...props}
    >
      {/*
        `fill` needs a positioned box, and the box's size has to come from somewhere other than the
        photograph: a fixed height on a phone, and the height of the row it shares above `md`.
      */}
      <div className="relative h-75 w-full md:h-auto md:flex-1">
        <Image
          src={image.src}
          alt={image.alt ?? ''}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>

      <div
        className={cn(
          'flex flex-col items-center justify-center gap-5 text-center',
          'px-4 pb-7.5 md:gap-7.5 md:pb-0',
          // 512px of the tablet frame, 709px of the desktop one — the drawn measures, held as
          // fixed columns so the photograph takes the remainder rather than the other way round.
          'md:w-128 md:shrink-0 md:px-8.5 xl:w-177.25 xl:pr-25 xl:pl-5',
        )}
      >
        <SectionHeading id={headingId}>
          {heading.lead} <span className="text-primary-default">{heading.emphasis}</span>
        </SectionHeading>

        {/*
          The drawing sets these two sentences as one continuous block, so they get no gap. They
          stay separate paragraphs because that is what they are, and because an editor will add a
          third.
        */}
        <div className="text-body-medium text-neutral-secondary max-w-111.25">
          {body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <Button href={cta.href} className="uppercase">
          {cta.label}
        </Button>
      </div>
    </section>
  )
}
