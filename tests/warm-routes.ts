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
const ROUTES = ['/', '/all-jewelry', '/rings', '/products/paragon-emerald-cut-diamond-engagement-ring']

export default async function warmRoutes() {
  for (const route of ROUTES) {
    try {
      await fetch(`${BASE}${route}`, { cache: 'no-store' })
    } catch {
      // The server may not be up yet in some runners; the suite's own waits still apply, and a
      // failure to warm is a slower run rather than a broken one.
    }
  }
}
