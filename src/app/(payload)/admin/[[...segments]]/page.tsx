import type { Metadata } from 'next'
import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { redirect } from 'next/navigation'

import { getCustomer } from '@/lib/auth/dal'

import { importMap } from '../importMap.js'

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams })

/**
 * Payload's admin panel, with one addition: a signed-in CUSTOMER is sent to their own account
 * instead of into a dead end (spec 004).
 *
 * **The dead end is real, and it has no exit.** Payload names its session cookie from the config's
 * `cookiePrefix`, so both collections share `payload-token` — one session at a time, by design. A
 * customer who opens `/admin` therefore arrives with a valid session that is not an admin one, and
 * gets the Unauthorized view: "you don't have permission", and a Log out button.
 *
 * That button does nothing, and cannot. It renders `LogoutClient`, whose `useAuth().user` is null
 * for a session belonging to another collection — so the branch that would call `logOut()` is
 * skipped and it merely navigates to `/admin/login`, which sees a session, bounces back to
 * `/admin`, and shows Unauthorized again. The cookie is never cleared. From the customer's side
 * the button is broken; underneath, the admin has no way to end a session it does not own.
 *
 * So the fix is to never reach that screen. `getCustomer()` returns null for an admin session and
 * for no session at all, which is why this cannot lock an administrator out of their own panel —
 * it fires only when the cookie genuinely belongs to a customer. It is `cache`d, so the extra read
 * is one per request, and only on admin routes.
 */
const Page = async ({ params, searchParams }: Args) => {
  if (await getCustomer()) redirect('/account')

  return RootPage({ config, params, searchParams, importMap })
}

export default Page
