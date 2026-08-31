/**
 * Money, formatted (003/T232, contract §5).
 *
 * The single place an amount becomes a price. Every other module — the mappers, the queries, the
 * routes — passes integers around and calls this once at the boundary, which is why `ProductCard`
 * has always taken a `string` and why it keeps taking one after spec 004 swaps the data source.
 *
 * **Amounts are integer counts of minor units.** `$24,900` is `2490000`. The plugin stores them
 * that way (Constitution VI) and nothing here converts them any earlier than it has to, because a
 * price that spends time as a float is a price that eventually renders as `$24,899.999999999996`.
 *
 * **The exponent is asked for, not assumed.** Dividing by 100 is correct for USD and wrong for JPY
 * (0 digits) and BHD (3). `Intl` already knows the answer for every currency it supports, so the
 * two-line lookup below is cheaper than the bug.
 */

/**
 * Formatting has to be deterministic across the server render and the client hydration, and the
 * runtime default differs between them — Node takes it from `LANG`, the browser from the user. An
 * explicit default is what stops `$24,900` and `24 900,00 $US` from being the same component.
 */
const DEFAULT_LOCALE = 'en-US'
const DEFAULT_CURRENCY = 'USD'

/**
 * The currency every amount in the catalogue is counted in, as an ISO 4217 code.
 *
 * Exported because structured data has to state it: `schema.org/Offer` wants `priceCurrency`
 * beside a machine-readable `price`, and a search engine reading "USD" from a hardcoded string in
 * a route while the formatter uses something else is the kind of divergence nobody notices until a
 * rich result quotes the wrong money.
 */
export const CATALOG_CURRENCY = DEFAULT_CURRENCY

/** How many decimal places this currency's minor unit occupies. USD 2, JPY 0, BHD 3. */
export function minorUnitDigits(currency: string = DEFAULT_CURRENCY, locale?: string): number {
  const { maximumFractionDigits } = new Intl.NumberFormat(locale ?? DEFAULT_LOCALE, {
    style: 'currency',
    currency,
  }).resolvedOptions()
  return maximumFractionDigits ?? 2
}

/**
 * `2490000` → `"$24,900"`.
 *
 * Whole amounts lose their decimals, because that is what the design draws and jewellery is priced
 * in round numbers. An amount with cents keeps them rather than being rounded away — a silent
 * `$24,899.50 → $24,900` is the kind of rounding that ends up in a dispute.
 *
 * Throws on a non-integer or non-finite amount. There is no sensible price to render for one, and a
 * fractional minor unit always means an arithmetic mistake upstream — a percentage applied to a
 * total, a division that should have been integer. Constitution VI would rather that surface here
 * than be rounded into something plausible.
 */
export function formatPrice(
  minorUnits: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  if (!Number.isFinite(minorUnits) || !Number.isInteger(minorUnits)) {
    throw new TypeError(
      `formatPrice expects an integer count of minor units, received ${minorUnits}. ` +
        'A fractional amount means the arithmetic upstream produced a float.',
    )
  }

  const digits = minorUnitDigits(currency, locale)
  const major = minorUnits / 10 ** digits
  const whole = Number.isInteger(major)

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : digits,
    maximumFractionDigits: whole ? 0 : digits,
  }).format(major)
}
