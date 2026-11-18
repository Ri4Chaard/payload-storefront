import { describe, expect, it } from 'vitest'

import type { CartLineView, CartView } from '@/lib/cart/types'
import { LINK_BUDGET, buildLink } from '@/lib/messengers/links'
import { composeMessage } from '@/lib/messengers/message'

/**
 * The cart becomes text —
 * [messenger-handoff.md §3](../../specs/005-checkout-handoff/contracts/messenger-handoff.md).
 * FR-022, FR-026, FR-028, FR-028a, FR-043 – FR-045. SC-002, SC-004, SC-013, SC-015.
 *
 * **The Cyrillic block near the bottom is the reason this file is worth reading.** The budget is
 * measured on the percent-encoded link, where one Cyrillic character costs six — so the same
 * twenty-line cart fits comfortably in English and does not in Russian. A test suite written only
 * in Latin would report a truncation rule that works and ship one that never fires for the market
 * this shop actually sells into.
 */

const TEMPLATE = `Hello Aurum, I would like to order:

{{items}}

Total: {{total}}

{{customer}}`

const line = (over: Partial<CartLineView> = {}): CartLineView => ({
  id: 'row-1',
  title: 'Product 3',
  href: '/products/product-3',
  image: null,
  variantChoice: null,
  unitPrice: '$24,900',
  lineTotal: '$24,900',
  unitMinor: 2490000,
  quantity: 1,
  maxQuantity: undefined,
  available: true,
  ...over,
})

const cart = (lines: CartLineView[], subtotal = '$24,900'): CartView => ({
  lines,
  itemCount: lines.reduce((n, l) => n + l.quantity, 0),
  subtotal,
  shipping: '$0',
  currency: 'USD',
  issues: [],
  empty: lines.length === 0,
})

describe('what the seller is told (SC-002)', () => {
  it('names every product, its option and how many', () => {
    const message = composeMessage(
      cart([
        line({
          id: 'a',
          title: 'Product 1',
          variantChoice: 'Option B',
          quantity: 2,
          lineTotal: '$76,640',
        }),
        line({ id: 'b' }),
      ]),
      TEMPLATE,
      null,
    )

    expect(message).toContain('2 × Product 1')
    expect(message).toContain('Option B')
    expect(message).toContain('$76,640')
    expect(message).toContain('1 × Product 3')
  })

  it('works for a product with one option and for one with neither', () => {
    const variantOnly = composeMessage(
      cart([line({ variantChoice: 'Option A' })]),
      TEMPLATE,
      null,
    )
    expect(variantOnly).toContain('— Option A —')

    const neither = composeMessage(cart([line()]), TEMPLATE, null)
    expect(neither).toContain('1 × Product 3 — $24,900')
    // No dangling separator where the options would have been.
    expect(neither).not.toMatch(/Product 3 —\s+—/)
  })

  it('carries the total', () => {
    expect(composeMessage(cart([line()], '$63,220'), TEMPLATE, null)).toContain('Total: $63,220')
  })

  /** The seller must not be sent a request for a product the customer was just told is gone. */
  it('leaves out a line the loader flagged unavailable', () => {
    const message = composeMessage(
      cart([line({ id: 'a' }), line({ id: 'b', title: 'Withdrawn Product', available: false })]),
      TEMPLATE,
      null,
    )

    expect(message).toContain('Product 3')
    expect(message).not.toContain('Withdrawn Product')
  })
})

describe('the customer block (FR-043 – FR-045, SC-013)', () => {
  const one = cart([line()])

  it('carries a saved name and delivery address', () => {
    const message = composeMessage(one, TEMPLATE, {
      name: 'Aisha Karimova',
      address: 'Mangilik el 22, Astana, 010000, Kazakhstan',
    })

    expect(message).toContain('Name: Aisha Karimova')
    expect(message).toContain('Delivery address: Mangilik el 22, Astana, 010000, Kazakhstan')
  })

  it('degrades per field, not per auth state', () => {
    const nameOnly = composeMessage(one, TEMPLATE, { name: 'Aisha Karimova', address: null })
    expect(nameOnly).toContain('Name: Aisha Karimova')
    expect(nameOnly).not.toContain('Delivery address')

    const addressOnly = composeMessage(one, TEMPLATE, { name: null, address: 'Astana' })
    expect(addressOnly).toContain('Delivery address: Astana')
    expect(addressOnly).not.toContain('Name:')
  })

  /**
   * SC-013's exact claim: a customer who registered and never filled in their profile produces the
   * same message an anonymous visitor does. One rule, not four states.
   */
  it('produces an identical message for an anonymous visitor and a profile-less customer', () => {
    const anonymous = composeMessage(one, TEMPLATE, null)
    const emptyProfile = composeMessage(one, TEMPLATE, { name: null, address: null })

    expect(emptyProfile).toBe(anonymous)
  })

  it('collapses the placeholder without leaving a ragged gap behind it', () => {
    const message = composeMessage(one, TEMPLATE, null)

    expect(message).not.toContain('{{customer}}')
    expect(message).not.toMatch(/\n{3,}/)
    expect(message.endsWith('Total: $24,900')).toBe(true)
  })

  it('leaves no placeholder unsubstituted, whatever the template says', () => {
    const message = composeMessage(one, 'A {{items}} B {{total}} C {{customer}} D', null)
    expect(message).not.toMatch(/\{\{\w+\}\}/)
  })
})

