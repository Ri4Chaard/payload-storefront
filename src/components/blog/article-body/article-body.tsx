import React from 'react'

import { RichText } from '@/components/ui'
import type { Chapter } from '@/lib/blog/types'
import { cn } from '@/lib/cn'

/**
 * The article itself (007/T027, T028), from nodes `312:8491`, `418:8639`, `418:8948`.
 *
 * One chapter renders in one order, and the order is a contract rather than a preference — see
 * `specs/007-blog-articles/contracts/article-content.md` §4:
 *
 *     h2          heading
 *     p           lede            (optional, emphasised)
 *                 body            (rich text)
 *     blockquote  pullQuote       (optional, ruled)
 *
 * **Every chapter heading is an `h2`, and there is no `h3` anywhere.** The chapter body's editor has
 * headings removed from its feature set (`src/collections/articles.ts`), which is what makes the
 * contents rail complete by construction: every heading in the article is a chapter, and every
 * chapter is in the list. A rail that can silently miss a section is worse than no rail.
 *
 * **`tabIndex={-1}` on the heading is not decoration.** A contents entry jumps to `#anchor`, and a
 * keyboard visitor who follows it must continue reading from the chapter rather than from the rail
 * they just left. An element with no natural focus takes none from a fragment link unless it can
 * hold it, so the heading is made focusable-by-script-only. `scroll-mt-*` is the other half: the
 * header is sticky, so a heading scrolled to the very top of the viewport lands underneath it.
 *
 * **The pull quote is a `<blockquote>`, not a styled paragraph.** It is drawn as a ruled, indented
 * line at `312:8506`, and the rule is the only visual signal that it is a quotation. A screen
 * reader has no rule to see, so the element has to carry the meaning.
 */
export interface ArticleBodyProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  chapters: Chapter[]
}

export function ArticleBody({ chapters, className, ...props }: ArticleBodyProps) {
  return (
    <div className={cn('flex flex-col gap-12 xl:gap-15', className)} {...props}>
      {chapters.map((chapter) => (
        <section key={chapter.anchor} aria-labelledby={chapter.anchor}>
          <h2
            id={chapter.anchor}
            tabIndex={-1}
            className="text-heading-1 text-neutral-primary scroll-mt-35 uppercase focus-visible:outline-none xl:scroll-mt-40"
          >
            {chapter.heading}
          </h2>

          {chapter.lede ? (
            <p className="text-body-strong text-neutral-primary mt-5">{chapter.lede}</p>
          ) : null}

          <RichText html={chapter.bodyHtml} className="mt-4" />

          {chapter.pullQuote ? (
            <blockquote className="border-primary-default text-body-base text-neutral-primary mt-8 border-l-2 pl-6">
              {chapter.pullQuote}
            </blockquote>
          ) : null}
        </section>
      ))}
    </div>
  )
}
