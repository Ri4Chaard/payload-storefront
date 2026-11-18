import { describe, expect, it, vi } from 'vitest'

/**
 * next-intl's middleware reaches for `next/server`, which does not resolve outside a Next build.
 * Stubbed so this file can import the proxy for its `config` alone — the behaviour underneath is
 * proved against a real server in the e2e suite.
 */
vi.mock('next-intl/middleware', () => ({ default: () => () => undefined }))
vi.mock('next/server', () => ({ NextResponse: { redirect: () => undefined, next: () => undefined } }))

const { config } = await import('@/proxy')

/**
 * What the proxy is allowed to run on.
 *
 * The behaviour of the proxy itself is proved end to end in `tests/e2e/locale-routing.spec.ts`
 * against a real server, because a `NextRequest` faithful enough to drive next-intl's middleware is
 * most of a framework. What can be asserted cheaply — and what would break silently — is the
 * matcher: every exclusion in it is load-bearing, and a regression there is invisible until
 * something that should never have been touched starts redirecting.
 */
const matcher = config.matcher[0] ?? ''
const pattern = new RegExp(`^${matcher.replace('/:path*', '')}$`)

describe('the proxy matcher', () => {
  it('runs on every storefront page, in every language', () => {
    for (const path of ['/', '/all-products', '/ru', '/ru/legal/privacy', '/uk/products/x']) {
      expect(pattern.test(path)).toBe(true)
    }
  })

  it('never runs on anything Payload owns', () => {
    // A locale prefix on `/admin` or `/api` would break the admin panel and every REST consumer.
    for (const path of ['/api/users', '/api/graphql', '/admin', '/admin/collections/products']) {
      expect(pattern.test(path)).toBe(false)
    }
  })

  it('never runs on the cookie-reset handler', () => {
    // If the proxy acted on `/language/reset`, the redirect loop that route exists to break would
    // simply move into this file.
    expect(pattern.test('/language/reset')).toBe(false)
  })

  it('never runs on static assets or framework internals', () => {
    for (const path of ['/_next/static/chunk.js', '/icon.svg', '/sitemap.xml', '/apple-icon.png']) {
      expect(pattern.test(path)).toBe(false)
    }
  })
})
