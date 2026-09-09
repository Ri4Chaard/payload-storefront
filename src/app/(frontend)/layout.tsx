import type { Metadata, Viewport } from 'next'
import React from 'react'

import { colorValue } from '@tokens/mapping'
import { CartCountProvider } from '@/components/layout/cart-count'
import { ContactBanner } from '@/components/layout/contact-banner'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { getSocialLinks } from '@/lib/messengers/settings'
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

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  /*
    One read, three consumers (spec 005, T072, FR-052).

    Safe here in a way `cookies()` is not: a Local API global read is not a request-time API, so
    this does not opt every route into dynamic rendering — the prerendered catalogue survives it,
    which the build output confirms. `revalidateGlobalOnChange` on the global is what makes a saved
    change reach those cached pages (FR-042).
  */
  const social = await getSocialLinks()

  return (
    <html lang="en" className={fontVariables}>
      <body>
        {/*
          The badge's count lives in a client provider, not in this layout (spec 005, T025, R8).
          Reading the cart cookie here would make `cookies()` a dependency of every route and opt
          the whole site into dynamic rendering — including `/products/[slug]`, which is
          prerendered. A number in a badge is not worth the prerendered catalogue.
        */}
        <CartCountProvider>
          <ContactBanner social={social} />
          <Header social={social} />
        {/*
          `<main>` is the landmark the skip link (T072) will target. The skip link is still its own
          task; header and footer are wired up here so they are exercised by a real page rather than
          only by Storybook.
        */}
          <main id="main">{children}</main>
          <Footer social={social} />
        </CartCountProvider>
      </body>
    </html>
  )
}
