import config from '@payload-config'
import { readFileSync } from 'node:fs'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { formatAddress } from '@/lib/addresses/types'
import { messageCustomerFor } from '@/lib/cart/message-customer'
import type { CartView } from '@/lib/cart/types'
import { composeMessage } from '@/lib/messengers/message'
import { getMessageTemplate } from '@/lib/messengers/settings'

/**
 * Composing for whoever is at the keyboard —
 * [messenger-handoff.md §3](../../specs/005-checkout-handoff/contracts/messenger-handoff.md).
 * FR-029, FR-044, FR-046, research R18.
 *
 * **`messageCustomerFor` rather than `getMessageCustomer`**, because the latter reads the session
 * and `headers()` needs a request scope a test runner does not have — the same seam
 * `src/lib/cart/operations.ts` draws, for the same reason.
 */

const payload = await getPayload({ config })

const DOMAIN = '@handoff.aurum-testing.dev'

afterAll(async () => {
  const { docs } = await payload.find({
    collection: 'customers',
    limit: 100,
    overrideAccess: true,
    where: { email: { like: DOMAIN } },
  })
  if (docs.length > 0) {
    await payload.delete({
      collection: 'addresses',
      overrideAccess: true,
      where: { customer: { in: docs.map((doc) => doc.id) } },
    })
  }
  await payload.delete({
    collection: 'customers',
    overrideAccess: true,
    where: { email: { like: DOMAIN } },
  })
})

async function customer(over: { firstName?: string; lastName?: string } = {}) {
  const created = await payload.create({
    collection: 'customers',
    data: {
      email: `handoff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${DOMAIN}`,
      password: 'a-long-enough-password',
      ...over,
    },
    disableVerificationEmail: true,
    overrideAccess: true,
  })

  return {
    id: created.id,
    firstName: created.firstName ?? null,
    lastName: created.lastName ?? null,
  }
}

const address = (customerId: number, over: Record<string, unknown> = {}) =>
  payload.create({
    collection: 'addresses',
    data: {
      customer: customerId,
      addressLine1: 'Mangilik el 22',
      city: 'Astana',
      postalCode: '010000',
      country: 'KZ',
      ...over,
    },
    overrideAccess: true,
  })

describe('which address the seller is given (FR-044)', () => {
  it('chooses the one marked default, not the first or the newest', async () => {
    const alice = await customer({ firstName: 'Aisha', lastName: 'Karimova' })

    const first = await address(alice.id, { addressLine1: 'First street 1' })
    await address(alice.id, { addressLine1: 'Second street 2' })
    const third = await address(alice.id, { addressLine1: 'Third street 3' })

    // Spec 004 makes the first address default automatically; move it to the third deliberately.
    await payload.update({
      collection: 'addresses',
      id: third.id,
      data: { isDefault: true },
      overrideAccess: true,
    })

    const composed = await messageCustomerFor(alice)
    expect(composed.address).toContain('Third street 3')
    expect(composed.address).not.toContain('First street 1')
    expect(first.isDefault).toBe(true) // it was, until the third took over
  })

  /**
   * Research R18. `formatAddress` drops the postcode on purpose — it distinguishes nothing on a
   * profile row and is the part most likely to overflow the box. For an address a ring is posted
   * to, that reasoning inverts, and reusing it would produce something that looks right in review
   * and is missing what the courier needs.
   */
  it('includes the postcode that the profile formatter deliberately drops', async () => {
    const alice = await customer({ firstName: 'Aisha' })
    const saved = await address(alice.id, { postalCode: '010042' })

    const composed = await messageCustomerFor(alice)

    expect(composed.address).toContain('010042')
    expect(formatAddress(saved as never)).not.toContain('010042')
  })
})

