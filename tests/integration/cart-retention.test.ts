import { describe, it } from 'vitest'

/**
 * How long a cart is kept, and how it is erased — [data-model.md §4a](../../specs/005-checkout-handoff/data-model.md). FR-047 to FR-049, SC-014.
 *
 * Created empty by spec 005 T003 so that every later task writes into a file the runner already
 * knows about, and so `pnpm test:integration` stays green from the first commit of the feature. The
 * assertions land in T077.
 */
describe('cart retention', () => {
  it.todo('expires a cart on a clock the test controls, never by waiting')
})
