import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The mock boundary (002/T135, SC-008; narrowed by 003/T236).
 *
 * Content comes from `src/mocks/` rather than Payload, which is a recorded deviation from
 * Constitution I. What makes it a *staged* deviation rather than a permanent one is that only the
 * catalogue's `queries.ts` and the route-level loaders may read it: swapping in a Payload query is
 * then one file, and no component changes.
 *
 * **The offender half of this test moved to ESLint** — `catalog/no-mock-imports` in
 * `eslint-rules/catalog-boundary.mjs`. A linter reports at the import, in the editor, while the
 * line is being typed, which is strictly better than a test naming a path after the fact. What a
 * linter structurally CANNOT do is what is left here: assert that the boundary is crossed
 * somewhere. A rule that forbids an import nobody writes passes over an empty repository, and a
 * gate that cannot fail is not evidence of anything.
 */
const ROOT = resolve(import.meta.dirname, '../..')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

describe('the mock content boundary', () => {
  it('is actually crossed, or the lint rule guards nothing', () => {
    const readers = [
      ...walk(resolve(ROOT, 'src/app')),
      resolve(ROOT, 'src/lib/catalog/queries.ts'),
    ]
      .filter((file) => /\.tsx?$/.test(file))
      .filter((file) => /from '@\/mocks/.test(readFileSync(file, 'utf8')))

    expect(
      readers.length,
      'nothing reads mock content — catalog/no-mock-imports is vacuously satisfied',
    ).toBeGreaterThan(0)
  })
})
