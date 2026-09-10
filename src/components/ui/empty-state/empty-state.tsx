import React from 'react'

import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { cn } from '@/lib/cn'

/**
 * A page that has nothing to show, and what to do about it (003/T252 as `ListingEmpty`; promoted
 * to the kit by 007/T007).
 *
 * **Nothing is drawn for this anywhere** — spec inconsistency 8 in the catalogue, and no empty
 * frame in the blog section either. That is the usual fate of the empty state and the reason it is
 * worth building deliberately: a filter combination that matches nothing, or a blog before its
 * first article, is the moment a visitor is most likely to leave, and an empty grid under a
 * toolbar reads as a broken page rather than as an answer.
 *
 * So it says up to three things, in the order they are useful: that there is nothing, what was
 * asked for, and how to get out. The middle one is `children` — the catalogue slots its active
 * filter chips in there.
 *
 * **Promoted rather than copied, and changed in exactly two ways.** Constitution II makes the
 * second consumer the trigger to promote, and the blog is it. What moved was the shape:
 *
 * 1. **The way out is optional.** `ListingEmpty` required a `clearHref`, because a listing that
 *    matches nothing always has filters to drop. A blog with no articles published has nothing to
 *    clear and nowhere useful to send anybody, so an unconditional button there would be a control
 *    that admits it cannot help. `action` absent means no button.
 * 2. **The copy is the caller's.** The catalogue's "Nothing matches those filters" used to be a
 *    default in this file — user-visible copy inside a component, which Constitution I permits only
 *    for developer-facing errors. Both callers now pass their own, and the blog's comes out of
 *    Payload.
 *
 * The heading is an `h2`: this is a message inside a page whose `h1` is above it, not a page of its
 * own. The `id` is fixed rather than generated because a page has at most one empty state — by
 * definition, since it is what stands in for the page's content.
 */
export interface EmptyStateProps extends React.ComponentProps<'div'> {
  title: string
  description: string
  /** The way out, when there is one. Absent when nothing the visitor can press would help. */
  action?: { href: string; label: string }
}

export function EmptyState({
  title,
  description,
  action,
  children,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <Container
      as="section"
      aria-labelledby="empty-state-title"
      className={cn(
        'text-neutral-primary flex flex-col items-center gap-5 py-15 text-center xl:py-25',
        className,
      )}
      {...props}
    >
      <h2 id="empty-state-title" className="text-heading-1">
        {title}
      </h2>

      {/* Whatever produced this, when the caller can show it — the catalogue's applied chips. */}
      {children}

      <p className="text-body-base text-neutral-secondary max-w-150">{description}</p>

      {action ? (
        <Button variant="outline" href={action.href}>
          {action.label}
        </Button>
      ) : null}
    </Container>
  )
}
