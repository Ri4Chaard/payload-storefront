import React from 'react'

import { Container } from '@/components/ui/container'
import { cn } from '@/lib/cn'

/**
 * The block above every listing — the category's name and the sentence under it.
 * Nodes `222:709` (1920) · `412:7735` (768) · `412:7870` (375).
 *
 * **It carries the page's `h1`.** A listing's subject is its category, so the name is the heading
 * the page is about and there is exactly one of them. `/all-products` is the same block with a
 * different name in it (node `355:7142`), which is why this takes a title rather than a category.
 *
 * **The subtitle is a measure, not a full-width line.** The drawing constrains it to 804px at 1920
 * and 480px at 768 and lets it run the gutter at 375 — a centred sentence that spans 1720px is
 * unreadable, and the drawn widths are the answer to that rather than decoration.
 *
 * The vertical rhythm is the drawn one and it is not symmetric below `xl`: 32 above and 24 below at
 * 375, 48 and 40 at 768, an even 50 at 1920. Rounding those to one padding would close the gap the
 * toolbar sits in.
 */
export interface ListingHeaderProps extends Omit<React.ComponentProps<'header'>, 'title'> {
  title: string
  /** Omit it and the block closes over the space rather than leaving a gap. */
  subtitle?: string | null
}

export function ListingHeader({ title, subtitle, className, ...props }: ListingHeaderProps) {
  return (
    <Container
      as="header"
      className={cn(
        'text-neutral-primary flex flex-col items-center text-center',
        'gap-2 pt-8 pb-6 md:gap-3 md:pt-12 md:pb-10 xl:gap-5 xl:py-12.5',
        className,
      )}
      {...props}
    >
      {/* Uppercased in CSS, as everywhere: the name reaches a screen reader in its real casing. */}
      <h1 className="text-display uppercase">{title}</h1>

      {subtitle ? (
        <p className="text-body-base text-neutral-secondary md:max-w-120 xl:max-w-201">{subtitle}</p>
      ) : null}
    </Container>
  )
}
