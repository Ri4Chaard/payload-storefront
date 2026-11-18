import { useTranslations } from 'next-intl'
import React from 'react'

import type { ContentsEntry } from '@/lib/blog/types'
import { cn } from '@/lib/cn'

import { TocCurrent } from './toc-current'

/**
 * On this page, from nodes `312:8409`, `418:8674`, `418:8938`.
 *
 * A server component. The list, the card and every link are rendered on the server; the only client
 * code is `TocCurrent`, which sets `aria-current` and nothing else.
 *
 * **It sticks, and the drawing does not.** At desktop the rail is 456px tall beside 1824px of
 * article, so as drawn it scrolls away after the first screen and is unreachable for the remaining
 * eighty per cent of the page (007 spec, design inconsistency 5). A contents list nobody can reach
 * while reading is a decoration, so it is made sticky — the one change here that the design does
 * not ask for and the reading experience does.
 *
 * **`+ N more chapters below` is computed, and disappears when N is zero.** The mobile frame draws
 * the literal string `+ 5 more chapters below` (`418:8946`), which is right for an article with ten
 * chapters and wrong for every other article ever written (design inconsistency 3).
 *
 * **One DOM, not two.** The phone shows five entries and the wider breakpoints show all of them,
 * which is a content difference rather than a layout one — so the obvious implementation is two
 * renders with `hidden`/`md:block`, and that would put two `<nav>` landmarks and two copies of every
 * link into the document for a screen reader to choose between. Instead the surplus entries are
 * hidden at phone width only. What that costs is honest: a phone visitor using a screen reader gets
 * a shortcut list of five rather than ten. What it does not cost is access to the chapters — they
 * are all in the article below, which is what the truncation line says.
 */

/** What the phone shows before it starts counting. The drawn card lists five. */
const PHONE_LIMIT = 5

export interface TableOfContentsProps extends Omit<React.ComponentProps<'nav'>, 'children'> {
  entries: ContentsEntry[]
  /** The card's own heading. Editorial copy has no place here — it names the component's function. */
  label?: string
}

export function TableOfContents({
  entries,
  label: labelProp,
  className,
  ...props
}: TableOfContentsProps) {
  const t_blog = useTranslations('blog')
  /*
    Resolved in the body, not as a default parameter: `useTranslations` is a hook. The
    prop stays overridable, so a caller with its own words still wins — what changed is that the
    fallback is translated instead of being an English literal.
  */
  const label = labelProp ?? t_blog('onThisPage')
  // Below two chapters the list points at what is already on screen. The mapper has usually already
  // dropped it; this is the renderer refusing to draw an empty card if it has not.
  if (entries.length < 2) return null

  const hiddenOnPhone = Math.max(entries.length - PHONE_LIMIT, 0)

  return (
    <nav
      aria-labelledby="contents-title"
      className={cn(
        'bg-background-container p-7.5',
        // Sticky from the breakpoint at which it becomes a rail beside the article rather than a
        // card above it. `top` clears the sticky header. The caller is responsible for giving this
        // a grid area tall enough to move within — see the route's note on `row-span-2`.
        'md:sticky md:top-30 xl:top-35',
        className,
      )}
      {...props}
    >
      <h2 id="contents-title" className="text-label text-neutral-secondary uppercase">
        {label}
      </h2>

      <ol className="mt-5 flex flex-col gap-4">
        {entries.map((entry, index) => (
          <li key={entry.anchor} className={cn(index >= PHONE_LIMIT && 'hidden md:list-item')}>
            <a
              href={`#${entry.anchor}`}
              data-toc={entry.anchor}
              className={cn(
                'text-body-small text-neutral-secondary block transition-colors',
                'hover:text-neutral-primary',
                // The reading position, set by TocCurrent. Styled off the attribute so the visible
                // state and the announced state cannot drift apart.
                'aria-[current=true]:text-neutral-primary aria-[current=true]:font-bold',
                'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
              )}
            >
              {entry.label}
            </a>
          </li>
        ))}
      </ol>

      {hiddenOnPhone > 0 ? (
        <p className="text-body-small text-neutral-secondary mt-4 md:hidden">
          {`+ ${hiddenOnPhone} more ${hiddenOnPhone === 1 ? 'chapter' : 'chapters'} below`}
        </p>
      ) : null}

      <TocCurrent anchors={entries.map((entry) => entry.anchor)} />
    </nav>
  )
}
