import React from 'react'

import type { ArticleCard as ArticleCardModel } from '@/lib/blog/types'
import { cn } from '@/lib/cn'

import { ArticleCard } from '../article-card'

/**
 * The blog's grid (007/T041), from nodes `312:7367`, `415:7933`, `415:8039`.
 *
 * **Three equal columns with a 20px gutter reproduces the drawing exactly.** The desktop container
 * is 1720 wide, a narrow cell is 560 and a wide one 1140 — which is two narrows plus the gutter. So
 * the wide cell is not a special width, it is `col-span-2`, and the whole mosaic is one grid rather
 * than a set of hand-placed rows.
 *
 * **`grid-auto-flow` stays at its default. `dense` is refused.** Dense packing would backfill the
 * gap a wide card leaves at the end of a row with a later, smaller card — and the index is
 * chronological. A visitor who reads the third card expects the third newest article, not whichever
 * one happened to fit. The gap is the correct rendering.
 *
 * **A partial final row falls out for free** (FR-009). Spans are assigned left to right from the
 * card's index, and every full cycle sums to a whole number of rows, so any article count from one
 * upward ends short rather than holed. There is no arrangement that leaves a hole in the middle,
 * which is why there is no special case for one here.
 *
 * The mosaic is a `<ul>`: it is a list of articles, and a screen reader announcing "list, 7 items"
 * before the first one is worth more than the div it replaces.
 */
export interface ArticleMosaicProps extends Omit<React.ComponentProps<'ul'>, 'children'> {
  articles: ArticleCardModel[]
  /** Names the list for assistive technology — "Latest articles", "Articles in Guides". */
  label: string
}

export function ArticleMosaic({ articles, label, className, ...props }: ArticleMosaicProps) {
  return (
    <ul
      aria-label={label}
      className={cn('grid grid-cols-1 gap-x-5 gap-y-10', 'md:grid-cols-2 xl:grid-cols-3', className)}
      {...props}
    >
      {articles.map((article) => (
        <li
          key={article.id}
          className={cn(
            // The span lives on the list item rather than the card, so the grid's children are all
            // the same kind of thing and the card stays placeable anywhere.
            article.emphasis.tabletLead && 'md:col-span-2',
            /*
              The desktop span is stated for EVERY card, not only the wide ones, and that `col-span-1`
              is load-bearing rather than noise. Tailwind breakpoints are min-width, so a card that
              leads the tablet grid keeps `md:col-span-2` at 1280 unless something at `xl` says
              otherwise — which put card 5 across two columns on the desktop grid, where the design
              draws it narrow. The two rhythms disagree by construction (007/research.md R4), so the
              wider one has to answer for every card rather than only for its own emphasis.
            */
            article.emphasis.desktopWide ? 'xl:col-span-2' : 'xl:col-span-1',
          )}
        >
          <ArticleCard article={article} className="h-full" />
        </li>
      ))}
    </ul>
  )
}
