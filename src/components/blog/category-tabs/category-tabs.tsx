import { Link as NextLink } from '@/i18n/navigation'
import React from 'react'

import type { BlogCategory } from '@/lib/blog/types'
import { cn } from '@/lib/cn'

/**
 * Narrowing the blog to one subject (007/T062 — T064), from nodes `312:7365`, `415:7921`,
 * `415:8027`.
 *
 * **Links with `aria-current`, NOT an ARIA `tablist`** (007/research.md R5). Every tab is a real
 * address, so every tab is a link. The `tablist` pattern describes panels swapped in place without
 * navigation, and adopting it here would promise a screen-reader user keyboard semantics — roving
 * arrow-key focus, `aria-selected` — that a set of links does not have and should not have.
 * `aria-current="page"` is the correct announcement for "this is the view you are on", and it is
 * what `NavLink` already uses for the header.
 *
 * **LATEST is the absence of a category, not a category named "latest".** It is drawn first and
 * always present; `blogHref({})` is its address.
 *
 * **The underline is drawn at every width, and the desktop frame does not draw it.** At desktop the
 * active tab is distinguished by colour alone (`312:7366` dark against four muted siblings), while
 * tablet and mobile both draw a 2px rule beneath it. Colour alone fails WCAG 1.4.1 and disappears
 * entirely on a monochrome or high-contrast display, so the rule is drawn everywhere (007 spec,
 * design inconsistency 4).
 *
 * The rule is a transparent border at rest rather than a border added when current — adding one
 * would grow the element by 2px and nudge every sibling sideways, which is the same trap `NavLink`
 * records.
 *
 * **The strip scrolls within itself on a narrow phone, and the page never does.** Five uppercase
 * words do not fit across 390px, and the alternatives are wrapping to two rows (which pushes the
 * mosaic down on the width with the least room) or a `<select>` (a second control to keep in sync,
 * hiding the categories a visitor came to see). `overflow-x-auto` on the list keeps the page's own
 * horizontal scroll at zero, which FR-047 requires, and every tab stays reachable by keyboard
 * because each one is focusable and the browser scrolls focus into view.
 */
export interface CategoryTabsProps extends Omit<React.ComponentProps<'nav'>, 'children'> {
  categories: BlogCategory[]
  /** The slug currently narrowed to, or `undefined` for LATEST. */
  active?: string
  /** LATEST's address. Passed in so this component never assembles a URL. */
  allHref: string
  label?: string
}

export function CategoryTabs({
  categories,
  active,
  allHref,
  label = 'Article categories',
  className,
  ...props
}: CategoryTabsProps) {
  const tabs = [{ title: 'Latest', slug: undefined, href: allHref }, ...categories]

  return (
    <nav aria-label={label} className={className} {...props}>
      <ul className="scrollbar-subtle -mx-4 flex gap-8 overflow-x-auto px-4 md:mx-0 md:px-0">
        {tabs.map((tab) => {
          const current = tab.slug === active

          return (
            <li key={tab.slug ?? 'latest'} className="shrink-0">
              <NextLink
                href={tab.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'text-heading-2 block border-b-2 border-transparent pb-2 whitespace-nowrap uppercase transition-colors',
                  current
                    ? 'border-primary-default text-neutral-primary'
                    : 'text-neutral-secondary hover:text-neutral-primary',
                  'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
                )}
              >
                {tab.title}
              </NextLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
