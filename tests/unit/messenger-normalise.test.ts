import { describe, it } from 'vitest'

/**
 * What an owner types becomes what we store — [messenger-handoff.md §1](../../specs/005-checkout-handoff/contracts/messenger-handoff.md). FR-035, FR-036.
 *
 * Created empty by spec 005 T003 so that every later task writes into a file the runner already
 * knows about, and so `pnpm test` stays green from the first commit of the feature. The
 * assertions land in T040.
 */
describe('normaliseDestination', () => {
  it.todo('reduces `+1 (555) 010 20-30` to the digits wa.me requires')
})
