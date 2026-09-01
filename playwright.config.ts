import { defineConfig, devices } from '@playwright/test'

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
