import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { DEFAULT_LOCALE, LOCALES, routing, type Locale } from '@/i18n/routing'

/**
 * **`proxy.ts`, not `middleware.ts`** (spec 004, research R9; spec 010, research R3).
 *
 * Next.js 16 renamed Middleware to Proxy — "the functionality remains the same", but the filename
 * does not: a `middleware.ts` in this project would sit there and never run, and the failure is
 * silent. Verified in the bundled docs rather than trusted from recall, which is why `AGENTS.md`
 * insists on reading them.
 *
 * Two jobs now live here, in this order:
 *
 * 1. **The account guard** (spec 004). A courtesy, not a security boundary: it checks for the
 *    presence of a cookie and nothing else — no database read, no signature check. A forged or
 *    expired cookie passes this file and is refused by `src/lib/auth/dal.ts`, which is where FR-015
 *    is actually met. Next's own guidance says Proxy runs on every route including prefetches, so
 *    its checks must stay optimistic and it "should not be used as a full session management or
 *    authorization solution".
 * 2. **Locale routing** (spec 010). next-intl resolves the prefix; the remembered-choice rule below
 *    is ours, because the library's own detection is off.
 *
 * **No Payload import, no database read.** Next's proxy documentation says this file "should not
 * attempt relying on shared modules or globals", and it is deployed to a CDN edge in optimised
 * cases. Which languages are *offered* is therefore decided in the render — see the layout — and
 * never here. That constraint is the reason `/language/reset` exists.
 */

/** Payload's session cookie. `payload` is the default `cookiePrefix`; the suffix is fixed. */
const SESSION_COOKIE = 'payload-token'

const handleLocale = createMiddleware(routing)

/**
 * Split `/ru/account/orders` into its prefix and the path underneath it.
 *
 * The prefix is optional by design (`localePrefix: 'as-needed'`), so an English path returns the
 * default locale and itself — which is what lets every rule below be written once instead of twice.
 */
function splitLocale(pathname: string): { locale: Locale; path: string; prefixed: boolean } {
  const [, head = '', ...tail] = pathname.split('/')
  if ((LOCALES as readonly string[]).includes(head)) {
    return { locale: head as Locale, path: `/${tail.join('/')}`, prefixed: true }
  }
  return { locale: DEFAULT_LOCALE, path: pathname, prefixed: false }
}

/** `/account` under whichever language the visitor is reading. */
function localeHref(locale: Locale, path: string): string {
  return locale === DEFAULT_LOCALE ? path : `/${locale}${path}`
}

export function proxy(request: NextRequest): NextResponse {
  const { locale, path } = splitLocale(request.nextUrl.pathname)

  /*
    The account guard, made locale-aware (spec 010, T016a). Before this feature it matched
    `/account/:path*` and redirected to a hardcoded `/sign-in`; a Russian visitor clicking "account"
    would have been bounced onto the English sign-in page, which is a language switch nobody asked
    for.
  */
  if (path === '/account' || path.startsWith('/account/')) {
    if (!request.cookies.has(SESSION_COOKIE)) {
      const signIn = new URL(localeHref(locale, '/sign-in'), request.nextUrl)
      // Carried so signing in returns them to the page they asked for. Read back in the sign-in
      // action, which validates it as a same-origin relative path before using it — an unchecked
      // `next` is how a sign-in form becomes an open redirect.
      signIn.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
      return NextResponse.redirect(signIn)
    }
  }

  return handleLocale(request)
}

/**
 * Every page request, and nothing Payload owns.
 *
 * `api` and `admin` are Payload's route groups and must never gain a prefix; `language` is the
 * cookie-reset handler, which has to be reachable without the proxy acting on it or the loop it
 * exists to break would simply move here.
 */
export const config = {
  matcher: ['/((?!api|admin|_next|_vercel|language|.*\\..*).*)'],
}
