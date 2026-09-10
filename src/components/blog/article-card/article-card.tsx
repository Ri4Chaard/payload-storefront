import NextLink from 'next/link'
import React from 'react'

import { Media } from '@/components/ui'
import type { ArticleCard as ArticleCardModel } from '@/lib/blog/types'
import { cn } from '@/lib/cn'

/**
 * One article in the mosaic (007/T038 — T040), from nodes `312:7397`, `312:7425`, `415:7934`,
 * `415:7944`, `415:8040`.
 *
 * **One component with two emphasis flags, not four cards** (FR-051). The design draws this at five
 * sizes and the temptation is five components; what actually differs between them is the width of
 * the cell and the height of the photograph, both of which are properties of WHERE the card landed
 * rather than of what is in it. `emphasis` carries that, computed once in the mapper.
 *
 * **Why two flags rather than one.** The rhythms at the two wide breakpoints disagree — card 5
 * leads the tablet grid and is narrow on desktop — so a single boolean, or a stored `featured`
 * checkbox, cannot express the drawing. 007/research.md R4 has the table.
 *
 * **The card IS the link** (FR-005). The drawing shows a photograph, a badge, a title and a date,
 * all of which lead to the same article; as three separate anchors that is three tab stops and
 * three announcements where the visitor sees one destination. So the root element is the anchor,
 * and the badge inside it is a `<span>` — a label, never a control, because pressing it does
 * nothing the card does not already do.
 *
 * **The badge sits over the photograph and carries its own ground.** The design insets it 16px from
 * the top-left of the image, which is fine over the drawn photographs and is a contrast failure
 * waiting to happen the first time an editor uploads a pale one — the class of failure axe cannot
 * catch, because it cannot measure text over an image. The badge therefore paints its own surface
 * rather than relying on the picture behind it. `CategoryCard` records the same reasoning for its
 * scrim.
 *
 * **The date is a `<time>` with the ISO value**, and the human string beside it comes from the
 * mapper. Formatting here would mean formatting twice — server and client, against whatever locale
 * the browser reports — which is the classic hydration mismatch.
 *
 * **The card does not place itself.** `emphasis` decides the photograph's height and the responsive
 * `sizes` hint, and nothing else; the column spans belong to `ArticleMosaic`, which owns the grid.
 * Putting `col-span-2` here as well was the first draft and it was dead code — a card inside a
 * list item cannot span its grandparent's tracks — as well as two places for one rule to live.
 */
export interface ArticleCardProps extends Omit<React.ComponentProps<'a'>, 'href' | 'title'> {
  article: ArticleCardModel
  /** The heading level that suits the surrounding page. The mosaic sits under an `h1`. */
  headingLevel?: 2 | 3
}

export function ArticleCard({
  article,
  headingLevel = 2,
  className,
  ...props
}: ArticleCardProps) {
  const Heading = `h${headingLevel}` as const
  const { tabletLead, desktopWide } = article.emphasis

  return (
    <NextLink
      href={article.href}
      className={cn(
        'group flex flex-col',
        'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
        className,
      )}
      {...props}
    >
      <div className="relative">
        {article.media ? (
          <Media
            media={article.media}
            /*
              Below the fold by definition — the index's first card sits under a header and a tab
              strip — so nothing here is ever `priority`. The hint follows the cell: a wide cell is
              two thirds of the desktop grid, a narrow one a third.
            */
            sizes={
              desktopWide
                ? '(min-width: 1280px) 66vw, (min-width: 768px) 100vw, 100vw'
                : '(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw'
            }
            className={cn(
              'w-full',
              // The drawn image heights: 200 on a phone, 240 in a tablet pair, 380 for the tablet
              // lead, 300 at desktop for both widths.
              'h-50 xl:h-75',
              tabletLead ? 'md:h-95' : 'md:h-60',
            )}
          />
        ) : (
          // An article whose hero was never set, or whose photograph was deleted from the library.
          // The cell keeps its shape so the mosaic's rhythm survives; nothing pretends to be a
          // picture.
          <div className={cn('bg-background-container w-full', 'h-50 xl:h-75', tabletLead ? 'md:h-95' : 'md:h-60')} />
        )}

        {article.category ? (
          <span
            className={cn(
              'bg-background-bg/90 text-label text-neutral-primary absolute top-4 left-4',
              'px-4 py-2 uppercase backdrop-blur-sm',
            )}
          >
            {article.category.title}
          </span>
        ) : null}
      </div>

      <Heading className="text-body-strong text-neutral-primary group-hover:text-primary-default mt-5 transition-colors">
        {article.title}
      </Heading>

      <time dateTime={article.publishedOn} className="text-body-small text-neutral-secondary mt-2">
        {article.publishedLabel}
      </time>
    </NextLink>
  )
}
