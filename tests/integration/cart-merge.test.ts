import { describe, it } from 'vitest'

/**
 * A guest cart meeting an account cart at sign-in — [cart-actions.md §5](../../specs/005-checkout-handoff/contracts/cart-actions.md). FR-005.
 *
 * Created empty by spec 005 T003 so that every later task writes into a file the runner already
 * knows about, and so `pnpm test:integration` stays green from the first commit of the feature. The
 * assertions land in T016.
 */
describe('cart merge', () => {
  it.todo('keeps both sizes, sums only true matches, and drops nothing from either side')
})
