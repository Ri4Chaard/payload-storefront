import { CATALOG_CURRENCY, formatPrice } from '@/lib/catalog/price'
import type { CatalogImage } from '@/lib/catalog/types'

/**
 * What a component is allowed to see of a cart (spec 005, T005).
 *
 * The same boundary `src/lib/catalog/types.ts` draws, for the same reasons, and one more that is
 * specific to money: **no raw amount crosses into a component except where arithmetic demands it**.
 * `unitMinor` is the single exception and it exists so the subtotal is summed in one place from
 * integers rather than reconstructed from formatted strings. Nothing that DRAWS a price reads it.
 *
 * **Lines carry labels, not identifiers.** A component that can see `variantId` is a component that
 * can be made to send it somewhere; identifiers travel the other way, in `CartIntent`, which is
 * checked on arrival. The one id here is `id` — the cart row — because the mutation actions have to
 * name which line they are changing, and a row id is not a fact about the catalogue.
 *
 * **Pure, and separate from every module that reads Payload.** `src/lib/addresses/types.ts` records
 * what this costs to learn: a single import of a module that imports `@payload-config` from a
 * `'use client'` file drags the whole Payload config into the browser bundle, where it fails on Node
 * built-ins. Nothing here imports Payload, so nothing here can.
 */

/** One line of the cart, resolved against the live catalogue. */
export interface CartLineView {
  /**
   * The cart row's own id. Payload array rows are always string ids whatever the database's own
   * id type is, which is why this is not a number.
   */
  id: string
  title: string
  /** `null` once the product is gone — the line still renders, it just has nowhere to go. */
  href: string | null
  image: CatalogImage | null
  /** The chosen stone's label. `null` where the piece offers no choice. */
  diamond: string | null
  /** The chosen size's label. `null` where the piece offers no choice. */
  size: string | null
  /** Formatted. */
  unitPrice: string
  /** Formatted. `unitMinor × quantity`. */
  lineTotal: string
  /**
   * An integer count of minor units — the only raw amount in this file.
   *
   * Present so the subtotal is one sum over integers instead of a parse of `"$24,900"`, which is
   * exactly the direction Constitution VI forbids money to travel.
   */
  unitMinor: number
  quantity: number
  /** How high the stepper may go. `undefined` for a made-to-order piece, which has no ceiling. */
  maxQuantity: number | undefined
  /** `false` excludes the line from the totals; it does not remove it from the page. */
  available: boolean
}

/**
 * Something changed underneath the cart since the line was added (FR-014).
 *
 * Reported per line and surfaced on it. A cart that quietly loses a piece is a cart the customer
 * cannot reason about, so nothing here is a reason to drop a line — only a reason to exclude it
 * from the total and to say so in words.
 */
export interface CartIssue {
  lineId: string
  kind: 'price-changed' | 'quantity-reduced' | 'unavailable' | 'unpublished'
  /** What the customer is shown on that line. In text, never in colour alone. */
  message: string
}

/** The whole cart, ready to render. */
export interface CartView {
  lines: CartLineView[]
  /** Total quantity across available lines — "Products, N items", and the header badge. */
  itemCount: number
  /** Formatted, computed here from `unitMinor` (FR-012). Never `cart.subtotal`. */
  subtotal: string
  /** Always `"$0"`. Nothing computes delivery; it is arranged with the seller. */
  shipping: string
  currency: string
  /** Non-empty blocks checkout until the customer acknowledges it (FR-014). */
  issues: CartIssue[]
  empty: boolean
}

/**
 * What an empty cart looks like, so "no cart at all" and "a cart with nothing in it" render
 * identically — which is what lets the loader return a view rather than a null the caller has to
 * remember to handle (FR-015).
 *
 * A function rather than a frozen constant: `CartView` holds arrays, and a shared instance is one
 * accidental `push` away from leaking between requests.
 *
 * `price.ts` is safe to import here — it depends on nothing but `Intl`, so this file stays free of
 * Payload and remains importable from a client component.
 */
export function emptyCart(): CartView {
  return {
    lines: [],
    itemCount: 0,
    subtotal: formatPrice(0),
    shipping: formatPrice(0),
    currency: CATALOG_CURRENCY,
    issues: [],
    empty: true,
  }
}
