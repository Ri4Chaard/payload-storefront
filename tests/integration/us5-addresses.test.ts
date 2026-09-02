import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { addressSchema, saveAddressSchema } from '@/lib/auth/schemas'

/**
 * US5 — saved delivery addresses (spec 004, FR-027 – FR-032; SC-007).
 *
 * **`saveAddress` and `deleteAddress` are not called here**, for the seam US2, US3 and US4 all
 * record: both open with `requireCustomerUser()`, which reads `next/headers`, and there is no
 * request in a test runner. What they do once past that line is three things, and each is proved
 * below through the layer that actually enforces it:
 *
 *  - the id that arrives from the browser cannot name another customer's row — asserted here as the
 *    query `ownedAddress` runs, and again at the access layer in `account-access.test.ts`, which is
 *    where FR-032 is required to live;
 *  - ownership is assigned from the session rather than from the submission;
 *  - FR-031 holds across all four transitions, in the collection, whoever is writing.
 *
 * `tests/unit/address-default.test.ts` is the companion: it proves which hook made which decision,
 * where this proves the decisions add up to the invariant.
 */

const payload = await getPayload({ config })

const fresh = (label: string) =>
  `us5-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@us5.aurum-testing.dev`

async function makeCustomer(label: string) {
  const created = await payload.create({
    collection: 'customers',
    data: { email: fresh(label), password: 'a-long-enough-password' },
    disableVerificationEmail: true,
    overrideAccess: true,
  })

  return { ...created, collection: 'customers' as const }
}

const alice = await makeCustomer('alice')
const bob = await makeCustomer('bob')

/** Written the way the action writes: as the customer, with access control switched on. */
async function addAddress(
  user: typeof alice,
  data: Record<string, unknown> = {},
): Promise<{ id: number; isDefault?: boolean | null }> {
  return payload.create({
    collection: 'addresses',
    data: {
      addressLine1: 'Mangilik el 22',
      city: 'Astana',
      country: 'KZ',
      postalCode: '010042',
      ...data,
    },
    overrideAccess: false,
    user,
  })
}

/** `depth: 0` so `customer` comes back as the id the ownership assertions compare against. */
const reread = async (id: number) =>
  payload.findByID({ collection: 'addresses', depth: 0, id, overrideAccess: true })

const defaultsOf = async (customerId: number) => {
  const { docs } = await payload.find({
    collection: 'addresses',
    limit: 100,
    overrideAccess: true,
    where: { and: [{ customer: { equals: customerId } }, { isDefault: { equals: true } }] },
  })
  return docs.map((doc) => doc.id)
}

/** The single default, refusing to continue if the invariant has already been broken. */
const soleDefault = async (customerId: number): Promise<number> => {
  const [only, ...rest] = await defaultsOf(customerId)
  if (only === undefined || rest.length > 0) {
    throw new Error(`expected exactly one default address, found ${rest.length + (only ? 1 : 0)}`)
  }
  return only
}

/** Between describes, so one block's leftovers cannot decide another block's "first address". */
const clear = async (customerId: number) => {
  await payload.delete({
    collection: 'addresses',
    overrideAccess: true,
    where: { customer: { equals: customerId } },
  })
}

afterAll(async () => {
  await payload.delete({
    collection: 'addresses',
    overrideAccess: true,
    where: { customer: { in: [alice.id, bob.id] } },
  })
  await payload.delete({
    collection: 'customers',
    overrideAccess: true,
    where: { email: { like: '@us5.aurum-testing.dev' } },
  })
})

describe('the id that arrives from the browser', () => {
  it('finds nothing when it names another customer’s address (FR-032, SC-007)', async () => {
    const hers = await addAddress(alice)

    // Exactly the query `ownedAddress` runs before a save or a delete. An empty result is what
    // becomes `addressNotFound` — the same answer an id that never existed gets, so the response
    // does not tell the sender which of the two they found.
    const { docs } = await payload.find({
      collection: 'addresses',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      user: bob,
      where: { id: { equals: hers.id } },
    })

    expect(docs).toHaveLength(0)
    await clear(alice.id)
  })

  it('assigns ownership from the session, not from the submission', async () => {
    // The one shape a client-supplied `customer` could take. The plugin's own `beforeChange`
    // overwrites it, which is why `saveAddress` never sends one.
    const created = await addAddress(bob, { customer: alice.id })

    expect((await reread(created.id)).customer).toBe(bob.id)
    await clear(bob.id)
  })
})

describe('exactly one default (FR-031)', () => {
  it('makes the first address the default, whatever the box said', async () => {
    const first = await addAddress(alice, { isDefault: false })

    expect((await reread(first.id)).isDefault).toBe(true)
  })

  it('leaves a second address alone', async () => {
    const second = await addAddress(alice, { addressLine1: 'Sheikh Zayed Rd 1', city: 'Dubai' })

    expect((await reread(second.id)).isDefault).toBeFalsy()
    expect(await defaultsOf(alice.id)).toHaveLength(1)
  })

  it('moves the role when another address is marked default', async () => {
    const { docs } = await payload.find({
      collection: 'addresses',
      overrideAccess: true,
      sort: 'createdAt',
      where: { customer: { equals: alice.id } },
    })
    const [first, second] = docs
    if (!first || !second) throw new Error('expected the two addresses saved above')

    await payload.update({
      collection: 'addresses',
      data: { isDefault: true },
      id: second.id,
      overrideAccess: false,
      user: alice,
    })

    expect(await defaultsOf(alice.id)).toEqual([second.id])
    expect((await reread(first.id)).isDefault).toBeFalsy()
  })

  it('refuses to leave the customer with no default at all', async () => {
    const current = await soleDefault(alice.id)

    await payload.update({
      collection: 'addresses',
      data: { isDefault: false },
      id: current,
      overrideAccess: false,
      user: alice,
    })

    // The edit succeeds; the box does not. Anything else would turn fixing a typo into an error.
    expect((await reread(current)).isDefault).toBe(true)
    expect(await defaultsOf(alice.id)).toEqual([current])
  })

  it('promotes another address when the default is deleted', async () => {
    const current = await soleDefault(alice.id)

    await payload.delete({
      collection: 'addresses',
      id: current,
      overrideAccess: false,
      user: alice,
    })

    const remaining = await defaultsOf(alice.id)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]).not.toBe(current)
  })

  it('promotes nobody when the deleted address was the last one', async () => {
    const last = await soleDefault(alice.id)

    await payload.delete({ collection: 'addresses', id: last, overrideAccess: false, user: alice })

    expect(await defaultsOf(alice.id)).toHaveLength(0)
    await clear(alice.id)
  })
})

