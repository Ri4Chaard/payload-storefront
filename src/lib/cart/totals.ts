import { CATALOG_CURRENCY, formatPrice } from '@/lib/catalog/price'
import type { DiamondOption, ProductDetail } from '@/lib/catalog/types'

import { emptyCart, type CartIssue, type CartLineView, type CartView } from './types'

/**
 * What the cart says, given what the catalogue currently says (spec 005, T008,
 * [cart-loader.md](../../../specs/005-checkout-handoff/contracts/cart-loader.md)).
 *
 * **Split from `./loader.ts` so that this half needs no database.** The loader's job is to fetch —
 * the cart row, and the products those lines point at. This module's job is to decide, and every
 * rule worth arguing about lives here: which line is stale, which is excluded from the total, what
 * the total is. That makes them unit-testable against a handful of plain objects rather than only
 * against a seeded Postgres, which is what `vitest.integration.config.ts` means when it says the
 * fast tier has to stay runnable "on a laptop with nothing installed".
 *
 * **This is where FR-012 is actually met.** Every amount is computed here from published catalogue
 * data, in integer minor units, and formatted exactly once at the boundary. Nothing reads
 * `cart.subtotal` — see the loader for the long version of why the plugin's own number is the wrong
 * one for this page.
 */

/** A `carts.items` row, at `depth: 0`, before anything has been resolved. */
export interface RawCartLine {
  id?: null | string
  product?: number | { id: number } | null
  quantity?: null | number
  size?: number | { id: number } | null
  variant?: number | { id: number } | null
}

/** Nothing computes delivery; it is arranged with the seller (FR-011). */
const SHIPPING_MINOR = 0

export const relationId = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    return typeof id === 'number' ? id : undefined
  }
  return undefined
}

/**
 * A line whose product no longer resolves.
 *
 * It keeps its row id and says the little it can — the name lived on the product. Dropping it is
 * what the spec's edge case forbids: a cart that quietly loses a piece is a cart the customer
 * cannot reason about, and the row still has to be removable.
 */
function orphanLine(row: RawCartLine, quantity: number): CartLineView {
  return {
    id: String(row.id),
    title: 'This piece is no longer available',
    href: null,
    image: null,
    diamond: null,
    size: null,
    unitPrice: formatPrice(0),
    lineTotal: formatPrice(0),
    unitMinor: 0,
    quantity,
    maxQuantity: undefined,
    available: false,
  }
}

/**
 * One row, resolved against the catalogue as it is right now.
 *
 * The line and its issues are returned together because every issue is a fact about a specific
 * line. Separating them is how a total ends up disagreeing with the rows above it.
 */
export function resolveLine(
  row: RawCartLine,
  product: ProductDetail | undefined,
): { issues: CartIssue[]; line: CartLineView } {
  const lineId = String(row.id)
  const quantity = Math.max(1, Math.trunc(row.quantity ?? 1))
  const issues: CartIssue[] = []

  if (!product) {
    return {
      issues: [
        {
          lineId,
          kind: 'unpublished',
          message: 'This piece is no longer on sale and has been left out of your total.',
        },
      ],
      line: orphanLine(row, quantity),
    }
  }

  const variantId = relationId(row.variant)
  const sizeId = relationId(row.size)

  const chosen: DiamondOption | undefined = product.diamondOptions.find(
    (option) => option.id === variantId,
  )
  const size = product.sizes.find((option) => option.id === sizeId)

  // The stone's price where the piece has stones, the piece's own where it does not. `carts_items`
  // carries no price of its own by design (research R6) — FR-012 wants the current one, and a
  // stored one would be a snapshot of a kind FR-029 has ruled out.
  const unitMinor = chosen ? chosen.priceMinor : product.priceMinor
  const maxQuantity = chosen ? chosen.maxQuantity : product.maxQuantity

  // A piece with stones is only buyable through one of them, so a chosen stone that no longer
  // exists is treated exactly as an unavailable one — it can only arrive from a stale page or a
  // hand-edited request, and neither deserves a distinct message.
  const available =
    product.diamondOptions.length > 0 ? Boolean(chosen?.available) : product.available

  if (!available) {
    issues.push({
      lineId,
      kind: 'unavailable',
      message: chosen
        ? `${chosen.label} is no longer available and has been left out of your total.`
        : 'This piece is no longer available and has been left out of your total.',
    })
  }

  let counted = quantity
  if (available && maxQuantity !== undefined && quantity > maxQuantity) {
    counted = maxQuantity
    issues.push({
      lineId,
      kind: 'quantity-reduced',
      message: `Only ${maxQuantity} left — your quantity has been reduced to match.`,
    })
  }

  const lineMinor = available ? unitMinor * counted : 0

  return {
    issues,
    line: {
      id: lineId,
      title: product.title,
      href: product.href,
      image: product.images[0] ?? null,
      diamond: chosen?.label ?? null,
      size: size?.label ?? null,
      unitPrice: formatPrice(unitMinor),
      lineTotal: formatPrice(lineMinor),
      unitMinor,
      quantity: counted,
      maxQuantity,
      available,
    },
  }
}

/**
 * The whole view, from rows and the products they name.
 *
 * The subtotal is a sum over integers, formatted once. `formatPrice` throws on a fractional minor
 * unit rather than rendering `$24,899.999999999996`, which is the assertion that keeps the
 * arithmetic honest as this grows.
 */
export function resolveCart(
  rows: RawCartLine[],
  products: Map<number, ProductDetail>,
): CartView {
  const lines: CartLineView[] = []
  const issues: CartIssue[] = []

  for (const row of rows) {
    // A row with no id cannot be addressed by a mutation, so it cannot be corrected or removed.
    // Payload always assigns one; this is the guard that stops a malformed row rendering a line
    // whose bin does nothing.
    if (!row.id) continue

    const resolved = resolveLine(row, products.get(relationId(row.product) ?? -1))
    lines.push(resolved.line)
    issues.push(...resolved.issues)
  }

  if (lines.length === 0) return emptyCart()

  const subtotalMinor = lines.reduce(
    (total, line) => total + (line.available ? line.unitMinor * line.quantity : 0),
    0,
  )
  const itemCount = lines.reduce(
    (count, line) => count + (line.available ? line.quantity : 0),
    0,
  )

  return {
    lines,
    itemCount,
    subtotal: formatPrice(subtotalMinor),
    shipping: formatPrice(SHIPPING_MINOR),
    currency: CATALOG_CURRENCY,
    issues,
    empty: false,
  }
}
