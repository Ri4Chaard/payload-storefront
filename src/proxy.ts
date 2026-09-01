import { NextResponse, type NextRequest } from 'next/server'

/**
 * **`proxy.ts`, not `middleware.ts`** (spec 004, research R9).
 *
 * Next.js 16 renamed Middleware to Proxy — "the functionality remains the same", but the filename
 * does not: a `middleware.ts` in this project would sit there and never run, and the failure is
 * silent. Verified in `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`, which is
 * why `AGENTS.md` insists on reading the bundled docs rather than trusting recall.
 *
 * **This is a courtesy, not a security boundary.** It exists so an anonymous visitor who clicks
 * "account" is sent to sign-in instead of rendering a profile shell that will resolve to nothing.
 * It checks for the presence of a cookie and nothing else: no database read, no signature check.
 * Next's own guidance is explicit that Proxy runs on every route including prefetches, that its
 * checks must therefore stay optimistic, and that it "should not be used as a full session
 * management or authorization solution".
 *
 * A forged or expired cookie passes this file and is refused by `src/lib/auth/dal.ts`, which is
 * where FR-015 is actually met.
 */

/** Payload's session cookie. `payload` is the default `cookiePrefix`; the suffix is fixed. */
const SESSION_COOKIE = 'payload-token'

export function proxy(request: NextRequest): NextResponse {
  const hasSession = request.cookies.has(SESSION_COOKIE)
  if (hasSession) return NextResponse.next()

  const signIn = new URL('/sign-in', request.nextUrl)
  // Carried so signing in returns them to the page they asked for. Read back in the sign-in action,
  // which validates it as a same-origin relative path before using it — an unchecked `next` is how
  // a sign-in form becomes an open redirect.
  signIn.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)

  return NextResponse.redirect(signIn)
}

export const config = {
  matcher: '/account/:path*',
}
