import { DEFAULT_LOCALE, type Locale } from '@/i18n/routing'
import { countryName, type CountryCode } from '@/lib/countries'

/**
 * The view model for a saved delivery address, and the one line the profile draws it as
 * (spec 004, US5, FR-027).
 *
 * **Pure, and separate from `./queries.ts` for a reason that cost a test run to learn.** Both live
 * in `src/lib/catalog`'s shape — types beside queries — because a client component needs the shape
 * and the formatter, and must never reach the reader: `queries.ts` imports `@payload-config`, and a
 * single import of it from a `'use client'` file drags the whole Payload config into the browser
 * bundle, where it fails on Node built-ins. Nothing here imports Payload, so nothing here can.
 */
export interface CustomerAddress {
  addressLine1: string
  addressLine2: null | string
  apartment: null | string
  city: string
  country: CountryCode
  id: number
  isDefault: boolean
  postalCode: string
}

/**
 * One line, as the profile draws it: `Country, City, 1 Main Street` (node `266:5096`).
 *
 * The design's example has three parts, and this adds the two optional ones when they are filled.
 * That is a deliberate departure: the drawn row shows a customer with one address, and the whole
 * point of a list is telling two of them apart — two flats in one building differ by the apartment
 * and by nothing else, so a summary that omits it renders the same line twice.
 *
 * The postcode is left out. It distinguishes nothing a customer looks at, and it is the part of an
 * address most likely to push the line past the width of the box.
 */
export function formatAddress(address: CustomerAddress, locale: Locale = DEFAULT_LOCALE): string {
  return [
    // `countries.ts` has resolved names through `Intl.DisplayNames` since spec 004 and has
    // always taken this argument; spec 010 is simply the first caller to pass one (FR-040).
    countryName(address.country, locale),
    address.city,
    address.addressLine1,
    address.addressLine2,
    address.apartment,
  ]
    .filter(Boolean)
    .join(', ')
}

/**
 * The same address, for somebody who has to post an order to it (spec 005, T054, research R18).
 *
 * **Not `formatAddress`, and the difference is the postcode.** That one drops it deliberately, and
 * its reasoning is sound for the profile: the postcode distinguishes nothing a customer looks at,
 * and it is the part of an address most likely to push a line past the width of its box. For a
 * message to a seller arranging delivery, that reasoning inverts completely — the postcode is the
 * part the courier needs.
 *
 * Two functions rather than a flag on one, because they answer different questions: *"which of my
 * addresses is this?"* and *"where should this be sent?"*. A boolean that changed what an address
 * MEANS is the kind of parameter whose two call sites drift, and it would put the profile's careful
 * reasoning about line width next to a branch that ignores it.
 */
export function formatPostalAddress(
  address: CustomerAddress,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return [
    address.addressLine1,
    address.addressLine2,
    address.apartment,
    address.city,
    address.postalCode,
    // `countries.ts` has resolved names through `Intl.DisplayNames` since spec 004 and has
    // always taken this argument; spec 010 is simply the first caller to pass one (FR-040).
    countryName(address.country, locale),
  ]
    .filter(Boolean)
    .join(', ')
}
