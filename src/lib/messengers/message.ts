import type { MessageCustomer } from '@/lib/cart/message-customer'
import type { CartView } from '@/lib/cart/types'

import { LINK_BUDGET, buildLink } from './links'
import type { Platform } from './normalise'

/**
 * The cart becomes text (spec 005, T056,
 * [messenger-handoff.md §3](../../../specs/005-checkout-handoff/contracts/messenger-handoff.md)).
 * FR-022, FR-028, FR-028a, FR-043 – FR-045.
 *
 * **The budget is measured on the finished, percent-encoded link — not on the message.** This is
 * the part that gets written wrong. A Latin cart spends roughly one character of budget per
 * character of message; a Cyrillic one spends **six**, because each character is two UTF-8 bytes
 * and each byte becomes a three-character `%XX` escape. So a `message.length` check passes every
 * test written in English and truncates nothing for the customers who write in Russian or
 * Ukrainian. `tests/unit/messenger-message.test.ts` exercises the rule against a
 * Cyrillic cart for exactly that reason.
 *
 * **Truncation cuts at a line boundary and says what it dropped.** A message that quietly loses its
 * last three lines is worse than one that is visibly shorter: the seller cannot know to ask.
 *
 * **Composed once per checkout** (FR-026). `beginCheckout` calls this a single time and holds the
 * result for the life of the modal, so a double-click cannot produce two messages built from two
 * reads of a cart whose price changed in between.
 */

/** The longest destination a link can carry, so the budget is computed against the worst case. */
const LONGEST_DESTINATION_PLATFORM: Platform = 'telegram'

interface ComposeOptions {
  /**
   * The platform the budget is measured against. Every enabled messenger gets the SAME message —
   * one text, several links — so the worst case governs, and `telegram` is it: its URL prefix is
   * the longest of the three that carry text.
   */
  platform?: Platform
  /** A stand-in destination of realistic length, when the real one is not to hand. */
  destination?: string
}

/** "2 × Product 1 — Option 1 — $76,640" */
function itemLine(line: CartView['lines'][number]): string {
  // The variant, where one was chosen. Size travelled here too until spec 011 deprecated it.
  const described = line.variantChoice ? ` — ${line.variantChoice}` : ''

  return `${line.quantity} × ${line.title}${described} — ${line.lineTotal}`
}

/**
 * The customer block, or nothing at all.
 *
 * Each half is independent (FR-045): a saved name with no address yields the name alone, and an
 * empty result must be indistinguishable from an anonymous visitor's.
 */
function customerBlock(customer: MessageCustomer | null): string {
  if (!customer) return ''

  const parts = [
    customer.name === null ? null : `Name: ${customer.name}`,
    customer.address === null ? null : `Delivery address: ${customer.address}`,
  ].filter(Boolean)

  return parts.join('\n')
}

/**
 * Substitute, then collapse.
 *
 * `{{customer}}` takes its surrounding blank line with it when it renders nothing — otherwise every
 * anonymous message carries a ragged gap where the block would have been, which is the tell that a
 * template was filled in by a machine.
 */
function fill(template: string, items: string, total: string, customer: string): string {
  const filled = template
    .replaceAll('{{items}}', items)
    .replaceAll('{{total}}', total)
    .replaceAll('{{customer}}', customer)

  return (
    filled
      // Three or more newlines — what a collapsed placeholder leaves behind — become the paragraph
      // break the template intended.
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+$/gm, '')
      .trim()
  )
}

/** How long the finished link would be, if this message were sent through the worst-case platform. */
function encodedLength(message: string, options: ComposeOptions): number {
  const platform = options.platform ?? LONGEST_DESTINATION_PLATFORM
  const destination = options.destination ?? 'a'.repeat(32)
  return buildLink(platform, destination, message).href.length
}

/**
 * Drop whole item lines from the end until the link fits, and say how many went.
 *
 * Line-at-a-time rather than character-at-a-time: a message cut mid-word reads as a fault, and a
 * message cut mid-line loses a line without admitting it.
 */
function truncateItems(
  lines: string[],
  build: (items: string[], omitted: number) => string,
  options: ComposeOptions,
): string {
  let kept = lines.length

  while (kept > 0) {
    const message = build(lines.slice(0, kept), lines.length - kept)
    if (encodedLength(message, options) <= LINK_BUDGET) return message
    kept -= 1
  }

  // Even one line does not fit — a single title long enough to fill 2,000 characters of URL. The
  // seller gets a request they can act on rather than a truncated title: the reference is the
  // conversation itself, and the customer is standing in it.
  return build([], lines.length)
}

export function composeMessage(
  cart: CartView,
  template: string,
  customer: MessageCustomer | null,
  options: ComposeOptions = {},
): string {
  // The seller must not receive a request for a product the customer was just told is unavailable.
  const lines = cart.lines.filter((line) => line.available).map(itemLine)
  const block = customerBlock(customer)

  const build = (items: string[], omitted: number): string => {
    const listed =
      omitted > 0
        ? [...items, `…and ${omitted} more ${omitted === 1 ? 'item' : 'items'} in my cart`]
        : items

    return fill(template, listed.join('\n'), cart.subtotal, block)
  }

  const whole = build(lines, 0)
  return encodedLength(whole, options) <= LINK_BUDGET
    ? whole
    : truncateItems(lines, build, options)
}
