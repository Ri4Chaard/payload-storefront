import config from '@payload-config'
import { cache } from 'react'
import { getPayload } from 'payload'

import { DEFAULT_COUNTRY, isCountryCode, type CountryCode } from '@/lib/countries'

/**
 * The `account-settings` global — how the accounts feature behaves (spec 004, R11).
 *
 * The copy that used to sit beside these values is gone; see `src/lib/auth/copy.ts` for why. What
 * remains is the handful of decisions that belong to the shop owner rather than to the code.
 *
 * **Returns a view model, not the document.** Every field on the generated type is nullable —
 * Payload cannot promise a global row exists before anyone has saved it — so consuming the document
 * directly would push a `?? 'AE'` into every call site, which is how three of them end up
 * disagreeing about the default. The fallbacks are resolved once, in `resolveAccountSettings`.
 */
export interface AccountSettings {
  /** Pre-selected in the address form. Falls back to the code default when unset (FR-030). */
  defaultCountry: CountryCode
  /** Whether the registration form asks for marketing consent at all. */
  marketingEnabled: boolean
  /** Empty means every country. Never excludes the default, which would be unofferable. */
  shippingCountries: CountryCode[]
}

/** The shape this needs out of the global, kept structural so the generated type is not imported. */
interface RawSettings {
  defaultCountry?: null | string
  marketingEnabled?: boolean | null
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
    // Absent rather than false is the state of a global nobody has saved yet, and the field's
    // default is on — so an unsaved global must read as on, not as off.
    marketingEnabled: doc.marketingEnabled !== false,
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
 * Memoized with React's `cache` for the same reason the DAL is: a page, its form and its country
 * dropdown all want the same three values, and that should be one read.
 */
export const getAccountSettings = cache(async (): Promise<AccountSettings> => {
  const payload = await getPayload({ config })
  return resolveAccountSettings(
    await payload.findGlobal({ slug: 'account-settings', overrideAccess: true }),
  )
})
