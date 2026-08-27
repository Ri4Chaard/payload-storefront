import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The mock boundary (002/T135, SC-008).
 *
 * Content comes from `src/mocks/` rather than Payload, which is a recorded deviation from
 * Constitution I. What makes it a *staged* deviation rather than a permanent one is that route-level
 * loaders are the only thing allowed to read from it: swapping in a Payload query is then one file
 * per route, and no component changes.
 *
 * That rule is worth exactly as much as its enforcement. A single `import { homeContent }` inside a
 * section would convert the swap into a rewrite, and it would look completely reasonable in review —
 * which is why this is a test and not a convention.
 */
const ROOT = resolve(import.meta.dirname, '../..')
const SRC = resolve(ROOT, 'src')

/** Route-level loaders. These are the files whose whole job is to fetch and pass down. */
const ALLOWED = [/^src\/app\//, /^src\/mocks\//]

/** Stories are documentation, not shipped code — using real content there is the point of them. */
const EXEMPT = /\.stories\.tsx$/

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

describe('the mock content boundary', () => {
  it('is crossed only by route-level loaders', () => {
    const offenders = walk(SRC)
      .filter((file) => /\.tsx?$/.test(file))
      .map((file) => relative(ROOT, file))
      .filter((file) => !ALLOWED.some((pattern) => pattern.test(file)))
      .filter((file) => !EXEMPT.test(file))
      .filter((file) => /from '@\/mocks|from '.*\/mocks/.test(readFileSync(join(ROOT, file), 'utf8')))

    expect(
      offenders,
      `these import mock content directly, which turns the Payload swap from one file into a rewrite:\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it('is actually crossed somewhere, or the rule is vacuous', () => {
    const readers = walk(resolve(SRC, 'app'))
      .filter((file) => /\.tsx?$/.test(file))
      .filter((file) => /from '@\/mocks/.test(readFileSync(file, 'utf8')))

    expect(readers.length, 'no route reads mock content — this test proves nothing').toBeGreaterThan(
      0,
    )
  })
})
