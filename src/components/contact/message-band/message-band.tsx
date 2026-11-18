import React from 'react'

import { Media } from '@/components/ui'
import type { ContactForm as ContactFormContent } from '@/lib/contact/types'

import { ContactForm } from '../contact-form'

/**
 * "Send us a message", from nodes `312:8649`, `419:10792`, `419:10872`.
 *
 * **Full-bleed by construction rather than by a `Container` with negative margins.** The drawing
 * splits the viewport in half at desktop — 960 of copy beside 960 of photograph — and at tablet
 * 384/384. The band therefore sits outside the page gutter and puts its own padding on the text
 * column, which is what lets the photograph run to the edge on both.
 *
 * **The photograph is second in the DOM and first at nothing.** At mobile it is drawn beneath the
 * form, which is also the order a screen reader and a keyboard want: the form is why a visitor is
 * in this band, and a decorative half-screen picture ahead of it is a long scroll past nothing.
 * `md:order-*` is deliberately not used — the DOM order already matches every drawn arrangement.
 *
 * **The frame reserves its box before anything loads**. `aspect-*` on the wrapper plus the
 * intrinsic width and height `Media` passes to the image pipeline means the band's height is known
 * from the first paint, so the form below it on a phone never jumps.
 *
 * The band renders without a photograph rather than reserving a blank half-screen — an owner who
 * has not chosen one gets a wider form, not a grey rectangle.
 */
export interface MessageBandProps {
  heading: string
  body?: string
  form: ContactFormContent
}

export function MessageBand({ heading, body, form }: MessageBandProps) {
  return (
    <section
      aria-labelledby="send-us-a-message"
      className="flex flex-col xl:flex-row xl:items-stretch"
    >
      <div className="flex-1 px-4 py-10 md:px-6 xl:px-25 xl:py-12.5">
        <h2 id="send-us-a-message" className="text-display text-neutral-primary uppercase">
          {heading}
        </h2>
        {body ? (
          <p className="text-body-medium text-neutral-primary/80 mt-5 max-w-160">{body}</p>
        ) : null}

        <div className="mt-7.5">
          <ContactForm content={form} />
        </div>
      </div>

      {form.photo ? (
        <div className="relative aspect-[390/320] w-full xl:aspect-auto xl:w-1/2">
          <Media
            media={{ kind: 'photo', ...form.photo }}
            /*
              Half the viewport from `xl` up, the whole of it below — the two arrangements the
              drawing has. Getting this wrong costs a phone visitor a desktop-sized download for a
              picture beside a form they came to type in.
            */
            sizes="(min-width: 1280px) 50vw, 100vw"
            /*
              Eager, because Next measured it as this page's Largest Contentful Paint and was
              lazy-loading it — the band sits directly under a 290px card row, so at desktop and
              tablet the photograph is in the viewport on arrival.

              It is genuinely below the fold on a phone, where it is drawn beneath the whole form,
              and `priority` cannot be conditional on viewport. This is the right side of that
              trade: it is the only image on the page, and a phone spends the bytes on the one
              picture it was going to load a moment later anyway, where a desktop visitor gets an
              LCP that is not waiting on a lazy fetch.
            */
            priority
            className="h-full w-full"
          />
        </div>
      ) : null}
    </section>
  )
}
