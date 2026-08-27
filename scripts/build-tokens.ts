/**
 * Generates src/styles/tokens.css from the Figma exports plus the semantic mapping.
 *
 * Tailwind v4's `@theme` block is the single definition site: declaring `--color-primary-default`
 * there both defines the CSS variable and generates `bg-primary-default`, `text-primary-default`,
 * `border-primary-default`. One declaration, everywhere — which is exactly what FR-011 and SC-001
 * require.
 *
 * The output is committed so the build never depends on this script running, and `check-tokens.ts`
 * regenerates and diffs it in CI.
 */

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  breakpoints,
  colors,
  fluidRange,
  fontFamilies,
  motion,
  radii,
  shadows,
  spacing,
  typeScale,
  type TypeToken,
} from '../design/tokens/mapping.ts'

const here = dirname(fileURLToPath(import.meta.url))
const OUTPUT = resolve(here, '../src/styles/tokens.css')

const rem = (px: number) => `${(px / 16).toFixed(4).replace(/\.?0+$/, '')}rem`

/**
 * Fluid size between the mobile and desktop viewport widths.
 *
 * FR-017 requires the scale to adapt across breakpoints WITHOUT per-component overrides. clamp()
 * delivers that with no media queries at all, and reproduces the design's values exactly at both
 * ends of the range.
 */
function fluid([minPx, maxPx]: [number, number]): string {
  const { min: minVw, max: maxVw } = fluidRange
  const slope = (maxPx - minPx) / (maxVw - minVw)
  const intercept = minPx - slope * minVw
  return `clamp(${rem(minPx)}, ${rem(intercept)} + ${(slope * 100).toFixed(4)}vw, ${rem(maxPx)})`
}

function sizeOf(token: TypeToken): string {
  return typeof token.size === 'number' ? rem(token.size) : fluid(token.size)
}

const lines: string[] = []
const push = (s = '') => lines.push(s)

push('/*')
push(' * GENERATED FILE — DO NOT EDIT.')
push(' *')
push(' * Produced by scripts/build-tokens.ts from design/tokens/{colors,typography}.json and')
push(' * design/tokens/mapping.ts. Run `pnpm build:tokens` after changing either.')
push(' *')
push(' * Hand-editing this file is the one thing that breaks the whole token model: CI regenerates')
push(' * it and fails on any diff (`pnpm check:tokens`).')
push(' */')
push()
push('@theme {')

push('  /* ---------- Colour ---------- */')
for (const token of colors) {
  const flag = token.provenance === 'unverified' ? ' /* ⚠ unverified against Figma */' : ''
  push(`  --color-${token.name}: ${token.value};${flag}`)
}
push()
push('  /* Borders are Tailwind built-ins, deliberately not tokens:')
push('     border-black/10 (default) · border-black/5 (subtle) · border-white/8 (inverse).')
push('     Figma stores raw colours with opacity applied at the use site; so do we. */')
push()

push('  /* ---------- Typography ---------- */')
// Namespaced with `brand-` deliberately: Payload's admin CSS defines and reads its own
// `--font-body`, and an unprefixed token silently shadows it — the admin panel then falls back to
// Times because our value references next/font variables that do not exist in the admin context.
// tests/unit/tokens.test.ts asserts this namespace never collides again.
push(`  --font-brand-display: ${fontFamilies.display};`)
push(`  --font-brand-body: ${fontFamilies.body};`)
push()
for (const token of typeScale) {
  push(`  --text-${token.name}: ${sizeOf(token)};`)
  push(`  --text-${token.name}--line-height: ${token.lineHeight};`)
  push(`  --text-${token.name}--font-weight: ${token.weight};`)
}
push()

push('  /* ---------- Spacing ---------- */')
push(`  --spacing: ${spacing.base};`)
for (const [name, value] of Object.entries(spacing.brand)) {
  push(`  --spacing-${name}: ${value};`)
}
push()

push('  /* ---------- Breakpoints ---------- */')
for (const [name, value] of Object.entries(breakpoints)) {
  push(`  --breakpoint-${name}: ${value};`)
}
push()

push('  /* ---------- Shape ---------- */')
for (const [name, value] of Object.entries(radii)) {
  push(`  --radius-${name}: ${value};`)
}
push()
for (const [name, value] of Object.entries(shadows)) {
  push(`  --shadow-${name}: ${value};`)
}
push()

push('  /* ---------- Motion ---------- */')
for (const [name, value] of Object.entries(motion.duration)) {
  push(`  --duration-${name}: ${value};`)
}
for (const [name, value] of Object.entries(motion.ease)) {
  push(`  --ease-${name}: ${value};`)
}
push('}')
push()

/**
 * Uppercase is part of the display styles, and text-transform is not something Tailwind derives
 * from a --text-* token. Emitting utilities keeps the transform attached to the style rather than
 * leaving every consumer to remember `uppercase`.
 */
push('@utility text-display-cased {')
push('  text-transform: uppercase;')
push('}')
push()
for (const token of typeScale.filter((t) => t.uppercase)) {
  push(`@utility text-${token.name} {`)
  push(`  font-family: var(--font-brand-${token.family === 'display' ? 'display' : 'body'});`)
  push(`  font-size: var(--text-${token.name});`)
  push(`  line-height: var(--text-${token.name}--line-height);`)
  push(`  font-weight: var(--text-${token.name}--font-weight);`)
  push('  text-transform: uppercase;')
  push('}')
}

const output = lines.join('\n') + '\n'
writeFileSync(OUTPUT, output, 'utf8')

const unverified = colors.filter((c) => c.provenance === 'unverified')
console.log(`✓ Wrote ${OUTPUT}`)
console.log(`  ${colors.length} colours · ${typeScale.length} type styles`)
if (unverified.length > 0) {
  console.log(`  ⚠ ${unverified.length} unverified colours: ${unverified.map((c) => c.name).join(', ')}`)
}
