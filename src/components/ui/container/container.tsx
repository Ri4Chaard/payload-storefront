import React from 'react'

import { cn } from '@/lib/cn'

/**
 * The page gutter, and the only place it is written down.
 *
 * Six places had grown the same three classes independently — both rows of the header, the footer,
 * the contact strip, and two of the home page's bands. Six copies of one measure is not a
 * convention, it is six chances to disagree, and the disagreement shows up as a column of text that
 * fails to line up with the one above it.
 *
 * **The measure is drawn, not chosen**: 16px on a phone, 24px from tablet, 100px from 1280 up
 * (nodes 440:13435, 440:12226, 196:868 and their band twins). At 1920 that leaves the 1720px
 * content width every desktop frame is laid out on.
 *
 * **There is no `size` prop and no max-width.** Spec 001's contract sketched `narrow | default |
 * wide | full`, but the design draws three widths and caps none of them — every desktop frame is
 * 1920 wide with the content simply filling it. Inventing three max-widths to satisfy an API would
 * be inventing three measurements. Past 1920 the content keeps growing, which is worth a decision
 * from the designer; the point of this component is that the decision then lands in one file.
 *
 * **It contributes horizontal padding and nothing else.** No background, no vertical rhythm, no
 * flex. Those belong to the band, vary per band, and folding them in here is how a layout primitive
 * turns into a second way of writing every section.
 *
 * **Three places carry the same classes and deliberately do not use this.** `Hero` and `MobileNav`
 * stop at `md:px-6` — a centred text column and a panel row are not page gutters, and neither takes
 * the `xl` step. `FeatureStrip` puts the gutter INSIDE its scroll container so the row scrolls to
 * the screen edge with the gutter as a leading inset; wrapping it would clip the scroller at the
 * gutter instead, which is a worse phone. Same three classes, three different jobs.
 */
export interface ContainerProps extends Omit<React.ComponentProps<'div'>, 'ref'> {
  /**
   * The gutter is a property of the band, and bands are `<section>`, `<header>`, `<footer>` as
   * often as they are `<div>`. Constrained to a union rather than `ElementType` so that the props
   * this spreads stay checkable.
   */
  as?: 'div' | 'section' | 'header' | 'footer' | 'main' | 'nav' | 'aside'
  /**
   * Widened from `HTMLDivElement`, which is the one place the tags in that union genuinely differ.
   * A band typed `ComponentProps<'section'>` spreading its own props through here would otherwise
   * fail to compile on `ref` alone — the two bands that adopted this hit exactly that.
   */
  ref?: React.Ref<HTMLElement>
}

export function Container({ as = 'div', className, ...props }: ContainerProps) {
  // Cast on the TAG, not the props, so everything below stays type-checked. A union of intrinsic
  // tag names cannot be used as a JSX element directly: TypeScript intersects their prop types, and
  // `ref` has no common one to intersect to.
  const Element = as as unknown as React.ComponentType<Omit<ContainerProps, 'as'>>

  return <Element className={cn('px-4 md:px-6 xl:px-25', className)} {...props} />
}
