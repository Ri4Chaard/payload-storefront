import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, afterEach, describe, expect, it } from 'vitest'

import { DEFAULT_MESSAGE_TEMPLATE } from '@/globals/contact-settings'
import { getMessageTemplate, getMessengers } from '@/lib/messengers/settings'
import { skipRevalidation } from '@/lib/revalidate'

/**
 * The seller's destinations, and what the admin refuses to save —
 * [messenger-handoff.md §4](../../specs/005-checkout-handoff/contracts/messenger-handoff.md).
 * FR-034, FR-037 – FR-041, SC-012.
 *
 * **SC-012 is the claim these exist to support**: no configuration reachable through the admin can
 * produce a messenger row in the modal that leads nowhere. That is a claim about what cannot
 * happen, so it is tested by attempting each broken combination and asserting the save is refused —
 * not by checking that a good one works.
 *
 * Every write goes through `payload.updateGlobal` with `overrideAccess: false` and an admin user,
 * so the collection's own access and validation run exactly as they do in the admin panel.
 */

const payload = await getPayload({ config })

/** A real admin, because `update` is `isAdmin` and the point is to exercise it. */
const admin = await (async () => {
  const email = `contact-${Date.now()}@contact.aurum-testing.dev`
  const created = await payload.create({
    collection: 'admins',
    data: { email, name: 'Contact settings test admin', password: 'a-long-enough-password' },
    overrideAccess: true,
  })
  return payload.findByID({ collection: 'admins', id: created.id, overrideAccess: true })
})()

const asAdmin = { ...admin, collection: 'admins' } as Parameters<
  typeof payload.updateGlobal
>[0]['user']

const GOOD = [
  { platform: 'instagram' as const, destination: 'aurum', handle: '@aurum', enabled: true },
  { platform: 'telegram' as const, destination: 'aurum', handle: '@aurum', enabled: true },
  { platform: 'whatsapp' as const, destination: '15550102030', handle: '@aurum', enabled: true },
]

const save = (data: Record<string, unknown>) =>
  payload.updateGlobal({
    slug: 'contact-settings',
    data,
    overrideAccess: false,
    user: asAdmin,
    context: skipRevalidation,
  })

/**
 * Put the shop back after every test, so one failure cannot cascade through the file.
 *
 * **Restored to the global's own default, never to a string written out here.** An earlier draft
 * invented a template for this — one that happened to omit `{{customer}}` — and every run of this
 * suite quietly stripped the customer block out of the real shop's message. The bug reached a
 * person's screen: they were signed in, their name and address were saved, and the message carried
 * neither. A test that writes to shared state must restore the value that was there, not one that
 * merely looks plausible.
 */
afterEach(async () => {
  await payload.updateGlobal({
    slug: 'contact-settings',
    data: { messengers: GOOD, messageTemplate: DEFAULT_MESSAGE_TEMPLATE },
    overrideAccess: true,
    context: skipRevalidation,
  })
})

afterAll(async () => {
  await payload.delete({
    collection: 'admins',
    overrideAccess: true,
    where: { email: { like: '@contact.aurum-testing.dev' } },
  })
})

