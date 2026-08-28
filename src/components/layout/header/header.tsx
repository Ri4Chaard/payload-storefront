'use client'

import { usePathname } from 'next/navigation'
import React from 'react'

import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui/breadcrumbs'
import { Container } from '@/components/ui/container'
import { IconButton } from '@/components/ui/icon-button'
import { NavLink } from '@/components/ui/nav-link'
import { LanguageSelector, type Locale } from '@/components/layout/language-selector'
import { Logo } from '@/components/layout/logo'
import { MobileNav } from '@/components/layout/mobile-nav'
import { cn } from '@/lib/cn'

/**
 * The site header (T073, FR-035), from the five variants at node 327:7956 plus the page reference
 * at node 440:13435.
 *
 * **Those five variants are three breakpoints, not five components.** Figma has to draw a frame per
 * width; CSS does not, and shipping five headers would guarantee they drift. One header adapts:
 *
 *   < md    60px tall, 16px gutter. Hamburger, centred wordmark, cart and account.
 *   md–xl   70px tall, 24px gutter. As above plus the language switcher.
 *   xl+     70px tall, 100px gutter. Wordmark left, navigation inline, no hamburger.
 *
 * Variant3 (node 367:6506) is the mobile header the owner flagged as wrong, and it is: it drops the
 * hamburger and the cart, keeps the language switcher, and left-aligns the wordmark — so on a phone
 * there is no way to reach the navigation or the basket at all. The page reference at node
 * 440:13435 shows what the mobile header should be (Variant5), and that is what is built. Variant3
 * is treated as superseded rather than as a fourth layout.
 *
 * The wordmark is centred with absolute positioning below `xl` and returns to the flow above it.
 * That is what lets one element be centred between two unequal flanks at small widths and sit
 * flush-left at large ones without rendering it twice.
 */
export interface HeaderProps {
  navItems?: { label: string; href: string }[]
  /** Renders the trail bar beneath the header. Omit or empty for the plain header. */
  breadcrumbs?: BreadcrumbItem[]
  cartCount?: number
  locales?: Locale[]
  className?: string
}

/** Placeholder navigation (T073). Later specs replace this with Payload-managed content. */
const DEFAULT_NAV = [
  { label: 'All jewelry', href: '/jewelry' },
  { label: 'Rings', href: '/rings' },
  { label: 'Bracelets', href: '/bracelets' },
  { label: 'Earrings', href: '/earrings' },
  { label: 'Necklaces', href: '/necklaces' },
  { label: 'About us', href: '/about' },
  { label: 'Contact us', href: '/contact' },
]

const DEFAULT_LOCALES: Locale[] = [
  { code: 'EN', label: 'English' },
  { code: 'RU', label: 'Russian' },
]

/**
 * The count belongs in the accessible name, not only in the badge — the badge is `aria-hidden`
 * because "Cart 2" read as two unrelated things tells nobody what the two counts.
 */
function cartLabel(count: number): string {
  if (count <= 0) return 'Cart, empty'
  return `Cart, ${count} ${count === 1 ? 'item' : 'items'}`
}

export function Header({
  navItems = DEFAULT_NAV,
  breadcrumbs,
  cartCount = 0,
  locales = DEFAULT_LOCALES,
  className,
}: HeaderProps) {
  const pathname = usePathname()

  // Locale is local state because nothing routes on it yet. When i18n lands this becomes controlled
  // by the router; the shape of the prop does not change.
  const [locale, setLocale] = React.useState(locales[0]?.code ?? 'EN')

  // The header's icons are 20px on a phone and 24px from tablet up (nodes 440:13412, 440:12452).
  // Applied as a class rather than a prop because the change is per-breakpoint, which a prop cannot
  // express.
  const iconChrome =
    'text-neutral-primary hover:text-primary-default [&_svg]:size-5 md:[&_svg]:size-6'

  return (
    <header className={cn('bg-background-bg border-b border-black/10', className)}>
      <Container className="relative flex h-15 items-center justify-between md:h-17.5">
        <MobileNav items={navItems} className="xl:hidden" />

        <Logo className="absolute left-1/2 -translate-x-1/2 xl:static xl:translate-x-0" />

        <nav aria-label="Primary" className="hidden xl:block">
          <ul className="flex items-center gap-7.5">
            {navItems.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} current={pathname === item.href}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4 md:gap-5">
          <LanguageSelector
            locales={locales}
            value={locale}
            onChange={setLocale}
            className="hidden md:block"
          />
          <IconButton
            variant="bare"
            icon="cart"
            label={cartLabel(cartCount)}
            badge={cartCount > 0 ? cartCount : undefined}
            className={iconChrome}
          />
          <IconButton variant="bare" icon="user" label="Account" className={iconChrome} />
        </div>
      </Container>

      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Container className="py-2.5">
          <Breadcrumbs items={breadcrumbs} />
        </Container>
      ) : null}
    </header>
  )
}
