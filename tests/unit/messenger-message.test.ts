import { describe, it } from 'vitest'

/**
 * The cart becomes text — [messenger-handoff.md §3](../../specs/005-checkout-handoff/contracts/messenger-handoff.md). FR-022, FR-026, FR-028, FR-028a, FR-043 to FR-045.
 *
 * Created empty by spec 005 T003 so that every later task writes into a file the runner already
 * knows about, and so `pnpm test` stays green from the first commit of the feature. The
 * assertions land in T052 and T067.
 */
describe('composeMessage', () => {
  it.todo('names every piece, carries the customer block when there is one, and budgets the ENCODED link')
})
