'use client'

import { usePathname } from 'next/navigation'
import React from 'react'

import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui/breadcrumbs'
import { Container } from '@/components/ui/container'
import { IconButton } from '@/components/ui/icon-button'
import { NavLink } from '@/components/ui/nav-link'
import { useCartCount } from '@/components/layout/cart-count'
import { LanguageSelector, type Locale } from '@/components/layout/language-selector'
import { Logo } from '@/components/layout/logo'
import { MobileNav } from '@/components/layout/mobile-nav'
import type { IconName } from '@/lib/icon-registry'
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
  /**
   * Stick to the top and step out of the way while the visitor is reading downward, coming back
   * the moment they scroll up. `false` pins it in the flow, which is what a story that wants to
   * photograph the header rather than watch it wants.
   */
  reveal?: boolean
  /** Renders the trail bar beneath the header. Omit or empty for the plain header. */
  breadcrumbs?: BreadcrumbItem[]
  /**
   * Overrides the live count. Stories and the odd fixed rendering want a number they control;
   * everything else leaves it alone and takes what `CartCountProvider` knows (spec 005, T025).
   */
  cartCount?: number
  /** The shop's accounts, from `contact-settings`. Passed through to the mobile navigation. */
  social?: { href: string; icon: IconName; label: string }[]
  /** The shop's own details, from the `contact-settings` global via the layout. */
  email: string
  phone: string
  phoneHref: string
  locales?: Locale[]
  className?: string
}

/** Placeholder navigation (T073). Later specs replace this with Payload-managed content. */
const DEFAULT_NAV = [
  { label: 'All jewelry', href: '/all-jewelry' },
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
  cartCount,
  social,
  email,
  phone,
  phoneHref,
  locales = DEFAULT_LOCALES,
  reveal = true,
  className,
}: HeaderProps) {
  // The prop wins where one is given — stories and fixed renderings — otherwise the live count
  // from `CartCountProvider`. Reading it here rather than in the layout is what keeps `cookies()`
  // out of the root layout and the catalogue prerendered (spec 005, research R8).
  const liveCount = useCartCount()
  const count = cartCount ?? liveCount

  const pathname = usePathname()

  // Locale is local state because nothing routes on it yet. When i18n lands this becomes controlled
  // by the router; the shape of the prop does not change.
  const [locale, setLocale] = React.useState(locales[0]?.code ?? 'EN')

  const headerRef = React.useRef<HTMLElement>(null)
  // How far above its resting place the header sits — 0, or its own height once it has stepped out
  // of the way. A number rather than a boolean because it is also the animated value.
  const [lift, setLift] = React.useState(0)

  React.useEffect(() => {
    if (!reveal) return
    const element = headerRef.current
    if (!element) return

    let previous = window.scrollY
    let frame = 0

    function evaluate() {
      const height = element!.offsetHeight
      const y = Math.max(0, window.scrollY)
      const delta = y - previous
      // Momentum scrolling and trackpads deliver a pixel at a time in both directions. Without a
      // floor the header flickers on and off around a single pixel of movement.
      if (Math.abs(delta) < 6) return
      previous = y
      // Two header-heights of runway before it will hide, so that a small nudge near the top of the
      // page does not take the navigation away from someone who has barely started reading.
      setLift(delta > 0 && y > height * 2 ? -height : 0)
    }

    function onScroll() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(evaluate)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [reveal])

  // The header's icons are 20px on a phone and 24px from tablet up (nodes 440:13412, 440:12452).
  // Applied as a class rather than a prop because the change is per-breakpoint, which a prop cannot
  // express.
  const iconChrome =
    'text-neutral-primary hover:text-primary-default [&_svg]:size-5 md:[&_svg]:size-6'

  return (
    <header
      ref={headerRef}
      style={reveal ? { top: lift } : undefined}
      className={cn(
        'bg-background-bg border-b border-black/10',
        // `top` rather than a transform, and deliberately. A transform on this element would make
        // it the containing block for every `position: fixed` descendant, and the menu's panel is
        // one — it would be sized to the header instead of to the viewport. `position: sticky`
        // creates a stacking context but not a containing block, so the panel is unaffected.
        reveal &&
          'sticky top-0 z-30 transition-[top] duration-[var(--duration-base)] ease-[var(--ease-standard)] motion-reduce:transition-none',
        className,
      )}
    >
      <Container className="relative flex h-15 items-center justify-between md:h-17.5">
        <MobileNav
          email={email}
          phone={phone}
          phoneHref={phoneHref}
          {...(social ? { social } : {})}
          items={navItems}
          locales={locales}
          locale={locale}
          onLocaleChange={setLocale}
          className="xl:hidden"
        />

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
          {/*
            The badge counted the cart and nothing opened it (spec 005, T024, FR-016). `IconButton`
            has always taken an `href` — the account control beside this one uses it — so this is
            the one line that was missing, not a new capability.
          */}
          <IconButton
            variant="bare"
            icon="cart"
            href="/cart"
            label={cartLabel(count)}
            badge={count > 0 ? count : undefined}
            className={iconChrome}
          />
          {/*
            One href for both states (spec 004, FR-016). An anonymous visitor is sent to sign-in by
            `src/proxy.ts`, which already guards `/account` and carries `next` so they land back
            here afterwards.

            The alternative — branching on the session — means calling `getCustomer()` in the root
            layout, and reading the session makes every route dynamic. `products/[slug]` is
            statically generated, so that trades the pages that sell things for a header attribute
            nobody can see. The customer-visible behaviour FR-016 asks for is identical either way.
          */}
          <IconButton
            variant="bare"
            href="/account"
            icon="user"
            label="Account"
            className={iconChrome}
          />
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
