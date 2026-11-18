'use client'

import { useLocale, useTranslations } from 'next-intl'
import React from 'react'

import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui/breadcrumbs'
import { Container } from '@/components/ui/container'
import { IconButton } from '@/components/ui/icon-button'
import { NavLink } from '@/components/ui/nav-link'
import { useCartCount } from '@/components/layout/cart-count'
import { LanguageSelector, type Locale } from '@/components/layout/language-selector'
import { Logo } from '@/components/layout/logo'
import { MobileNav } from '@/components/layout/mobile-nav'
import { usePathname, useRouter } from '@/i18n/navigation'
import { LOCALES, LOCALE_LABELS } from '@/i18n/routing'
import type { IconName } from '@/lib/icon-registry'
import { cn } from '@/lib/cn'

/**
 * The site header, from the five variants at node 327:7956 plus the page reference
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
  /**
   * Replaces the whole navigation. Stories and fixed renderings only — the storefront passes
   * `categories` and lets the header compose the rest.
   */
  navItems?: { label: string; href: string }[]
  /**
   * The categories the owner ticked "Show in the header", in their order and already titled in the
   * visitor's language — read by the layout (`getHeaderCategories`). Drawn between "All products"
   * and "About us". Empty or absent, the header carries the fixed links alone.
   */
  categories?: { label: string; href: string }[]
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
   * everything else leaves it alone and takes what `CartCountProvider` knows.
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

/**
 * The links that are not categories: "All products" first, "About us" and "Contact us" last.
 * Their words are interface chrome, translated through the message files; the categories between
 * them are the owner's (see `categories` on the props).
 */
const LEADING_NAV = [{ key: 'allProducts', href: '/all-products' }] as const
const TRAILING_NAV = [
  { key: 'about', href: '/about' },
  { key: 'contact', href: '/contact' },
] as const

/**
 * The languages on offer.
 *
 * A default rather than a requirement, so Storybook and any fixed rendering still work — but the
 * layout passes the real list, filtered to what the owner has switched on. Before spec 010 this was
 * a hardcoded `EN`/`RU` pair with Ukrainian nowhere in the codebase.
 *
 * **`code` is the DISPLAY code and `value` is the route code**, which is why `toLowerCase()` below
 * is exact rather than hopeful: `tests/unit/i18n-locale.test.ts` asserts that every display code is
 * its locale upper-cased, so the two can never drift apart unnoticed.
 */
const DEFAULT_LOCALES: Locale[] = LOCALES.map((locale) => LOCALE_LABELS[locale])

/**
 * The count belongs in the accessible name, not only in the badge — the badge is `aria-hidden`
 * because "Cart 2" read as two unrelated things tells nobody what the two counts.
 *
 * **The plural is the message file's job now.** `count === 1 ? 'item' : 'items'`
 * is correct English and wrong Russian and Ukrainian, which have three plural categories: 1 товар,
 * 2 товара, 5 товаров. ICU knows the rules; a ternary cannot.
 */

export function Header({
  navItems: navItemsProp,
  categories = [],
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
  // out of the root layout and the catalogue prerendered.
  const liveCount = useCartCount()
  const count = cartCount ?? liveCount

  const pathname = usePathname()
  const router = useRouter()

  /*
    Spec 010 landed, and the prediction held: the locale is the router's now, and the prop shape did
    not change. `usePathname` here is next-intl's, which returns the path WITHOUT the prefix — that
    is what lets `current={pathname === item.href}` below keep working on a Russian page, where
    `next/navigation` would have reported `/ru/about` against an href of `/about`.
  */
  const t = useTranslations('header')
  const t_nav = useTranslations('nav')
  const navItems = navItemsProp ?? [
    ...LEADING_NAV.map(({ key, href }) => ({ label: t_nav(key), href })),
    ...categories,
    ...TRAILING_NAV.map(({ key, href }) => ({ label: t_nav(key), href })),
  ]
  const activeLocale = useLocale()
  const locale = activeLocale.toUpperCase()
  const setLocale = (code: string) => {
    // `replace` rather than `push`: switching language is not a place in history to go back to, and
    // the back button should return to the previous PAGE.
    router.replace(pathname, { locale: code.toLowerCase() as (typeof LOCALES)[number] })
  }

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

        <nav aria-label={t('primaryNav')} className="hidden xl:mx-5 xl:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.href} className="whitespace-nowrap">
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
            The badge counted the cart and nothing opened it. `IconButton`
            has always taken an `href` — the account control beside this one uses it — so this is
            the one line that was missing, not a new capability.
          */}
          <IconButton
            variant="bare"
            icon="cart"
            href="/cart"
            label={count > 0 ? t('cart', { count }) : t('cartEmpty')}
            badge={count > 0 ? count : undefined}
            className={iconChrome}
          />
          {/*
            One href for both states. An anonymous visitor is sent to sign-in by
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
            label={t('account')}
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
