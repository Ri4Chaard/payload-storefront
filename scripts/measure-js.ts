/**
 * Gzipped initial JavaScript per route, measured from a real browser.
 *
 * Constitution V requires this figure be measured against a running production server rather than
 * read from a build log: Next 16 with Turbopack no longer prints per-route JS, and what matters is
 * what the browser fetches before the load event, gzipped as served.
 *
 * **It drives a browser rather than scraping the HTML, and that correction matters.** An earlier
 * version of this script collected every `/_next/static/**.js` URL it could find in the server
 * markup. That silently undercounts: a client component reached through the RSC flight payload is
 * requested by the client runtime through a manifest, and its chunk URL never appears in the
 * document at all. Measured that way, the cookie banner looked like it cost nothing on every route
 * — which was flattering and wrong.
 *
 * Usage:
 *   pnpm measure:js http://localhost:3000 / /all-jewelry /legal/privacy
 */

import { gzipSync } from 'node:zlib'
import { chromium } from '@playwright/test'

const [base, ...routes] = process.argv.slice(2)

if (!base || routes.length === 0) {
  console.error('Usage: pnpm measure:js <origin> <route> [route...]')
  process.exit(1)
}

const browser = await chromium.launch()
const rows: { route: string; requests: number; kb: string }[] = []

for (const route of routes) {
  // A fresh context per route: a warm HTTP cache would report the second route as nearly free.
  const context = await browser.newContext()
  const page = await context.newPage()

  const seen = new Map<string, number>()
  /*
    The response handler is async, so its work has to be tracked and awaited — otherwise the totals
    are read while bodies are still being fetched. The symptom is distinctive and worth recognising:
    every route reports an identical figure, because only the handful of handlers that happened to
    finish first got counted.
  */
  const pending: Promise<void>[] = []

  page.on('response', (response) => {
    const url = response.url()
    if (!url.includes('/_next/static/') || !url.endsWith('.js')) return
    if (seen.has(url)) return

    pending.push(
      response
        .body()
        // Gzipped locally at the default level so the number is comparable across runs and does not
        // depend on how this particular server was configured to compress.
        .then((body) => void seen.set(url, gzipSync(body).length))
        // A response whose body is gone by the time it is asked for. Rare, and skipping one is
        // better than failing the whole measurement.
        .catch(() => undefined),
    )
  })

  await page.goto(base + route, { waitUntil: 'load' })
  // The flight payload resolves client components after load; give the runtime a moment to request
  // their chunks, or they are missed exactly the way the old HTML-scraping version missed them.
  await page.waitForLoadState('networkidle')

  await Promise.all(pending)

  const total = [...seen.values()].reduce((sum, size) => sum + size, 0)
  rows.push({ route, requests: seen.size, kb: (total / 1024).toFixed(1) })

  await context.close()
}

await browser.close()
console.table(rows)
