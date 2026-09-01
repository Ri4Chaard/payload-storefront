import { describe, expect, it } from 'vitest'

import { COUNTRY_CODES, countryName, countryOptions } from '@/lib/countries'

/**
 * research R6. The e-commerce plugin ships a forty-country list containing neither Kazakhstan nor
 * the UAE — the shop's own market, and the country in the sample address the design draws. That is
 * the regression this file exists to catch, because it would come back silently on a plugin
 * upgrade that reset `supportedCountries`.
 */
describe('country list', () => {
  it('includes the two countries the plugin default omits', () => {
    expect(COUNTRY_CODES).toContain('KZ')
    expect(COUNTRY_CODES).toContain('AE')
  })

  it('can save the address the design itself draws', () => {
    // "Kazakhstan, Astana, Mangilik el 22" — profile design, node 266:5096.
    expect(countryOptions().some((o) => o.value === 'KZ' && o.label === 'Kazakhstan')).toBe(true)
  })

  it('has no duplicate codes', () => {
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length)
  })

  it('resolves a display name for every single code', () => {
    // A code with no Intl name would render as the raw code in the dropdown.
    const unnamed = COUNTRY_CODES.filter((code) => countryName(code) === code)
    expect(unnamed).toEqual([])
  })

  it('sorts by localized name rather than by code', () => {
    const labels = countryOptions().map((o) => o.label)
    expect(labels[0]).toBe('Afghanistan')
    expect(labels.at(-1)).toBe('Zimbabwe')
  })

  it('collates accents where a reader expects them, not after Z', () => {
    // The default sort compares UTF-16 code units and puts "Åland Islands" past "Zimbabwe".
    const labels = countryOptions().map((o) => o.label)
    expect(labels.indexOf('Åland Islands')).toBeLessThan(labels.indexOf('Albania'))
  })

  it('localizes the names rather than hardcoding English', () => {
    expect(countryName('DE', 'de')).toBe('Deutschland')
    expect(countryName('DE', 'en')).toBe('Germany')
  })
})
