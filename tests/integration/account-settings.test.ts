import { describe, expect, it } from 'vitest'

import { resolveAccountSettings } from '@/lib/auth/settings'

/**
 * Spec 004, R11 — the account settings global.
 *
 * Every case here is a state the admin UI can actually produce, which is the bar for testing a
 * resolver: an unsaved global, a value left over from a narrowed enum, and a countries list that
 * forgot to include the country the form starts on.
 *
 * In the integration suite rather than the unit one only because `settings.ts` reaches the Payload
 * config for the read beside it, and the unit runner has no environment. The function under test
 * touches nothing.
 */
describe('resolveAccountSettings', () => {
  it('falls back to the code default before anyone has saved the global', () => {
    const settings = resolveAccountSettings({})

    expect(settings.defaultCountry).toBe('AE')
    expect(settings.shippingCountries).toEqual([])
  })

  it('keeps a saved country and a saved list', () => {
    const settings = resolveAccountSettings({
      defaultCountry: 'KZ',
      shippingCountries: ['KZ', 'AE', 'GB'],
    })

    expect(settings.defaultCountry).toBe('KZ')
    expect(settings.shippingCountries).toEqual(['KZ', 'AE', 'GB'])
  })

  it('drops a country that is no longer a country', () => {
    const settings = resolveAccountSettings({
      defaultCountry: 'XX',
      shippingCountries: ['AE', 'XX', 'GB'],
    })

    expect(settings.defaultCountry).toBe('AE')
    expect(settings.shippingCountries).not.toContain('XX')
  })

  it('never offers a list that excludes the country the form starts on', () => {
    // Otherwise the address form renders a select whose value is not among its options — invalid
    // from the moment it appears, and blamed on the form rather than on the setting.
    const settings = resolveAccountSettings({
      defaultCountry: 'AE',
      shippingCountries: ['GB', 'US'],
    })

    expect(settings.shippingCountries).toContain('AE')
    expect(settings.defaultCountry).toBe('AE')
  })

  it('leaves an empty list empty — that means every country, not none', () => {
    expect(resolveAccountSettings({ shippingCountries: [] }).shippingCountries).toEqual([])
  })
})
