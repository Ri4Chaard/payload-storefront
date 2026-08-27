import type { Metadata } from 'next'
import React from 'react'

import { AboutBand, CategoryBand, Hero, JewelryCarousel } from '@/components/sections'
import { FeatureStrip } from '@/components/ui'
import { homeContent } from '@/mocks'

/**
 * The home page (002/T108), from Figma node 255:3353.
 *
 * **This file is the only thing on the route that reads content.** Every band below takes what it
 * renders as props. That is not ceremony — it is the entire mechanism behind SC-008: when the
 * catalogue spec lands, `homeContent` is replaced by a Payload query here and no component changes.
 * A section that imported the mocks itself would quietly convert that one-line swap into a rewrite.
 *
 * The heading hierarchy is decided here rather than inside the bands, because it is a property of
 * the page: the hero owns the only `h1`, and every band heading is an `h2` beneath it (FR-026).
 */
export const metadata: Metadata = {
  // Not the layout's `%s — Aurum` template: on the home page that would read "Aurum — Aurum".
  title: { absolute: 'Aurum — Lab-grown diamond jewelry' },
  description:
    'Lab-grown diamond rings, bracelets, earrings and necklaces. Exceptional brilliance and ' +
    'refined luxury, made with a responsible approach.',
}

export default function HomePage() {
  const { hero, categories, featured, about } = homeContent

  return (
    <>
      <Hero {...hero} />

      <CategoryBand {...categories} />

      <JewelryCarousel {...featured} />

      <AboutBand {...about} />

      {/*
        The service promises are spec 001's component, consumed unchanged — which is the point of
        having built it there. Its copy is still its own default; it moves into the content source
        when there is a reason for an editor to change it.

        Its position is load-bearing, not incidental. The strip is a labelled region whose cards are
        `h3`, so placing it above the about band's `h2` — as an earlier revision did — produced an
        outline that jumped h1 → h3 and skipped a level (FR-026). The drawn order puts it here
        anyway; the heading hierarchy is the reason to keep it here.
      */}
      <FeatureStrip items={FEATURES} />
    </>
  )
}

/**
 * Static until an editor needs them. These four are fixed promises about how the shop operates
 * rather than content that changes, so they stay beside the page that shows them instead of
 * inflating the content model for a later spec.
 */
const FEATURES = [
  {
    icon: 'shipping' as const,
    title: 'Free shipping',
    description: 'Carefully packaged and delivered with guaranteed protection',
  },
  {
    icon: 'seal-check' as const,
    title: 'Quality guarantee',
    description:
      'If your piece doesn’t meet your expectations, we’ll assist you with a return or exchange',
  },
  {
    icon: 'customer-support' as const,
    title: 'Personal support',
    description: 'Our specialists will help you choose the perfect piece and answer any questions',
  },
  {
    icon: 'secure-payment' as const,
    title: 'Secure payments',
    description: 'Your information is protected with modern encryption technology',
  },
]
