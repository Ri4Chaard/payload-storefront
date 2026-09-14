import { Link as NextLink } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

/**
 * How a listing goes past its first twelve (003/T255, FR-018).
 *
 * Nothing is drawn for this — spec inconsistency 7, and Open Question 1's stated default, which is
 * where this arrives after a detour through numbered pages. The pattern is the one every jeweller
 * of this size uses: a count of what is on screen against what there is, and one control that adds
 * to it.
 *
 * **It is a link, and that is the whole design.** The listing already lives in its URL, so "twelve
 * more" is an address — `?page=2` means the first twenty-four rather than the second twelve, and
 * the server renders it. Three things fall out of that and none of them had to be built:
 *
 * - It works with scripting off. The link is followed, the server renders the longer grid, and the
 *   visitor is where they expected (FR-029). No fetch, no API route, no second code path.
 * - The position is shareable and survives the back button, which is what FR-018 asks for.
 * - With scripting, `next/link` navigates on the client and `scroll={false}` leaves the page where
 *   it was, so the grid grows under the visitor's eye rather than jumping to the top.
 *
 * **The count is a live region.** It is the only thing on screen that says the press worked — the
 * new cards are below the fold, and the button stays exactly where it was. Someone using a screen
 * reader would otherwise press LOAD MORE and hear nothing at all.
 *
 * `Button as="span"` inside the anchor rather than `Button href`: the button here is a drawing
 * inside a link that owns the interaction, which is the shape that prop exists for, and it is what
 * lets this reuse the kit's outline button without a nested `<a>` or a second copy of its styling.
 */
export interface LoadMoreProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** How many are on screen. */
  shown: number
  /** How many the filters match in total. */
  total: number
  /** The next set's address, or `null` when everything is already shown. */
  moreHref: string | null
  /** What is being counted. The shop calls them pieces; a caller may disagree. */
  noun?: string
  label?: string
}

export function LoadMore({
  shown,
  total,
  moreHref,
  noun = 'pieces',
  label: labelProp,
  className,
  ...props
}: LoadMoreProps) {
  const t_catalog = useTranslations('catalog')
  /*
    Resolved in the body, not as a default parameter: `useTranslations` is a hook (spec 010). The
    prop stays overridable, so a caller with its own words still wins — what changed is that the
    fallback is translated instead of being an English literal.
  */
  const label = labelProp ?? t_catalog('loadMore')
  return (
    <div className={cn('flex flex-col items-center gap-5', className)} {...props}>
      <p role="status" className="text-body-small text-neutral-secondary">
        {`Showing ${shown} of ${total} ${noun}`}
      </p>

      {moreHref ? (
        <NextLink
          href={moreHref}
          scroll={false}
          className={cn(
            'group inline-block',
            // The focus ring belongs to the anchor, because the button inside it is a `<span>` and
            // has no focus of its own to draw one around.
            'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
          )}
        >
          {/* Uppercased in CSS rather than typed in capitals, as every drawn button here is. */}
          <Button as="span" variant="outline" className="uppercase">
            {label}
          </Button>
        </NextLink>
      ) : null}
    </div>
  )
}
