import config from '@payload-config'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import { generateExpiredPayloadCookie, generatePayloadCookie } from 'payload/shared'

/**
 * Putting a customer into a session, and taking them out of one.
 *
 * Payload's REST login sets its own cookie on the response it controls. A Server Action does not go
 * through that path, so the token has to be turned into a cookie here — but with Payload's own
 * helper rather than a hand-rolled `Set-Cookie`, so the name, prefix, `httpOnly`, `sameSite` and
 * expiry all come from the collection's auth config. Writing those by hand is how a 30-day session
 * quietly becomes a session cookie that dies with the tab.
 */

async function authConfig() {
  const payload = await getPayload({ config })
  const collection = payload.collections.customers
  return {
    collectionAuthConfig: collection.config.auth,
    cookiePrefix: payload.config.cookiePrefix,
  }
}

/** Signs the customer in for real: the cookie the DAL and the proxy both read afterwards. */
export async function establishSession(token: string): Promise<void> {
  const { collectionAuthConfig, cookiePrefix } = await authConfig()

  const cookie = generatePayloadCookie({
    collectionAuthConfig,
    cookiePrefix,
    returnCookieAsObject: true,
    token,
  })

  const store = await cookies()
  store.set(cookie.name, cookie.value ?? '', {
    domain: cookie.domain,
    expires: cookie.expires ? new Date(cookie.expires) : undefined,
    httpOnly: cookie.httpOnly,
    path: cookie.path,
    sameSite: cookie.sameSite?.toLowerCase() as 'lax' | 'none' | 'strict' | undefined,
    secure: cookie.secure,
  })
}

/**
 * Ends it immediately.
 *
 * An expired cookie rather than a deletion, which is what `generateExpiredPayloadCookie` is for:
 * the two are equivalent to a compliant browser, and the explicit expiry is the form that survives
 * an intermediate cache deciding to keep a response with no `Set-Cookie` in it.
 */
export async function clearSession(): Promise<void> {
  const { collectionAuthConfig, cookiePrefix } = await authConfig()

  const cookie = generateExpiredPayloadCookie({
    collectionAuthConfig,
    cookiePrefix,
    returnCookieAsObject: true,
  })

  const store = await cookies()
  store.set(cookie.name, '', {
    domain: cookie.domain,
    expires: new Date(0),
    httpOnly: cookie.httpOnly,
    path: cookie.path,
    sameSite: cookie.sameSite?.toLowerCase() as 'lax' | 'none' | 'strict' | undefined,
    secure: cookie.secure,
  })
}
