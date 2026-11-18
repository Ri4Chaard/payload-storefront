/**
 * Fails when the committed token file is stale.
 *
 * The generated CSS is committed so the build never depends on the generator running. That is only
 * safe if the commit is guaranteed to match its source — which is what this check guarantees.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const target = resolve(here, '../src/styles/tokens.css')

const committed = readFileSync(target, 'utf8')
const backup = mkdtempSync(join(tmpdir(), 'tokens-'))
const stash = join(backup, 'tokens.css')
writeFileSync(stash, committed, 'utf8')

try {
  execFileSync('node', ['--import', 'tsx', resolve(here, 'build-tokens.ts')], { stdio: 'pipe' })
  const regenerated = readFileSync(target, 'utf8')

  if (regenerated !== committed) {
    writeFileSync(target, committed, 'utf8')
    console.error('✗ src/styles/tokens.css is stale.')
    console.error('  It does not match design/tokens/. Run `pnpm build:tokens` and commit the result.')
    console.error('  Never hand-edit the generated file.')
    process.exit(1)
  }

  console.log('✓ src/styles/tokens.css matches its source')
} finally {
  rmSync(backup, { recursive: true, force: true })
}
