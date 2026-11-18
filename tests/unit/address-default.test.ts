import { describe, expect, it, vi } from 'vitest'

import {
  assignFirstAddressAsDefault,
  clearOtherDefaults,
  keepOneDefault,
  promoteDefaultAfterDelete,
} from '@/fields/address-hooks'

/**
 * FR-031 — exactly one address is the default, at any time.
 *
 * **Unit rather than integration, because what is being tested is the DECISION.** The companion
 * suite `tests/integration/us5-addresses.test.ts` runs the same hooks against a real collection and
 * proves the invariant holds end to end; that is the slower, truer test, and it cannot tell you
 * which of the four hooks made a given call or that a hook stayed its hand. These can: every one
 * below asserts either the write that was issued or that none was.
 *
 * The stubs are cast through `unknown` rather than typed `any` — the repo bans the latter, and a
 * hook argument has some thirty fields of which each hook reads three.
 */
type BeforeArgs = Parameters<typeof assignFirstAddressAsDefault>[0]
type AfterChangeArgs = Parameters<typeof clearOtherDefaults>[0]
type AfterDeleteArgs = Parameters<typeof promoteDefaultAfterDelete>[0]

const asArgs = <T>(value: object): T => value as unknown as T

/** A `req` carrying only the two Payload calls these hooks make. */
function stubReq(payload: Record<string, unknown>) {
  return { payload }
}

describe('the first address becomes the default', () => {
  it('sets isDefault on a create when the customer has none', async () => {
    const count = vi.fn().mockResolvedValue({ totalDocs: 0 })

    const result = await assignFirstAddressAsDefault(
      asArgs<BeforeArgs>({
        data: { city: 'Astana', customer: 7 },
        operation: 'create',
        req: stubReq({ count }),
      }),
    )

    expect(result).toMatchObject({ isDefault: true })
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customer: { equals: 7 } } }),
    )
  })

  it('leaves a second address alone, whatever the box said', async () => {
    const count = vi.fn().mockResolvedValue({ totalDocs: 1 })

    const result = await assignFirstAddressAsDefault(
      asArgs<BeforeArgs>({
        data: { city: 'Dubai', customer: 7, isDefault: false },
        operation: 'create',
        req: stubReq({ count }),
      }),
    )

    expect(result).toMatchObject({ isDefault: false })
  })

  it('does not count on an update — only a create can be a first address', async () => {
    const count = vi.fn()

    await assignFirstAddressAsDefault(
      asArgs<BeforeArgs>({
        data: { city: 'Astana', customer: 7 },
        operation: 'update',
        req: stubReq({ count }),
      }),
    )

    expect(count).not.toHaveBeenCalled()
  })

  /**
   * The plugin's own `beforeChange` assigns `customer` from `req.user`, and ours runs after it. If
   * it ever did not — an admin creating a row with no customer chosen — counting addresses for
   * "nobody" would mark that row the default for every customer who has none.
   */
  it('does nothing when the row has no owner yet', async () => {
    const count = vi.fn()

    const result = await assignFirstAddressAsDefault(
      asArgs<BeforeArgs>({ data: { city: 'Astana' }, operation: 'create', req: stubReq({ count }) }),
    )

    expect(result).not.toHaveProperty('isDefault')
    expect(count).not.toHaveBeenCalled()
  })
})

describe('marking a default clears the previous one', () => {
  it('clears every other default the same customer holds', async () => {
    const update = vi.fn().mockResolvedValue({})

    await clearOtherDefaults(
      asArgs<AfterChangeArgs>({
        doc: { customer: 7, id: 42, isDefault: true },
        req: stubReq({ update }),
      }),
    )

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isDefault: false },
        where: {
          and: [
            { customer: { equals: 7 } },
            { id: { not_equals: 42 } },
            { isDefault: { equals: true } },
          ],
        },
      }),
    )
  })

  /**
   * This is what stops the recursion the hook's own docblock promises: the updates it issues fire
   * this hook again, and every one of those documents is being set to `isDefault: false`.
   */
  it('issues nothing for a row that is not becoming the default', async () => {
    const update = vi.fn()

    await clearOtherDefaults(
      asArgs<AfterChangeArgs>({
        doc: { customer: 7, id: 42, isDefault: false },
        req: stubReq({ update }),
      }),
    )

    expect(update).not.toHaveBeenCalled()
  })

  it('resolves the owner when the relationship arrives populated', async () => {
    const update = vi.fn().mockResolvedValue({})

    await clearOtherDefaults(
      asArgs<AfterChangeArgs>({
        doc: { customer: { email: 'ada@example.test', id: 7 }, id: 42, isDefault: true },
        req: stubReq({ update }),
      }),
    )

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          and: expect.arrayContaining([{ customer: { equals: 7 } }]),
        }),
      }),
    )
  })
})

