import { Manrope, Playfair_Display } from 'next/font/google'

/**
 * The brand typefaces, defined ONCE.
 *
 * Both the storefront layout and Storybook import from here. Defining them twice would let the
 * component workshop drift from production — and a type specimen rendered in the wrong face is
 * worse than no specimen at all, because it looks authoritative.
 *
 * next/font self-hosts the files and generates metric-adjusted fallbacks, which is what satisfies
 * FR-014 (readable during load, no layout shift on swap) without hand-tuned size-adjust values.
 */

/** Body face. The real brand font — Manrope, SIL Open Font Licence. */
export const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
})

/**
 * Display face — PLACEHOLDER.
 *
 * The design specifies "TT Ramillas Trl". The "Trl" suffix marks it a TRIAL file, and trial licences
 * prohibit production and commercial use, so it cannot ship. Playfair Display is the closest
 * freely-licensed stand-in: a high-contrast display serif with a 500 weight that holds up at the
 * uppercase display sizes the brand uses.
 *
 * To swap in the licensed face: replace this loader with next/font/local pointing at the purchased
 * woff2 files, keeping the `--font-playfair` variable name (or rename it in
 * design/tokens/mapping.ts and regenerate). No component references a family directly, so nothing
 * else changes — and because Storybook imports this same file, the workshop updates with it.
 */
export const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  weight: ['500'],
  variable: '--font-playfair',
  display: 'swap',
})

/** Apply to the element the tokens resolve against — `<html>` in the app, the story root in Storybook. */
export const fontVariables = `${manrope.variable} ${playfair.variable}`
