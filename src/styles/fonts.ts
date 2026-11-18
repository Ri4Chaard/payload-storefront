import { Cormorant_Garamond, Inter } from 'next/font/google'

/**
 * The typefaces, defined ONCE.
 *
 * Both the storefront layout and Storybook import from here, so the component workshop cannot drift
 * from production. next/font self-hosts the files and generates metric-adjusted fallbacks, so text
 * stays readable during load without layout shift on swap.
 *
 * To use your own faces: swap these loaders (or use next/font/local with your woff2 files), keeping
 * the `--font-display-face` / `--font-body-face` variable names, or rename them in
 * design/tokens/mapping.ts and run `pnpm build:tokens`. No component references a family directly.
 */

/** Body face — Inter, SIL Open Font Licence. */
export const bodyFont = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body-face',
  display: 'swap',
})

/** Display face (headings, wordmark) — Cormorant Garamond, SIL Open Font Licence. */
export const displayFont = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['500'],
  variable: '--font-display-face',
  display: 'swap',
})

/** Apply to the element the tokens resolve against — `<html>` in the app, the story root in Storybook. */
export const fontVariables = `${bodyFont.variable} ${displayFont.variable}`
