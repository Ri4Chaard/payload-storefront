import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * Who can reach whose data (spec 004, FR-026, FR-032, FR-039; SC-007, SC-008).
 *
 * **Deliberately all negative.** A passing positive test proves a feature works; these prove it is
 * not open, which is the only property here whose failure is a privacy incident rather than a bug
 * report. They run with `overrideAccess: false` — the Local API bypasses access control by default,
 * so a test that forgets that flag proves nothing at all.
 */

const payload = await getPayload({ config })

async function makeCustomer(label: string) {
  return payload.create({
    collection: 'customers',
    data: {
      email: `access-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.test`,
      password: 'a-long-enough-password',
    },
    // The account is created verified so these tests are about ACCESS and not about verification.
    disableVerificationEmail: true,
    overrideAccess: true,
  })
}

const alice = await makeCustomer('alice')
const bob = await makeCustomer('bob')

const aliceAddress = await payload.create({
  collection: 'addresses',
  data: {
    addressLine1: 'Mangilik el 22',
    city: 'Astana',
    country: 'KZ',
    customer: alice.id,
    postalCode: '010042',
  },
  overrideAccess: true,
})

afterAll(async () => {
  await payload.delete({
    collection: 'addresses',
    overrideAccess: true,
    where: { customer: { in: [alice.id, bob.id] } },
  })
  await payload.delete({
    collection: 'customers',
    overrideAccess: true,
    where: { email: { like: '@example.test' } },
  })
})

describe('one customer against another’s data', () => {
  it('cannot read another customer’s address by its id', async () => {
    await expect(
      payload.findByID({
        collection: 'addresses',
        id: aliceAddress.id,
        overrideAccess: false,
        user: { ...bob, collection: 'customers' },
      }),
    ).rejects.toThrow()
  })

  it('does not see another customer’s address in a list', async () => {
    const found = await payload.find({
      collection: 'addresses',
      overrideAccess: false,
      user: { ...bob, collection: 'customers' },
    })
    expect(found.docs.map((d) => d.id)).not.toContain(aliceAddress.id)
  })

  it('cannot update another customer’s address', async () => {
    await expect(
      payload.update({
        collection: 'addresses',
        data: { city: 'Somewhere else' },
        id: aliceAddress.id,
        overrideAccess: false,
        user: { ...bob, collection: 'customers' },
      }),
    ).rejects.toThrow()
  })

  it('cannot delete another customer’s address', async () => {
    await expect(
      payload.delete({
        collection: 'addresses',
        id: aliceAddress.id,
        overrideAccess: false,
        user: { ...bob, collection: 'customers' },
      }),
    ).rejects.toThrow()
  })

  it('cannot read another customer’s profile', async () => {
    await expect(
      payload.findByID({
        collection: 'customers',
        id: alice.id,
        overrideAccess: false,
        user: { ...bob, collection: 'customers' },
      }),
    ).rejects.toThrow()
  })

  it('cannot update another customer’s profile', async () => {
    await expect(
      payload.update({
        collection: 'customers',
        data: { firstName: 'Not' },
        id: alice.id,
        overrideAccess: false,
        user: { ...bob, collection: 'customers' },
      }),
    ).rejects.toThrow()
  })
})

describe('verification-codes', () => {
  /**
   * Access on this collection is `false` in every direction for everyone — not admins-only. The
   * rows are live credentials, so there is no role for which reading them is legitimate.
   */
  it('is unreadable by an anonymous request', async () => {
    await expect(
      payload.find({ collection: 'verification-codes', overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('is unreadable by a signed-in customer', async () => {
    await expect(
      payload.find({
        collection: 'verification-codes',
        overrideAccess: false,
        user: { ...alice, collection: 'customers' },
      }),
    ).rejects.toThrow()
  })

  it('is not writable by a signed-in customer', async () => {
    await expect(
      payload.create({
        collection: 'verification-codes',
        data: {
          attempts: 0,
          codeHash: 'forged',
          email: alice.email,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          purpose: 'reset-password',
          token: 'forged-token',
        },
        overrideAccess: false,
        user: { ...alice, collection: 'customers' },
      }),
    ).rejects.toThrow()
  })
})

describe('the admin boundary', () => {
  /**
   * FR-039 holds by construction rather than by a role check: `admins` and `customers` are separate
   * collections, so a customer has no row in the one the panel authenticates against. This asserts
   * the structural fact rather than a boolean somebody could flip.
   */
  it('keeps customers out of the collection the admin panel authenticates', async () => {
    const staff = await payload.find({
      collection: 'admins',
      overrideAccess: true,
      where: { email: { equals: alice.email } },
    })
    expect(staff.totalDocs).toBe(0)
  })

  it('gives the customers collection no admin access function at all', async () => {
    const customers = payload.config.collections.find((c) => c.slug === 'customers')
    expect(customers?.access.admin).toBeUndefined()
  })

  it('anonymous requests cannot list customers', async () => {
    await expect(
      payload.find({ collection: 'customers', overrideAccess: false }),
    ).rejects.toThrow()
  })
})
