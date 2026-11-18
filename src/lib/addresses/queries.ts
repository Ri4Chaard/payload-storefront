import config from '@payload-config'
import { cache } from 'react'
import { getPayload } from 'payload'

import type { CustomerAddress } from '@/lib/addresses/types'
import { requireCustomerUser } from '@/lib/auth/dal'

/**
 * Reading a customer's saved delivery addresses.
 *
 * **Server only.** It imports `@payload-config`; a `'use client'` module that reaches it pulls the
 * entire Payload configuration into the browser bundle, where it fails on Node built-ins with an
 * error that names `file-type` rather than anything in this repository. The shape and the formatter
 * live in `./types.ts` precisely so a component never needs this file.
 *
 * The write side lives in `src/lib/auth/actions.ts`; this is only the read, and it is separate for
 * the same reason `dal.ts` is separate from the actions — a Server Component may call this, and
 * nothing that renders may call a `'use server'` module without pulling every one of its exported
 * endpoints along with it.
 *
 * **The query runs AS the customer**, with `overrideAccess: false` and their own user. The
 * collection's `isDocumentOwner` rule then turns into a `where` clause on `customer`, so one
 * customer's addresses are not filtered out of another's results — they were never in the result
 * set. FR-032 is a property of the query rather than of the code that reads it, which is the only
 * version of that guarantee that survives someone editing this file.
 *
 * **Not sorted default-first**, which was the first instinct and is wrong: marking a different
 * address as the default would then reorder the list under the cursor that just clicked it. The
 * order is stable and the default is marked in place.
 *
 * The limit is a real bound rather than a guess at generosity. A customer with fifty delivery
 * addresses is a data-entry accident, and an unbounded `find` on a relationship a customer controls
 * is how one account makes the profile page slow for everybody who shares the database.
 */
export const getCustomerAddresses = cache(async (): Promise<CustomerAddress[]> => {
  const user = await requireCustomerUser()
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'addresses',
    depth: 0,
    limit: 50,
    overrideAccess: false,
    sort: 'createdAt',
    user,
  })

  /**
   * Mapped inline rather than through a named `(doc: Address) => …`, so that the generated document
   * type is never imported: `payload.find` is generic over the slug, so `doc` is already the
   * address document here. The catalogue boundary keeps `payload-types` to the Payload-side tiers,
   * and a hand-written copy of the row shape to satisfy it would be the duplicate it exists to stop.
   */
  return docs.map((doc) => ({
    addressLine1: doc.addressLine1,
    addressLine2: doc.addressLine2 ?? null,
    apartment: doc.apartment ?? null,
    city: doc.city,
    country: doc.country,
    id: doc.id,
    isDefault: Boolean(doc.isDefault),
    postalCode: doc.postalCode,
  }))
})
