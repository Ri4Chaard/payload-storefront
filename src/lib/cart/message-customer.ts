import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import { getCustomer } from '@/lib/auth/dal'
import { formatPostalAddress, type CustomerAddress } from '@/lib/addresses/types'

/**
 * What the shop already knows about whoever is checking out (spec 005, T055, FR-043 – FR-046).
 *
 * A signed-in customer may have saved a name and a delivery address on their profile — spec 004
 * built both. Sending the seller a request that omits them, when the customer has already typed
 * them once, makes the seller ask again in the very conversation this feature exists to start.
 *
 * **`getCustomer()`, never `requireCustomer` or `requireCustomerUser`.** Those redirect. Calling one
 * here would bounce an anonymous visitor to `/sign-in` in the middle of pressing CHECKOUT — an
 * accidental sign-in gate that FR-031 and FR-046 forbid, arriving by accident rather than by
 * design, and arriving only for the visitors least likely to report it. The lookup is optional by
 * construction: this returns `null` and the message is composed without a customer block.
 *
 * **Degradation is per field, not per auth state** (FR-045). "Signed in" is not the condition —
 * *having the datum* is. A customer who registered and never opened their profile has an account,
 * no name and no address, and their message is identical to an anonymous visitor's. One rule to
 * implement and one to test, instead of four states.
 */

export interface MessageCustomer {
  name: null | string
  /** The default saved address, formatted WITH its postcode. */
  address: null | string
}

const client = cache(async () => getPayload({ config }))

/**
 * The same thing for a customer named by id, with no session to read.
 *
 * The seam `src/lib/auth/login.ts` established and `src/lib/cart/operations.ts` follows: everything
 * below the session boundary takes what it needs as an argument, so it can be tested against a real
 * database. `cookies()` and `headers()` need a request scope a test runner does not have.
 */
export async function messageCustomerFor(
  customer: { firstName: null | string; id: number; lastName: null | string },
): Promise<MessageCustomer> {
  const payload = await client()

  const { docs } = await payload.find({
    collection: 'addresses',
    depth: 0,
    limit: 50,
    overrideAccess: true,
    where: { customer: { equals: customer.id } },
  })

  // Exactly one address is the default: spec 004's `assignFirstAddressAsDefault` and
  // `keepOneDefault` hooks are what make that true, so this is a find rather than a sort (FR-044).
  const chosen = docs.find((doc) => doc.isDefault) ?? null

  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim()

  return {
    name: name === '' ? null : name,
    address: chosen ? formatPostalAddress(chosen as unknown as CustomerAddress) : null,
  }
}

export const getMessageCustomer = cache(async (): Promise<MessageCustomer | null> => {
  const customer = await getCustomer()
  if (!customer) return null

  return messageCustomerFor(customer)
})
