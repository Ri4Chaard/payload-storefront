/**
 * Every path in the repository is kebab-case.
 *
 * One convention, no per-directory dialect: `button.tsx`, not `Button.tsx`; `check-naming.ts`, not
 * `checkNaming.ts`. The reason it is a gate rather than a note in a README is that filename casing
 * is invisible on macOS — its filesystem is case-insensitive, so `import './Button'` resolves
 * against `button.tsx` locally and fails only once CI runs on Linux. That is a class of bug nobody
 * catches by reading a diff.
 *
 * Exported identifiers are NOT affected. React components stay PascalCase; this is about paths.
 *
 * ESLint cannot host this rule — it lints TypeScript, and "everywhere" has to include the SVG
 * assets, the stylesheets, and the docs.
 */

import { execFileSync } from 'node:child_process'
import { basename } from 'node:path'

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Uppercase by universal convention — renaming these would break tooling that looks for them. */
const ALLOWED_FILES = new Set([
  'README.md',
  'LICENSE',
  'AGENTS.md',
  'CLAUDE.md',
  'MEMORY.md',
  'SKILL.md',
])

/** Vendored or generated — we do not own the naming. */
const IGNORED_PREFIXES = [
  '.claude/', // Spec Kit command definitions
  '.specify/', // Spec Kit templates and memory
  'migrations/', // emitted by `payload migrate:create`
  'src/app/(payload)/admin/importMap.js', // emitted by Payload
  'src/payload-types.ts', // emitted by `payload generate:types`
]

/**
 * Next.js encodes routing in directory names: `(group)`, `[param]`, `[...rest]`, `[[...optional]]`.
 * The brackets are framework syntax, so they are unwrapped before the name inside them is checked.
 */
function unwrapSegment(segment: string): string {
  return segment.replace(/^\(|\)$/g, '').replace(/^\[+\.{0,3}|\]+$/g, '')
}

function checkSegment(segment: string): boolean {
  if (segment.startsWith('.')) return true // .github, .storybook, .env.example
  return KEBAB.test(unwrapSegment(segment))
}

/**
 * `button.stories.tsx` is a stem plus qualifiers plus an extension. Each dot-separated part is
 * checked, so `Button.stories.tsx` and `button.Stories.tsx` both fail.
 */
function checkFilename(name: string): boolean {
  if (ALLOWED_FILES.has(name)) return true
  if (name.startsWith('.')) return true
  return name.split('.').every((part) => KEBAB.test(part))
}

// Tracked plus untracked-but-not-ignored: exactly the files the repository is responsible for.
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)
  .filter((file) => !IGNORED_PREFIXES.some((prefix) => file.startsWith(prefix)))

const violations: { file: string; reason: string }[] = []

for (const file of files) {
  const segments = file.split('/')
  const name = basename(file)

  for (const segment of segments.slice(0, -1)) {
    if (!checkSegment(segment)) {
      violations.push({ file, reason: `directory "${segment}" is not kebab-case` })
      break
    }
  }
  if (!checkFilename(name)) {
    violations.push({ file, reason: `filename "${name}" is not kebab-case` })
  }
}

if (violations.length > 0) {
  console.error(`✗ ${violations.length} path(s) are not kebab-case:\n`)
  for (const { file, reason } of violations) {
    console.error(`  ${file}\n    ${reason}`)
  }
  console.error('\n  Rename with `git mv` so history follows. On macOS a case-only rename needs')
  console.error('  two steps — the filesystem is case-insensitive and will silently no-op.')
  process.exit(1)
}

console.log(`✓ ${files.length} paths, all kebab-case`)
