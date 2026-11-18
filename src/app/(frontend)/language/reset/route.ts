import { NextResponse, type NextRequest } from 'next/server'

import { LOCALE_COOKIE } from '@/i18n/routing'

/**
 * Forgetting a language the site no longer offers.
 *
 * **This route exists to break a redirect loop, and the loop is worth stating.** A visitor who chose
 * Ukrainian holds `NEXT_LOCALE=uk`. The owner switches Ukrainian off. The visitor returns to `/`;
 * `src/proxy.ts` honours the cookie and redirects to `/uk`; the layout finds Ukrainian is no longer
 * offered and redirects back to `/`; the proxy redirects to `/uk` again. Forever.
 *
 * Something has to clear the cookie, and only two places can: the proxy, which must not read the
 * database to know a language is disabled, and a Route Handler. This is the Route Handler.
 *
 * It is reached only from the layout's guard, it is excluded from the proxy's matcher, and it runs
 * at most once per visitor per disabled language — after it, the cookie is gone and the ordinary
 * path applies.
 */
export function GET(request: NextRequest): NextResponse {
  const next = request.nextUrl.searchParams.get('next') ?? '/'

  /*
    Validated as a site-relative path before being used. `next` arrives in a URL, so it is the
    visitor's to set — and an unchecked one turns this into an open redirect. The same rule the
    sign-in action applies to its own `next`, for the same reason. `//evil.example` is the case a
    naive `startsWith('/')` misses.
  */
  const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/'

  const response = NextResponse.redirect(new URL(safe, request.nextUrl))
  response.cookies.delete(LOCALE_COOKIE)
  return response
}
