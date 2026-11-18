import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { nameSchema } from '@/lib/auth/schemas'

/**
 * US4 — the profile.
 *
 * **`updateName` is not called here, and the reason is the same seam US2 and US3 record.** The
 * action opens with `requireCustomer()`, which reads `next/headers`; there is no request in a test
 * runner. What the action actually does once past that line is two things, and both are tested:
 * the write lands on the signed-in customer and nobody else — which
 * `tests/integration/account-access.test.ts` proves at the access layer, where FR-026 requires it to
 * live — and the composed `name` keeps up, which is a hook and is tested below through a real write.
 *
 * The hook is worth its own tests rather than being taken on trust from the profile screen: it is
 * the only thing keeping a field three other surfaces already read (`useAsTitle`, the admin list,
 * the seller's view of a customer) in step with the two the customer edits.
 */

const payload = await getPayload({ config })

const fresh = () =>
  `us4-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@us4.aurum-testing.dev`

async function customer(data: Record<string, unknown> = {}) {
  return payload.create({
    collection: 'customers',
    data: { email: fresh(), password: 'a-long-enough-password', ...data },
    disableVerificationEmail: true,
    overrideAccess: true,
  })
}

const reread = async (id: number) =>
  payload.findByID({ collection: 'customers', id, overrideAccess: true })

const setName = async (id: number, data: Record<string, unknown>) =>
  payload.update({ collection: 'customers', data, id, overrideAccess: true })

afterAll(async () => {
  await payload.delete({
    collection: 'customers',
    overrideAccess: true,
    where: { email: { like: '@us4.aurum-testing.dev' } },
  })
})

describe('the composed name', () => {
  it('joins the two halves the customer edits', async () => {
    const created = await customer()
    await setName(created.id, { firstName: 'Ada', lastName: 'Lovelace' })

    expect((await reread(created.id)).name).toBe('Ada Lovelace')
  })

  it('keeps a customer who gives only one half', async () => {
    // FR-024 does not require both. Someone with a mononym must still be able to save it.
    const created = await customer()
    await setName(created.id, { firstName: 'Prince', lastName: '' })

    expect((await reread(created.id)).name).toBe('Prince')
  })

  /**
   * The failure this guards against: a partial update carrying only `firstName` recomposing `name`
   * from that half alone and silently dropping the surname. The hook reads the missing half from
   * `originalDoc`, and this is the assertion that says so.
   */
  it('does not lose the half that was not submitted', async () => {
    const created = await customer()
    await setName(created.id, { firstName: 'Ada', lastName: 'Lovelace' })
    await setName(created.id, { firstName: 'Augusta' })

    const after = await reread(created.id)
    expect(after.lastName).toBe('Lovelace')
    expect(after.name).toBe('Augusta Lovelace')
  })

  it('clears the composed name when the customer empties both halves', async () => {
    const created = await customer()
    await setName(created.id, { firstName: 'Ada', lastName: 'Lovelace' })
    await setName(created.id, { firstName: '', lastName: '' })

    expect((await reread(created.id)).name).toBeFalsy()
  })

  it('leaves the name alone when a write touches neither half', async () => {
    // Saving the marketing switch must not recompute, and must not blank, the name (US6 writes here).
    const created = await customer({ firstName: 'Ada', lastName: 'Lovelace' })
    await setName(created.id, { marketingEmail: true })

    expect((await reread(created.id)).name).toBe('Ada Lovelace')
  })
})

/**
 * Both halves optional, bounded at the top. A `min(1)` would turn "I would rather you did not store
 * my surname" into a validation error, which is not a rule anyone asked for.
 */
describe('nameSchema', () => {
  it('accepts an empty half, and trims', () => {
    const parsed = nameSchema.safeParse({ firstName: '  Ada  ', lastName: '' })
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.firstName).toBe('Ada')
  })

  it('refuses a paste of something that is not a name', () => {
    const parsed = nameSchema.safeParse({ firstName: 'a'.repeat(101), lastName: '' })
    expect(parsed.success).toBe(false)
    expect(parsed.success === false && parsed.error.issues[0]?.message).toBe('nameTooLong')
  })
})
