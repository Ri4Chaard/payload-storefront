import type { Decorator, Preview } from '@storybook/nextjs-vite'
import React from 'react'

// The storefront stylesheet, so every story renders on brand with the real tokens.
import '../src/app/(frontend)/[locale]/styles.css'

import { NextIntlClientProvider } from 'next-intl'

import { breakpoints } from '@tokens/mapping'
import messages from '@/i18n/messages/en.json'
import { DEFAULT_LOCALE } from '@/i18n/routing'
import { fontVariables } from '@/styles/fonts'

/**
 * The brand typefaces reach stories the same way they reach the app.
 *
 * next/font exposes each family as a CSS variable set via className, and the app applies it to
 * `<html>`. Storybook has no such element, so without this decorator `--font-playfair` and
 * `--font-manrope` are undefined, every `font-family` referencing them becomes invalid, and the
 * type specimen silently renders in the browser default — a design system page showing the wrong
 * typeface, authoritatively.
 */
const withBrandFonts: Decorator = (Story) => (
  <div className={fontVariables} style={{ fontFamily: 'var(--font-brand-body)' }}>
    <Story />
  </div>
)

/**
 * Messages reach stories the same way they reach the app (spec 010, T086).
 *
 * Components that read `useTranslations` or `useLocale` throw without a provider above them — and
 * since spec 010 the header is one of them. English, because a story is a specimen of the design
 * rather than of a translation; a component whose Russian rendering needs checking gets a story
 * that sets its own provider.
 */
const withMessages: Decorator = (Story) => (
  <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={messages}>
    <Story />
  </NextIntlClientProvider>
)

const preview: Preview = {
  decorators: [withBrandFonts, withMessages],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: {
      options: {
        page: { name: 'Page', value: '#f8f7f6' },
        container: { name: 'Container', value: '#ffffff' },
        base: { name: 'Base (dark)', value: '#130000' },
      },
    },
    // Viewports match the project breakpoints so a story cannot be checked at a width the design
    // system does not define.
    viewport: {
      options: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '812px' } },
        sm: { name: 'sm', styles: { width: breakpoints.sm, height: '900px' } },
        md: { name: 'md', styles: { width: breakpoints.md, height: '900px' } },
        lg: { name: 'lg', styles: { width: breakpoints.lg, height: '900px' } },
        xl: { name: 'xl', styles: { width: breakpoints.xl, height: '900px' } },
      },
    },
    a11y: {
      // Accessibility violations fail the build rather than sitting in a panel nobody opens.
      test: 'error',
    },
  },
  initialGlobals: {
    backgrounds: { value: 'page' },
  },
}

export default preview