describe('the length budget (FR-028, FR-028a, SC-015)', () => {
  const longCart = (title: string, count: number) =>
    cart(Array.from({ length: count }, (_, i) => line({ id: `row-${i}`, title })))

  const linkLength = (message: string) =>
    buildLink('telegram', 'a'.repeat(32), message).href.length

  it('leaves an ordinary cart alone', () => {
    const message = composeMessage(longCart('Product 3', 3), TEMPLATE, null)
    expect(message).not.toContain('more items')
    expect(linkLength(message)).toBeLessThanOrEqual(LINK_BUDGET)
  })

  /**
   * The whole point. Twenty Cyrillic lines blow the budget; the same twenty in Latin do not. A
   * `message.length` check would treat them identically and truncate neither.
   */
  it('truncates a twenty-line Cyrillic cart and leaves the Latin one untouched', () => {
    const cyrillic = composeMessage(longCart('Шерстяное пальто с капюшоном', 20), TEMPLATE, null)
    const latin = composeMessage(longCart('A product with a Latin title', 20), TEMPLATE, null)

    expect(cyrillic).toMatch(/more items in my cart/)
    expect(latin).not.toContain('more items')

    // And both fit — which is the assertion that matters, not merely that one was cut.
    expect(linkLength(cyrillic)).toBeLessThanOrEqual(LINK_BUDGET)
    expect(linkLength(latin)).toBeLessThanOrEqual(LINK_BUDGET)
  })

  it('measures the encoded link, not the message — the two disagree by a factor of six', () => {
    const cyrillic = composeMessage(longCart('Шерстяное пальто с капюшоном', 20), TEMPLATE, null)

    // Comfortably inside the budget as a string, and only inside it as a URL because it was cut.
    expect(cyrillic.length).toBeLessThan(LINK_BUDGET)
    expect(linkLength(cyrillic)).toBeGreaterThan(cyrillic.length * 3)
  })

  it('cuts at a line boundary and says how many items it dropped', () => {
    const message = composeMessage(longCart('Шерстяное пальто с капюшоном', 20), TEMPLATE, null)
    const dropped = message.match(/…and (\d+) more items in my cart/)

    expect(dropped).not.toBeNull()
    const listed = message.split('\n').filter((row) => row.startsWith('1 × ')).length
    expect(listed + Number(dropped![1])).toBe(20)

    // Never a title cut in half.
    for (const row of message.split('\n')) {
      if (row.startsWith('1 × ')) expect(row).toContain('Шерстяное пальто с капюшоном')
    }
  })

  it('survives a single product too long to fit at all, rather than looping', () => {
    const message = composeMessage(longCart('З'.repeat(600), 1), TEMPLATE, null)
    expect(linkLength(message)).toBeLessThanOrEqual(LINK_BUDGET)
    expect(message).toContain('more item')
  })
})

describe('composing is deterministic (FR-026, SC-004)', () => {
  it('produces the same message every time from the same cart', () => {
    const one = cart([line({ variantChoice: 'Option B' })])
    const customer = { name: 'Aisha Karimova', address: 'Astana' }

    const first = composeMessage(one, TEMPLATE, customer)
    const second = composeMessage(one, TEMPLATE, customer)

    expect(second).toBe(first)
  })
})

/**
 * A BUY NOW message (T067).
 *
 * One product, its chosen options, and the total for that product alone — never whatever else the
 * customer happens to be holding.
 */
describe('a single-product message', () => {
  it('describes exactly one product with its chosen options', () => {
    const message = composeMessage(
      cart(
        [
          line({
            title: 'Product 1',
            variantChoice: 'Option B',
            quantity: 1,
            lineTotal: '$38,320',
          }),
        ],
        '$38,320',
      ),
      TEMPLATE,
      null,
    )

    const items = message.split('\n').filter((row) => /^\d+ × /.test(row))
    expect(items).toHaveLength(1)
    expect(items[0]).toContain('Option B')
    expect(message).toContain('Total: $38,320')
  })
})
