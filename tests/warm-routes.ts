/**
 * Compile every route once, before any test runs (003/T290).
 *
 * `next dev` compiles a route the first time it is requested. With five workers starting at once,
 * each pays that compilation for whichever route it happened to open first — and after the swap to
 * Payload those first hits also wait on Postgres. The cost lands inside tests, where it looks like
 * a hydration race: a slider pressed before the page is listening, a chip clicked before the
 * handler is attached. Three different tests failed that way on three different runs, each passing
 * alone in six seconds.
 *
 * Raising individual timeouts treats the symptom and makes it worse — a test that holds a worker
 * for twenty seconds starves the others. Warming pays the compilation ONCE, in serial, before the
 * clock starts on anything.
 */
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

/** One of each distinct route, not one of each URL: the compiler works per route, not per query. */
const ROUTES = [
  '/',
  '/all-products',
  '/category-1',
  '/products/paragon-emerald-cut-diamond-engagement-ring',
  // The account flow (004). Three specs and the a11y sweep all open these, so whichever worker gets
  // there first was paying the compilation inside an assertion.
  '/sign-in',
  '/create-account',
  '/verify-email?email=warm%40aurum-testing.dev',
  '/forgot-password',
  '/reset-password?email=warm%40aurum-testing.dev',
  // The blog (007). `blog.spec.ts` and the a11y sweep both open the index, and `blog.spec.ts` and
  // `blog-admin.spec.ts` both open an article — so without these, whichever worker arrived first
  // was paying the route compilation inside an assertion about a contents rail that had not been
  // hydrated yet.
  '/blog',
  '/blog/how-to-choose-the-perfect-diamond',
  // Contact and FAQ (008). `contact.spec.ts`, `contact-admin.spec.ts` and the a11y sweep all open
  // `/contact`; `faq.spec.ts` and the a11y sweep both open `/faq`. The contact form is the reason
  // this matters more here than elsewhere — a submit pressed before the route has hydrated fails as
  // a missing confirmation, which reads exactly like a broken action.
  '/contact',
  '/faq',
]

/**
 * **`/account` is not here, and cannot be.** `src/proxy.ts` redirects any request without a session
 * cookie, so an anonymous fetch compiles the REDIRECT and never the page — and it is the one route
 * two specs reach immediately after signing in. Warming it with a nonsense cookie was tried: the
 * proxy checks only that a cookie is PRESENT, so in principle the request should reach the route and
 * build it. In practice the timings could not be told apart from Turbopack's on-disk cache, so
 * whether it warmed anything is unproven, and an unverified mitigation carrying a confident comment
 * is worse than none. If the two sign-in assertions keep losing runs, this is the thread to pull.
 */

/**
 * Refuse to run against a server that is not this application.
 *
 * `playwright.config.ts` sets `reuseExistingServer` outside CI, which is right — starting a fresh
 * Next server for every run would be slow. But it reuses whatever is LISTENING, and port 3000 is
 * the default for most Node dev servers: another project of the author's took it twice during this
 * spec, and the suite dutifully tested that project instead. The failures looked like real
 * regressions — an accessibility audit of a page with no header — and cost an hour of hunting
 * before anyone thought to check what was answering.
 *
 * The marker is the site's own name, matched case-INSENSITIVELY. `Logo` writes the wordmark in
 * sentence case and uppercases it in CSS, deliberately — a screen reader given "AURUM" may spell
 * it out — so a check for the drawn capitals fails against the real site, which is how this guard
 * first reported a false alarm on a server that was perfectly fine.
 */
async function assertOurs() {
  let html: string
  try {
    html = await (await fetch(`${BASE}/`, { cache: 'no-store' })).text()
  } catch {
    return // Not up yet. Playwright's own `webServer` wait is what handles that.
  }

  if (/aurum/i.test(html)) return

  throw new Error(
    `${BASE} is serving something that is not Aurum.\n\n` +
      `Playwright reuses an existing server outside CI, and another application is on that port. ` +
      `Stop it, or point this run somewhere else:\n\n` +
      `  PORT=3100 PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e\n`,
  )
}

export default async function warmRoutes() {
  await assertOurs()

  for (const route of ROUTES) {
    try {
      await fetch(`${BASE}${route}`, { cache: 'no-store' })
    } catch {
      // The server may not be up yet in some runners; the suite's own waits still apply, and a
      // failure to warm is a slower run rather than a broken one.
    }
  }

}
