import { describe, expect, it } from 'vitest'

import { slugField } from '@/fields/slug'

/**
 * A Cyrillic title must produce an address.
 *
 * **This is a regression test for a defect that did not exist yet.** Before spec 010, `slugify`
 * stripped everything outside `a-z0-9`, so a Russian title reduced to the empty string against a
 * field that is `required` and `unique` — an unexplained save error the first time the owner created
 * a document while editing in Russian. Nothing in the old test suite could have caught it, because
 * nothing entered a Cyrillic title.
 *
 * The hook is reached through the field config rather than by exporting `slugify`: what matters is
 * what Payload actually calls.
 */
const derive = (title: string): unknown => {
  // `Field` is a union covering layout fields that have no hooks at all; `slugField` always returns
  // the named text variant, so the narrowing is safe and the cast says which member it is.
  const field = slugField() as Extract<ReturnType<typeof slugField>, { hooks?: unknown }>
  const hook = field.hooks?.beforeValidate?.[0]
  if (!hook) throw new Error('slugField lost its beforeValidate hook')
  return hook({ value: undefined, data: { title }, operation: 'create' } as never)
}

describe('slug derivation', () => {
  it('leaves an English title as it always did', () => {
    expect(derive('Summer Jacket')).toBe('summer-jacket')
    expect(derive('Shipping & Returns')).toBe('shipping-returns')
  })

  it('transliterates a Ukrainian title instead of emptying it', () => {
    expect(derive('Зимова куртка')).toBe('zimova-kurtka')
  })

  it('transliterates a Russian title, guillemets and all', () => {
    // «» are removed rather than turned into separators, or the name would gain a leading dash.
    expect(derive('Куртка «Парагон»')).toBe('kurtka-paragon')
  })

  it('handles the letters the two alphabets do not share', () => {
    expect(derive('Їжак')).toBe('yizhak')
    expect(derive('Объезд')).toBe('obezd')
    expect(derive('Щука')).toBe('shchuka')
  })

  it('never produces an empty or non-conforming slug from a titled document', () => {
    for (const title of ['Куртка', 'Jacket', 'Пальто XL', 'Шапка — вовна']) {
      const slug = derive(title)
      expect(typeof slug).toBe('string')
      expect(slug as string).toMatch(/^[a-z0-9-]+$/)
    }
  })
})
