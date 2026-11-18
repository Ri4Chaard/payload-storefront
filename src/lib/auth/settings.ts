import config from '@payload-config'
import { cache } from 'react'
import { getPayload } from 'payload'

import {
  DEFAULT_COUNTRY,
  countryOptions,
  isCountryCode,
  type CountryCode,
  type CountryOption,
} from '@/lib/countries'

/**
 * The `account-settings` global — how the accounts feature behaves.
 *
 * The copy that used to sit beside these values is gone — it lives in the screens that render it.
 * What remains is the handful of decisions that belong to the shop owner rather than to the code.
 *
 * **Returns a view model, not the document.** Every field on the generated type is nullable —
 * Payload cannot promise a global row exists before anyone has saved it — so consuming the document
 * directly would push a `?? 'AE'` into every call site, which is how three of them end up
 * disagreeing about the default. The fallbacks are resolved once, in `resolveAccountSettings`.
 */
export interface AccountSettings {
  /** Pre-selected in the address form. Falls back to the code default when unset. */
  defaultCountry: CountryCode
  /** Empty means every country. Never excludes the default, which would be unofferable. */
  shippingCountries: CountryCode[]
}

/** The shape this needs out of the global, kept structural so the generated type is not imported. */
interface RawSettings {
  defaultCountry?: null | string
  shippingCountries?: null | string[]
}

/**
 * Pure, and separate from the read so it can be tested without a database.
 *
 * Three things are decided here, and each of them is a state the admin UI can genuinely produce:
 * an unsaved global, a country that is no longer in the enum, and a narrowed list that forgot to
 * include the default.
 */
export function resolveAccountSettings(doc: RawSettings): AccountSettings {
  const defaultCountry = isCountryCode(doc.defaultCountry) ? doc.defaultCountry : DEFAULT_COUNTRY
  const offered = (doc.shippingCountries ?? []).filter(isCountryCode)

  return {
    defaultCountry,
    /**
     * A narrowed list that somehow omits the default would render a form whose pre-selected value
     * is not among its options — a control invalid the moment it appears. Cheaper to make that
     * unrepresentable here than to explain it in the form.
     */
    shippingCountries:
      offered.length > 0 && !offered.includes(defaultCountry)
        ? [defaultCountry, ...offered]
        : offered,
  }
}

/**
 * The countries the address form may offer.
 *
 * An empty `shippingCountries` means every country rather than none — the global's own description
 * says so, and a shop that has never opened the settings page must still be able to take an
 * address. `resolveAccountSettings` has already guaranteed the default is a member of a narrowed
 * list, so the pre-selection is always one of these.
 *
 * Pure, and separate from the form, because the form is a client component: this runs on the
 * server and hands down the finished list.
 */
export function offeredCountries(settings: AccountSettings): CountryOption[] {
  const options = countryOptions()
  if (settings.shippingCountries.length === 0) return options

  const offered = new Set<string>(settings.shippingCountries)
  return options.filter((option) => offered.has(option.value))
}

/**
 * Memoized with React's `cache` for the same reason the DAL is: a page, its form and its country
 * dropdown all want the same three values, and that should be one read.
 */
export const getAccountSettings = cache(async (): Promise<AccountSettings> => {
  const payload = await getPayload({ config })
  return resolveAccountSettings(
    await payload.findGlobal({ slug: 'account-settings', overrideAccess: true }),
  )
})
