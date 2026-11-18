import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, afterEach, describe, expect, it } from 'vitest'

import { DEFAULT_MESSAGE_TEMPLATE } from '@/globals/contact-settings'
import { DEFAULT_CONTACT } from '@/lib/contact/defaults'
import { getContactDetails } from '@/lib/messengers/settings'
import { getMessageTemplate, getMessengers } from '@/lib/messengers/settings'
import { skipRevalidation } from '@/lib/revalidate'

/**
 * The seller's destinations, and what the admin refuses to save —
 *.
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
    data: {
      messengers: GOOD,
      messageTemplate: DEFAULT_MESSAGE_TEMPLATE,
      email: DEFAULT_CONTACT.email,
      phone: DEFAULT_CONTACT.phone,
      address: DEFAULT_CONTACT.address,
      openingHours: DEFAULT_CONTACT.openingHours,
      mapsUrl: '',
    },
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

describe('what cannot be saved', () => {
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

  it('refuses a message template with no {{items}} in it', async () => {
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

describe('what is stored', () => {
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

describe('what customers see', () => {
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

describe('who may change them', () => {
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

/**
 * The shop's own email and phone.
 *
 * They were three hardcoded strings in `src/lib/contact.ts` — and the number was written two
 * different ways in two components, which is what a second copy of one fact does even inside a
 * single repository.
 */
describe('contact details', () => {
  it('are editable, and reach the chrome', async () => {
    await save({
      messengers: GOOD,
      email: 'hello@aurum.example',
      phone: '+7 (700) 111 22-33',
    })

    const details = await getContactDetails()
    expect(details.email).toBe('hello@aurum.example')
    expect(details.phone).toBe('+7 (700) 111 22-33')
  })

  /**
   * `tel:` accepts digits and a leading `+` and nothing else, so the punctuation somebody types has
   * to come out somewhere. Deriving it means there is one number to edit and no second value that
   * can quietly disagree — a wrong `tel:` is only discovered by dialling it.
   */
  it('derive the dialling link from the number as written', async () => {
    await save({ messengers: GOOD, phone: '+7 (700) 111 22-33' })
    expect((await getContactDetails()).phoneHref).toBe('tel:+77001112233')
  })

  it('refuse a number nobody could dial', async () => {
    await expect(save({ messengers: GOOD, phone: 'call the shop' })).rejects.toThrow()
    await expect(save({ messengers: GOOD, phone: '12345' })).rejects.toThrow()
  })

  it('refuse an address that is not one', async () => {
    await expect(save({ messengers: GOOD, email: 'not-an-email' })).rejects.toThrow()
  })

  /** An empty field is "we do not publish this", not "render a blank line and a dead mailto:". */
  it('fall back to what shipped when a field is emptied', async () => {
    await save({ messengers: GOOD, email: '', phone: '' })

    const details = await getContactDetails()
    expect(details.email).toBe(DEFAULT_CONTACT.email)
    expect(details.phone).toBe(DEFAULT_CONTACT.phone)
    expect(details.phoneHref).toBe('tel:+15550102030')
  })
})

/**
 * Where the shop is, when it is open, and how to find it on a map.
 *
 * The footer shipped with all three hardcoded, and the map link pointed at a bare
 * `https://maps.google.com/` — a link to Google Maps, not to this shop. It survived review for the
 * same reason the `wa.me/` marks did: a link that opens *something* looks like it works.
 */
describe('where the shop is', () => {
  it('draws the address and hours the owner set', async () => {
    await save({
      messengers: GOOD,
      address: 'Unit 4, Esentai Tower, Almaty, Kazakhstan',
      openingHours: 'Mon–Sat · 11:00–19:00',
    })

    const details = await getContactDetails()
    expect(details.address).toBe('Unit 4, Esentai Tower, Almaty, Kazakhstan')
    expect(details.openingHours).toBe('Mon–Sat · 11:00–19:00')
  })

  it('uses the pinned map link when there is one', async () => {
    await save({ messengers: GOOD, mapsUrl: 'https://maps.app.goo.gl/abc123' })
    expect((await getContactDetails()).mapsHref).toBe('https://maps.app.goo.gl/abc123')
  })

  /**
   * With no pin, a search for the address the owner typed. Not a bare `maps.google.com`, which is
   * what the footer shipped with and is about nowhere in particular.
   */
  it('searches for the address when no pin is set', async () => {
    await save({
      messengers: GOOD,
      address: 'Unit 4, Esentai Tower, Almaty',
      mapsUrl: '',
    })

    const { mapsHref } = await getContactDetails()
    expect(mapsHref).toContain('google.com/maps/search')
    expect(mapsHref).toContain(encodeURIComponent('Unit 4, Esentai Tower, Almaty'))
    expect(mapsHref).not.toBe('https://maps.google.com/')
  })

  it('refuses a map link that is not a link', async () => {
    await expect(save({ messengers: GOOD, mapsUrl: 'old town, example city' })).rejects.toThrow()
  })

  it('falls back to what shipped when the address is emptied', async () => {
    await save({ messengers: GOOD, address: '', openingHours: '' })

    const details = await getContactDetails()
    expect(details.address).toBe(DEFAULT_CONTACT.address)
    expect(details.openingHours).toBe(DEFAULT_CONTACT.openingHours)
  })
})
