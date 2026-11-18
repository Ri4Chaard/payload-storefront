import { Link as NextLink } from '@/i18n/navigation'
import React from 'react'

import { cn } from '@/lib/cn'
import { SITE_NAME } from '@/lib/site'

/**
 * The brand wordmark, linking home.
 *
 * The text is written in sentence case and uppercased by the `display` type style, not typed in
 * capitals. A screen reader given "AURUM" may spell it letter by letter; given "Aurum" it says
 * the name. The capitals are presentation, so they belong in CSS.
 *
 * The design sets 35px on desktop and 22px on mobile. `text-display` is fluid between 24px and 36px
 * over the same range, so it lands within a pixel at the top and two at the bottom while staying on
 * the type scale — which is the trade FR-016 asks for.
 *
 * It is a link, not a heading. The page's `<h1>` describes the page; a wordmark in every header is
 * navigation.
 */
export function Logo({ className, ...props }: Omit<React.ComponentProps<typeof NextLink>, 'href'>) {
  return (
    <NextLink
      href="/"
      className={cn(
        'text-display text-primary-default ease-standard whitespace-nowrap transition-colors duration-[var(--duration-fast)]',
        className,
      )}
      {...props}
    >
      {SITE_NAME}
    </NextLink>
  )
}