describe('a customer is never left with no default', () => {
  const counting = (totalDocs: number) => vi.fn().mockResolvedValue({ totalDocs })

  it('puts the value back when the last default is cleared', async () => {
    const count = counting(0)

    const result = await keepOneDefault(
      asArgs<BeforeArgs>({
        data: { city: 'Astana', isDefault: false },
        operation: 'update',
        originalDoc: { customer: 7, id: 42, isDefault: true },
        req: stubReq({ count }),
      }),
    )

    expect(result).toMatchObject({ isDefault: true })
  })

  /**
   * The write `clearOtherDefaults` issues during a hand-off. Allowing it is what keeps the two
   * hooks from clearing and restoring the same pair of rows forever — the case that hung an
   * integration test before this condition existed.
   */
  it('allows the clearing write when another address already holds the role', async () => {
    const count = counting(1)

    const result = await keepOneDefault(
      asArgs<BeforeArgs>({
        data: { isDefault: false },
        operation: 'update',
        originalDoc: { customer: 7, id: 42, isDefault: true },
        req: stubReq({ count }),
      }),
    )

    expect(result).toMatchObject({ isDefault: false })
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          and: [
            { customer: { equals: 7 } },
            { id: { not_equals: 42 } },
            { isDefault: { equals: true } },
          ],
        },
      }),
    )
  })

  it('leaves an edit that does not touch the box alone', async () => {
    const count = counting(0)

    const result = await keepOneDefault(
      asArgs<BeforeArgs>({
        data: { city: 'Almaty' },
        operation: 'update',
        originalDoc: { customer: 7, id: 42, isDefault: true },
        req: stubReq({ count }),
      }),
    )

    expect(result).toEqual({ city: 'Almaty' })
    expect(count).not.toHaveBeenCalled()
  })

  it('lets a non-default row stay non-default', async () => {
    const count = counting(0)

    const result = await keepOneDefault(
      asArgs<BeforeArgs>({
        data: { isDefault: false },
        operation: 'update',
        originalDoc: { customer: 7, id: 42, isDefault: false },
        req: stubReq({ count }),
      }),
    )

    expect(result).toMatchObject({ isDefault: false })
    expect(count).not.toHaveBeenCalled()
  })

  it('does not apply to a create — the first-address hook owns that', async () => {
    const count = counting(0)

    const result = await keepOneDefault(
      asArgs<BeforeArgs>({
        data: { isDefault: false },
        operation: 'create',
        originalDoc: { customer: 7, id: 42, isDefault: true },
        req: stubReq({ count }),
      }),
    )

    expect(result).toMatchObject({ isDefault: false })
    expect(count).not.toHaveBeenCalled()
  })
})

describe('deleting the default promotes another', () => {
  it('promotes the most recently created survivor', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 9 }] })
    const update = vi.fn().mockResolvedValue({})

    await promoteDefaultAfterDelete(
      asArgs<AfterDeleteArgs>({
        doc: { customer: 7, id: 42, isDefault: true },
        req: stubReq({ find, update }),
      }),
    )

    expect(find).toHaveBeenCalledWith(expect.objectContaining({ sort: '-createdAt' }))
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isDefault: true }, id: 9 }),
    )
  })

  it('promotes nobody when that was the customer’s last address', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] })
    const update = vi.fn()

    await promoteDefaultAfterDelete(
      asArgs<AfterDeleteArgs>({
        doc: { customer: 7, id: 42, isDefault: true },
        req: stubReq({ find, update }),
      }),
    )

    expect(update).not.toHaveBeenCalled()
  })

  it('does nothing when the deleted address was not the default', async () => {
    const find = vi.fn()

    await promoteDefaultAfterDelete(
      asArgs<AfterDeleteArgs>({
        doc: { customer: 7, id: 42, isDefault: false },
        req: stubReq({ find }),
      }),
    )

    expect(find).not.toHaveBeenCalled()
  })
})
