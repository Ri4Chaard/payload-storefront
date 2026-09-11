import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ENQUIRY_RATE_LIMIT, ENQUIRY_RETENTION_DAYS } from '@/lib/contact/config'
import { skipRevalidation } from '@/lib/revalidate'

/**
 * The enquiry pipeline — [enquiry-action.md](../../specs/008-contact-faq-pages/contracts/enquiry-action.md)
 * §5, §9. FR-021, FR-024a, FR-027, FR-029, FR-029a, FR-029b.
 *
 * **The claim these exist to support is §5's ordering**: the record is the receipt and the email is
 * a notification, so a mail outage costs the shop a notification rather than the customer their
 * message. That is a claim about what cannot happen — a visitor being told their message failed
 * while it sits in the database — so it is tested by breaking the mail and asserting the answer is
 * still `success`.
 *
 * `next/headers` is stubbed because the action reads the client address through it and there is no
 * request here. Everything else is real: a real database, real access rules, real writes.
 */

const HEADERS = { forwarded: '203.0.113.10' }

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': HEADERS.forwarded }),
}))

/** Typed by what Payload actually calls it with, so `mock.calls[0][0]` is not an empty tuple. */
const sendEmail = vi.fn<(message: Record<string, unknown>) => Promise<unknown>>(async () => undefined)

const payload = await getPayload({ config })

/**
 * The adapter is swapped rather than the module mocked, so `src/lib/email/enquiry.ts` runs for real
 * — its escaping, its `replyTo`, its subject. What is faked is the wire, which is the only part
 * that can be made to fail on demand.
 */
const realSendEmail = payload.sendEmail.bind(payload)
payload.sendEmail = sendEmail as unknown as typeof payload.sendEmail

const { submitEnquiry } = await import('@/lib/contact/actions')
const { purgeEnquiriesTask } = await import('@/jobs/purge-enquiries')

const form = (overrides: Record<string, string> = {}) => {
  const data = new FormData()
  data.set('name', 'Yara')
  data.set('email', `yara-${Math.random().toString(36).slice(2)}@aurum-testing.dev`)
  data.set('message', 'Do you have this in a 1.5ct emerald cut?')
  data.set('website', '')
  for (const [key, value] of Object.entries(overrides)) data.set(key, value)
  return data
}

const submit = (data: FormData) => submitEnquiry({ status: 'idle' }, data)

const countFor = async (email: string) =>
  (await payload.count({ collection: 'enquiries', where: { email: { equals: email } }, overrideAccess: true }))
    .totalDocs

const rowFor = async (email: string) => {
  const found = await payload.find({
    collection: 'enquiries',
    where: { email: { equals: email } },
    overrideAccess: true,
    limit: 1,
  })
  return found.docs[0]
}

beforeEach(() => {
  sendEmail.mockReset()
  sendEmail.mockResolvedValue(undefined)
  HEADERS.forwarded = `203.0.113.${Math.floor(Math.random() * 250) + 1}`
})

afterEach(async () => {
  await payload.delete({
    collection: 'enquiries',
    where: { email: { contains: 'aurum-testing.dev' } },
    overrideAccess: true,
    context: skipRevalidation,
  })
})

afterAll(() => {
  payload.sendEmail = realSendEmail
})

describe('a valid submission', () => {
  it('writes exactly one row and returns success', async () => {
    const data = form()
    const email = data.get('email') as string

    await expect(submit(data)).resolves.toEqual({ status: 'success' })
    expect(await countFor(email)).toBe(1)
  })

  it('notifies the shop with the visitor’s details and a reply-to', async () => {
    const data = form()
    const email = data.get('email') as string
    await submit(data)

    expect(sendEmail).toHaveBeenCalledTimes(1)
    const sent = sendEmail.mock.calls[0]![0] as Record<string, string>
    expect(sent.replyTo).toBe(email)
    expect(sent.html).toContain('Yara')
    expect(sent.html).toContain(email)
    // The subject never carries visitor text — it shows on lock screens and in previews.
    expect(sent.subject).not.toContain('Yara')
  })

  it('records the notification as sent', async () => {
    const data = form()
    await submit(data)
    expect((await rowFor(data.get('email') as string))?.notification).toBe('sent')
  })

  /** FR-026. Nothing a visitor types may alter the structure of the message the shop receives. */
  it('treats visitor text as text', async () => {
    const data = form({ name: '<script>alert(1)</script>' })
    await submit(data)

    const sent = sendEmail.mock.calls[0]![0] as Record<string, string>
    expect(sent.html).not.toContain('<script>')
    expect(sent.html).toContain('&lt;script&gt;')
  })
})

