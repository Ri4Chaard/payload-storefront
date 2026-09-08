import { describe, it } from 'vitest'

/**
 * Revalidation against the live catalogue — [cart-loader.md §4](../../specs/005-checkout-handoff/contracts/cart-loader.md). FR-014.
 *
 * Created empty by spec 005 T003 so that every later task writes into a file the runner already
 * knows about, and so `pnpm test:integration` stays green from the first commit of the feature. The
 * assertions land in T027.
 */
describe('cart loader', () => {
  it.todo('classifies the four issue kinds without ever letting a line vanish silently')
})
