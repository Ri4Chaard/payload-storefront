import { defineConfig, devices } from '@playwright/test'

/**
 * Environment, read the same way `vitest.integration.config.ts` reads it and for the same reason.
 *
 * Since spec 004 an e2e spec imports server modules — the registration journey mints a verification
 * code through the Local API, because the stored code is a keyed hash and cannot be read back. That
 * pulls in `src/env.ts`, which refuses to load without the database and mail variables.
 *
 * A missing FILE is not an error: CI injects the values directly, and `env.ts` is what complains if
 * they are absent either way.
 */
try {
  process.loadEnvFile('.env')
} catch {
  // Already in the environment, or there is nothing to load.
}

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const STORYBOOK_URL = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

export default defineConfig({
  testDir: './tests',
  // Compiles every route once, in serial, before the clock starts on any test. See the file for
  // why this is the fix rather than longer per-test timeouts.
  globalSetup: './tests/warm-routes.ts',
  fullyParallel: true,
  /**
   * Fewer workers than the default `cpus / 2`, since 003/T290.
   *
   * The storefront now reads Postgres on every request, and `next dev` compiles a route the first
   * time it is asked for. Five workers hitting a single dev server put ordinary assertions over the
   * 5s budget — a chip clicked, a slider pressed, a link followed — and the failures moved between
   * tests from run to run, which is the signature of contention rather than of a bug. Every one of
   * them passes alone in three to nine seconds.
   *
   * Raising individual timeouts was tried first and made it worse: a test holding a worker for
   * twenty seconds starves the rest. The server is the scarce resource, so the fix is to ask less
   * of it at once. `tests/warm-routes.ts` pays the compilation up front for the same reason.
   */
  workers: process.env.CI ? 2 : 3,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  /**
   * Ten seconds rather than five, since 003/T290.
   *
   * Every storefront navigation now renders from Postgres, so the wait an assertion is really
   * making — for a page to arrive — grew for the whole suite at once. The failures moved between
   * tests from run to run and each passed alone in three to nine seconds, which is latency rather
   * than a bug; the previous budget was set when pages came from an array in memory.
   *
   * Raised here rather than test by test on purpose. A per-test timeout says "this assertion is
   * special", and none of them is — three different tests had already been patched individually
   * before it was clear they were all measuring the same thing.
   */
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'a11y',
      testDir: './tests/a11y',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Asserts stories RENDER, not merely that Storybook builds. Those are different guarantees —
      // see tests/stories/foundations.spec.ts for the bug that proved it.
      name: 'stories',
      testDir: './tests/stories',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm dev',
      url: BASE_URL,
      /**
       * The registration and password-reset specs drive real Payload auth operations, which send
       * through the configured email adapter. Without this the suite spends a live Resend quota on
       * every run and starts failing — as "no code was issued" rather than as a rate limit — the
       * day it runs out. See `src/lib/email/log-adapter.ts`.
       *
       * **`reuseExistingServer` means a dev server already running WITHOUT this variable is used as
       * it is**, and Next 16 refuses to start a second dev server for the same project, so there is
       * no way for this to override one that is already up. A local run against an ordinary
       * `pnpm dev` therefore still sends — and once the daily quota is spent, registration itself
       * starts failing, because Payload sends the verification email inside the create transaction.
       * The failures then read as "no code was issued".
       *
       * Before a local suite run, either stop the dev server and let this start its own, or start
       * it as `EMAIL_TRANSPORT=log pnpm dev`. CI always starts its own.
       */
      env: { ...process.env, EMAIL_TRANSPORT: 'log' },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm storybook',
      url: STORYBOOK_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
