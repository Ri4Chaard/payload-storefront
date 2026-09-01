import config from '@payload-config'
import { cache } from 'react'
import { getPayload } from 'payload'

import type { AccountCopy } from '@/lib/auth/account-copy'

/**
 * The `account` global, read once per render pass (spec 004, research R11).
 *
 * Every customer-visible word in this feature comes from here rather than from JSX, so an editor
 * can change any of it without a deploy (Constitution I). The generated type is the canonical
 * shape — nothing hand-writes an interface mirroring it.
 *
 * Memoized with React's `cache` for the same reason the DAL is: an auth screen, its form and its
 * footer all want the copy, and that should be one read.
 *
 * Server-only by construction: it imports the Payload config. The pure half — the type and
 * `message` — lives in `account-copy.ts` so the forms can use it without dragging Payload into the
 * browser.
 */
export const getAccountCopy = cache(async (): Promise<AccountCopy> => {
  const payload = await getPayload({ config })
  return payload.findGlobal({ slug: 'account', overrideAccess: true })
})
