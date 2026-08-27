'use client'

import NextLink from 'next/link'
import React from 'react'

import { cn } from '@/lib/cn'

/**
 * FR-022 (T048) — navigation. A control that PERFORMS is a `Button`; this one goes somewhere. The
 * distinction is not cosmetic: it decides which key activates the control and how a screen reader
 * announces it.
 *
 * `inverse` comes from Figma node 312:8748 — a footer link on `background-base`, 80% white, with a
 * `primary-default` rule that grows from zero width on hover.
 *
 * Only `inline` is underlined at rest, and deliberately so. Inside a paragraph, colour alone is not
 * a sufficient affordance: a link that is only "the maroon words" is invisible to anyone who cannot
 * separate it from the surrounding text. In a footer column or a nav row the links are identifiable
 * by position, so the hover rule is decoration rather than the only signal.
 */
export type LinkVariant = 'inline' | 'standalone' | 'muted' | 'inverse' | 'inverse-inline'

const variantClasses: Record<LinkVariant, string> = {
  inline: 'text-primary-default underline underline-offset-4 hover:text-primary-hover',
  standalone: 'text-neutral-primary hover:text-primary-default',
  muted: 'text-neutral-secondary hover:text-neutral-primary',
  inverse: 'text-neutral-white/80 hover:text-neutral-white focus-visible:outline-neutral-white',
  'inverse-inline':
    'text-neutral-white/80 underline underline-offset-4 hover:text-neutral-white focus-visible:outline-neutral-white',
}

const ruleClasses: Record<LinkVariant, string> = {
  inline: '',
  standalone: 'bg-primary-default',
  muted: 'bg-neutral-primary',
  // Figma draws this rule in `primary-default` (node 312:8748). On `background-base` that measures
  // barely 1.3:1 against the surface behind it — a hover affordance nobody can see is not one.
  // White, at the owner's direction.
  inverse: 'bg-neutral-white',
  'inverse-inline': '',
}

export interface LinkProps extends Omit<React.ComponentProps<'a'>, 'href'> {
  href: string
  variant?: LinkVariant
  /** Inferred from an absolute href; pass explicitly to override. */
  external?: boolean
}

export function Link({
  href,
  variant = 'inline',
  external,
  className,
  children,
  ...props
}: LinkProps) {
  const isExternal = external ?? /^(?:[a-z]+:)?\/\//i.test(href)
  // Only the variants that are NOT underlined at rest get the rule that grows on hover. Drawing
  // both would double the line.
  const animated = variant === 'standalone' || variant === 'muted' || variant === 'inverse'

  const content = (
    <>
      {children}
      {animated ? (
        <span
          aria-hidden="true"
          className={cn(
            'ease-standard absolute bottom-0 left-0 h-px w-0 transition-[width] duration-[var(--duration-base)] group-hover:w-full',
            ruleClasses[variant],
          )}
        />
      ) : null}
      {isExternal ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </>
  )

  const classes = cn(
    'group relative inline-block text-body-small',
    'transition-colors duration-[var(--duration-fast)] ease-standard',
    variantClasses[variant],
    className,
  )

  // A link off-site is a plain anchor: next/link's prefetch and client transition have nothing to
  // do, and `rel` has to carry the tab-nabbing protection that `target="_blank"` otherwise opens up.
  if (isExternal) {
    return (
      <a href={href} rel="noopener noreferrer" target="_blank" className={classes} {...props}>
        {content}
      </a>
    )
  }

  return (
    <NextLink href={href} className={classes} {...props}>
      {content}
    </NextLink>
  )
}
