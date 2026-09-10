'use client'

import { useEffect } from 'react'

/**
 * Which chapter the reader is on (007/T030).
 *
 * **This is the only client JavaScript in the whole feature**, and it does exactly one thing: set
 * `aria-current` on one link. It renders nothing. The list itself is server-rendered by
 * `table-of-contents.tsx`, so with scripting unavailable every entry still navigates and nothing is
 * marked — a rail that is slightly less informative rather than a rail that is missing.
 *
 * Constitution V requires `use client` to be pushed as far down the tree as possible. A leaf that
 * returns `null` is as far down as it goes.
 *
 * **Why an observer rather than a scroll listener.** A `scroll` handler measuring
 * `getBoundingClientRect` runs on every frame of every scroll, on a page whose whole purpose is
 * being scrolled. `IntersectionObserver` fires only when a heading crosses the line, which on a
 * long article is a few dozen times rather than a few thousand.
 *
 * **Why the callback recomputes from the DOM instead of trusting the entries.** Intersection
 * entries arrive per element and out of order, and "which chapter am I reading" is a question about
 * all of them together — the last heading that has passed the top of the viewport. Keeping a mirror
 * of each heading's state and reducing over it would be a second source of truth for something the
 * document already knows. The observer is the trigger; the document is the answer.
 *
 * **`aria-current` is the only thing set**, never a class. The styling hangs off the attribute in
 * `table-of-contents.tsx` (`aria-[current=true]:…`), so the visual state and the announced state
 * cannot drift apart — which is the failure this file would otherwise be one refactor away from.
 */
export interface TocCurrentProps {
  /** In document order. Every one is both a heading `id` and a link's `data-toc` value. */
  anchors: string[]
}

/** Roughly the sticky chrome's height. A heading above this line has been read past. */
const READ_LINE = 140

export function TocCurrent({ anchors }: TocCurrentProps) {
  useEffect(() => {
    if (anchors.length === 0) return

    const headings = anchors
      .map((anchor) => document.getElementById(anchor))
      .filter((element): element is HTMLElement => element !== null)

    if (headings.length === 0) return

    const apply = () => {
      /*
        The last heading that has crossed the line, or the first one when none has — which is the
        state at the very top of the article, where "you are reading nothing yet" would be a worse
        answer than "you are at the beginning".
      */
      let currentId = headings[0]?.id
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= READ_LINE) currentId = heading.id
      }

      for (const anchor of anchors) {
        const link = document.querySelector(`[data-toc="${CSS.escape(anchor)}"]`)
        if (!link) continue

        if (anchor === currentId) link.setAttribute('aria-current', 'true')
        else link.removeAttribute('aria-current')
      }
    }

    const observer = new IntersectionObserver(apply, {
      // Fires as a heading enters or leaves the band between the chrome and the fold.
      rootMargin: `-${READ_LINE}px 0px -55% 0px`,
      threshold: 0,
    })

    for (const heading of headings) observer.observe(heading)

    // The observer does not fire for a page loaded already scrolled — a shared `#anchor` link, or a
    // browser restoring a position. One call settles that.
    apply()

    return () => observer.disconnect()
  }, [anchors])

  return null
}
