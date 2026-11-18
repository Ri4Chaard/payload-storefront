/**
 * Every UI-kit component must have stories.
 *
 * The style guide is only "living" if adding a component to the kit forces adding it to the guide.
 * Left to review, this is the rule people forget first — an undocumented kit gets bypassed and
 * duplicated within a week, which is precisely what Constitution II exists to prevent.
 */

import { readdirSync, statSync } from 'node:fs'
import { join, resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const KIT = resolve(root, 'src/components/ui')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return [full]
  })
}

let files: string[]
try {
  files = walk(KIT)
} catch {
  console.log('✓ No UI kit directory yet — nothing to check')
  process.exit(0)
}

const components = files.filter(
  (f) => f.endsWith('.tsx') && !f.endsWith('.stories.tsx') && !f.endsWith('.test.tsx'),
)
const stories = new Set(files.filter((f) => f.endsWith('.stories.tsx')))

const missing = components.filter(
  (component) => !stories.has(component.replace(/\.tsx$/, '.stories.tsx')),
)

if (missing.length > 0) {
  console.error('✗ UI kit components with no stories file:\n')
  for (const file of missing) {
    console.error(`  ${relative(root, file)}`)
    console.error(`    expected ${relative(root, file.replace(/\.tsx$/, '.stories.tsx'))}`)
  }
  console.error('\n  Every component ships with its stories in the SAME change.')
  process.exit(1)
}

console.log(`✓ ${components.length} UI kit component(s), all with stories`)
