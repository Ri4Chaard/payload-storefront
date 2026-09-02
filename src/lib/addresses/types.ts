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
 * One line, as the profile draws it: `Kazakhstan, Astana, Mangilik el 22` (node `266:5096`).
 *
 * The design's example has three parts, and this adds the two optional ones when they are filled.
 * That is a deliberate departure: the drawn row shows a customer with one address, and the whole
 * point of a list is telling two of them apart — two flats in one building differ by the apartment
 * and by nothing else, so a summary that omits it renders the same line twice.
 *
 * The postcode is left out. It distinguishes nothing a customer looks at, and it is the part of an
 * address most likely to push the line past the width of the box.
 */
export function formatAddress(address: CustomerAddress): string {
  return [
    countryName(address.country),
    address.city,
    address.addressLine1,
    address.addressLine2,
    address.apartment,
  ]
    .filter(Boolean)
    .join(', ')
}
