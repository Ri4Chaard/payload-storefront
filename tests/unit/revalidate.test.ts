import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath }))

const { revalidateGlobalOnChange, revalidateOnChange, revalidateOnDelete, skipRevalidation } =
  await import('@/lib/revalidate')

/**
 * 003/T294. These are about the rules the caching strategy rests on: that a write in the admin
 * invalidates every cached path by name, that a piece which has left an address takes its page with
 * it, and that a write from a process with no request scope invalidates nothing rather than
 * throwing.
 *
 * The hooks are called with only the arguments they read. Payload passes a great deal more, and a
 * test that assembled a whole `PayloadRequest` would be asserting the shape of Payload's arguments
 * rather than the behaviour of this module.
 */
const CATALOGUE = [{ slug: 'first-piece' }, { slug: 'second-piece' }]
const find = vi.fn(async () => ({ docs: CATALOGUE }))
const req = { payload: { find } }

const change = (args: Record<string, unknown> = {}) =>
  revalidateOnChange({ collection: { slug: 'products' }, context: {}, req, ...args } as never)

describe('revalidation hooks', () => {
  beforeEach(() => revalidatePath.mockClear())

  it('names the home page and every product page, one literal path at a time', async () => {
    await change()

    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/products/first-piece')
    expect(revalidatePath).toHaveBeenCalledWith('/products/second-piece')
    // Not `/products/[slug]`. The pattern form leaves a prerendered page untouched, which is every
    // published piece — see the note on `invalidate`.
    expect(revalidatePath).not.toHaveBeenCalledWith('/products/[slug]', 'page')
  })

  it('asks for drafts too, so an unpublished piece stops being served', async () => {
    await change()
    expect(find).toHaveBeenCalledWith(
      expect.not.objectContaining({ overrideAccess: expect.anything() }),
    )
  })

  it('invalidates the address a renamed piece has left behind', async () => {
    await change({ doc: { slug: 'new-address' }, previousDoc: { slug: 'old-address' } })
    expect(revalidatePath).toHaveBeenCalledWith('/products/old-address')
  })

  it('leaves other collections alone when their own slugs change', async () => {
    await change({
      collection: { slug: 'categories' },
      doc: { slug: 'bands' },
      previousDoc: { slug: 'rings' },
    })
    expect(revalidatePath).not.toHaveBeenCalledWith('/products/rings')
  })

  it('invalidates a deleted piece, which the catalogue query can no longer name', async () => {
    await revalidateOnDelete({
      collection: { slug: 'products' },
      context: {},
      doc: { slug: 'gone-for-good' },
      req,
    } as never)

    expect(revalidatePath).toHaveBeenCalledWith('/products/gone-for-good')
  })

  it('returns the document from the global hook, which Payload requires', async () => {
    const doc = { detailsTitle: 'PRODUCT DETAILS' }
    expect(await revalidateGlobalOnChange({ context: {}, doc, req } as never)).toBe(doc)
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  /**
   * The seed runs under `payload run`, where `revalidatePath` throws `Invariant: static generation
   * store missing` rather than doing nothing. Without this flag `pnpm seed` would fail on its first
   * write.
   */
  it('does nothing at all for a write that says it is not a publish', async () => {
    await change({ context: skipRevalidation })
    await revalidateOnDelete({ collection: { slug: 'products' }, context: skipRevalidation, req } as never)
    await revalidateGlobalOnChange({ context: skipRevalidation, doc: {}, req } as never)

    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