describe('degrading per field, not per auth state (FR-045)', () => {
  it('gives a name with no address when nothing is saved', async () => {
    const alice = await customer({ firstName: 'Aisha', lastName: 'Karimova' })

    expect(await messageCustomerFor(alice)).toEqual({ name: 'Aisha Karimova', address: null })
  })

  it('gives an address with no name when the profile was never filled in', async () => {
    const anon = await customer()
    await address(anon.id)

    const composed = await messageCustomerFor(anon)
    expect(composed.name).toBeNull()
    expect(composed.address).toContain('Astana')
  })

  /** A registered customer who never opened their profile looks exactly like a stranger. */
  it('gives nothing at all for a customer with an empty profile', async () => {
    const empty = await customer()
    expect(await messageCustomerFor(empty)).toEqual({ name: null, address: null })
  })
})

describe('the handoff records nothing (FR-029)', () => {
  it('leaves orders and transactions disabled, so there is no table to write to', () => {
    // The plugin creates these collections only when enabled. Asserting on the running config is
    // what keeps FR-029 true as the plugin's options change under us.
    expect(Object.keys(payload.collections)).not.toContain('orders')
    expect(Object.keys(payload.collections)).not.toContain('transactions')
  })
})

/**
 * FR-046 as a source-level guard.
 *
 * `requireCustomer` and `requireCustomerUser` REDIRECT. Either of them here would bounce an
 * anonymous visitor to `/sign-in` in the middle of pressing CHECKOUT — an accidental sign-in gate,
 * arriving only for the visitors least likely to report it. There is no runtime assertion for
 * "this module does not redirect" that does not need a request scope, so the import is what is
 * checked: it is the one line that would cause it.
 */
describe('composing never sends an anonymous visitor to sign in (FR-046)', () => {
  it('resolves the session with getCustomer, never with a redirecting accessor', () => {
    const source = readFileSync('src/lib/cart/message-customer.ts', 'utf8')

    expect(source).toContain('getCustomer')
    expect(source).not.toMatch(/import[^\n]*requireCustomer/)
    expect(source).not.toMatch(/\brequireCustomerUser\(/)
  })
})

/**
 * The whole path, against the template the shop is actually configured with.
 *
 * **This test exists because the bug it catches reached a person's screen.** A signed-in customer
 * with a saved name and address saw a message carrying neither — and the cause was not in the
 * composer, which was correct and unit-tested. It was in `contact-settings.test.ts`, whose
 * `afterEach` "restored" the shop's template to a string it had invented, one that happened to omit
 * `{{customer}}`. Every run of that suite silently stripped the customer block out of the live
 * shop.
 *
 * The composer's own unit tests could not have found it: they pass their own template. Only reading
 * the configured one does, which is what this does.
 */
describe('the message a signed-in customer actually gets', () => {
  const cart = (): CartView => ({
    lines: [
      {
        id: 'row-1',
        title: 'Butterfly Diamond Pendant',
        href: '/products/butterfly-diamond-pendant',
        image: null,
        diamond: null,
        unitPrice: '$24,900',
        lineTotal: '$24,900',
        unitMinor: 2490000,
        quantity: 1,
        maxQuantity: undefined,
        available: true,
      },
    ],
    itemCount: 1,
    subtotal: '$24,900',
    shipping: '$0',
    currency: 'USD',
    issues: [],
    empty: false,
  })

  it('carries their name and delivery address, not only the order', async () => {
    const alice = await customer({ firstName: 'Aisha', lastName: 'Karimova' })
    await address(alice.id, { addressLine1: 'Mangilik el 22', postalCode: '010042' })

    const message = composeMessage(cart(), await getMessageTemplate(), await messageCustomerFor(alice))

    expect(message).toContain('Butterfly Diamond Pendant')
    expect(message).toContain('Aisha Karimova')
    expect(message).toContain('Mangilik el 22')
    expect(message).toContain('010042')
  })

  /**
   * The invariant the broken test violated, stated where it can be checked: the configured template
   * must have somewhere to put the customer, or the block silently vanishes for every signed-in
   * customer and nothing reports it.
   */
  it('is configured with a template that has a place for the customer block', async () => {
    expect(await getMessageTemplate()).toContain('{{customer}}')
  })
})
