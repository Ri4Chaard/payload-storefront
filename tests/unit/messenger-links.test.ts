import { describe, it } from 'vitest'

/**
 * Identifier plus text becomes a URL — [messenger-handoff.md §2](../../specs/005-checkout-handoff/contracts/messenger-handoff.md). FR-022.
 *
 * Created empty by spec 005 T003 so that every later task writes into a file the runner already
 * knows about, and so `pnpm test` stays green from the first commit of the feature. The
 * assertions land in T041.
 */
describe('buildLink', () => {
  it.todo('builds the verified wa.me, t.me and ig.me forms, and flags the one that cannot carry text')
})
