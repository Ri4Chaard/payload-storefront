import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

/**
 * The tests that need a database (003/T290).
 *
 * `tests/unit` must stay runnable on a laptop with nothing installed — that is what makes it the
 * gate people actually run before pushing. `catalog-queries.test.ts` stopped qualifying the moment
 * `queries.ts` began reading Payload: its subject is no longer a pure function over an array, it is
 * the seam between this repository and Postgres, and the only honest way to test that is against
 * one.
 *
 * Sixteen of the seventeen ran against Postgres unchanged. They were written to be about the RULES
 * that had to survive the swap rather than about fixture contents, and that framing is what let
 * them be pointed at a database without being rewritten — a better proof of the seam than anything
 * they assert individually.
 *
 * The seventeenth named `necklaces`, which passed because that is where the fixtures' sold-out
 * piece happened to sit. It now asks the whole catalogue: the rule was never about necklaces, and
 * an assertion that depends on which shelf is empty reports a filter bug when the only thing that
 * changed was a number in the admin.
 *
 * Environment comes from `.env` through Node's own loader rather than a new dependency, and is read
 * here rather than in a setup file so that a missing variable fails before any test reports. A
 * missing FILE is not an error: CI injects the values directly, and `env.ts` is what complains if
 * they are absent either way.
 */
try {
  process.loadEnvFile('.env')
} catch {
  // Already in the environment, or there is nothing to load. `env.ts` decides whether that is fatal.
}

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // See tests/stubs/server-only.ts — the real package throws outside a bundler context.
      'server-only': new URL('./tests/stubs/server-only.ts', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    reporters: 'default',
    // One worker: every test reads the same seeded catalogue, and Payload holds a database
    // connection pool that does not want to be forked once per file.
    fileParallelism: false,
    testTimeout: 30_000,
  },
})