describe('what cannot be saved (FR-039, SC-012)', () => {
  it('refuses an enabled messenger with no destination', async () => {
    await expect(
      save({
        messengers: [{ platform: 'whatsapp', destination: '', handle: '@aurum', enabled: true }],
      }),
    ).rejects.toThrow()
  })

  it('refuses an enabled messenger whose destination is not a usable account', async () => {
    await expect(
      save({
        messengers: [
          { platform: 'whatsapp', destination: 'call us!', handle: '@aurum', enabled: true },
        ],
      }),
    ).rejects.toThrow()
    await expect(
      save({
        messengers: [
          { platform: 'telegram', destination: 'a b', handle: '@aurum', enabled: true },
        ],
      }),
    ).rejects.toThrow()
  })

  /**
   * FR-034: an owner may park a half-filled row rather than delete it. Validating an unticked row
   * would teach them to delete instead of hide, and losing the account details with it.
   */
  it('allows a DISABLED messenger whose destination is broken', async () => {
    await expect(
      save({
        messengers: [
          { platform: 'whatsapp', destination: 'not a number', handle: '@aurum', enabled: false },
        ],
      }),
    ).resolves.toBeTruthy()

    // And it never reaches a customer.
    expect(await getMessengers()).toEqual([])
  })

  it('refuses a message template with no {{items}} in it (FR-040)', async () => {
    await expect(
      save({ messengers: GOOD, messageTemplate: 'Hello, I would like to order something.' }),
    ).rejects.toThrow()
  })

  it('accepts a template that keeps {{items}}, however else it is worded', async () => {
    await expect(
      save({ messengers: GOOD, messageTemplate: 'Hi! {{items}}' }),
    ).resolves.toBeTruthy()
  })
})

describe('what is stored (FR-035 – FR-037)', () => {
  it('normalises a phone number on the way in, so the stored value is the one that gets used', async () => {
    await save({
      messengers: [
        {
          platform: 'whatsapp',
          destination: '+1 (555) 010 20-30',
          handle: '@aurum',
          enabled: true,
        },
      ],
    })

    expect((await getMessengers())[0]?.destination).toBe('15550102030')
  })

  it('keeps the displayed handle separate from the destination', async () => {
    await save({
      messengers: [
        {
          platform: 'whatsapp',
          destination: '+1 (555) 010 20-30',
          handle: '@aurum',
          enabled: true,
        },
      ],
    })

    const [row] = await getMessengers()
    expect(row?.handle).toBe('@aurum')
    expect(row?.destination).toBe('15550102030')
    expect(row?.handle).not.toBe(row?.destination)
  })
})

describe('what customers see (FR-038)', () => {
  it('returns enabled rows in the order the owner arranged them', async () => {
    await save({ messengers: [GOOD[2]!, GOOD[0]!, GOOD[1]!] })
    expect((await getMessengers()).map((row) => row.platform)).toEqual([
      'whatsapp',
      'instagram',
      'telegram',
    ])
  })

  it('drops a disabled row and leaves the rest in order', async () => {
    await save({ messengers: [GOOD[0]!, { ...GOOD[1]!, enabled: false }, GOOD[2]!] })
    expect((await getMessengers()).map((row) => row.platform)).toEqual(['instagram', 'whatsapp'])
  })

  it('falls back to a usable template when the field is emptied', async () => {
    await save({ messengers: GOOD, messageTemplate: '' })
    expect(await getMessageTemplate()).toContain('{{items}}')
  })
})

describe('who may change them (FR-041)', () => {
  it('refuses a customer session', async () => {
    const customer = await payload.create({
      collection: 'customers',
      data: {
        email: `cust-${Date.now()}@contact.aurum-testing.dev`,
        password: 'a-long-enough-password',
      },
      disableVerificationEmail: true,
      overrideAccess: true,
    })
    const user = await payload.findByID({
      collection: 'customers',
      id: customer.id,
      overrideAccess: true,
    })

    await expect(
      payload.updateGlobal({
        slug: 'contact-settings',
        data: { messengers: [] },
        overrideAccess: false,
        user: { ...user, collection: 'customers' } as Parameters<
          typeof payload.updateGlobal
        >[0]['user'],
        context: skipRevalidation,
      }),
    ).rejects.toThrow()

    await payload.delete({ collection: 'customers', id: customer.id, overrideAccess: true })
  })

  it('refuses an anonymous request', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'contact-settings',
        data: { messengers: [] },
        overrideAccess: false,
        context: skipRevalidation,
      }),
    ).rejects.toThrow()
  })

  /** Read is public by nature: these values are shown to every visitor who opens the modal. */
  it('lets anyone read them', async () => {
    await expect(
      payload.findGlobal({ slug: 'contact-settings', overrideAccess: false }),
    ).resolves.toBeTruthy()
  })
})
