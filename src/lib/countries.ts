/**
 * Every country, as ISO 3166-1 alpha-2 codes (spec 004, research R6).
 *
 * **Why this file exists at all.** The e-commerce plugin ships `defaultCountries`, and it has forty
 * entries containing neither Kazakhstan nor the United Arab Emirates. The shop's own address in the
 * footer is in Dubai, and the sample address drawn in the profile design is "Kazakhstan, Astana,
 * Mangilik el 22" — so shipping the plugin's list would make the design's own example address
 * impossible to save. That is a defect, not a preference.
 *
 * **Why codes here and names from `Intl`.** The codes are a fixed international standard, so they
 * are data rather than the user-visible copy Constitution I keeps in Payload — nobody edits the
 * alpha-2 code for Portugal. The NAMES are user-visible, and they come from `Intl.DisplayNames`,
 * which is in the runtime, is already translated into every language the site might add, and stays
 * correct when a country renames itself. A country-list dependency would have shipped a second copy
 * of the names, in one language, that we would then own.
 */

/**
 * ISO 3166-1 alpha-2, officially assigned codes only.
 *
 * User-assigned and exceptionally-reserved codes (`XK` for Kosovo, `UK` as an alias for `GB`) are
 * deliberately absent: they are not in the standard, and `Intl.DisplayNames` has nothing to call
 * them, so they would render as their own code in the dropdown.
 */
export const COUNTRY_CODES = [
  'AD',
  'AE',
  'AF',
  'AG',
  'AI',
  'AL',
  'AM',
  'AO',
  'AQ',
  'AR',
  'AS',
  'AT',
  'AU',
  'AW',
  'AX',
  'AZ',
  'BA',
  'BB',
  'BD',
  'BE',
  'BF',
  'BG',
  'BH',
  'BI',
  'BJ',
  'BL',
  'BM',
  'BN',
  'BO',
  'BQ',
  'BR',
  'BS',
  'BT',
  'BV',
  'BW',
  'BY',
  'BZ',
  'CA',
  'CC',
  'CD',
  'CF',
  'CG',
  'CH',
  'CI',
  'CK',
  'CL',
  'CM',
  'CN',
  'CO',
  'CR',
  'CU',
  'CV',
  'CW',
  'CX',
  'CY',
  'CZ',
  'DE',
  'DJ',
  'DK',
  'DM',
  'DO',
  'DZ',
  'EC',
  'EE',
  'EG',
  'EH',
  'ER',
  'ES',
  'ET',
  'FI',
  'FJ',
  'FK',
  'FM',
  'FO',
  'FR',
  'GA',
  'GB',
  'GD',
  'GE',
  'GF',
  'GG',
  'GH',
  'GI',
  'GL',
  'GM',
  'GN',
  'GP',
  'GQ',
  'GR',
  'GS',
  'GT',
  'GU',
  'GW',
  'GY',
  'HK',
  'HM',
  'HN',
  'HR',
  'HT',
  'HU',
  'ID',
  'IE',
  'IL',
  'IM',
  'IN',
  'IO',
  'IQ',
  'IR',
  'IS',
  'IT',
  'JE',
  'JM',
  'JO',
  'JP',
  'KE',
  'KG',
  'KH',
  'KI',
  'KM',
  'KN',
  'KP',
  'KR',
  'KW',
  'KY',
  'KZ',
  'LA',
  'LB',
  'LC',
  'LI',
  'LK',
  'LR',
  'LS',
  'LT',
  'LU',
  'LV',
  'LY',
  'MA',
  'MC',
  'MD',
  'ME',
  'MF',
  'MG',
  'MH',
  'MK',
  'ML',
  'MM',
  'MN',
  'MO',
  'MP',
  'MQ',
  'MR',
  'MS',
  'MT',
  'MU',
  'MV',
  'MW',
  'MX',
  'MY',
  'MZ',
  'NA',
  'NC',
  'NE',
  'NF',
  'NG',
  'NI',
  'NL',
  'NO',
  'NP',
  'NR',
  'NU',
  'NZ',
  'OM',
  'PA',
  'PE',
  'PF',
  'PG',
  'PH',
  'PK',
  'PL',
  'PM',
  'PN',
  'PR',
  'PS',
  'PT',
  'PW',
  'PY',
  'QA',
  'RE',
  'RO',
  'RS',
  'RU',
  'RW',
  'SA',
  'SB',
  'SC',
  'SD',
  'SE',
  'SG',
  'SH',
  'SI',
  'SJ',
  'SK',
  'SL',
  'SM',
  'SN',
  'SO',
  'SR',
  'SS',
  'ST',
  'SV',
  'SX',
  'SY',
  'SZ',
  'TC',
  'TD',
  'TF',
  'TG',
  'TH',
  'TJ',
  'TK',
  'TL',
  'TM',
  'TN',
  'TO',
  'TR',
  'TT',
  'TV',
  'TW',
  'TZ',
  'UA',
  'UG',
  'UM',
  'US',
  'UY',
  'UZ',
  'VA',
  'VC',
  'VE',
  'VG',
  'VI',
  'VN',
  'VU',
  'WF',
  'WS',
  'YE',
  'YT',
  'ZA',
  'ZM',
  'ZW',
] as const

export type CountryCode = (typeof COUNTRY_CODES)[number]

export interface CountryOption {
  label: string
  value: CountryCode
}

/**
 * `Intl.DisplayNames` is constructed once per locale rather than once per country. Building it
 * inside the loop is the shape that turns a dropdown into a measurable cost.
 */
const displayNamesCache = new Map<string, Intl.DisplayNames>()

function displayNames(locale: string): Intl.DisplayNames {
  const cached = displayNamesCache.get(locale)
  if (cached) return cached

  const created = new Intl.DisplayNames([locale], { type: 'region' })
  displayNamesCache.set(locale, created)
  return created
}

/** The name of one country in the given locale. Falls back to the code, which is never blank. */
export function countryName(code: CountryCode, locale = 'en'): string {
  return displayNames(locale).of(code) ?? code
}

/**
 * Every country as `{ label, value }`, sorted by the localized name.
 *
 * Sorted with `Intl.Collator` rather than `Array.sort`'s default, because the default compares UTF-16
 * code units: it puts "Åland Islands" after "Zimbabwe" in English and gets Czech, Swedish and
 * Turkish wrong in ways their speakers notice immediately.
 */
export function countryOptions(locale = 'en'): CountryOption[] {
  const collator = new Intl.Collator(locale)

  return COUNTRY_CODES.map((value) => ({ label: countryName(value, locale), value })).sort((a, b) =>
    collator.compare(a.label, b.label),
  )
}

/**
 * The fallback pre-selection for the address form (spec 004, FR-030).
 *
 * The design draws “United Kingdom”, which is placeholder content. The owner
 * can change it in **Account settings**; this is what the form uses before anyone has, and it lives
 * here because it has to be a member of the list above.
 */
export const DEFAULT_COUNTRY: CountryCode = 'AE'

/**
 * Narrow an unknown value to a country code.
 *
 * Needed because a `select` field's stored value is `string | null` as far as the generated types
 * are concerned — Payload cannot promise the database still agrees with the options list after an
 * enum is narrowed. Anything that no longer resolves is dropped rather than rendered as a country
 * nobody can name.
 */
export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && (COUNTRY_CODES as readonly string[]).includes(value)
}