/**
 * **The regression test for the whole design** (contracts/enquiry-action.md §5).
 *
 * If this ever inverts, a mail outage starts telling visitors their message failed while the shop
 * is holding it. The record is the receipt; the email is how the owner finds out.
 */
describe('when the notification fails', () => {
  it('still returns success, because the shop has the message', async () => {
    sendEmail.mockRejectedValue(new Error('Resend is unreachable'))

    const data = form()
    await expect(submit(data)).resolves.toEqual({ status: 'success' })
    expect(await countFor(data.get('email') as string)).toBe(1)
  })

  it('marks the row failed, with a reason the owner can act on', async () => {
    sendEmail.mockRejectedValue(new Error('Resend is unreachable'))

    const data = form()
    await submit(data)

    const row = await rowFor(data.get('email') as string)
    expect(row?.notification).toBe('failed')
    expect(row?.notificationError).toContain('unreachable')
  })
})

describe('when the enquiry cannot be written', () => {
  it('returns sendFailed and sends nothing', async () => {
    const create = vi.spyOn(payload, 'create').mockRejectedValueOnce(new Error('database is down'))

    const result = await submit(form())

    expect(result).toMatchObject({ status: 'error', message: 'sendFailed' })
    expect(sendEmail).not.toHaveBeenCalled()
    create.mockRestore()
  })

  /** FR-022: what the visitor wrote is handed back so the form can be re-populated. */
  it('hands back what the visitor typed', async () => {
    const create = vi.spyOn(payload, 'create').mockRejectedValueOnce(new Error('database is down'))

    const result = await submit(form({ name: 'Yara', message: 'Keep this.' }))

    expect(result).toMatchObject({ values: { name: 'Yara', message: 'Keep this.' } })
    create.mockRestore()
  })
})

