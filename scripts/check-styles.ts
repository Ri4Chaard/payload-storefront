/**
 * The CSS half of the no-magic-values rules (FR-010, FR-016, FR-018).
 *
 * ESLint does not parse CSS, so the custom lint rules in eslint-rules/design-tokens.mjs cover only
 * TS and TSX. This closes the other half: a raw hex in a stylesheet would otherwise slip through
 * the gate entirely.
 *
 * src/styles/tokens.css is exempt — it is the one place raw values legitimately live.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const SRC = resolve(root, 'src')
const EXEMPT = [resolve(root, 'src/styles/tokens.css')]

const CHECKS = [
  {
    pattern: /#[0-9a-fA-F]{3,8}\b/,
    message: 'Raw colour value — use a design token (var(--color-*)) or a Tailwind utility.',
  },
  {
    pattern: /font-size\s*:\s*[\d.]+(px|rem|em|pt)/,
    message: 'Arbitrary font size — use a named type style (var(--text-*)).',
  },
  {
    pattern: /\b(?:margin|padding|gap)(?:-(?:top|right|bottom|left))?\s*:\s*[\d.]+(px|rem)/,
    message: 'Arbitrary spacing — use the spacing scale.',
  },
]

/** rgb()/hsl() inside a token definition or a shadow is fine; a bare hex is not. */
const ALLOW_LINE = /^\s*(\/\*|\*|--|@import|@theme|@utility|@media|@layer)/

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return full.endsWith('.css') ? [full] : []
  })
}

let violations = 0

for (const file of walk(SRC)) {
  if (EXEMPT.includes(file)) continue
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, index) => {
    if (ALLOW_LINE.test(line)) return
    for (const check of CHECKS) {
      if (check.pattern.test(line)) {
        console.error(`${relative(root, file)}:${index + 1}  ${check.message}`)
        console.error(`  ${line.trim()}`)
        violations += 1
      }
    }
  })
}

if (violations > 0) {
  console.error(`\n✗ ${violations} magic value(s) in CSS. See contracts/design-tokens.md.`)
  process.exit(1)
}
console.log('✓ No magic values in CSS')
