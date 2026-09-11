import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import React from 'react'

import { colorValue } from '@tokens/mapping'
import { CartCountProvider } from '@/components/layout/cart-count'
import { ContactBanner } from '@/components/layout/contact-banner'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { CookieBanner, CookieSettingsButton } from '@/components/ui'
import { getContactDetails, getSocialLinks } from '@/lib/messengers/settings'
import { getCookieSettings, getFooterPolicies } from '@/lib/policies/queries'
import { asLocale } from '@/i18n/locale'
import { loadMessages } from '@/i18n/request'
import { LOCALES, LOCALE_LABELS } from '@/i18n/routing'
import { fontVariables } from '@/styles/fonts'

import './styles.css'

export const metadata: Metadata = {
  title: {
    default: 'Aurum',
    template: '%s — Aurum',
  },
  description: 'Fine jewelry, made and chosen with care.',
  metadataBase: process.env.NEXT_PUBLIC_SERVER_URL
    ? new URL(process.env.NEXT_PUBLIC_SERVER_URL)
    : undefined,
}

export const viewport: Viewport = {
  // Sourced from the token system rather than hardcoded — the browser chrome colour follows a
  // palette change like everything else does.
  themeColor: colorValue('background-bg'),
}

/**
 * The three languages are prerendered (spec 010, FR-012).
 *
 * Each of these multiplies every prerendered route family below it — `/products/[slug]`,
 * `/blog/[slug]`, `/legal/[slug]` — by three. That is the intended cost: a visitor reading Russian
 * gets a static page, not a render.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

/**
 * Only the namespaces a Client Component actually reads (spec 010, research R11).
 *
 * Everything the server renders uses `getTranslations` and never touches this provider, so shipping
 * the whole message file would put every legal, blog and product string into the flight payload of
 * every page for no reader. Adding a namespace here is a deliberate act with a measurable cost —
 * `pnpm measure:js` is where it shows up.
 */
const CLIENT_NAMESPACES = ['common', 'header', 'nav', 'cart', 'account', 'forms', 'errors'] as const

export default async function FrontendLayout({ children, params }: LayoutProps<'/[locale]'>) {
  /*
    The segment is effectively a catch-all: `/anything` matches it before it matches nothing. So a
    value that is not one of the three languages is not a locale, it is a 404 — and it has to be
    refused here, above the render, or `/not-a-real-page` would render the whole chrome in English
    around an empty middle.
  */
  const { locale: segment } = await params
  const locale = asLocale(segment)
  if (!locale) notFound()

  const messages = loadMessages(locale)
  const clientMessages = Object.fromEntries(
    CLIENT_NAMESPACES.filter((name) => name in messages).map((name) => [
      name,
      messages[name as keyof typeof messages],
    ]),
  )

  /*
    One read, three consumers (spec 005, T072, FR-052).

    Safe here in a way `cookies()` is not: a Local API global read is not a request-time API, so
    this does not opt every route into dynamic rendering — the prerendered catalogue survives it,
    which the build output confirms. `revalidateGlobalOnChange` on the global is what makes a saved
    change reach those cached pages (FR-042).
  */
  const [social, contact, policies, cookies] = await Promise.all([
    getSocialLinks(),
    getContactDetails(),
    /*
      The footer's policy links (spec 009, FR-015b). A third read on the same terms as the two
      beside it: a Local API read is not a request-time API, so this does not opt any route into
      dynamic rendering, and it tolerates the database being absent during a container build.
    */
    getFooterPolicies(locale),
    /*
      The banner's configuration (spec 009, FR-045). A fourth read on the same terms — and the same
      reason it is read HERE rather than in the banner: the banner is a client component, and having
      it fetch its own categories would cost a request per page view to render something the server
      already had.
    */
    getCookieSettings(locale),
  ])

  // Each surface gets what it draws, rather than the whole record spread at it: the strip and the
  // menu show an email and a number, and only the footer carries the address, the hours and the map.
  const reach = { email: contact.email, phone: contact.phone, phoneHref: contact.phoneHref }

  return (
    <html lang={locale} className={fontVariables}>
      <body>
        {/*
          The badge's count lives in a client provider, not in this layout (spec 005, T025, R8).
          Reading the cart cookie here would make `cookies()` a dependency of every route and opt
          the whole site into dynamic rendering — including `/products/[slug]`, which is
          prerendered. A number in a badge is not worth the prerendered catalogue.
        */}
        <NextIntlClientProvider locale={locale} messages={clientMessages}>
        <CartCountProvider>
          <ContactBanner social={social} {...reach} />
          {/*
            The switcher's list comes from here rather than from the header's own default, so that
            spec 010's US3 has one place to filter it — the owner switching Ukrainian off changes
            this line's output and nothing else.
          */}
          <Header social={social} {...reach} locales={LOCALES.map((code) => LOCALE_LABELS[code])} />
        {/*
          `<main>` is the landmark the skip link (T072) will target. The skip link is still its own
          task; header and footer are wired up here so they are exercised by a real page rather than
          only by Storybook.
        */}
          <main id="main">{children}</main>
          <Footer
            social={social}
            legalLinks={policies.legal}
            customerCareLinks={policies.customerCare}
            cookieSettings={cookies.enabled ? <CookieSettingsButton /> : null}
            {...contact}
          />

          {/*
            The consent banner (spec 009, FR-017). Last in the body on purpose: it is fixed to the
            viewport, so its position in the DOM decides only where a keyboard meets it — and after
            the footer is wrong. See the note below.

            It renders nothing until it has read the visitor's decision in the browser, which is what
            keeps `cookies()` — a request-time API — out of this layout and leaves every route
            prerenderable.
          */}
          <CookieBanner settings={cookies} />
        </CartCountProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
