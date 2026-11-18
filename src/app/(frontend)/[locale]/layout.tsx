import type { Metadata, Viewport } from 'next'
import { notFound, redirect } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import React from 'react'

import { colorValue } from '@tokens/mapping'
import { CartCountProvider } from '@/components/layout/cart-count'
import { ContactBanner } from '@/components/layout/contact-banner'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { CookieBanner, CookieSettingsButton } from '@/components/ui'
import { getHeaderCategories } from '@/lib/catalog/queries'
import { getContactDetails, getSocialLinks } from '@/lib/messengers/settings'
import { getCookieSettings, getFooterPolicies } from '@/lib/policies/queries'
import { asLocale } from '@/i18n/locale'
import { loadMessages } from '@/i18n/messages'
import { getTranslations } from 'next-intl/server'

import { DEFAULT_LOCALE, LOCALES, LOCALE_LABELS } from '@/i18n/routing'
import { getEnabledLocales } from '@/lib/i18n/enabled'
import { fontVariables } from '@/styles/fonts'

import './styles.css'
import { SITE_NAME } from '@/lib/site'

/**
 * The site's own metadata, in the language being read.
 *
 * **A function rather than a constant, because the description is a sentence.** It is what a search
 * result shows for any page whose own SEO description is empty — so leaving it English put an
 * English sentence under a Russian page's title in Google, which is exactly the duplicate-looking
 * result the `hreflang` work exists to avoid.
 *
 * The title stays `Aurum` in every language: it is the shop's name, not a word.
 */
export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale: segment } = await params
  const locale = asLocale(segment) ?? DEFAULT_LOCALE
  const t = await getTranslations({ locale, namespace: 'meta' })

  return {
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description: t('siteDescription'),
    metadataBase: process.env.NEXT_PUBLIC_SERVER_URL
      ? new URL(process.env.NEXT_PUBLIC_SERVER_URL)
      : undefined,
  }
}

export const viewport: Viewport = {
  // Sourced from the token system rather than hardcoded — the browser chrome colour follows a
  // palette change like everything else does.
  themeColor: colorValue('background-bg'),
}

/**
 * The three languages are prerendered.
 *
 * Each of these multiplies every prerendered route family below it — `/products/[slug]`,
 * `/blog/[slug]`, `/legal/[slug]` — by three. That is the intended cost: a visitor reading Russian
 * gets a static page, not a render.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

/**
 * Only the namespaces a Client Component actually reads.
 *
 * Everything the server renders uses `getTranslations` and never touches this provider, so shipping
 * the whole message file would put every string into the flight payload of every page for no reader.
 * Adding a namespace here is a deliberate act with a measurable cost — `pnpm measure:js` is where it
 * shows up.
 *
 * **A namespace missing from this list fails silently and looks like a template bug.** next-intl
 * renders the key path itself — a button reading `product.addToCart` — rather than throwing, so it
 * survives a build, a typecheck and a lint, and is caught only by looking at the page. This list is
 * derived from what `useTranslations` is actually called with in a Client Component:
 *
 *   grep -rl "^'use client'" src | xargs grep -ohE "useTranslations\('([a-z]+)'\)" | sort -u
 *
 * `legal` and `email` are deliberately absent: a policy page is server-rendered and mail never
 * reaches a browser at all.
 */
const CLIENT_NAMESPACES = [
  'account',
  'cart',
  'catalog',
  'common',
  'errors',
  'forms',
  'header',
  'nav',
  'product',
] as const

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

  /*
    Is this language still on offer? (spec 010, FR-027.)

    The check is here rather than in `src/proxy.ts` because the answer lives in the database and the
    proxy must not read one. A disabled language is sent to `/language/reset`, which clears the
    cookie and returns the visitor to the English equivalent — the hop exists because a Server
    Component cannot clear a cookie, and without clearing it the proxy would send them straight back
   .
  */
  const enabled = await getEnabledLocales()
  if (!enabled.includes(locale)) {
    /*
      No `next` parameter, so the visitor lands on the English home page rather than on the English
      equivalent of the page they asked for. Knowing that page means reading `headers()`, which is a
      request-time API — it would opt the entire site into dynamic rendering to improve the landing
      spot in the one case where an owner switched a language off while somebody was reading it.
      The prerendered catalogue is worth more than that.
    */
    redirect('/language/reset')
  }

  const messages = loadMessages(locale)
  const clientMessages = Object.fromEntries(
    CLIENT_NAMESPACES.filter((name) => name in messages).map((name) => [
      name,
      messages[name as keyof typeof messages],
    ]),
  )

  /*
    One read, three consumers.

    Safe here in a way `cookies()` is not: a Local API global read is not a request-time API, so
    this does not opt every route into dynamic rendering — the prerendered catalogue survives it,
    which the build output confirms. `revalidateGlobalOnChange` on the global is what makes a saved
    change reach those cached pages.
  */
  const [social, contact, policies, cookies, headerCategories] = await Promise.all([
    getSocialLinks(),
    getContactDetails(),
    /*
      The footer's policy links. A third read on the same terms as the two
      beside it: a Local API read is not a request-time API, so this does not opt any route into
      dynamic rendering, and it tolerates the database being absent during a container build.
    */
    getFooterPolicies(locale),
    /*
      The banner's configuration. A fourth read on the same terms — and the same
      reason it is read HERE rather than in the banner: the banner is a client component, and having
      it fetch its own categories would cost a request per page view to render something the server
      already had.
    */
    getCookieSettings(locale),
    /*
      The categories the owner ticked "Show in the header", titled in this language. Read here, on
      the same terms as the reads above, and handed down: the header is a client component. Saving
      a category runs `revalidateOnChange`, which invalidates every cached page that draws it.
    */
    getHeaderCategories(locale),
  ])

  // Each surface gets what it draws, rather than the whole record spread at it: the strip and the
  // menu show an email and a number, and only the footer carries the address, the hours and the map.
  const reach = { email: contact.email, phone: contact.phone, phoneHref: contact.phoneHref }

  return (
    <html lang={locale} className={fontVariables}>
      <body>
        {/*
          The badge's count lives in a client provider, not in this layout.
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
            <Header
              categories={headerCategories}
              social={social}
              {...reach}
              locales={enabled.map((code) => LOCALE_LABELS[code])}
            />
            {/*
          `<main>` is the landmark the skip link will target. The skip link is still its own
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
            The consent banner. Last in the body on purpose: it is fixed to the
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
