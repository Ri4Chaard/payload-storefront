'use client'

import NextLink from 'next/link'
import React from 'react'

import { cn } from '@/lib/cn'

/**
 * The primary navigation item, from Figma node 135:204 — 70px tall, uppercase, gaining a 2px
 * `primary-default` rule and colour on hover.
 *
 * The rule is drawn at rest as a TRANSPARENT border rather than added on hover. Adding a border on
 * hover would grow the element by 2px and nudge every sibling sideways; Figma compensates for that
 * with a 2px top padding on the hover variant, which is the same fix expressed as a second state.
 *
 * `current` is separate from hover and sets `aria-current="page"`. They look alike by design, but a
 * screen reader has no hover, so the current page has to be announced rather than merely shaded.
 */
export interface NavLinkProps extends Omit<React.ComponentProps<'a'>, 'href'> {
  href: string
  /** Marks this as the page the visitor is on. */
  current?: boolean
}

export function NavLink({ href, current = false, className, children, ...props }: NavLinkProps) {
  return (
    <NextLink
      href={href}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'text-body-medium inline-flex h-17.5 items-center justify-center border-b-2 px-2 uppercase',
        'ease-standard transition-colors duration-[var(--duration-fast)]',
        'hover:border-primary-default hover:text-primary-default',
        current
          ? 'border-primary-default text-primary-default'
          : 'text-neutral-primary border-transparent',
        className,
      )}
      {...props}
    >
      {children}
    </NextLink>
  )
}
