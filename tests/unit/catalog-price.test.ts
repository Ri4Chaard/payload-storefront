import { describe, expect, it } from 'vitest'

import { formatPrice, minorUnitDigits } from '@/lib/catalog/price'

/**
 * Contract §5. The whole of this module's job is to be the only place money becomes a string, so
 * the tests are about the edges nobody looks at: the currency whose minor unit is not a hundredth,
 * the amount that is not whole, and the float that should never have arrived.
 */
describe('formatPrice', () => {
  it('drops the decimals on a whole amount, as the card draws it', () => {
    expect(formatPrice(2490000)).toBe('$24,900')
    expect(formatPrice(730000)).toBe('$7,300')
  })

  it('keeps them when there are cents, rather than rounding them away', () => {
    expect(formatPrice(2489950)).toBe('$24,899.50')
  })

  it('formats zero rather than treating it as absent', () => {
    expect(formatPrice(0)).toBe('$0')
  })

  it('respects the currency exponent instead of dividing by a hundred', () => {
    // 24900 yen is 24900 minor units, not 249.
    expect(minorUnitDigits('JPY')).toBe(0)
    expect(formatPrice(24900, 'JPY')).toBe('¥24,900')
  })

  it('formats in the locale it is given', () => {
    // The separator before the symbol is a non-breaking space — writing a plain one here passes in
    // review and fails in CI, which is the whole reason this assertion is spelled out.
    expect(formatPrice(2490000, 'EUR', 'de-DE')).toBe('24.900\u00a0\u20ac')
  })

  it('refuses a fractional amount instead of rendering a plausible one', () => {
    expect(() => formatPrice(2490000.5)).toThrow(/integer count of minor units/)
    expect(() => formatPrice(Number.NaN)).toThrow(/integer count of minor units/)
  })
})
