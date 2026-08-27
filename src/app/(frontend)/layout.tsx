import type { Metadata, Viewport } from 'next'
import React from 'react'

import { colorValue } from '@tokens/mapping'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
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

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <Header />
        {/*
          `<main>` is the landmark the skip link (T072) will target. The skip link is still its own
          task; header and footer are wired up here so they are exercised by a real page rather than
          only by Storybook.
        */}
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
