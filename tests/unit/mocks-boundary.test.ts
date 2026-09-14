import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The mock boundary, now closed (002/T135; narrowed by 003/T236; closed by spec 010).
 *
 * **This test used to assert the opposite of what it asserts now, and that is the point.** For
 * eight specs the storefront served some of its content from `src/mocks/` — a recorded deviation
 * from Constitution I, staged in spec 001 and narrowed every spec since. What made it a *staged*
 * deviation rather than a permanent one was that only route loaders could read it, so swapping in
 * Payload was one file per route. This test proved that boundary was actually crossed somewhere,
 * because a lint rule forbidding an import nobody writes passes over an empty repository and a gate
 * that cannot fail is not evidence of anything.
 *
 * Spec 010 closed it. The home page's hero, band headings and About copy are the `home-page` global
 * now; a TypeScript constant has no locale, so the alternative was a page that stayed English in
 * Russian for ever. What is left of those fixtures is specimen props for Storybook, next to the
 * components they draw.
 *
 * So the gate flips: it no longer proves the deviation is contained, it proves the deviation is
 * gone. `eslint-rules/catalog-boundary.mjs` keeps `no-mock-imports` for the day somebody
 * reintroduces the directory — this is what would catch it being reintroduced and then read.
 */
const ROOT = resolve(import.meta.dirname, '../..')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

describe('the mock content boundary', () => {
  it('has no mock content directory left to guard', () => {
    expect(
      existsSync(resolve(ROOT, 'src/mocks')),
      'src/mocks is back — content the application serves belongs in Payload (Constitution I)',
    ).toBe(false)
  })

  it('is read by nothing under src/', () => {
    const readers = walk(resolve(ROOT, 'src'))
      .filter((file) => /\.tsx?$/.test(file))
      .filter((file) => /from '@\/mocks/.test(readFileSync(file, 'utf8')))
      .map((file) => file.slice(ROOT.length + 1))

    expect(readers, `these still read mock content: ${readers.join(', ')}`).toEqual([])
  })
})