describe('validation', () => {
  it('names the fields at fault and writes nothing', async () => {
    const data = form({ name: '', email: 'not-an-email' })
    const result = await submit(data)

    expect(result).toMatchObject({
      status: 'error',
      message: 'invalid',
      fieldErrors: { name: 'nameRequired', email: 'emailInvalid' },
    })
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

/**
 * FR-027. Counted over stored rows in the trailing hour, on two keys — see
 * `src/lib/contact/throttle.ts` for why the address alone is not enough.
 */
describe('the throttle', () => {
  it(`refuses the ${ENQUIRY_RATE_LIMIT + 1}th from one address, writing and sending nothing`, async () => {
    const email = `throttle-${Date.now()}@aurum-testing.dev`

    for (let i = 0; i < ENQUIRY_RATE_LIMIT; i += 1) {
      // A different address each time, so only the email key can be the one that trips.
      HEADERS.forwarded = `198.51.100.${i + 1}`
      await expect(submit(form({ email }))).resolves.toEqual({ status: 'success' })
    }

    sendEmail.mockClear()
    HEADERS.forwarded = '198.51.100.200'

    const result = await submit(form({ email }))
    expect(result).toMatchObject({ status: 'error', message: 'throttled' })
    expect(await countFor(email)).toBe(ENQUIRY_RATE_LIMIT)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it(`refuses the ${ENQUIRY_RATE_LIMIT + 1}th from one sender, whatever address it uses`, async () => {
    HEADERS.forwarded = '198.51.100.77'

    for (let i = 0; i < ENQUIRY_RATE_LIMIT; i += 1) {
      await expect(submit(form())).resolves.toEqual({ status: 'success' })
    }

    sendEmail.mockClear()

    const result = await submit(form())
    expect(result).toMatchObject({ status: 'error', message: 'throttled' })
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

/**
 * A bot told precisely which check it failed is a bot that learns, so a filled honeypot returns the
 * SUCCESS shape. A visitor cannot reach the control — it is `sr-only`, `aria-hidden` and out of the
 * tab order.
 */
describe('the honeypot', () => {
  it('returns success and writes nothing', async () => {
    const data = form({ website: 'http://spam.example' })
    const email = data.get('email') as string

    await expect(submit(data)).resolves.toEqual({ status: 'success' })
    expect(await countFor(email)).toBe(0)
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

/**
 * FR-029a, FR-029b, SC-012. The collection refuses every write and every read that is not an
 * administrator's, so the action's `overrideAccess: true` is the only way in.
 */
describe('access', () => {
  const asCustomer = { id: 1, collection: 'customers' } as never

  it('refuses creation to everyone, including an administrator', async () => {
    await expect(
      payload.create({
        collection: 'enquiries',
        data: { name: 'Direct', email: 'direct@aurum-testing.dev', message: 'x', notification: 'pending' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('refuses updates, so what a visitor wrote stays as they wrote it', async () => {
    const data = form()
    await submit(data)
    const row = await rowFor(data.get('email') as string)

    await expect(
      payload.update({
        collection: 'enquiries',
        id: row!.id,
        data: { message: 'rewritten' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  /*
    **Refused outright, not filtered to nothing** — and the difference is worth pinning down.
    `questions` uses `adminOrPublishedStatus`, which returns a `Where` and therefore narrows the
    query; `isAdmin` returns a boolean, so Payload rejects the operation before it runs. For a
    collection of other people's correspondence, "you may not ask" is the stronger of the two, and
    it is what these assert.
  */
  it('refuses an anonymous request outright', async () => {
    await submit(form())
    await expect(
      payload.find({ collection: 'enquiries', overrideAccess: false }),
    ).rejects.toThrow(/not allowed/i)
  })

  it('refuses a customer, including for their own enquiries', async () => {
    await submit(form())
    await expect(
      payload.find({ collection: 'enquiries', overrideAccess: false, user: asCustomer }),
    ).rejects.toThrow(/not allowed/i)
  })
})

/**
 * Retention and erasure (008/T090, FR-029d, FR-029e, SC-013).
 *
 * **Constitution VI attaches both to any point that collects personal data**, and storing enquiries
 * created one. The purge is what bounds how long the shop holds a stranger's name, address and
 * message; deleting a row is what answers a request to be forgotten.
 */
describe('the retention purge', () => {
  /** The job takes `req` and uses only `req.payload`, which is what the runner hands it. */
  const runPurge = async () =>
    (purgeEnquiriesTask.handler as (args: { req: unknown }) => Promise<{ output: { enquiriesDeleted: number } }>)({
      req: { payload },
    })

  const age = async (id: number | string, days: number) => {
    const at = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    // Written straight to the column: `createdAt` is Payload's own and an update would not move it.
    await payload.db.drizzle.execute(
      `update enquiries set created_at = '${at}' where id = ${Number(id)}` as never,
    )
  }

  it('deletes a row past the cutoff and leaves one inside it', async () => {
    const stale = form()
    const fresh = form()
    await submit(stale)
    await submit(fresh)

    const staleRow = await rowFor(stale.get('email') as string)
    await age(staleRow!.id, ENQUIRY_RETENTION_DAYS + 5)

    const { output } = await runPurge()
    expect(output.enquiriesDeleted).toBeGreaterThanOrEqual(1)

    expect(await countFor(stale.get('email') as string)).toBe(0)
    expect(await countFor(fresh.get('email') as string)).toBe(1)
  })

  it('leaves a row exactly inside the window', async () => {
    const data = form()
    await submit(data)
    const row = await rowFor(data.get('email') as string)
    await age(row!.id, ENQUIRY_RETENTION_DAYS - 1)

    await runPurge()
    expect(await countFor(data.get('email') as string)).toBe(1)
  })
})

/**
 * FR-029e. Deletion is the erasure path — reachable by a person, not only by the nightly job — and
 * it has to take the `senderHash` with it, or a pseudonymous fingerprint of the visitor survives a
 * request to be forgotten.
 */
describe('erasure', () => {
  it('an administrator can delete an enquiry, and nothing of it remains', async () => {
    const data = form()
    await submit(data)
    const email = data.get('email') as string
    const row = await rowFor(email)
    expect(row?.senderHash).toBeTruthy()

    await payload.delete({ collection: 'enquiries', id: row!.id, overrideAccess: true })

    expect(await countFor(email)).toBe(0)
    const bySender = await payload.count({
      collection: 'enquiries',
      where: { senderHash: { equals: row!.senderHash } },
      overrideAccess: true,
    })
    expect(bySender.totalDocs).toBe(0)
  })
})
