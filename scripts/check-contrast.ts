/**
 * Validates every permitted colour pairing against WCAG 2.2 (FR-012, SC-003).
 *
 * This checks the DECLARED pairings, not the cartesian product. A combination absent from the list
 * is not a failure — it is simply not permitted, and using one is a review defect. That distinction
 * is what lets a colour be legitimate on a dark surface and forbidden on a light one.
 *
 * Accepted exceptions are listed explicitly in the mapping with a written reason. They are
 * exceptions of record, not silent violations: the gate still blocks any NEW undeclared failure.
 */

import {
  acceptedExceptions,
  acceptedOpacityExceptions,
  colors,
  permittedPairings,
  type Pairing,
} from '../design/tokens/mapping.ts'

const byName = new Map(colors.map((c) => [c.name, c.value]))

function channel(value: number): number {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  if (h.length === 8) {
    throw new Error(
      `Cannot compute contrast for the translucent colour #${h}. Composite it over a surface first.`,
    )
  }
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
  return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!)
}

export function contrastRatio(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)]
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

interface Result {
  pairing: Pairing
  ratio: number
  passed: boolean
}

function evaluate(pairing: Pairing): Result {
  const fg = byName.get(pairing.foreground)
  const bg = byName.get(pairing.background)
  if (!fg) throw new Error(`Pairing references unknown foreground token "${pairing.foreground}".`)
  if (!bg) throw new Error(`Pairing references unknown background token "${pairing.background}".`)
  const ratio = contrastRatio(fg, bg)
  return { pairing, ratio, passed: ratio >= pairing.minimum }
}

const results = permittedPairings.map(evaluate)
const failures = results.filter((r) => !r.passed)

const pad = (s: string, n: number) => s.padEnd(n)
const nameWidth = Math.max(...permittedPairings.map((p) => p.foreground.length)) + 2
const bgWidth = Math.max(...permittedPairings.map((p) => p.background.length)) + 2

console.log('Permitted pairings\n')
for (const { pairing, ratio, passed } of results) {
  const mark = passed ? '✓' : '✗'
  console.log(
    `  ${mark} ${pad(pairing.foreground, nameWidth)}on ${pad(pairing.background, bgWidth)}` +
      `${ratio.toFixed(2).padStart(6)}  (min ${pairing.minimum})`,
  )
}

if (acceptedExceptions.length > 0 || acceptedOpacityExceptions.length > 0) {
  console.log('\nAccepted exceptions — below AA, kept by owner decision:')
  for (const exception of acceptedExceptions) {
    const fg = byName.get(exception.foreground)!
    const bg = byName.get(exception.background)!
    const ratio = contrastRatio(fg, bg)
    console.log(
      `  ! ${exception.foreground} on ${exception.background} — ${ratio.toFixed(2)} ` +
        `(min ${exception.minimum}). ${exception.reason}`,
    )
  }
  for (const exception of acceptedOpacityExceptions) {
    console.log(`  ! ${exception.description} — ${exception.ratio}. ${exception.reason}`)
  }
}

console.log()
if (failures.length > 0) {
  console.error(`✗ ${failures.length} permitted pairing(s) fail their minimum contrast.`)
  console.error('  Either fix the colour, change the surface, or move the pairing to')
  console.error('  acceptedExceptions in design/tokens/mapping.ts with a written reason.')
  process.exit(1)
}

console.log(
  `✓ ${results.length} permitted pairings pass · ${acceptedExceptions.length + acceptedOpacityExceptions.length} documented exception(s)`,
)
