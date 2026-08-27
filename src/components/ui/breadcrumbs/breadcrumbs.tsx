import NextLink from 'next/link'
import React from 'react'

import { cn } from '@/lib/cn'

/**
 * The breadcrumb trail from the header's "хлебные крошки" bar (nodes 327:7076, 440:12427,
 * 440:13420) — 14px, slash-separated.
 *
 * The design draws seven `<p>` elements in a row: four labels and three slashes, all equal
 * children. That is a picture of a breadcrumb, not a breadcrumb. Here it is an ordered list inside
 * a labelled `nav`, the last item marked `aria-current="page"` and not linked, and the slashes
 * `aria-hidden` — a screen reader should hear the trail, not "text slash text slash text".
 *
 * The last crumb is the current page and takes no `href`, so passing one is ignored rather than
 * rendering a link to where you already are.
 */
export interface BreadcrumbItem {
  label: string
  /** Omitted on the final crumb, which is the current page. */
  href?: string
}

export interface BreadcrumbsProps extends Omit<React.ComponentProps<'nav'>, 'children'> {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items, className, ...props }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={cn('text-body-small', className)} {...props}>
      <ol className="text-neutral-primary flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {isLast || !item.href ? (
                <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
              ) : (
                <NextLink
                  href={item.href}
                  className="ease-standard transition-colors duration-[var(--duration-fast)] hover:underline hover:underline-offset-4"
                >
                  {item.label}
                </NextLink>
              )}
              {isLast ? null : (
                <span aria-hidden="true" className="text-neutral-secondary">
                  /
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