describe('the admin panel’s view of a customer', () => {
  /**
   * The `join` field on `customers`. It is the only route into the addresses collection from the
   * panel — the plugin creates that collection `hidden`, so without this a seller fulfilling an
   * order over WhatsApp could not see the address the customer had already given them.
   *
   * Asserted through the Local API rather than the UI because that is where the field either
   * resolves or does not: a wrong `on` path yields an empty join, which looks exactly like a
   * customer who has saved nothing.
   */
  it('reads the customer’s addresses back from the other side of the relationship', async () => {
    const first = await addAddress(alice)
    const second = await addAddress(alice, { addressLine1: 'Sheikh Zayed Rd 1', city: 'Dubai' })

    const customer = await payload.findByID({
      collection: 'customers',
      id: alice.id,
      overrideAccess: true,
    })

    const joined = customer.addresses?.docs ?? []
    const ids = joined.map((doc) => (typeof doc === 'number' ? doc : doc.id))

    expect(ids).toHaveLength(2)
    expect(ids).toContain(first.id)
    expect(ids).toContain(second.id)

    // Default first (FR-031), so the address that will actually be used is the one at the top.
    expect(ids[0]).toBe(first.id)
    await clear(alice.id)
  })

  it('shows nothing for a customer who has saved none', async () => {
    const customer = await payload.findByID({
      collection: 'customers',
      id: bob.id,
      overrideAccess: true,
    })

    expect(customer.addresses?.docs ?? []).toHaveLength(0)
  })
})

describe('the columns the form insists on (FR-030)', () => {
  it('refuses a row with no city, whoever is writing', async () => {
    await expect(addAddress(alice, { city: undefined })).rejects.toThrow()
    await clear(alice.id)
  })

  it('stores an address with neither optional line', async () => {
    const created = await addAddress(alice)
    const stored = await reread(created.id)

    expect(stored.addressLine2 ?? null).toBeNull()
    expect(stored.apartment ?? null).toBeNull()
    await clear(alice.id)
  })
})

describe('addressSchema', () => {
  const complete = {
    addressLine1: 'Mangilik el 22',
    addressLine2: '',
    apartment: '',
    city: 'Astana',
    country: 'KZ',
    isDefault: false,
    postalCode: '010042',
  }

  it('accepts the two optional fields left empty', () => {
    expect(addressSchema.safeParse(complete).success).toBe(true)
  })

  it('names each missing required field by its own key', () => {
    const parsed = addressSchema.safeParse({ ...complete, addressLine1: '  ', city: '' })
    expect(parsed.success).toBe(false)

    const keys = parsed.error?.issues.map((issue) => issue.message)
    expect(keys).toContain('addressLine1Required')
    expect(keys).toContain('addressCityRequired')
  })

  /**
   * Kazakhstan is the regression test for R6: the plugin's own country list has forty entries and
   * contains neither KZ nor AE, so shipping it would have made the design's own sample address
   * impossible to save.
   */
  it('accepts a country the plugin’s default list would have refused', () => {
    expect(addressSchema.safeParse({ ...complete, country: 'KZ' }).success).toBe(true)
    expect(addressSchema.safeParse({ ...complete, country: 'AE' }).success).toBe(true)
  })

  it('refuses a country that is not an ISO code', () => {
    const parsed = addressSchema.safeParse({ ...complete, country: 'Kazakhstan' })
    expect(parsed.success).toBe(false)
  })

  it('trims what it stores, so a pasted trailing space is not part of the city', () => {
    const parsed = addressSchema.safeParse({ ...complete, city: '  Astana  ' })
    expect(parsed.success && parsed.data.city).toBe('Astana')
  })
})

describe('saveAddressSchema', () => {
  const complete = {
    addressLine1: 'Mangilik el 22',
    addressLine2: '',
    apartment: '',
    city: 'Astana',
    country: 'KZ',
    isDefault: false,
    postalCode: '010042',
  }

  it('treats a missing id as "create"', () => {
    const parsed = saveAddressSchema.safeParse(complete)
    expect(parsed.success && parsed.data.id).toBeUndefined()
  })

  it('refuses an id that is not a positive whole number', () => {
    // The three shapes a tampered id actually takes. Each one would otherwise reach a `findByID`.
    expect(saveAddressSchema.safeParse({ ...complete, id: 0 }).success).toBe(false)
    expect(saveAddressSchema.safeParse({ ...complete, id: -1 }).success).toBe(false)
    expect(saveAddressSchema.safeParse({ ...complete, id: '4 OR 1=1' }).success).toBe(false)
  })
})
