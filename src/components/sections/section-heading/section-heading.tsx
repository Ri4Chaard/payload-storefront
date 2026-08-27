import React from 'react'

import { cn } from '@/lib/cn'

/**
 * The centred band heading (002/T107), drawn at nodes 138:456, 144:840 and their responsive twins —
 * 36px at 1920 and 1024, 34px at 390, centred, in the display face, in ink.
 *
 * There is no per-breakpoint sizing here because there does not need to be: `text-display` is a
 * fluid step that already runs 24px → 36px across the same range, and it carries the uppercasing
 * too. Adding `md:` overrides on top of a clamp would be two systems fighting over one number.
 *
 * **The level is a prop with no default that suits everyone.** These headings sit at the top of
 * page bands, so `h2` is right on a page whose `h1` is the hero — and wrong the moment a band is
 * reused somewhere that isn't. FR-026 asks for a hierarchy that descends without skipping, which is
 * a property of the page, not of the heading, so the page is where it gets decided.
 *
 * The `id` matters more than it looks. Each band labels itself with `aria-labelledby` pointing
 * here, which is what turns a `<section>` into a navigable region instead of a silent wrapper.
 */
export interface SectionHeadingProps extends React.ComponentProps<'h2'> {
  as?: 'h1' | 'h2' | 'h3'
}

export function SectionHeading({ as = 'h2', className, ...props }: SectionHeadingProps) {
  const Element = as

  return (
    <Element className={cn('text-display text-neutral-primary text-center', className)} {...props} />
  )
}
