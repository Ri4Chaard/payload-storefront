import { describe, expect, it } from 'vitest'

import {
  acceptedExceptions,
  colors,
  permittedPairings,
  typeScale,
} from '@tokens/mapping'

/**
 * The mapping's validation rules from data-model.md. These exist because the raw export violates
 * the first of them — `border-#ffffff` is not a valid CSS identifier — and because a token whose
 * provenance is unexplained is exactly what the provenance field is meant to prevent.
 */
describe('token mapping', () => {
  const IDENTIFIER = /^[a-z][a-z0-9-]*$/

  it('every colour token name is a valid CSS identifier', () => {
    for (const token of colors) {
      expect(token.name, `"${token.name}" is not a valid identifier`).toMatch(IDENTIFIER)
    }
  })

  it('every type token name is a valid CSS identifier', () => {
    for (const token of typeScale) {
      expect(token.name).toMatch(IDENTIFIER)
    }
  })

  it('every token that is not a straight passthrough explains itself', () => {
    // `figma` and `supplied` are passthroughs — the value is what the design tool gave us, so there
    // is nothing to justify. Everything else was renamed, remapped, derived, or is untrusted, and
    // must say why. This is what lets the owner audit invented values against supplied ones.
    const PASSTHROUGH = new Set(['figma', 'supplied'])
    const needsReason = [...colors, ...typeScale].filter((t) => !PASSTHROUGH.has(t.provenance))
    for (const token of needsReason) {
      expect(token.reason, `${token.name} has provenance "${token.provenance}" but no reason`)
        .toBeTruthy()
    }
  })

  it('every pairing references tokens that exist', () => {
    const names = new Set(colors.map((c) => c.name))
    for (const pairing of [...permittedPairings, ...acceptedExceptions]) {
      expect(names.has(pairing.foreground), `unknown foreground ${pairing.foreground}`).toBe(true)
      expect(names.has(pairing.background), `unknown background ${pairing.background}`).toBe(true)
    }
  })

  it('no token name collides', () => {
    const all = [...colors.map((c) => c.name), ...typeScale.map((t) => t.name)]
    expect(new Set(all).size).toBe(all.length)
  })

  it('fluid type sizes go smaller on mobile, never larger', () => {
    for (const token of typeScale) {
      if (Array.isArray(token.size)) {
        const [mobile, desktop] = token.size
        expect(mobile, `${token.name} mobile size exceeds desktop`).toBeLessThanOrEqual(desktop)
      }
    }
  })
})

/**
 * Regression guard for a bug that shipped once and would otherwise ship again.
 *
 * Payload's admin CSS defines and reads `--font-body`. Our token of the same name shadowed it with
 * a value referencing next/font variables that do not exist in the admin context, so the whole
 * declaration became invalid and the entire admin panel fell back to Times. It looked like a
 * Tailwind preflight problem; it was a variable-name collision.
 *
 * The admin panel is styled by a package we do not control, so the only durable defence is to
 * assert the two namespaces stay disjoint.
 */
describe('no collision with Payload admin CSS variables', () => {
  it('our tokens never shadow a variable Payload defines', async () => {
    const { readFileSync, existsSync } = await import('node:fs')
    const { resolve } = await import('node:path')

    const payloadCss = resolve('node_modules/@payloadcms/next/dist/prod/styles.css')
    if (!existsSync(payloadCss)) return // dependency layout changed; nothing to compare against

    const ours = new Set(
      [...readFileSync(resolve('src/styles/tokens.css'), 'utf8').matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)]
        .map((m) => m[1]!),
    )
    const theirs = new Set(
      [...readFileSync(payloadCss, 'utf8').matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]!),
    )

    const collisions = [...ours].filter((name) => theirs.has(name))
    expect(collisions, `tokens shadowing Payload variables: ${collisions.join(', ')}`).toEqual([])
  })
})
