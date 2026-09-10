/**
 * The two boundaries that keep the mock deviation to one file (003/T236, contract §7).
 *
 * Both are Constitution I, enforced by the system rather than by review. Neither violation looks
 * wrong in a diff — `import { productFixtures } from '@/mocks/catalog'` inside a section, or
 * `import type { Product } from '@/payload-types'` inside a card, are each one plausible line that
 * quietly converts spec 004 from a one-file swap into a rewrite. That is precisely why they are
 * rules and not conventions.
 *
 * A note on `pnpm test` vs `pnpm lint`: `tests/unit/mocks-boundary.test.ts` still exists and now
 * asserts only the thing a linter structurally cannot — that the boundary is crossed SOMEWHERE, so
 * the rule is not vacuously true over a codebase that reads no content at all.
 */

import path from 'node:path'

/** Absolute path → repo-relative, forward slashes, so the patterns below read the same on Windows. */
function repoPath(context) {
  const filename = context.filename ?? context.getFilename()
  return path.relative(context.cwd, filename).split(path.sep).join('/')
}

function isAllowed(file, patterns) {
  return patterns.some((pattern) => (pattern instanceof RegExp ? pattern.test(file) : file === pattern))
}

/** Every syntax that pulls a module in, including the re-export a barrel file uses. */
function sourceVisitor(check) {
  const visit = (node) => {
    if (node.source?.value) check(node, node.source.value)
  }
  return {
    ImportDeclaration: visit,
    ExportNamedDeclaration: visit,
    ExportAllDeclaration: visit,
    ImportExpression(node) {
      if (node.source?.type === 'Literal') check(node, node.source.value)
    },
  }
}

const MOCKS = /(^|\/)mocks(\/|$)/
const PAYLOAD_TYPES = /(^|\/)payload-types$/

/**
 * **Tightened by 003/T293.** Two entries left when the storefront swapped to Payload:
 *
 * - `src/lib/catalog/queries.ts` no longer reads fixtures at all, so its licence is revoked. The
 *   module that WAS the deviation is now the module that ended it.
 * - `src/app/**` narrowed to the single file that still needs it. Spec 002 licensed the whole tree
 *   because the home page reads `@/mocks` directly; every route added since — the listing, the
 *   category pages, the product page — is now forbidden from doing the same, which is the half of
 *   the rule that was doing nothing while a wildcard covered it.
 *
 * The home page cannot be swapped here: its hero, about band and featured row are not modelled in
 * Payload at all, and modelling them is a later spec's work. Naming the one file is what stops that
 * from being forgotten — a wildcard hides how much is left, a path says exactly.
 *
 * Stories are exempt because using real content in the style guide is the point of a style guide.
 */
const MOCK_READERS = [
  /^src\/mocks\//,
  'src/app/(frontend)/page.tsx',
  /\.stories\.tsx$/,
  // Testing a mapper means handing it a document, and a fixture IS a document.
  /^tests\//,
]

/**
 * The generated document types belong to the tiers that MODEL content and the one that reads it.
 * Everything else — every component, every storefront route — sees the view models in
 * `src/lib/catalog/types.ts`, which is what makes those two tiers swappable independently.
 *
 * The Payload-side allowances are listed ahead of needing them. A collection hook typed with
 * `Product` is correct code, and a rule that fires on it is a rule people disable.
 */
const DOCUMENT_TYPE_READERS = [
  /^src\/lib\/catalog\//,
  // The story page's data tier (006/T020-T022). Same job as `lib/catalog/` for a different
  // subject: it is where documents become view models, so it is where documents are allowed.
  /^src\/lib\/story\//,
  /^src\/mocks\//,
  /^src\/collections\//,
  /^src\/fields\//,
  /^src\/globals\//,
  // Block definitions (006/T008-T014) are modelling code, exactly like `collections/` and
  // `globals/` above — they describe documents rather than rendering them.
  /^src\/blocks\//,
  /^src\/hooks\//,
  /^src\/app\/\(payload\)\//,
  'src/payload.config.ts',
  /^scripts\//,
  /^tests\//,
]

export default {
  rules: {
    'no-mock-imports': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Mock content is read by the catalogue data layer and by route loaders, nowhere else.',
        },
        schema: [],
      },
      create(context) {
        const file = repoPath(context)
        if (isAllowed(file, MOCK_READERS)) return {}

        return sourceVisitor((node, source) => {
          if (!MOCKS.test(source)) return
          context.report({
            node,
            message:
              'Mock content belongs behind src/lib/catalog/queries.ts. Importing it here hardcodes ' +
              'the content and turns the swap to Payload from one file into a rewrite (Constitution I).',
          })
        })
      },
    },

    'no-document-types': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Generated collection types stay in the data layer; components see view models.',
        },
        schema: [],
      },
      create(context) {
        const file = repoPath(context)
        if (isAllowed(file, DOCUMENT_TYPE_READERS)) return {}

        return sourceVisitor((node, source) => {
          if (!PAYLOAD_TYPES.test(source)) return
          context.report({
            node,
            message:
              'payload-types describes DOCUMENTS — drafts, inventory counts, unresolved ' +
              'relationships. Import a view model from @/lib/catalog/types instead, so this file ' +
              'cannot render a draft or decide availability for itself (contract §2).',
          })
        })
      },
    },
  },
}
