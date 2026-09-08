import { describe, it } from 'vitest'

/**
 * The seller's destinations, and what the admin refuses to save — [messenger-handoff.md §4](../../specs/005-checkout-handoff/contracts/messenger-handoff.md). FR-034, FR-037, FR-039 to FR-041, SC-012.
 *
 * Created empty by spec 005 T003 so that every later task writes into a file the runner already
 * knows about, and so `pnpm test:integration` stays green from the first commit of the feature. The
 * assertions land in T042.
 */
describe('contact settings', () => {
  it.todo('refuses an enabled messenger that leads nowhere, naming the field')
})
