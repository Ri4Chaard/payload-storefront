import React from 'react'

import { cn } from '@/lib/cn'

/**
 * An article's opening (007/T026), from nodes `312:8484`, `418:8632`, `418:8933`.
 *
 * An eyebrow, the page's only `h1`, and the standfirst — the sentence that tells a visitor whether
 * this is the article they wanted before they commit to the scroll.
 *
 * **The eyebrow is drawn at every width, including desktop, and the desktop frame does not draw
 * it.** Tablet (`418:8633`) and mobile (`418:8934`) both open with `OUR BLOG`; the desktop frame
 * starts at the title. Two frames against one, and the one that disagrees is the one where the
 * eyebrow costs least — so it is resolved toward the pair (007 spec, design inconsistency 1). It is
 * a link rather than a label: it is the only route back to the blog from inside an article, and
 * three frames' worth of visitors will try to press it.
 *
 * **Left-aligned at every width**, unlike `PageHeaderBlock`, which centres from `md` up. That is
 * what all three frames draw, and it is right for the reason a centred `h1` over a left-aligned
 * article would be wrong: the title is the first line of the text, not a banner above it.
 *
 * The measure is capped rather than full-bleed. The drawn title runs to 797px inside a 1198px
 * column, which is the same instinct `PageHeaderBlock` records — display type set to the full width
 * of a desktop container is a wall.
 */
export interface ArticleHeaderProps extends Omit<React.ComponentProps<'header'>, 'children'> {
  eyebrow: { label: string; href: string }
  title: string
  standfirst: string
}

export function ArticleHeader({
  eyebrow,
  title,
  standfirst,
  className,
  ...props
}: ArticleHeaderProps) {
  return (
    <header className={cn('flex flex-col', className)} {...props}>
      <a
        href={eyebrow.href}
        className={cn(
          'text-label text-neutral-secondary w-fit uppercase',
          'hover:text-neutral-primary transition-colors',
          'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
        )}
      >
        {eyebrow.label}
      </a>

      <h1 className="text-display text-neutral-primary mt-5 max-w-200 uppercase">{title}</h1>

      <p className="text-body-base text-neutral-secondary mt-6 max-w-200">{standfirst}</p>
    </header>
  )
}
