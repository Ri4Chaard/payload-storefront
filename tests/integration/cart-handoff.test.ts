import { describe, it } from 'vitest'

/**
 * Composing for whoever is at the keyboard — [messenger-handoff.md §3](../../specs/005-checkout-handoff/contracts/messenger-handoff.md). FR-029, FR-044, FR-046.
 *
 * Created empty by spec 005 T003 so that every later task writes into a file the runner already
 * knows about, and so `pnpm test:integration` stays green from the first commit of the feature. The
 * assertions land in T053 and T078.
 */
describe('cart handoff', () => {
  it.todo('never redirects an anonymous visitor, and writes no record anywhere')
})
