/**
 * Gzipped initial JS per route, measured against a running production server.
 *
 * Constitution V requires the figure be measured this way rather than read from a build log:
 * Next 16 with Turbopack no longer prints per-route JS, and what matters is what the browser
 * fetches before the load event, gzipped as served.
 *
 * Usage: pnpm measure:js http://localhost:3000 / /all-jewelry /faq
 */
import { gzipSync } from 'node:zlib'

const [base, ...routes] = process.argv.slice(2)

/** Every /_next/static/**.js the document references — script tags and the flight payload alike. */
function scriptUrls(html: string): string[] {
  const found = new Set<string>()
  for (const m of html.matchAll(/\/_next\/static\/[^"'\\\s)]+?\.js/g)) found.add(m[0])
  return [...found]
}

const sizes = new Map<string, number>()

async function gzippedSize(url: string): Promise<number> {
  const cached = sizes.get(url)
  if (cached !== undefined) return cached
  const res = await fetch(base + url)
  if (!res.ok) return 0
  const body = Buffer.from(await res.arrayBuffer())
  // Gzip locally at default level rather than trusting the dev server's content-encoding, so the
  // number is comparable across runs and does not depend on how this server was configured.
  const size = gzipSync(body).length
  sizes.set(url, size)
  return size
}

const rows: { route: string; status: number; chunks: number; kb: string }[] = []
for (const route of routes) {
  const res = await fetch(base + route)
  const html = await res.text()
  const urls = scriptUrls(html)
  let total = 0
  for (const url of urls) total += await gzippedSize(url)
  rows.push({ route, status: res.status, chunks: urls.length, kb: (total / 1024).toFixed(1) })
}

console.table(rows)
